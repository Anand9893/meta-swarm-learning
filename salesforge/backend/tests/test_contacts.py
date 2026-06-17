"""TDD tests for WU-08: Contacts Backend."""
from __future__ import annotations

CONTACTS_URL = "/api/v1/contacts"
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

_REP_A = {"email": "rep_a@example.com", "password": "secret123", "full_name": "Rep A"}
_REP_B = {"email": "rep_b@example.com", "password": "secret123", "full_name": "Rep B"}
_MANAGER = {"email": "mgr@example.com", "password": "secret123", "full_name": "Manager"}
_ADMIN = {"email": "admin@example.com", "password": "secret123", "full_name": "Admin"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


def _contact_payload(**kwargs) -> dict:
    defaults = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane@acme.com",
        "phone": "555-9999",
        "title": "VP Sales",
    }
    defaults.update(kwargs)
    return defaults


def _get_user(db, email: str):
    from app.models.user import User

    return db.query(User).filter(User.email == email).first()


def _create_company(db, owner_id: str, name: str = "Test Corp"):
    from app.models.company import Company

    company = Company(name=name, owner_id=owner_id)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


# ---------------------------------------------------------------------------
# FR-001 / FR-002: Create contact
# ---------------------------------------------------------------------------

class TestCreateContact:
    def test_create_contact_returns_201(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.post(CONTACTS_URL, json=_contact_payload(), headers=_auth(token))
        assert resp.status_code == 201

    def test_create_contact_sets_owner(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.post(CONTACTS_URL, json=_contact_payload(), headers=_auth(token))
        assert resp.status_code == 201
        user = _get_user(db, _REP_A["email"])
        assert resp.json()["owner_id"] == user.id

    def test_create_contact_returns_all_fields(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.post(CONTACTS_URL, json=_contact_payload(), headers=_auth(token))
        data = resp.json()
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Doe"
        assert data["email"] == "jane@acme.com"
        assert data["phone"] == "555-9999"
        assert data["title"] == "VP Sales"
        assert data["company_id"] is None

    def test_create_contact_with_company_link(self, client, db):
        token = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        company = _create_company(db, user.id)

        resp = client.post(
            CONTACTS_URL,
            json=_contact_payload(company_id=company.id),
            headers=_auth(token),
        )
        assert resp.status_code == 201
        assert resp.json()["company_id"] == company.id

    def test_create_contact_without_email_is_valid(self, client, db):
        token = _register_login(client, _REP_A)
        payload = {"first_name": "No", "last_name": "Email"}
        resp = client.post(CONTACTS_URL, json=payload, headers=_auth(token))
        assert resp.status_code == 201
        assert resp.json()["email"] is None

    def test_create_contact_unauthenticated_returns_401(self, client, db):
        resp = client.post(CONTACTS_URL, json=_contact_payload())
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# FR-003: List contacts with RBAC
# ---------------------------------------------------------------------------

class TestListContacts:
    def test_rep_sees_only_own_contacts(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)

        client.post(
            CONTACTS_URL,
            json=_contact_payload(first_name="Alpha"),
            headers=_auth(tok_a),
        )
        client.post(
            CONTACTS_URL,
            json=_contact_payload(first_name="Beta"),
            headers=_auth(tok_b),
        )

        resp = client.get(CONTACTS_URL, headers=_auth(tok_a))
        assert resp.status_code == 200
        names = [c["first_name"] for c in resp.json()["items"]]
        assert "Alpha" in names
        assert "Beta" not in names

    def test_manager_sees_all_contacts(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")

        client.post(
            CONTACTS_URL,
            json=_contact_payload(first_name="Alpha"),
            headers=_auth(tok_a),
        )

        resp = client.get(CONTACTS_URL, headers=_auth(tok_mgr))
        names = [c["first_name"] for c in resp.json()["items"]]
        assert "Alpha" in names

    def test_admin_sees_all_contacts(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_admin = _register_login(client, _ADMIN)
        _set_role(db, _ADMIN["email"], "admin")

        client.post(
            CONTACTS_URL,
            json=_contact_payload(first_name="Alpha"),
            headers=_auth(tok_a),
        )

        resp = client.get(CONTACTS_URL, headers=_auth(tok_admin))
        names = [c["first_name"] for c in resp.json()["items"]]
        assert "Alpha" in names

    def test_list_contacts_paginates(self, client, db):
        token = _register_login(client, _REP_A)
        for i in range(5):
            client.post(
                CONTACTS_URL,
                json=_contact_payload(first_name=f"Contact{i}"),
                headers=_auth(token),
            )
        resp = client.get(CONTACTS_URL + "?page=1&page_size=3", headers=_auth(token))
        data = resp.json()
        assert data["total"] == 5
        assert len(data["items"]) == 3

    def test_list_contacts_unauthenticated_returns_401(self, client, db):
        resp = client.get(CONTACTS_URL)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# FR-004: Filter and search
# ---------------------------------------------------------------------------

class TestFilterContacts:
    def test_filter_by_company_id(self, client, db):
        token = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        company = _create_company(db, user.id, "Target Corp")

        client.post(
            CONTACTS_URL,
            json=_contact_payload(first_name="Linked", company_id=company.id),
            headers=_auth(token),
        )
        client.post(
            CONTACTS_URL,
            json=_contact_payload(first_name="Unlinked"),
            headers=_auth(token),
        )

        resp = client.get(
            CONTACTS_URL + f"?company_id={company.id}", headers=_auth(token)
        )
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["first_name"] == "Linked"

    def test_search_by_last_name(self, client, db):
        token = _register_login(client, _REP_A)
        client.post(
            CONTACTS_URL,
            json=_contact_payload(first_name="Alice", last_name="Smith"),
            headers=_auth(token),
        )
        client.post(
            CONTACTS_URL,
            json=_contact_payload(first_name="Bob", last_name="Jones"),
            headers=_auth(token),
        )

        resp = client.get(CONTACTS_URL + "?search=smith", headers=_auth(token))
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["first_name"] == "Alice"

    def test_search_by_email(self, client, db):
        token = _register_login(client, _REP_A)
        client.post(
            CONTACTS_URL,
            json=_contact_payload(email="target@special.com"),
            headers=_auth(token),
        )
        client.post(
            CONTACTS_URL,
            json=_contact_payload(email="other@example.com"),
            headers=_auth(token),
        )

        resp = client.get(CONTACTS_URL + "?search=special", headers=_auth(token))
        assert len(resp.json()["items"]) == 1

    def test_search_by_first_name(self, client, db):
        token = _register_login(client, _REP_A)
        client.post(
            CONTACTS_URL,
            json=_contact_payload(first_name="Unique"),
            headers=_auth(token),
        )
        client.post(
            CONTACTS_URL,
            json=_contact_payload(first_name="Common"),
            headers=_auth(token),
        )

        resp = client.get(CONTACTS_URL + "?search=Unique", headers=_auth(token))
        assert len(resp.json()["items"]) == 1


# ---------------------------------------------------------------------------
# FR-006: Contact detail with deals + activities
# ---------------------------------------------------------------------------

class TestGetContact:
    def test_get_contact_returns_detail(self, client, db):
        token = _register_login(client, _REP_A)
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(token)
        ).json()["id"]

        resp = client.get(f"{CONTACTS_URL}/{contact_id}", headers=_auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == contact_id
        assert "deals" in data
        assert "activities" in data

    def test_get_contact_detail_includes_linked_deals(self, client, db):
        from app.models.deal import Deal

        token = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(token)
        ).json()["id"]

        deal = Deal(
            title="Test Deal",
            stage="prospect",
            probability=10,
            currency="USD",
            owner_id=user.id,
            contact_id=contact_id,
        )
        db.add(deal)
        db.commit()

        resp = client.get(f"{CONTACTS_URL}/{contact_id}", headers=_auth(token))
        data = resp.json()
        assert len(data["deals"]) == 1
        assert data["deals"][0]["title"] == "Test Deal"
        assert data["deals"][0]["stage"] == "prospect"

    def test_get_contact_detail_activities_sorted_desc(self, client, db):
        from datetime import UTC, datetime, timedelta

        from app.models.activity import Activity

        token = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(token)
        ).json()["id"]

        now = datetime.now(UTC)
        act_older = Activity(
            type="email",
            title="Older",
            owner_id=user.id,
            contact_id=contact_id,
            created_at=now - timedelta(hours=2),
        )
        act_newer = Activity(
            type="call",
            title="Newer",
            owner_id=user.id,
            contact_id=contact_id,
            created_at=now - timedelta(hours=1),
        )
        db.add_all([act_older, act_newer])
        db.commit()

        resp = client.get(f"{CONTACTS_URL}/{contact_id}", headers=_auth(token))
        titles = [a["title"] for a in resp.json()["activities"]]
        assert titles == ["Newer", "Older"]

    def test_get_nonexistent_contact_returns_404(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.get(f"{CONTACTS_URL}/nonexistent-id", headers=_auth(token))
        assert resp.status_code == 404

    def test_rep_cannot_get_other_reps_contact(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(tok_a)
        ).json()["id"]

        resp = client.get(f"{CONTACTS_URL}/{contact_id}", headers=_auth(tok_b))
        assert resp.status_code == 403

    def test_manager_can_get_any_contact(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")

        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(tok_a)
        ).json()["id"]

        resp = client.get(f"{CONTACTS_URL}/{contact_id}", headers=_auth(tok_mgr))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# FR-005 / FR-007 / FR-008: Update contact and company link
# ---------------------------------------------------------------------------

class TestUpdateContact:
    def test_owner_can_update_contact(self, client, db):
        token = _register_login(client, _REP_A)
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(token)
        ).json()["id"]

        resp = client.patch(
            f"{CONTACTS_URL}/{contact_id}",
            json={"title": "CEO", "phone": "555-0001"},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "CEO"
        assert resp.json()["phone"] == "555-0001"

    def test_rep_cannot_update_other_reps_contact(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(tok_a)
        ).json()["id"]

        resp = client.patch(
            f"{CONTACTS_URL}/{contact_id}",
            json={"title": "Hacked"},
            headers=_auth(tok_b),
        )
        assert resp.status_code == 403

    def test_manager_can_update_any_contact(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")

        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(tok_a)
        ).json()["id"]

        resp = client.patch(
            f"{CONTACTS_URL}/{contact_id}",
            json={"title": "Updated by Mgr"},
            headers=_auth(tok_mgr),
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated by Mgr"

    def test_update_company_link_fr007_fr008(self, client, db):
        """FR-007/FR-008: Company link change is reflected in contact and company."""
        token = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        company_a = _create_company(db, user.id, "Corp A")
        company_b = _create_company(db, user.id, "Corp B")

        contact_id = client.post(
            CONTACTS_URL,
            json=_contact_payload(company_id=company_a.id),
            headers=_auth(token),
        ).json()["id"]
        assert client.get(f"{CONTACTS_URL}/{contact_id}", headers=_auth(token)).json()[
            "company_id"
        ] == company_a.id

        resp = client.patch(
            f"{CONTACTS_URL}/{contact_id}",
            json={"company_id": company_b.id},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["company_id"] == company_b.id

    def test_update_nonexistent_contact_returns_404(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.patch(
            f"{CONTACTS_URL}/nonexistent-id",
            json={"title": "X"},
            headers=_auth(token),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# FR-009: Delete contact; cascade FK to null
# ---------------------------------------------------------------------------

class TestDeleteContact:
    def test_owner_can_delete_contact(self, client, db):
        token = _register_login(client, _REP_A)
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(token)
        ).json()["id"]

        resp = client.delete(f"{CONTACTS_URL}/{contact_id}", headers=_auth(token))
        assert resp.status_code == 204

    def test_delete_is_permanent(self, client, db):
        token = _register_login(client, _REP_A)
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(token)
        ).json()["id"]

        client.delete(f"{CONTACTS_URL}/{contact_id}", headers=_auth(token))
        resp = client.get(f"{CONTACTS_URL}/{contact_id}", headers=_auth(token))
        assert resp.status_code == 404

    def test_rep_cannot_delete_other_reps_contact(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_b = _register_login(client, _REP_B)
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(tok_a)
        ).json()["id"]

        resp = client.delete(f"{CONTACTS_URL}/{contact_id}", headers=_auth(tok_b))
        assert resp.status_code == 403

    def test_manager_can_delete_any_contact(self, client, db):
        tok_a = _register_login(client, _REP_A)
        tok_mgr = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")

        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(tok_a)
        ).json()["id"]

        resp = client.delete(f"{CONTACTS_URL}/{contact_id}", headers=_auth(tok_mgr))
        assert resp.status_code == 204

    def test_delete_nullifies_activity_contact_id(self, client, db):
        """FR-009: deleting contact sets Activity.contact_id to null."""
        from app.models.activity import Activity

        token = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(token)
        ).json()["id"]

        activity = Activity(
            type="call",
            title="Follow-up Call",
            owner_id=user.id,
            contact_id=contact_id,
        )
        db.add(activity)
        db.commit()
        activity_id = activity.id

        client.delete(f"{CONTACTS_URL}/{contact_id}", headers=_auth(token))

        db.expire_all()
        reloaded = db.get(Activity, activity_id)
        assert reloaded is not None
        assert reloaded.contact_id is None

    def test_delete_nullifies_deal_contact_id(self, client, db):
        """FR-009: deleting contact sets Deal.contact_id to null."""
        from app.models.deal import Deal

        token = _register_login(client, _REP_A)
        user = _get_user(db, _REP_A["email"])
        contact_id = client.post(
            CONTACTS_URL, json=_contact_payload(), headers=_auth(token)
        ).json()["id"]

        deal = Deal(
            title="Linked Deal",
            stage="prospect",
            probability=10,
            currency="USD",
            owner_id=user.id,
            contact_id=contact_id,
        )
        db.add(deal)
        db.commit()
        deal_id = deal.id

        client.delete(f"{CONTACTS_URL}/{contact_id}", headers=_auth(token))

        db.expire_all()
        reloaded = db.get(Deal, deal_id)
        assert reloaded is not None
        assert reloaded.contact_id is None

    def test_delete_nonexistent_contact_returns_404(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.delete(f"{CONTACTS_URL}/nonexistent-id", headers=_auth(token))
        assert resp.status_code == 404
