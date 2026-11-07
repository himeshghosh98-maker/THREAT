from collections import defaultdict
from uuid import UUID

from app.models.schemas import Cluster, Correlations, ScanReport


def correlations(reports: list[ScanReport]) -> Correlations:
    groups: dict[str, set[UUID]] = defaultdict(set)
    for report in reports:
        for hop in report.redirect_chain:
            groups[hop.url].add(report.id)
    return Correlations(clusters=[
        Cluster(id=f"redirect-{min(ids)}", shared_indicator=target, indicator_type="redirect_target",
                report_ids=sorted(ids), summary="Reports share a redirect target.")
        for target, ids in sorted(groups.items()) if len(ids) > 1
    ])
