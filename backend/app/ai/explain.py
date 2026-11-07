from app.models.schemas import Explanation, Indicator, Risk


def explain(risk: Risk, indicators: list[Indicator]) -> Explanation:
    summary = ("No significant indicators found in the available checks."
               if risk.classification == "low_risk" else "A local rule identified a suspicious indicator.")
    return Explanation(summary=summary, tactics=[i.title for i in indicators],
                       recommended_actions=["Confirm the source through a known channel."],
                       model="deterministic-stub")
