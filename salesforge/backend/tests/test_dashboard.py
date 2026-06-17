"""TDD tests for WU-16: Dashboard Backend."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

DASHBOARD_URL = "/api/v1/dashboard"
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

_REP_A = {"email": "rep_a@dash.com", "password": "secret123", "full_name": "Rep A"}
_REP_B = {"email": "rep_b@dash.com", "password": "secret123", "full_name": "Rep B"}
_MANAGER = {"email": "mgr@dash.com", "password": "secret123", "full_name": "Manager"}


def _register_login(client, payload: dict) -> str:
    client.post(REGISTER_URL, json=payload)
    resp = client.post(
        LOGIN_URL,
        json={"email": payload["email"], "password": payload["password"]},
    )
    return resp.json()["access_token"]


def _set_role(db, email: str, role: str) -> None:
    from app.models.user import User
    user = db.query(User).filter(User.email == email).first()
    user.role = role
    db.commit()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _seed_lead(db, owner_id: str, days_ago: int = 0):
    from app.models.lead import Lead
    created = datetime.now(UTC) - timedelta(days=days_ago)
    lead = Lead(
        first_name="Test",
        last_name="Lead",
        status="new",
        owner_id=owner_id,
        created_at=created,
    )
    db.add(lead)
    db.commit()
    return lead


def _seed_deal(
    db,
    owner_id: str,
    stage: str = "prospect",
    value: float = 1000.0,
    days_since_update: int = 0,
):
    from app.models.deal import Deal
    updated = datetime.now(UTC) - timedelta(days=days_since_update)
    deal = Deal(
        title="Test Deal",
        stage=stage,
        probability=10,
        value=value,
        owner_id=owner_id,
        updated_at=updated,
    )
    db.add(deal)
    db.commit()
    return deal


def _seed_activity(db, owner_id: str, completed: bool = False, due_days_ago: int = 0):
    from app.models.activity import Activity
    due = datetime.now(UTC) - timedelta(days=due_days_ago)
    act = Activity(
        type="call",
        title="Test Act",
        completed=completed,
        due_date=due if due_days_ago > 0 else None,
        owner_id=owner_id,
    )
    db.add(act)
    db.commit()
    return act


def _get_user(db, email: str):
    from app.models.user import User
    return db.query(User).filter(User.email == email).first()


# ---------------------------------------------------------------------------
# Stats endpoint
# ---------------------------------------------------------------------------


class TestDashboardStats:
    def test_stats_endpoint_returns_all_fields(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.get(f"{DASHBOARD_URL}/stats", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert "leads_this_week" in data
        assert "pipeline_value" in data
        assert "deals_won_this_month" in data
        assert "deals_won_value_this_month" in data
        assert "overdue_activities" in data

    def test_leads_this_week_counts_recent(self, client, db):
        tok = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        _seed_lead(db, user.id, days_ago=2)
        _seed_lead(db, user.id, days_ago=10)  # too old

        resp = client.get(f"{DASHBOARD_URL}/stats", headers=_auth(tok))
        assert resp.json()["leads_this_week"] == 1

    def test_pipeline_value_excludes_won_and_lost(self, client, db):
        tok = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        _seed_deal(db, user.id, stage="prospect", value=1000.0)
        _seed_deal(db, user.id, stage="proposal", value=2000.0)
        _seed_deal(db, user.id, stage="won", value=5000.0)
        _seed_deal(db, user.id, stage="lost", value=3000.0)

        resp = client.get(f"{DASHBOARD_URL}/stats", headers=_auth(tok))
        assert resp.json()["pipeline_value"] == 3000.0

    def test_deals_won_this_month(self, client, db):
        tok = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        _seed_deal(db, user.id, stage="won", value=999.0, days_since_update=0)
        _seed_deal(db, user.id, stage="won", value=1.0, days_since_update=35)  # old

        resp = client.get(f"{DASHBOARD_URL}/stats", headers=_auth(tok))
        data = resp.json()
        assert data["deals_won_this_month"] == 1
        assert data["deals_won_value_this_month"] == 999.0

    def test_overdue_activities_count(self, client, db):
        tok = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        _seed_activity(db, user.id, completed=False, due_days_ago=2)
        _seed_activity(db, user.id, completed=True, due_days_ago=2)  # done, not overdue
        _seed_activity(db, user.id, completed=False)  # no due date, not overdue

        resp = client.get(f"{DASHBOARD_URL}/stats", headers=_auth(tok))
        assert resp.json()["overdue_activities"] == 1

    def test_rep_sees_only_own_stats(self, client, db):
        tok_a = _register_login(client, _REP_A)
        _register_login(client, _REP_B)
        user_a = _get_user(db, _REP_A["email"])
        user_b = _get_user(db, _REP_B["email"])

        _seed_lead(db, user_a.id, days_ago=1)
        _seed_lead(db, user_b.id, days_ago=1)

        resp = client.get(f"{DASHBOARD_URL}/stats", headers=_auth(tok_a))
        assert resp.json()["leads_this_week"] == 1

    def test_manager_sees_all_stats(self, client, db):
        _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")
        user_a = _get_user(db, _REP_A["email"])

        _seed_lead(db, user_a.id, days_ago=1)

        resp = client.get(f"{DASHBOARD_URL}/stats", headers=_auth(tok_mgr))
        assert resp.json()["leads_this_week"] >= 1


# ---------------------------------------------------------------------------
# Pipeline by stage
# ---------------------------------------------------------------------------


class TestPipelineByStage:
    def test_returns_all_5_stages(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.get(f"{DASHBOARD_URL}/pipeline-by-stage", headers=_auth(tok))
        assert resp.status_code == 200
        stages = {s["stage"] for s in resp.json()}
        assert stages == {"prospect", "proposal", "negotiation", "won", "lost"}

    def test_empty_stages_show_zero(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.get(f"{DASHBOARD_URL}/pipeline-by-stage", headers=_auth(tok))
        for stage in resp.json():
            assert stage["count"] == 0
            assert stage["total_value"] == 0.0

    def test_counts_and_values_correct(self, client, db):
        tok = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        _seed_deal(db, user.id, stage="proposal", value=1500.0)
        _seed_deal(db, user.id, stage="proposal", value=2500.0)

        resp = client.get(f"{DASHBOARD_URL}/pipeline-by-stage", headers=_auth(tok))
        by_stage = {s["stage"]: s for s in resp.json()}
        assert by_stage["proposal"]["count"] == 2
        assert by_stage["proposal"]["total_value"] == 4000.0
        assert by_stage["prospect"]["count"] == 0

    def test_rep_scoped_pipeline(self, client, db):
        tok_a = _register_login(client, _REP_A)
        _register_login(client, _REP_B)
        user_a = _get_user(db, _REP_A["email"])
        user_b = _get_user(db, _REP_B["email"])
        _seed_deal(db, user_a.id, stage="won", value=1000.0)
        _seed_deal(db, user_b.id, stage="won", value=1000.0)

        resp = client.get(f"{DASHBOARD_URL}/pipeline-by-stage", headers=_auth(tok_a))
        by_stage = {s["stage"]: s for s in resp.json()}
        assert by_stage["won"]["count"] == 1


# ---------------------------------------------------------------------------
# Recent activities
# ---------------------------------------------------------------------------


class TestRecentActivities:
    def test_returns_at_most_10(self, client, db):
        tok = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        for i in range(12):
            _seed_activity(db, user.id)

        resp = client.get(f"{DASHBOARD_URL}/recent-activities", headers=_auth(tok))
        assert resp.status_code == 200
        assert len(resp.json()) == 10

    def test_returns_newest_first(self, client, db):
        from app.models.activity import Activity
        tok = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])

        older = Activity(type="call", title="Older", owner_id=user.id,
                         created_at=datetime.now(UTC) - timedelta(hours=2))
        newer = Activity(type="email", title="Newer", owner_id=user.id,
                         created_at=datetime.now(UTC))
        db.add_all([older, newer])
        db.commit()

        resp = client.get(f"{DASHBOARD_URL}/recent-activities", headers=_auth(tok))
        items = resp.json()
        assert items[0]["title"] == "Newer"
        assert items[1]["title"] == "Older"

    def test_linked_record_name_for_deal(self, client, db):
        from app.models.activity import Activity
        from app.models.deal import Deal
        tok = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])

        deal = Deal(
            title="Alpha Deal", stage="prospect", probability=10, owner_id=user.id
        )
        db.add(deal)
        db.flush()

        act = Activity(
            type="call", title="Deal Call", deal_id=deal.id, owner_id=user.id
        )
        db.add(act)
        db.commit()

        resp = client.get(f"{DASHBOARD_URL}/recent-activities", headers=_auth(tok))
        items = resp.json()
        linked = next(i for i in items if i["title"] == "Deal Call")
        assert linked["linked_record_name"] == "Alpha Deal"
        assert linked["linked_record_type"] == "deal"

    def test_linked_record_name_for_contact(self, client, db):
        from app.models.activity import Activity
        from app.models.contact import Contact
        tok = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])

        contact = Contact(first_name="Jane", last_name="Doe", owner_id=user.id)
        db.add(contact)
        db.flush()

        act = Activity(
            type="email", title="Contact Email", contact_id=contact.id, owner_id=user.id
        )
        db.add(act)
        db.commit()

        resp = client.get(f"{DASHBOARD_URL}/recent-activities", headers=_auth(tok))
        items = resp.json()
        linked = next(i for i in items if i["title"] == "Contact Email")
        assert linked["linked_record_name"] == "Jane Doe"
        assert linked["linked_record_type"] == "contact"

    def test_linked_record_name_null_when_no_parent(self, client, db):
        from app.models.activity import Activity
        tok = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])

        act = Activity(type="task", title="Standalone Task", owner_id=user.id)
        db.add(act)
        db.commit()

        resp = client.get(f"{DASHBOARD_URL}/recent-activities", headers=_auth(tok))
        items = resp.json()
        standalone = next(i for i in items if i["title"] == "Standalone Task")
        assert standalone["linked_record_name"] is None
        assert standalone["linked_record_type"] is None

    def test_rep_sees_only_own_recent_activities(self, client, db):
        tok_a = _register_login(client, _REP_A)
        _register_login(client, _REP_B)
        user_a = _get_user(db, _REP_A["email"])
        user_b = _get_user(db, _REP_B["email"])
        _seed_activity(db, user_a.id)
        _seed_activity(db, user_b.id)

        resp = client.get(f"{DASHBOARD_URL}/recent-activities", headers=_auth(tok_a))
        assert len(resp.json()) == 1

    def test_unauthenticated_returns_401(self, client, db):
        resp = client.get(f"{DASHBOARD_URL}/stats")
        assert resp.status_code == 401
