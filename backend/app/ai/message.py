import re

from app.models.schemas import Impersonation, Indicator, MessageAnalysis


def analyze_message(message: str) -> tuple[MessageAnalysis, list[Indicator]]:
    urgent = bool(re.search(r"\b(urgent|immediately|act now)\b", message, re.I))
    analysis = MessageAnalysis(extracted_urls=[], extracted_emails=[], extracted_phones=[],
                               urgency_signals=["Urgency language"] if urgent else [],
                               impersonation=Impersonation(detected=False, target=None),
                               explanation="Only urgency language was checked. Contact extraction and impersonation checks were not run.")
    indicators = []
    if urgent:
        indicators.append(Indicator(id="urgent-language", category="social_engineering",
                                    title="Urgency language", severity="medium",
                                    evidence="The message contains a configured urgency phrase.",
                                    source="local phrase check"))
    return analysis, indicators
