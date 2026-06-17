"""TDD tests for WU-12: Deals Backend."""
from __future__ import annotations

DEALS_URL = "/api/v1/deals"
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

_REP_A = {"email": "rep_a@deals.com", "password": "secret123", "full_name": "Rep A"}
_REP_B = {"email": "rep_b@deals.com", "password": "secret123", "full_name": "Rep B"}
_MANAGER = {"email": "mgr@deals.com", "password": "secret123", "full_name": "Manager"}


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


def _deal_payload(**kwargs) -> dict:
    defaults = {"title": "Big Deal", "value": 50000.0}
    defaults.update(kwargs)
    return defaults


def _create_deal(client, headers, **kwargs):
    return client.post(DEALS_URL, json=_deal_payload(**kwargs), headers=headers)


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


class TestCreateDeal:
    def test_create_defaults_stage_prospect(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = _create_deal(client, _auth(tok))
        assert resp.status_code == 201
        data = resp.json()
        assert data["stage"] == "prospect"
        assert data["probability"] == 10
        assert data["currency"] == "USD"

    def test_create_sets_owner(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = _create_deal(client, _auth(tok))
        assert "owner_id" in resp.json()

    def test_create_unauthenticated_returns_401(self, client, db):
        resp = client.post(DEALS_URL, json=_deal_payload())
        assert resp.status_code == 401

    def test_create_with_explicit_stage_and_probability(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = _create_deal(client, _auth(tok), stage="proposal", probability=45)
        assert resp.status_code == 201
        data = resp.json()
        assert data["stage"] == "proposal"
        assert data["probability"] == 45

    def test_create_stage_auto_sets_probability(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = _create_deal(client, _auth(tok), stage="negotiation")
        assert resp.status_code == 201
        assert resp.json()["probability"] == 60


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


class TestListDeals:
    def test_rep_sees_only_own_deals(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        _create_deal(client, _auth(tok_a), title="Rep A Deal")
        _create_deal(client, _auth(tok_b), title="Rep B Deal")

        resp = client.get(DEALS_URL, headers=_auth(tok_a))
        titles = [d["title"] for d in resp.json()["items"]]
        assert "Rep A Deal" in titles
        assert "Rep B Deal" not in titles

    def test_manager_sees_all_deals(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")
        _create_deal(client, _auth(tok_a), title="Rep A Deal")

        resp = client.get(DEALS_URL, headers=_auth(tok_mgr))
        assert resp.json()["total"] >= 1

    def test_filter_by_stage(self, client, db):
        tok = _register_login(client, _REP_A)
        _create_deal(client, _auth(tok), title="Prospect Deal", stage="prospect")
        _create_deal(client, _auth(tok), title="Won Deal", stage="won")

        resp = client.get(f"{DEALS_URL}?stage=prospect", headers=_auth(tok))
        items = resp.json()["items"]
        assert all(d["stage"] == "prospect" for d in items)

    def test_search_by_title(self, client, db):
        tok = _register_login(client, _REP_A)
        _create_deal(client, _auth(tok), title="Enterprise Deal")
        _create_deal(client, _auth(tok), title="SMB Deal")

        resp = client.get(f"{DEALS_URL}?search=enterprise", headers=_auth(tok))
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["title"] == "Enterprise Deal"

    def test_manager_filter_by_owner_id(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")

        from app.models.user import User
        rep_a = db.query(User).filter(User.email == _REP_A["email"]).first()
        _create_deal(client, _auth(tok_a), title="A Deal")
        _create_deal(client, _auth(tok_b), title="B Deal")

        resp = client.get(f"{DEALS_URL}?owner_id={rep_a.id}", headers=_auth(tok_mgr))
        items = resp.json()["items"]
        assert all(d["owner_id"] == rep_a.id for d in items)


# ---------------------------------------------------------------------------
# Pipeline summary
# ---------------------------------------------------------------------------


class TestPipelineSummary:
    def test_pipeline_summary_returns_all_5_stages(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.get(f"{DEALS_URL}/pipeline-summary", headers=_auth(tok))
        assert resp.status_code == 200
        stages = {s["stage"] for s in resp.json()}
        assert stages == {"prospect", "proposal", "negotiation", "won", "lost"}

    def test_pipeline_summary_empty_stages_are_zero(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.get(f"{DEALS_URL}/pipeline-summary", headers=_auth(tok))
        for stage in resp.json():
            assert stage["count"] == 0
            assert stage["total_value"] == 0.0

    def test_pipeline_summary_counts_correctly(self, client, db):
        tok = _register_login(client, _REP_A)
        _create_deal(client, _auth(tok), title="D1", stage="proposal", value=1000.0)
        _create_deal(client, _auth(tok), title="D2", stage="proposal", value=2000.0)
        _create_deal(client, _auth(tok), title="D3", stage="won", value=500.0)

        resp = client.get(f"{DEALS_URL}/pipeline-summary", headers=_auth(tok))
        by_stage = {s["stage"]: s for s in resp.json()}
        assert by_stage["proposal"]["count"] == 2
        assert by_stage["proposal"]["total_value"] == 3000.0
        assert by_stage["won"]["count"] == 1
        assert by_stage["prospect"]["count"] == 0

    def test_pipeline_summary_rep_scoped(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        _create_deal(client, _auth(tok_a), title="A Deal", stage="won", value=999.0)
        _create_deal(client, _auth(tok_b), title="B Deal", stage="won", value=999.0)

        resp = client.get(f"{DEALS_URL}/pipeline-summary", headers=_auth(tok_a))
        by_stage = {s["stage"]: s for s in resp.json()}
        assert by_stage["won"]["count"] == 1


# ---------------------------------------------------------------------------
# Get deal
# ---------------------------------------------------------------------------


class TestGetDeal:
    def test_owner_can_get_deal(self, client, db):
        tok = _register_login(client, _REP_A)
        did = _create_deal(client, _auth(tok)).json()["id"]
        resp = client.get(f"{DEALS_URL}/{did}", headers=_auth(tok))
        assert resp.status_code == 200
        assert resp.json()["id"] == did

    def test_rep_cannot_get_other_reps_deal(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        did = _create_deal(client, _auth(tok_a)).json()["id"]
        resp = client.get(f"{DEALS_URL}/{did}", headers=_auth(tok_b))
        assert resp.status_code == 403

    def test_get_nonexistent_deal_returns_404(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.get(f"{DEALS_URL}/nonexistent", headers=_auth(tok))
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update / probability auto-reset
# ---------------------------------------------------------------------------


class TestUpdateDeal:
    def test_stage_change_without_probability_auto_resets(self, client, db):
        tok = _register_login(client, _REP_A)
        did = _create_deal(client, _auth(tok), stage="prospect").json()["id"]

        resp = client.patch(
            f"{DEALS_URL}/{did}", json={"stage": "proposal"}, headers=_auth(tok)
        )
        assert resp.status_code == 200
        assert resp.json()["stage"] == "proposal"
        assert resp.json()["probability"] == 30

    def test_stage_change_with_probability_uses_explicit_value(self, client, db):
        tok = _register_login(client, _REP_A)
        did = _create_deal(client, _auth(tok), stage="prospect").json()["id"]

        resp = client.patch(
            f"{DEALS_URL}/{did}",
            json={"stage": "proposal", "probability": 55},
            headers=_auth(tok),
        )
        assert resp.status_code == 200
        assert resp.json()["probability"] == 55

    def test_rep_cannot_update_other_reps_deal(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        did = _create_deal(client, _auth(tok_a)).json()["id"]

        resp = client.patch(
            f"{DEALS_URL}/{did}", json={"title": "Hijacked"}, headers=_auth(tok_b)
        )
        assert resp.status_code == 403

    def test_manager_can_update_any_deal(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")
        did = _create_deal(client, _auth(tok_a)).json()["id"]

        resp = client.patch(
            f"{DEALS_URL}/{did}", json={"title": "Mgr Updated"}, headers=_auth(tok_mgr)
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Mgr Updated"

    def test_update_nonexistent_deal_returns_404(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.patch(
            f"{DEALS_URL}/nonexistent", json={"title": "X"}, headers=_auth(tok)
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


class TestDeleteDeal:
    def test_owner_can_delete_deal(self, client, db):
        tok = _register_login(client, _REP_A)
        did = _create_deal(client, _auth(tok)).json()["id"]
        resp = client.delete(f"{DEALS_URL}/{did}", headers=_auth(tok))
        assert resp.status_code == 204

    def test_delete_is_permanent(self, client, db):
        tok = _register_login(client, _REP_A)
        did = _create_deal(client, _auth(tok)).json()["id"]
        client.delete(f"{DEALS_URL}/{did}", headers=_auth(tok))
        resp = client.get(f"{DEALS_URL}/{did}", headers=_auth(tok))
        assert resp.status_code == 404

    def test_rep_cannot_delete_other_reps_deal(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        did = _create_deal(client, _auth(tok_a)).json()["id"]
        resp = client.delete(f"{DEALS_URL}/{did}", headers=_auth(tok_b))
        assert resp.status_code == 403

    def test_delete_nullifies_activity_deal_id(self, client, db):
        from app.models.activity import Activity
        from app.models.user import User
        tok = _register_login(client, _REP_A)
        did = _create_deal(client, _auth(tok)).json()["id"]

        user = db.query(User).filter(User.email == _REP_A["email"]).first()
        act = Activity(type="call", title="Follow up", deal_id=did, owner_id=user.id)
        db.add(act)
        db.commit()
        act_id = act.id

        client.delete(f"{DEALS_URL}/{did}", headers=_auth(tok))

        db.expire_all()
        act = db.get(Activity, act_id)
        assert act is not None
        assert act.deal_id is None

    def test_delete_nonexistent_deal_returns_404(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.delete(f"{DEALS_URL}/nonexistent", headers=_auth(tok))
        assert resp.status_code == 404
