from sqlalchemy import func, select

from app.models.entities import AnalysisJob, Ticket


def create(client, auth, submission, key="unique-key-123"):
    response = client.post("/api/v1/requests", json=submission, headers={"Idempotency-Key": key})
    assert response.status_code == 201
    return client.get("/api/v1/tickets", headers=auth).json()["items"][-1]


def test_persist_before_analysis_and_duplicate(client, database, auth, submission):
    create(client, auth, submission)
    response = client.post(
        "/api/v1/requests", json=submission, headers={"Idempotency-Key": "unique-key-123"}
    )
    assert response.status_code == 201
    with database() as db:
        assert db.scalar(select(func.count()).select_from(Ticket)) == 1
        assert db.scalar(select(Ticket)).analysis_state == "PENDING_ANALYSIS"
        assert db.scalar(select(AnalysisJob)).state == "PENDING"
    changed = submission | {"subject": "Different subject"}
    assert (
        client.post(
            "/api/v1/requests", json=changed, headers={"Idempotency-Key": "unique-key-123"}
        ).status_code
        == 409
    )


def test_validation_auth_and_rate_limit(client, submission):
    assert client.get("/api/v1/tickets").status_code == 401
    assert client.get("/api/v1/dashboard/metrics").status_code == 401
    for invalid in ({"email": "bad"}, {"description": " "}, {"website": "spam"}, {"name": "x"}):
        assert (
            client.post(
                "/api/v1/requests",
                json=submission | invalid,
                headers={"Idempotency-Key": "validation-key"},
            ).status_code
            == 422
        )
    for i in range(10):
        assert (
            client.post(
                "/api/v1/requests", json=submission, headers={"Idempotency-Key": f"rate-key-{i}"}
            ).status_code
            == 201
        )
    assert (
        client.post(
            "/api/v1/requests", json=submission, headers={"Idempotency-Key": "rate-key-11"}
        ).status_code
        == 429
    )


def test_move_reload_conflict_and_manual_priority(client, auth, submission):
    ticket = create(client, auth, submission)
    url = f"/api/v1/tickets/{ticket['id']}"
    moved = client.patch(
        url + "/position",
        headers=auth,
        json={"expected_version": ticket["version"], "status": "IN_PROGRESS", "position": 0},
    )
    assert moved.status_code == 200
    assert client.get(url, headers=auth).json()["status"] == "IN_PROGRESS"
    assert (
        client.patch(
            url + "/position",
            headers=auth,
            json={"expected_version": 1, "status": "TODO", "position": 0},
        ).status_code
        == 409
    )
    edited = client.patch(
        url, headers=auth, json={"expected_version": 2, "priority": "LOW", "team_id": "billing"}
    )
    assert edited.status_code == 200
    assert edited.json()["priority_rank"] == 3
    assert edited.json()["status"] == "IN_PROGRESS"
    assert edited.json()["human_locked_fields"] == ["priority", "status", "team_id"]
    assert (
        client.patch(
            url + "/position",
            headers=auth,
            json={"expected_version": 3, "status": "RESOLVED", "position": 0},
        ).status_code
        == 422
    )


def test_reorder_and_versions_of_displaced_cards(client, auth, submission):
    first = create(client, auth, submission, "reorder-first")
    second = create(client, auth, submission, "reorder-second")
    response = client.patch(
        f"/api/v1/tickets/{second['id']}/position",
        headers=auth,
        json={"expected_version": 1, "status": "REVIEW", "position": 0},
    )
    assert response.status_code == 200
    rows = client.get("/api/v1/tickets", headers=auth).json()["items"]
    assert [row["id"] for row in rows] == [second["id"], first["id"]]
    assert [row["position"] for row in rows] == [0, 1]
    assert [row["version"] for row in rows] == [2, 2]
