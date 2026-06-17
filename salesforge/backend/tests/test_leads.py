"""TDD tests for WU-06: Leads Backend."""
from __future__ import annotations

import pytest

LEADS_URL = "/api/v1/leads"
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

_REP_A = {"email": "rep_a@example.com", "password": "secret123", "full_name": "Rep A"}
_REP_B = {"email": "rep_b@example.com", "password": "secret123", "full_name": "Rep B"}
_MANAGER = {"email": "mgr@example.com", "password": "secret123", "full_name": "Mgr"}
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


def _lead_payload(**kwargs) -> dict:
    defaults = {
        "first_name": "Alice",
        "last_name": "Smith",
        "email": "alice@acme.com",
        "company_name": "Acme Corp",
        "status": "new",
    }
    defaults.update(kwargs)
    return defaults


# ---------------------------------------------------------------------------
# FR-001 / FR-002: Create lead
# ---------------------------------------------------------------------------

class TestCreateLead:
    def test_create_lead_returns_201(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.post(
            LEADS_URL,
            json=_lead_payload(),
            headers=_auth(token),
        )
        assert resp.status_code == 201

    def test_create_lead_sets_owner_to_current_user(self, client, db):
        from app.models.user import User

        token = _register_login(client, _REP_A)
        resp = client.post(
            LEADS_URL,
            json=_lead_payload(),
            headers=_auth(token),
        )
        assert resp.status_code == 201
        data = resp.json()
        rep = db.query(User).filter(User.email == _REP_A["email"]).first()
        assert data["owner_id"] == rep.id

    def test_create_lead_default_status_is_new(self, client, db):
        token = _register_login(client, _REP_A)
        payload = _lead_payload()
        payload.pop("status", None)
        resp = client.post(LEADS_URL, json=payload, headers=_auth(token))
        assert resp.status_code == 201
        assert resp.json()["status"] == "new"

    def test_create_lead_returns_all_fields(self, client, db):
        token = _register_login(client, _REP_A)
        payload = _lead_payload(phone="555-1234", source="web", notes="VIP")
        resp = client.post(LEADS_URL, json=payload, headers=_auth(token))
        assert resp.status_code == 201
        data = resp.json()
        assert data["first_name"] == "Alice"
        assert data["last_name"] == "Smith"
        assert data["email"] == "alice@acme.com"
        assert data["phone"] == "555-1234"
        assert data["company_name"] == "Acme Corp"
        assert data["source"] == "web"
        assert data["notes"] == "VIP"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_lead_unauthenticated_returns_401(self, client):
        resp = client.post(LEADS_URL, json=_lead_payload())
        assert resp.status_code == 401

    def test_create_lead_minimal_payload(self, client, db):
        """Only first_name and last_name are required."""
        token = _register_login(client, _REP_A)
        resp = client.post(
            LEADS_URL,
            json={"first_name": "Bob", "last_name": "Jones"},
            headers=_auth(token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] is None
        assert data["company_name"] is None


# ---------------------------------------------------------------------------
# FR-006: All five statuses accepted
# ---------------------------------------------------------------------------

class TestLeadStatuses:
    @pytest.mark.parametrize(
        "status", ["new", "contacted", "qualified", "converted", "lost"]
    )
    def test_create_lead_with_valid_status(self, client, db, status):
        token = _register_login(client, _REP_A)
        resp = client.post(
            LEADS_URL,
            json=_lead_payload(status=status),
            headers=_auth(token),
        )
        assert resp.status_code == 201
        assert resp.json()["status"] == status


# ---------------------------------------------------------------------------
# FR-003: List leads (pagination, RBAC visibility)
# ---------------------------------------------------------------------------

class TestListLeads:
    def test_list_leads_returns_200(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.get(LEADS_URL, headers=_auth(token))
        assert resp.status_code == 200

    def test_list_leads_structure(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.get(LEADS_URL, headers=_auth(token))
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data

    def test_rep_sees_only_own_leads(self, client, db):
        token_a = _register_login(client, _REP_A)
        token_b = _register_login(client, _REP_B)

        # Rep A creates 2 leads
        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Lead1"),
            headers=_auth(token_a),
        )
        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Lead2"),
            headers=_auth(token_a),
        )
        # Rep B creates 1 lead
        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Lead3"),
            headers=_auth(token_b),
        )

        resp = client.get(LEADS_URL, headers=_auth(token_a))
        data = resp.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

    def test_manager_sees_all_leads(self, client, db):
        token_a = _register_login(client, _REP_A)
        token_b = _register_login(client, _REP_B)
        mgr_token = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")

        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Lead1"),
            headers=_auth(token_a),
        )
        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Lead2"),
            headers=_auth(token_b),
        )

        resp = client.get(LEADS_URL, headers=_auth(mgr_token))
        data = resp.json()
        assert data["total"] == 2

    def test_admin_sees_all_leads(self, client, db):
        token_a = _register_login(client, _REP_A)
        admin_token = _register_login(client, _ADMIN)
        _set_role(db, _ADMIN["email"], "admin")

        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Lead1"),
            headers=_auth(token_a),
        )
        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Lead2"),
            headers=_auth(token_a),
        )

        resp = client.get(LEADS_URL, headers=_auth(admin_token))
        data = resp.json()
        assert data["total"] == 2

    def test_pagination_defaults(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.get(LEADS_URL, headers=_auth(token))
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 20

    def test_pagination_page_size(self, client, db):
        token = _register_login(client, _REP_A)
        for i in range(5):
            client.post(
                LEADS_URL,
                json=_lead_payload(first_name=f"Lead{i}"),
                headers=_auth(token),
            )
        resp = client.get(f"{LEADS_URL}?page=1&page_size=3", headers=_auth(token))
        data = resp.json()
        assert data["page_size"] == 3
        assert len(data["items"]) == 3
        assert data["total"] == 5

    def test_pagination_second_page(self, client, db):
        token = _register_login(client, _REP_A)
        for i in range(5):
            client.post(
                LEADS_URL,
                json=_lead_payload(first_name=f"Lead{i}"),
                headers=_auth(token),
            )
        resp = client.get(f"{LEADS_URL}?page=2&page_size=3", headers=_auth(token))
        data = resp.json()
        assert data["page"] == 2
        assert len(data["items"]) == 2  # 5 total, 3 on page 1, 2 on page 2

    def test_list_unauthenticated_returns_401(self, client):
        resp = client.get(LEADS_URL)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# FR-004: Filtering — status and search
# ---------------------------------------------------------------------------

class TestFilterLeads:
    def test_filter_by_status(self, client, db):
        token = _register_login(client, _REP_A)
        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Alice", status="new"),
            headers=_auth(token),
        )
        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Bob", status="qualified"),
            headers=_auth(token),
        )

        resp = client.get(f"{LEADS_URL}?status=qualified", headers=_auth(token))
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["first_name"] == "Bob"

    def test_search_by_first_name(self, client, db):
        token = _register_login(client, _REP_A)
        # Use minimal payloads to avoid default email/company contamination
        client.post(
            LEADS_URL,
            json={"first_name": "Alice", "last_name": "Smith"},
            headers=_auth(token),
        )
        client.post(
            LEADS_URL,
            json={"first_name": "Bob", "last_name": "Jones"},
            headers=_auth(token),
        )

        resp = client.get(f"{LEADS_URL}?search=alice", headers=_auth(token))
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["first_name"] == "Alice"

    def test_search_by_last_name(self, client, db):
        token = _register_login(client, _REP_A)
        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Alice", last_name="Johnson"),
            headers=_auth(token),
        )
        client.post(
            LEADS_URL,
            json=_lead_payload(first_name="Bob", last_name="Smith"),
            headers=_auth(token),
        )

        resp = client.get(f"{LEADS_URL}?search=johnson", headers=_auth(token))
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["last_name"] == "Johnson"

    def test_search_by_company_name(self, client, db):
        token = _register_login(client, _REP_A)
        # Use minimal payloads to avoid default email contamination
        client.post(
            LEADS_URL,
            json={
                "first_name": "Alice",
                "last_name": "Smith",
                "company_name": "Acme Corp",
            },
            headers=_auth(token),
        )
        client.post(
            LEADS_URL,
            json={
                "first_name": "Bob",
                "last_name": "Jones",
                "company_name": "TechCo",
            },
            headers=_auth(token),
        )

        resp = client.get(f"{LEADS_URL}?search=acme", headers=_auth(token))
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["company_name"] == "Acme Corp"

    def test_search_by_email(self, client, db):
        token = _register_login(client, _REP_A)
        # Use minimal payloads to avoid default company_name contamination
        client.post(
            LEADS_URL,
            json={
                "first_name": "Alice",
                "last_name": "Smith",
                "email": "alice@acme.com",
            },
            headers=_auth(token),
        )
        client.post(
            LEADS_URL,
            json={
                "first_name": "Bob",
                "last_name": "Jones",
                "email": "bob@techco.com",
            },
            headers=_auth(token),
        )

        resp = client.get(f"{LEADS_URL}?search=acme", headers=_auth(token))
        data = resp.json()
        assert data["total"] == 1

    def test_filter_status_and_search_combined(self, client, db):
        token = _register_login(client, _REP_A)
        client.post(
            LEADS_URL,
            json=_lead_payload(
                first_name="Alice", company_name="Acme Corp", status="qualified"
            ),
            headers=_auth(token),
        )
        client.post(
            LEADS_URL,
            json=_lead_payload(
                first_name="Bob", company_name="Acme Corp", status="new"
            ),
            headers=_auth(token),
        )

        resp = client.get(
            f"{LEADS_URL}?status=qualified&search=acme", headers=_auth(token)
        )
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["first_name"] == "Alice"


# ---------------------------------------------------------------------------
# Get single lead
# ---------------------------------------------------------------------------

class TestGetLead:
    def test_get_lead_by_id(self, client, db):
        token = _register_login(client, _REP_A)
        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token)
        )
        lead_id = create_resp.json()["id"]

        resp = client.get(f"{LEADS_URL}/{lead_id}", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["id"] == lead_id

    def test_get_nonexistent_lead_returns_404(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.get(f"{LEADS_URL}/nonexistent-id", headers=_auth(token))
        assert resp.status_code == 404

    def test_rep_cannot_get_other_reps_lead(self, client, db):
        token_a = _register_login(client, _REP_A)
        token_b = _register_login(client, _REP_B)

        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token_a)
        )
        lead_id = create_resp.json()["id"]

        resp = client.get(f"{LEADS_URL}/{lead_id}", headers=_auth(token_b))
        assert resp.status_code == 403

    def test_manager_can_get_any_lead(self, client, db):
        token_a = _register_login(client, _REP_A)
        mgr_token = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")

        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token_a)
        )
        lead_id = create_resp.json()["id"]

        resp = client.get(f"{LEADS_URL}/{lead_id}", headers=_auth(mgr_token))
        assert resp.status_code == 200

    def test_get_lead_unauthenticated_returns_401(self, client, db):
        resp = client.get(f"{LEADS_URL}/some-id")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# FR-005: Update lead — RBAC
# ---------------------------------------------------------------------------

class TestUpdateLead:
    def test_owner_can_update_lead(self, client, db):
        token = _register_login(client, _REP_A)
        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token)
        )
        lead_id = create_resp.json()["id"]

        resp = client.patch(
            f"{LEADS_URL}/{lead_id}",
            json={"first_name": "Updated"},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "Updated"

    def test_rep_cannot_update_others_lead(self, client, db):
        token_a = _register_login(client, _REP_A)
        token_b = _register_login(client, _REP_B)

        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token_a)
        )
        lead_id = create_resp.json()["id"]

        resp = client.patch(
            f"{LEADS_URL}/{lead_id}",
            json={"first_name": "Hijacked"},
            headers=_auth(token_b),
        )
        assert resp.status_code == 403

    def test_manager_can_update_any_lead(self, client, db):
        token_a = _register_login(client, _REP_A)
        mgr_token = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")

        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token_a)
        )
        lead_id = create_resp.json()["id"]

        resp = client.patch(
            f"{LEADS_URL}/{lead_id}",
            json={"status": "qualified"},
            headers=_auth(mgr_token),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "qualified"

    def test_admin_can_update_any_lead(self, client, db):
        token_a = _register_login(client, _REP_A)
        admin_token = _register_login(client, _ADMIN)
        _set_role(db, _ADMIN["email"], "admin")

        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token_a)
        )
        lead_id = create_resp.json()["id"]

        resp = client.patch(
            f"{LEADS_URL}/{lead_id}",
            json={"notes": "Updated by admin"},
            headers=_auth(admin_token),
        )
        assert resp.status_code == 200
        assert resp.json()["notes"] == "Updated by admin"

    def test_update_nonexistent_lead_returns_404(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.patch(
            f"{LEADS_URL}/nonexistent-id",
            json={"first_name": "X"},
            headers=_auth(token),
        )
        assert resp.status_code == 404

    def test_update_partial_fields_only(self, client, db):
        token = _register_login(client, _REP_A)
        create_resp = client.post(
            LEADS_URL,
            json=_lead_payload(phone="555-0001", notes="original"),
            headers=_auth(token),
        )
        lead_id = create_resp.json()["id"]

        resp = client.patch(
            f"{LEADS_URL}/{lead_id}",
            json={"first_name": "NewName"},
            headers=_auth(token),
        )
        data = resp.json()
        assert data["first_name"] == "NewName"
        assert data["phone"] == "555-0001"  # unchanged
        assert data["notes"] == "original"  # unchanged


# ---------------------------------------------------------------------------
# FR-012: Delete lead
# ---------------------------------------------------------------------------

class TestDeleteLead:
    def test_owner_can_delete_lead(self, client, db):
        token = _register_login(client, _REP_A)
        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token)
        )
        lead_id = create_resp.json()["id"]

        resp = client.delete(f"{LEADS_URL}/{lead_id}", headers=_auth(token))
        assert resp.status_code == 204

    def test_delete_is_permanent(self, client, db):
        token = _register_login(client, _REP_A)
        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token)
        )
        lead_id = create_resp.json()["id"]

        client.delete(f"{LEADS_URL}/{lead_id}", headers=_auth(token))
        resp = client.get(f"{LEADS_URL}/{lead_id}", headers=_auth(token))
        assert resp.status_code == 404

    def test_rep_cannot_delete_others_lead(self, client, db):
        token_a = _register_login(client, _REP_A)
        token_b = _register_login(client, _REP_B)

        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token_a)
        )
        lead_id = create_resp.json()["id"]

        resp = client.delete(f"{LEADS_URL}/{lead_id}", headers=_auth(token_b))
        assert resp.status_code == 403

    def test_manager_can_delete_any_lead(self, client, db):
        token_a = _register_login(client, _REP_A)
        mgr_token = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")

        create_resp = client.post(
            LEADS_URL, json=_lead_payload(), headers=_auth(token_a)
        )
        lead_id = create_resp.json()["id"]

        resp = client.delete(f"{LEADS_URL}/{lead_id}", headers=_auth(mgr_token))
        assert resp.status_code == 204

    def test_delete_nonexistent_lead_returns_404(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.delete(f"{LEADS_URL}/nonexistent-id", headers=_auth(token))
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# FR-007 / FR-008: Convert lead — atomic, lead retained, status=converted
# ---------------------------------------------------------------------------

class TestConvertLead:
    def _create_lead(self, client, token, **kwargs) -> str:
        resp = client.post(
            LEADS_URL, json=_lead_payload(**kwargs), headers=_auth(token)
        )
        assert resp.status_code == 201
        return resp.json()["id"]

    def test_convert_creates_contact(self, client, db):
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(client, token)

        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": False, "create_deal": False},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["contact_id"] is not None

    def test_convert_creates_company_when_requested(self, client, db):
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(
            client, token, company_name="Acme Corp"
        )

        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": True, "create_deal": False},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["company_id"] is not None

    def test_convert_no_company_when_create_company_false(self, client, db):
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(
            client, token, company_name="Acme Corp"
        )

        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": False, "create_deal": False},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["company_id"] is None

    def test_convert_no_company_when_no_company_name(self, client, db):
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(
            client, token, company_name=None
        )

        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": True, "create_deal": False},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["company_id"] is None

    def test_convert_creates_deal_when_requested(self, client, db):
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(client, token)

        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={
                "create_company": False,
                "create_deal": True,
                "deal_title": "Big Deal",
                "deal_value": 50000.0,
            },
            headers=_auth(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["deal_id"] is not None

    def test_convert_no_deal_when_create_deal_false(self, client, db):
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(client, token)

        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": False, "create_deal": False},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["deal_id"] is None

    def test_convert_no_deal_when_no_deal_title(self, client, db):
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(client, token)

        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": False, "create_deal": True},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["deal_id"] is None

    def test_convert_sets_lead_status_to_converted(self, client, db):
        """FR-008: Lead record is retained and status=converted."""
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(client, token)

        client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": False, "create_deal": False},
            headers=_auth(token),
        )

        # Lead still accessible with status=converted
        resp = client.get(f"{LEADS_URL}/{lead_id}", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json()["status"] == "converted"

    def test_convert_lead_retained_after_conversion(self, client, db):
        """FR-008: Lead is NOT deleted after conversion."""
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(client, token)

        client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": False, "create_deal": False},
            headers=_auth(token),
        )

        resp = client.get(f"{LEADS_URL}/{lead_id}", headers=_auth(token))
        assert resp.status_code == 200  # still exists

    def test_convert_already_converted_returns_400(self, client, db):
        """FR-009: Re-converting a converted lead returns 400."""
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(client, token)

        client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": False, "create_deal": False},
            headers=_auth(token),
        )
        # Try again
        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": False, "create_deal": False},
            headers=_auth(token),
        )
        assert resp.status_code == 400

    def test_convert_nonexistent_lead_returns_404(self, client, db):
        token = _register_login(client, _REP_A)
        resp = client.post(
            f"{LEADS_URL}/nonexistent-id/convert",
            json={"create_company": False, "create_deal": False},
            headers=_auth(token),
        )
        assert resp.status_code == 404

    def test_rep_cannot_convert_others_lead(self, client, db):
        token_a = _register_login(client, _REP_A)
        token_b = _register_login(client, _REP_B)
        lead_id = self._create_lead(client, token_a)

        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": False, "create_deal": False},
            headers=_auth(token_b),
        )
        assert resp.status_code == 403

    def test_convert_full_pipeline(self, client, db):
        """Convert with company + deal simultaneously."""
        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(client, token, company_name="Global Inc")

        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={
                "create_company": True,
                "create_deal": True,
                "deal_title": "Enterprise License",
                "deal_value": 100000.0,
            },
            headers=_auth(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["contact_id"] is not None
        assert data["company_id"] is not None
        assert data["deal_id"] is not None

    def test_convert_verifies_contact_in_db(self, client, db):
        """Atomicity: contact actually created in DB."""
        from app.models.contact import Contact

        token = _register_login(client, _REP_A)
        lead_id = self._create_lead(client, token)

        resp = client.post(
            f"{LEADS_URL}/{lead_id}/convert",
            json={"create_company": False, "create_deal": False},
            headers=_auth(token),
        )
        contact_id = resp.json()["contact_id"]
        db.expire_all()
        contact = db.get(Contact, contact_id)
        assert contact is not None
        assert contact.first_name == "Alice"
