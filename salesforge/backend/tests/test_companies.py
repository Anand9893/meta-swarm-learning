"""TDD tests for WU-10: Companies Backend."""
from __future__ import annotations

COMPANIES_URL = "/api/v1/companies"
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

_REP_A = {"email": "rep_a@co.com", "password": "secret123", "full_name": "Rep A"}
_REP_B = {"email": "rep_b@co.com", "password": "secret123", "full_name": "Rep B"}
_MANAGER = {"email": "mgr@co.com", "password": "secret123", "full_name": "Manager"}


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


def _company_payload(**kwargs) -> dict:
    defaults = {
        "name": "Acme Corp",
        "industry": "Technology",
        "website": "https://acme.com",
    }
    defaults.update(kwargs)
    return defaults


def _create_company(client, headers, **kwargs):
    return client.post(COMPANIES_URL, json=_company_payload(**kwargs), headers=headers)


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


class TestCreateCompany:
    def test_rep_can_create_company(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = _create_company(client, _auth(tok))
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Acme Corp"
        assert data["industry"] == "Technology"
        assert "owner_id" in data

    def test_create_requires_name(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.post(COMPANIES_URL, json={}, headers=_auth(tok))
        assert resp.status_code == 422

    def test_create_unauthenticated_returns_401(self, client, db):
        resp = client.post(COMPANIES_URL, json=_company_payload())
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


class TestListCompanies:
    def test_rep_sees_only_own_companies(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        _create_company(client, _auth(tok_a), name="Rep A Corp")
        _create_company(client, _auth(tok_b), name="Rep B Corp")

        resp = client.get(COMPANIES_URL, headers=_auth(tok_a))
        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()["items"]]
        assert "Rep A Corp" in names
        assert "Rep B Corp" not in names

    def test_manager_sees_all_companies(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")
        _create_company(client, _auth(tok_a), name="Rep A Corp")

        resp = client.get(COMPANIES_URL, headers=_auth(tok_mgr))
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_pagination(self, client, db):
        tok = _register_login(client, _REP_A)
        for i in range(3):
            _create_company(client, _auth(tok), name=f"Corp {i}")

        resp = client.get(f"{COMPANIES_URL}?page=1&page_size=2", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3

    def test_filter_by_industry(self, client, db):
        tok = _register_login(client, _REP_A)
        _create_company(client, _auth(tok), name="Tech Corp", industry="Technology")
        _create_company(client, _auth(tok), name="Finance Corp", industry="Finance")

        resp = client.get(f"{COMPANIES_URL}?industry=Technology", headers=_auth(tok))
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert all(c["industry"] == "Technology" for c in items)
        assert len(items) == 1

    def test_search_by_name(self, client, db):
        tok = _register_login(client, _REP_A)
        _create_company(client, _auth(tok), name="Globex Corp")
        _create_company(client, _auth(tok), name="Initech")

        resp = client.get(f"{COMPANIES_URL}?search=globex", headers=_auth(tok))
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["name"] == "Globex Corp"


# ---------------------------------------------------------------------------
# Get detail
# ---------------------------------------------------------------------------


class TestGetCompany:
    def test_get_company_returns_detail(self, client, db):
        tok = _register_login(client, _REP_A)
        create_resp = _create_company(client, _auth(tok))
        cid = create_resp.json()["id"]

        resp = client.get(f"{COMPANIES_URL}/{cid}", headers=_auth(tok))
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == cid
        assert "contacts" in data
        assert "deals" in data

    def test_get_company_detail_includes_linked_contacts(self, client, db):
        from app.models.contact import Contact
        from app.models.user import User
        tok = _register_login(client, _REP_A)
        create_resp = _create_company(client, _auth(tok))
        cid = create_resp.json()["id"]

        user = db.query(User).filter(User.email == _REP_A["email"]).first()
        contact = Contact(
            first_name="Alice",
            last_name="Smith",
            company_id=cid,
            owner_id=user.id,
        )
        db.add(contact)
        db.commit()

        resp = client.get(f"{COMPANIES_URL}/{cid}", headers=_auth(tok))
        assert resp.status_code == 200
        contacts = resp.json()["contacts"]
        assert len(contacts) == 1
        assert contacts[0]["first_name"] == "Alice"

    def test_get_nonexistent_company_returns_404(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.get(f"{COMPANIES_URL}/nonexistent-id", headers=_auth(tok))
        assert resp.status_code == 404

    def test_rep_cannot_get_other_reps_company(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        cid = _create_company(client, _auth(tok_a)).json()["id"]

        resp = client.get(f"{COMPANIES_URL}/{cid}", headers=_auth(tok_b))
        assert resp.status_code == 403

    def test_manager_can_get_any_company(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")
        cid = _create_company(client, _auth(tok_a)).json()["id"]

        resp = client.get(f"{COMPANIES_URL}/{cid}", headers=_auth(tok_mgr))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


class TestUpdateCompany:
    def test_owner_can_update_company(self, client, db):
        tok = _register_login(client, _REP_A)
        cid = _create_company(client, _auth(tok)).json()["id"]

        resp = client.patch(
            f"{COMPANIES_URL}/{cid}",
            json={"name": "Updated Corp"},
            headers=_auth(tok),
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Corp"

    def test_rep_cannot_update_other_reps_company(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        cid = _create_company(client, _auth(tok_a)).json()["id"]

        resp = client.patch(
            f"{COMPANIES_URL}/{cid}",
            json={"name": "Hijacked"},
            headers=_auth(tok_b),
        )
        assert resp.status_code == 403

    def test_manager_can_update_any_company(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")
        cid = _create_company(client, _auth(tok_a)).json()["id"]

        resp = client.patch(
            f"{COMPANIES_URL}/{cid}",
            json={"industry": "Retail"},
            headers=_auth(tok_mgr),
        )
        assert resp.status_code == 200
        assert resp.json()["industry"] == "Retail"

    def test_update_nonexistent_company_returns_404(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.patch(
            f"{COMPANIES_URL}/nonexistent",
            json={"name": "X"},
            headers=_auth(tok),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


class TestDeleteCompany:
    def test_owner_can_delete_company(self, client, db):
        tok = _register_login(client, _REP_A)
        cid = _create_company(client, _auth(tok)).json()["id"]

        resp = client.delete(f"{COMPANIES_URL}/{cid}", headers=_auth(tok))
        assert resp.status_code == 204

    def test_delete_is_permanent(self, client, db):
        tok = _register_login(client, _REP_A)
        cid = _create_company(client, _auth(tok)).json()["id"]
        client.delete(f"{COMPANIES_URL}/{cid}", headers=_auth(tok))

        resp = client.get(f"{COMPANIES_URL}/{cid}", headers=_auth(tok))
        assert resp.status_code == 404

    def test_rep_cannot_delete_other_reps_company(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        cid = _create_company(client, _auth(tok_a)).json()["id"]

        resp = client.delete(f"{COMPANIES_URL}/{cid}", headers=_auth(tok_b))
        assert resp.status_code == 403

    def test_delete_nullifies_contact_company_id(self, client, db):
        from app.models.contact import Contact
        from app.models.user import User
        tok = _register_login(client, _REP_A)
        cid = _create_company(client, _auth(tok)).json()["id"]

        user = db.query(User).filter(User.email == _REP_A["email"]).first()
        contact = Contact(
            first_name="Bob", last_name="Jones", company_id=cid, owner_id=user.id
        )
        db.add(contact)
        db.commit()
        contact_id = contact.id

        client.delete(f"{COMPANIES_URL}/{cid}", headers=_auth(tok))

        db.expire_all()
        contact = db.get(Contact, contact_id)
        assert contact is not None
        assert contact.company_id is None

    def test_delete_nullifies_deal_company_id(self, client, db):
        from app.models.deal import Deal
        from app.models.user import User
        tok = _register_login(client, _REP_A)
        cid = _create_company(client, _auth(tok)).json()["id"]

        user = db.query(User).filter(User.email == _REP_A["email"]).first()
        deal = Deal(
            title="Test Deal", stage="prospect", probability=10,
            company_id=cid, owner_id=user.id,
        )
        db.add(deal)
        db.commit()
        deal_id = deal.id

        client.delete(f"{COMPANIES_URL}/{cid}", headers=_auth(tok))

        db.expire_all()
        deal = db.get(Deal, deal_id)
        assert deal is not None
        assert deal.company_id is None

    def test_delete_nonexistent_company_returns_404(self, client, db):
        tok = _register_login(client, _REP_A)
        resp = client.delete(f"{COMPANIES_URL}/nonexistent", headers=_auth(tok))
        assert resp.status_code == 404
