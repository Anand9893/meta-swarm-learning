"""TDD tests for WU-14: Activities Backend."""
from __future__ import annotations

ACTIVITIES_URL = "/api/v1/activities"
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

_REP_A = {"email": "rep_a@act.com", "password": "secret123", "full_name": "Rep A"}
_REP_B = {"email": "rep_b@act.com", "password": "secret123", "full_name": "Rep B"}
_MANAGER = {"email": "mgr@act.com", "password": "secret123", "full_name": "Manager"}


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


def _activity_payload(**kwargs) -> dict:
    defaults = {"type": "call", "title": "Follow up call"}
    defaults.update(kwargs)
    return defaults


def _create_activity(client, headers, **kwargs):
    return client.post(
        ACTIVITIES_URL, json=_activity_payload(**kwargs), headers=headers
    )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


class TestCreateActivity:
    def test_rep_can_create_activity(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = _create_activity(client, _auth(tok))
        assert resp.status_code == 201
        data = resp.json()
        assert data["type"] == "call"
        assert data["completed"] is False
        assert "owner_id" in data

    def test_create_requires_type_and_title(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.post(ACTIVITIES_URL, json={}, headers=_auth(tok))
        assert resp.status_code == 422

    def test_create_unauthenticated_returns_401(self, client, db):
        resp = client.post(ACTIVITIES_URL, json=_activity_payload())
        assert resp.status_code == 401

    def test_create_with_parent_ids(self, client, db):
        tok = _register_login(client, _REP_A)
        # Seed a real deal so FK constraint passes
        deal = client.post(
            "/api/v1/deals", json={"title": "Parent Deal"}, headers=_auth(tok)
        ).json()
        resp = _create_activity(client, _auth(tok), deal_id=deal["id"])
        assert resp.status_code == 201
        assert resp.json()["deal_id"] == deal["id"]


# ---------------------------------------------------------------------------
# List and filter
# ---------------------------------------------------------------------------


class TestListActivities:
    def test_rep_sees_only_own_activities(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        _create_activity(client, _auth(tok_a), title="A Call")
        _create_activity(client, _auth(tok_b), title="B Call")

        resp = client.get(ACTIVITIES_URL, headers=_auth(tok_a))
        titles = [a["title"] for a in resp.json()["items"]]
        assert "A Call" in titles
        assert "B Call" not in titles

    def test_manager_sees_all_activities(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")
        _create_activity(client, _auth(tok_a), title="A Call")

        resp = client.get(ACTIVITIES_URL, headers=_auth(tok_mgr))
        assert resp.json()["total"] >= 1

    def test_filter_by_type(self, client, db):
        tok = _register_login(client, _REP_A)
        _create_activity(client, _auth(tok), type="call", title="Call")
        _create_activity(client, _auth(tok), type="email", title="Email")

        resp = client.get(f"{ACTIVITIES_URL}?type=call", headers=_auth(tok))
        items = resp.json()["items"]
        assert all(a["type"] == "call" for a in items)
        assert len(items) == 1

    def test_filter_by_completed(self, client, db):
        from app.models.activity import Activity
        from app.models.user import User
        tok = _register_login(client, _REP_A)
        _create_activity(client, _auth(tok), title="Open task")
        user = db.query(User).filter(User.email == _REP_A["email"]).first()
        done = Activity(
            type="task", title="Done task", completed=True, owner_id=user.id
        )
        db.add(done)
        db.commit()

        resp = client.get(f"{ACTIVITIES_URL}?completed=false", headers=_auth(tok))
        items = resp.json()["items"]
        assert all(not a["completed"] for a in items)

    def test_filter_by_deal_id(self, client, db):
        tok = _register_login(client, _REP_A)
        deal = client.post(
            "/api/v1/deals", json={"title": "Filter Deal"}, headers=_auth(tok)
        ).json()
        _create_activity(client, _auth(tok), title="Deal Act", deal_id=deal["id"])
        _create_activity(client, _auth(tok), title="No Deal Act")

        resp = client.get(f"{ACTIVITIES_URL}?deal_id={deal['id']}", headers=_auth(tok))
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["title"] == "Deal Act"

    def test_filter_by_contact_id(self, client, db):
        tok = _register_login(client, _REP_A)
        contact = client.post(
            "/api/v1/contacts",
            json={"first_name": "Filter", "last_name": "Contact"},
            headers=_auth(tok),
        ).json()
        _create_activity(
            client, _auth(tok), title="Contact Act", contact_id=contact["id"]
        )
        _create_activity(client, _auth(tok), title="No Contact Act")

        resp = client.get(
            f"{ACTIVITIES_URL}?contact_id={contact['id']}", headers=_auth(tok)
        )
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["title"] == "Contact Act"

    def test_filter_by_lead_id(self, client, db):
        tok = _register_login(client, _REP_A)
        lead = client.post(
            "/api/v1/leads",
            json={"first_name": "Filter", "last_name": "Lead"},
            headers=_auth(tok),
        ).json()
        _create_activity(client, _auth(tok), title="Lead Act", lead_id=lead["id"])
        _create_activity(client, _auth(tok), title="No Lead Act")

        resp = client.get(f"{ACTIVITIES_URL}?lead_id={lead['id']}", headers=_auth(tok))
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["title"] == "Lead Act"


# ---------------------------------------------------------------------------
# Get single
# ---------------------------------------------------------------------------


class TestGetActivity:
    def test_owner_can_get_activity(self, client, db):
        tok = _register_login(client, _REP_A)
        aid = _create_activity(client, _auth(tok)).json()["id"]
        resp = client.get(f"{ACTIVITIES_URL}/{aid}", headers=_auth(tok))
        assert resp.status_code == 200

    def test_rep_cannot_get_other_reps_activity(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        aid = _create_activity(client, _auth(tok_a)).json()["id"]
        resp = client.get(f"{ACTIVITIES_URL}/{aid}", headers=_auth(tok_b))
        assert resp.status_code == 403

    def test_get_nonexistent_activity_returns_404(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.get(f"{ACTIVITIES_URL}/nonexistent", headers=_auth(tok))
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Update — completed toggle (any user) vs other fields (owner only)
# ---------------------------------------------------------------------------


class TestUpdateActivity:
    def test_non_owner_can_toggle_completed(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        aid = _create_activity(client, _auth(tok_a)).json()["id"]

        resp = client.patch(
            f"{ACTIVITIES_URL}/{aid}",
            json={"completed": True},
            headers=_auth(tok_b),
        )
        assert resp.status_code == 200
        assert resp.json()["completed"] is True

    def test_toggle_completed_false_then_true(self, client, db):
        tok = _register_login(client, _REP_A)
        aid = _create_activity(client, _auth(tok)).json()["id"]

        client.patch(
            f"{ACTIVITIES_URL}/{aid}", json={"completed": True}, headers=_auth(tok)
        )
        resp = client.patch(
            f"{ACTIVITIES_URL}/{aid}", json={"completed": False}, headers=_auth(tok)
        )
        assert resp.json()["completed"] is False

    def test_rep_cannot_update_other_reps_activity_non_completed_field(
        self, client, db
    ):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        aid = _create_activity(client, _auth(tok_a)).json()["id"]

        resp = client.patch(
            f"{ACTIVITIES_URL}/{aid}",
            json={"title": "Hijacked"},
            headers=_auth(tok_b),
        )
        assert resp.status_code == 403

    def test_owner_can_update_activity_fields(self, client, db):
        tok = _register_login(client, _REP_A)
        aid = _create_activity(client, _auth(tok)).json()["id"]

        resp = client.patch(
            f"{ACTIVITIES_URL}/{aid}",
            json={"title": "Updated title"},
            headers=_auth(tok),
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated title"

    def test_manager_can_update_any_activity(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")
        aid = _create_activity(client, _auth(tok_a)).json()["id"]

        resp = client.patch(
            f"{ACTIVITIES_URL}/{aid}",
            json={"title": "Mgr Updated"},
            headers=_auth(tok_mgr),
        )
        assert resp.status_code == 200

    def test_update_nonexistent_activity_returns_404(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.patch(
            f"{ACTIVITIES_URL}/nonexistent",
            json={"title": "X"},
            headers=_auth(tok),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


class TestDeleteActivity:
    def test_owner_can_delete_activity(self, client, db):
        tok = _register_login(client, _REP_A)
        aid = _create_activity(client, _auth(tok)).json()["id"]
        resp = client.delete(f"{ACTIVITIES_URL}/{aid}", headers=_auth(tok))
        assert resp.status_code == 204

    def test_rep_cannot_delete_other_reps_activity(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        aid = _create_activity(client, _auth(tok_a)).json()["id"]
        resp = client.delete(f"{ACTIVITIES_URL}/{aid}", headers=_auth(tok_b))
        assert resp.status_code == 403

    def test_delete_nonexistent_returns_404(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.delete(f"{ACTIVITIES_URL}/nonexistent", headers=_auth(tok))
        assert resp.status_code == 404
