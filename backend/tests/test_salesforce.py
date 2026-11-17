from datetime import timedelta

import httpx
import pytest
from sqlalchemy import func, select
from test_intake_board import create

from app.core.config import Settings
from app.integrations.salesforce import LiveSalesforce, SalesforceError
from app.models.entities import SyncOutbox, now
from app.services.sync import SyncService
from app.worker import tick


def settings():
    return Settings(
        _env_file=None,
        operator_token="test-operator-token-for-tests",
        salesforce_mode="live",
        salesforce_instance_url="https://example.my.salesforce.com",
        salesforce_client_id="test-client",
        salesforce_client_secret="test-secret",
        salesforce_status_map={"REVIEW": "Configured Review"},
        salesforce_priority_map={"MEDIUM": "Configured Medium"},
    )


def snapshot():
    return {
        "subject": "Test subject",
        "description": "Test description",
        "priority": "MEDIUM",
        "status": "REVIEW",
        "team_id": None,
    }


def test_approval_required_and_demo_never_synced(client, database, auth, submission):
    ticket = create(client, auth, submission)
    url = f"/api/v1/tickets/{ticket['id']}/salesforce-sync"
    assert client.post(url, json={"expected_version": 1, "approved": True}).status_code == 401
    assert client.post(url, headers=auth, json={"expected_version": 1}).status_code == 422
    assert (
        client.post(url, headers=auth, json={"expected_version": 1, "approved": False}).status_code
        == 422
    )
    assert (
        client.post(url, headers=auth, json={"expected_version": 1, "approved": True}).status_code
        == 202
    )
    assert (
        client.post(url, headers=auth, json={"expected_version": 1, "approved": True}).status_code
        == 202
    )
    with database.begin() as db:
        assert db.scalar(select(func.count()).select_from(SyncOutbox)) == 1
        SyncService(db).process(db.scalar(select(SyncOutbox)).id)
    detail = client.get(f"/api/v1/tickets/{ticket['id']}", headers=auth).json()
    assert detail["sync_status"] == "DEMO_NOT_SYNCED"
    assert detail["salesforce_case_id"] is None


def test_stale_snapshot_is_cancelled(client, database, auth, submission):
    ticket = create(client, auth, submission)
    url = f"/api/v1/tickets/{ticket['id']}"
    client.post(
        url + "/salesforce-sync", headers=auth, json={"expected_version": 1, "approved": True}
    )
    client.patch(url, headers=auth, json={"expected_version": 1, "priority": "LOW"})

    class NeverCall:
        def upsert(self, *args):
            pytest.fail("Superseded approval cannot produce an external write")

    with database.begin() as db:
        row = db.scalar(select(SyncOutbox))
        SyncService(db).process(row.id, NeverCall())
        assert row.status == "CANCELLED"


def test_upsert_retry_no_duplicate_and_mapping():
    remote = {}
    requests = []
    failed = False

    def transport(request):
        nonlocal failed
        requests.append(request)
        if request.url.path.endswith("/token"):
            return httpx.Response(200, json={"access_token": "mock-secret-token"})
        if request.method == "PATCH":
            remote[request.url.path] = "500000000000001AAA"
            if not failed:
                failed = True
                raise httpx.ReadTimeout("lost acknowledgement")
            return httpx.Response(204)
        return httpx.Response(200, json={"Id": "500000000000001AAA"})

    port = LiveSalesforce(settings(), httpx.Client(transport=httpx.MockTransport(transport)))
    with pytest.raises(SalesforceError) as error:
        port.upsert("CP-EXAMPLE", snapshot())
    assert error.value.retryable
    assert port.upsert("CP-EXAMPLE", snapshot()).live
    assert len(remote) == 1
    patches = [r for r in requests if r.method == "PATCH"]
    assert patches[0].url == patches[1].url
    assert b"Configured Medium" in patches[0].content
    port.close()


@pytest.mark.parametrize(
    "status,code,retryable",
    [
        (429, "SALESFORCE_RATE_LIMIT", True),
        (500, "SALESFORCE_UNAVAILABLE", True),
        (403, "SALESFORCE_HTTP_403", False),
    ],
)
def test_http_error_taxonomy(status, code, retryable):
    with pytest.raises(SalesforceError) as error:
        LiveSalesforce.check(httpx.Response(status, text="sensitive server body"))
    assert str(error.value) == code
    assert error.value.retryable is retryable


def test_oauth_refresh_and_missing_mapping():
    tokens = 0
    patches = 0

    def handler(request):
        nonlocal tokens, patches
        if request.url.path.endswith("/token"):
            tokens += 1
            return httpx.Response(200, json={"access_token": f"mock-{tokens}"})
        patches += 1
        return (
            httpx.Response(401)
            if patches == 1
            else httpx.Response(201, json={"id": "500000000000001AAA"})
        )

    port = LiveSalesforce(settings(), httpx.Client(transport=httpx.MockTransport(handler)))
    assert port.upsert("CP-EXAMPLE", snapshot()).case_id == "500000000000001AAA"
    assert tokens == 2
    with pytest.raises(SalesforceError, match="SALESFORCE_MAPPING_MISSING"):
        port.upsert("CP-EXAMPLE", snapshot() | {"status": "TODO"})
    port.close()


def test_bounded_outbox_retry(client, database, auth, submission):
    ticket = create(client, auth, submission)
    client.post(
        f"/api/v1/tickets/{ticket['id']}/salesforce-sync",
        headers=auth,
        json={"expected_version": 1, "approved": True},
    )

    class FailingPort:
        def upsert(self, *args):
            raise SalesforceError("SALESFORCE_RATE_LIMIT", True)

    for expected in ("RETRY", "RETRY", "FAILED"):
        with database.begin() as db:
            row = db.scalar(select(SyncOutbox))
            SyncService(db).process(row.id, FailingPort())
            assert row.status == expected
            assert (
                row.available_at > now().replace(tzinfo=None)
                if row.available_at.tzinfo is None
                else row.available_at > now()
            )
    with database() as db:
        assert db.scalar(select(SyncOutbox)).attempts == 3


def test_expired_analysis_lease_is_recovered(client, database, auth, submission):
    from app.models.entities import AnalysisJob

    create(client, auth, submission)
    with database.begin() as db:
        job = db.scalar(select(AnalysisJob))
        job.state = "RUNNING"
        job.lease_until = now() - timedelta(seconds=1)
    tick(database)
    with database() as db:
        assert db.scalar(select(AnalysisJob)).state == "DONE"
