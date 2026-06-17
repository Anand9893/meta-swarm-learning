"""TDD tests for WU-04: RBAC middleware and user management endpoint."""
from app.core.security import create_access_token

USERS_URL = "/api/v1/users"
REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"

_USER_A = {"email": "rep@example.com", "password": "secret123", "full_name": "Rep A"}
_USER_B = {"email": "rep2@example.com", "password": "secret123", "full_name": "Rep B"}
_ADMIN = {"email": "admin@example.com", "password": "secret123", "full_name": "Admin"}
_MANAGER = {"email": "mgr@example.com", "password": "secret123", "full_name": "Mgr"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register_login(client, payload: dict) -> str:
    client.post(REGISTER_URL, json=payload)
    resp = client.post(
        LOGIN_URL, json={"email": payload["email"], "password": payload["password"]}
    )
    return resp.json()["access_token"]


def _set_role(db, email: str, role: str) -> None:
    from app.models.user import User

    user = db.query(User).filter(User.email == email).first()
    user.role = role
    db.commit()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# get_current_user — token validation
# ---------------------------------------------------------------------------

class TestGetCurrentUser:
    def test_valid_token_grants_access(self, client, db):
        token = _register_login(client, _ADMIN)
        _set_role(db, _ADMIN["email"], "admin")
        resp = client.get(USERS_URL, headers=_auth(token))
        assert resp.status_code == 200

    def test_missing_token_returns_401(self, client):
        resp = client.get(USERS_URL)
        assert resp.status_code == 401

    def test_malformed_token_returns_401(self, client):
        resp = client.get(USERS_URL, headers=_auth("not.a.jwt"))
        assert resp.status_code == 401

    def test_deactivated_user_token_returns_401(self, client, db):
        """FR-010: valid JWT for a deactivated user must be rejected."""
        token = _register_login(client, _ADMIN)
        _set_role(db, _ADMIN["email"], "admin")

        from app.models.user import User

        user = db.query(User).filter(User.email == _ADMIN["email"]).first()
        user.is_active = False
        db.commit()

        resp = client.get(USERS_URL, headers=_auth(token))
        assert resp.status_code == 401

    def test_token_with_nonexistent_user_id_returns_401(self, client):
        token = create_access_token("nonexistent-user-id")
        resp = client.get(USERS_URL, headers=_auth(token))
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# require_role — role enforcement on admin-only endpoint
# ---------------------------------------------------------------------------

class TestRequireRole:
    def test_admin_can_access_users_list(self, client, db):
        token = _register_login(client, _ADMIN)
        _set_role(db, _ADMIN["email"], "admin")
        resp = client.get(USERS_URL, headers=_auth(token))
        assert resp.status_code == 200

    def test_manager_cannot_access_admin_only_endpoint(self, client, db):
        token = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")
        resp = client.get(USERS_URL, headers=_auth(token))
        assert resp.status_code == 403

    def test_rep_cannot_access_admin_only_endpoint(self, client):
        token = _register_login(client, _USER_A)
        resp = client.get(USERS_URL, headers=_auth(token))
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# require_owner_or_above — unit test (no endpoint needed yet)
# ---------------------------------------------------------------------------

class TestRequireOwnerOrAbove:
    def _make_user(self, db, email: str, role: str):
        from app.models.user import User

        u = User(
            email=email,
            full_name="Test",
            hashed_password="x",
            role=role,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
        return u

    def test_rep_owns_record_passes(self, db):

        from app.core.deps import require_owner_or_above

        rep = self._make_user(db, "rep@test.com", "rep")
        require_owner_or_above(rep.id, rep)  # should not raise

    def test_rep_does_not_own_record_raises_403(self, db):
        import pytest
        from fastapi import HTTPException

        from app.core.deps import require_owner_or_above

        rep = self._make_user(db, "rep2@test.com", "rep")
        with pytest.raises(HTTPException) as exc_info:
            require_owner_or_above("other-owner-id", rep)
        assert exc_info.value.status_code == 403

    def test_manager_passes_regardless_of_ownership(self, db):
        from app.core.deps import require_owner_or_above

        mgr = self._make_user(db, "mgr@test.com", "manager")
        require_owner_or_above("someone-elses-id", mgr)  # should not raise

    def test_admin_passes_regardless_of_ownership(self, db):
        from app.core.deps import require_owner_or_above

        admin = self._make_user(db, "adm@test.com", "admin")
        require_owner_or_above("anyone-elses-id", admin)  # should not raise


# ---------------------------------------------------------------------------
# FR-012 — Admin user management endpoint
# ---------------------------------------------------------------------------

class TestUserManagement:
    def _setup_admin(self, client, db) -> str:
        token = _register_login(client, _ADMIN)
        _set_role(db, _ADMIN["email"], "admin")
        return token

    def test_list_users_returns_all_users(self, client, db):
        admin_token = self._setup_admin(client, db)
        client.post(REGISTER_URL, json=_USER_A)
        client.post(REGISTER_URL, json=_USER_B)
        resp = client.get(USERS_URL, headers=_auth(admin_token))
        assert resp.status_code == 200
        assert len(resp.json()) >= 3  # admin + two reps

    def test_admin_can_deactivate_user(self, client, db):
        admin_token = self._setup_admin(client, db)
        client.post(REGISTER_URL, json=_USER_A)

        from app.models.user import User

        rep = db.query(User).filter(User.email == _USER_A["email"]).first()
        resp = client.patch(
            f"{USERS_URL}/{rep.id}",
            json={"is_active": False},
            headers=_auth(admin_token),
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False

    def test_admin_can_change_role(self, client, db):
        admin_token = self._setup_admin(client, db)
        client.post(REGISTER_URL, json=_USER_A)

        from app.models.user import User

        rep = db.query(User).filter(User.email == _USER_A["email"]).first()
        resp = client.patch(
            f"{USERS_URL}/{rep.id}",
            json={"role": "manager"},
            headers=_auth(admin_token),
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "manager"

    def test_non_admin_cannot_patch_users(self, client, db):
        mgr_token = _register_login(client, _MANAGER)
        _set_role(db, _MANAGER["email"], "manager")
        client.post(REGISTER_URL, json=_USER_A)

        from app.models.user import User

        rep = db.query(User).filter(User.email == _USER_A["email"]).first()
        resp = client.patch(
            f"{USERS_URL}/{rep.id}",
            json={"is_active": False},
            headers=_auth(mgr_token),
        )
        assert resp.status_code == 403

    def test_patch_nonexistent_user_returns_404(self, client, db):
        admin_token = self._setup_admin(client, db)
        resp = client.patch(
            f"{USERS_URL}/nonexistent-id",
            json={"is_active": False},
            headers=_auth(admin_token),
        )
        assert resp.status_code == 404
