from app.models.schemas import Indicator, Risk

WEIGHTS = {"info": 2, "low": 8, "medium": 20, "high": 35, "critical": 55}


def score_risk(indicators: list[Indicator], completed: list[str], failed: list[str],
               *, authoritative_hit: bool = False) -> Risk:
    """Only exact matches from a verified threat-intel source set authoritative_hit."""
    score = min(100, sum(2 if item.category == "headers" and item.severity == "low"
                         else WEIGHTS[item.severity] for item in indicators))
    strong = sum(item.severity in {"high", "critical"} for item in indicators)
    if authoritative_hit:
        classification, score = "confirmed_malicious", 100
    elif score >= 70 and strong >= 2:
        classification = "high_risk"
    elif score >= WEIGHTS["info"]:
        classification = "suspicious"
    elif failed or not completed:
        classification = "inconclusive"
    else:
        classification = "low_risk"
    coverage = len(completed) / max(1, len(completed) + len(failed))
    return Risk(classification=classification, score=score, confidence=round(coverage, 2),
                checks_completed=completed, checks_failed=failed)


def assess(indicators: list[Indicator], check: str) -> Risk:
    return score_risk(indicators, [check], [])
