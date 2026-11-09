import re

from app.models.schemas import Indicator, Risk

# Weights determine a position within a band. Hygiene contributes at most
# six points in total. A short DNS TTL carries no evidentiary weight.
WEIGHTS = {"info": 0, "low": 2, "medium": 15, "high": 30, "critical": 50}
HYGIENE_CAP = 6
BANDS = {"low_risk": (0, 19), "inconclusive": (0, 19), "suspicious": (20, 59),
         "high_risk": (60, 99), "confirmed_malicious": (100, 100)}
CORE = {"DNS", "HTTP redirects", "TLS"}
MIN_COVERAGE = 0.5


def strong(item):
    key = re.sub(r"^link-\d+-", "", item.id)
    return (item.category in {"typosquat", "threat_intel"}
            or item.category == "homograph" and key != "idn-label"
            or item.category == "domain_age" and item.severity == "high"
            or item.category == "social_engineering" and item.severity == "high"
            or key in {"brand-subdomain", "embedded-url", "tls-ca"})


def score_risk(indicators: list[Indicator], completed: list[str], failed: list[str],
               *, authoritative_hit: bool = False) -> Risk:
    coverage = len(completed) / max(1, len(completed) + len(failed))
    strong_items = [item for item in indicators if strong(item)]
    hygiene = min(HYGIENE_CAP, sum(min(2, WEIGHTS[i.severity]) for i in indicators if not strong(i)))
    score = hygiene + sum(WEIGHTS[i.severity] for i in strong_items)
    # Correlated language cues describe one solicitation. Urgent messages
    # remain in the suspicious band unless an authoritative source confirms them.
    urgent_message = "Local message rules" in completed and any(i.id == "urgent-language" for i in indicators)
    missing_core = any(name.split(": ")[-1] in CORE or "URL scan blocked" in name for name in failed)
    if authoritative_hit:
        classification = "confirmed_malicious"
    elif not urgent_message and (len(strong_items) >= 2 or any(i.severity == "critical" for i in strong_items)):
        classification = "high_risk"
    elif strong_items:
        classification = "suspicious"
    elif missing_core or coverage < MIN_COVERAGE or "Local domain suffix" in completed:
        classification = "inconclusive"
    else:
        classification = "low_risk"
    floor, ceiling = BANDS[classification]
    return Risk(classification=classification, score=max(floor, min(ceiling, score)),
                confidence=round(coverage, 2), checks_completed=completed, checks_failed=failed)


def assess(indicators: list[Indicator], check: str) -> Risk:
    return score_risk(indicators, [check], [])
