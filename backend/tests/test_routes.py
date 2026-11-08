from uuid import uuid4

import pytest

from app.models.schemas import Correlations, ErrorResponse, Health, ReportList, ScanReport, VerifyResult

API = "/api/v1"


def validated(response, model):
    assert response.status_code == 200, response.text
    result = model.model_validate(response.json())
    assert result.model_dump(mode="json") == response.json()
    return result


def test_health_and_cors(client):
    response = client.get(API + "/health", headers={"Origin": "https://ui.example"})
    validated(response, Health)
    assert response.json() == {"status": "ok", "service": "threat-intel-backend", "version": "1.0.0"}
    assert response.headers["access-control-allow-origin"] == "https://ui.example"
    denied = client.get(API + "/health", headers={"Origin": "https://unknown.example"})
    assert "access-control-allow-origin" not in denied.headers


def test_list_and_correlations(client):
    listing = validated(client.get(API + "/reports"), ReportList)
    assert listing.total == len(listing.items) == 7
    for risk in ("suspicious", "low_risk"):
        response = client.get(API + "/reports", params={"risk": risk, "offset": 1, "limit": 1})
        page = validated(response, ReportList)
        assert page.total == (4 if risk == "suspicious" else 3)
        assert len(page.items) == 1
        assert page.items[0].risk.classification == risk
    cluster, = validated(client.get(API + "/intel/correlations"), Correlations).clusters
    assert len(cluster.report_ids) == 2
    assert set(cluster.report_ids) <= {r.id for r in listing.items}


@pytest.mark.parametrize(("route", "body", "expected"), [
    ("url", {"url": "https://example.org/reset?otp=123456"}, "low_risk"),
    ("url", {"url": "https://example.zip"}, "suspicious"),
    ("message", {"message": "Urgent: send secret 123456"}, "suspicious"),
    ("message", {"message": "Meet on Tuesday"}, "low_risk"),
])
def test_scan_publish_verify(client, route, body, expected):
    response = client.post(API + "/scan/" + route, json=body)
    report = validated(response, ScanReport)
    assert "secret" not in response.text and "123456" not in response.text
    assert report.risk.classification == expected and report.limitations
    assert bool(report.indicators) == (expected == "suspicious")
    if route == "url":
        assert report.input_display.startswith("hxxps://") and "[.]" in report.input_display
    else:
        assert report.message_analysis is not None
    if expected == "low_risk" and route == "message":
        assert report.ai_explanation.summary == "No significant indicators found in the available checks."
    path = f"{API}/reports/{report.id}"
    assert validated(client.get(path), ScanReport) == report
    before = client.get(path + "/verify")
    assert before.status_code == 409 and before.json()["error"]["code"] == "not_published"
    published = validated(client.post(path + "/publish"), ScanReport)
    assert published.onchain.status == "published" and published.onchain.network == "local"
    assert validated(client.post(path + "/publish"), ScanReport) == published
    assert validated(client.get(path), ScanReport) == published
    after = validated(client.get(path + "/verify"), VerifyResult)
    assert after.match and after.recomputed_hash == published.onchain.report_hash
    assert len(after.history) == 1


@pytest.mark.parametrize(("method", "path", "body", "status"), [
    ("POST", "/scan/url", {"url": "file:///secret"}, 422),
    ("POST", "/scan/message", {"message": "  "}, 422),
    ("GET", "/reports?risk=banana", None, 422),
    ("GET", "/reports?offset=-1", None, 422),
    ("GET", "/reports/invalid", None, 422),
    ("GET", f"/reports/{uuid4()}", None, 404),
    ("POST", "/health", None, 405),
])
def test_error_envelope(client, method, path, body, status):
    response = client.request(method, API + path, json=body)
    assert response.status_code == status
    detail = ErrorResponse.model_validate(response.json()).error
    assert detail.code and detail.message and "secret" not in response.text
