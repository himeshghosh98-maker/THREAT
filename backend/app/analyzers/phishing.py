import json
from pathlib import Path

from pydantic import HttpUrl

from app.models.schemas import Indicator

TLDS = frozenset(json.loads((Path(__file__).parents[1] / "data/suspicious_tlds.json").read_text()))


def inspect_url(url: HttpUrl) -> list[Indicator]:
    if url.host.rstrip(".").split(".")[-1] in TLDS:
        return [Indicator(id="listed-tld", category="url_structure", title="Listed domain suffix",
                          severity="medium", evidence="The host suffix appears in the local demo list.",
                          source="local suffix list")]
    return []
