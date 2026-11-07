from app.models.schemas import Indicator, Risk


def assess(indicators: list[Indicator], check: str) -> Risk:
    flagged = bool(indicators)
    return Risk(classification="suspicious" if flagged else "low_risk",
                score=55 if flagged else 0, confidence=0.45, checks_completed=[check],
                checks_failed=[])
