"""TDD tests for WU-03: Auth backend endpoints."""
from datetime import UTC, datetime, timedelta

from tests.conftest import seed_reset_token

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
REFRESH_URL = "/api/v1/auth/refresh"
LOGOUT_URL = "/api/v1/auth/logout"
FORGOT_URL = "/api/v1/auth/forgot-password"
RESET_URL = "/api/v1/auth/reset-password"

VALID_USER = {
    "email": "alice@example.com",
    "password": "secret123",
    "full_name": "Alice Smith",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def register_and_login(client) -> dict:
    client.post(REGISTER_URL, json=VALID_USER)
    resp = client.post(
        LOGIN_URL,
        json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
    )
    return resp.json()


# ---------------------------------------------------------------------------
# FR-001 / FR-002 — Register
# ---------------------------------------------------------------------------

class TestRegister:
    def test_register_creates_rep_user(self, client):
        resp = client.post(REGISTER_URL, json=VALID_USER)
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == VALID_USER["email"]
        assert data["role"] == "rep"
        assert data["is_active"] is True
        assert "hashed_password" not in data

    def test_register_duplicate_email_returns_409(self, client):
        client.post(REGISTER_URL, json=VALID_USER)
        resp = client.post(REGISTER_URL, json=VALID_USER)
        assert resp.status_code == 409

    def test_register_short_password_returns_422(self, client):
        resp = client.post(
            REGISTER_URL, json={**VALID_USER, "password": "12345"}
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# FR-003 / FR-004 — Login
# ---------------------------------------------------------------------------

class TestLogin:
    def test_login_returns_tokens(self, client):
        client.post(REGISTER_URL, json=VALID_USER)
        resp = client.post(
            LOGIN_URL,
            json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password_returns_401(self, client):
        client.post(REGISTER_URL, json=VALID_USER)
        resp = client.post(
            LOGIN_URL, json={"email": VALID_USER["email"], "password": "wrongpass"}
        )
        assert resp.status_code == 401

    def test_login_unknown_email_returns_401(self, client):
        resp = client.post(
            LOGIN_URL, json={"email": "nobody@example.com", "password": "secret123"}
        )
        assert resp.status_code == 401

    def test_login_inactive_user_returns_401(self, client, db):
        """FR-010: deactivated account cannot log in."""
        client.post(REGISTER_URL, json=VALID_USER)
        from app.models.user import User

        user = db.query(User).filter(User.email == VALID_USER["email"]).first()
        user.is_active = False
        db.commit()

        resp = client.post(
            LOGIN_URL,
            json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# FR-005 — Refresh
# ---------------------------------------------------------------------------

class TestRefresh:
    def test_refresh_returns_new_access_token(self, client):
        tokens = register_and_login(client)
        resp = client.post(REFRESH_URL, json={"refresh_token": tokens["refresh_token"]})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data

    def test_refresh_invalid_token_returns_401(self, client):
        resp = client.post(REFRESH_URL, json={"refresh_token": "notarealtoken"})
        assert resp.status_code == 401

    def test_refresh_revoked_token_returns_401(self, client):
        tokens = register_and_login(client)
        client.post(LOGOUT_URL, json={"refresh_token": tokens["refresh_token"]})
        resp = client.post(REFRESH_URL, json={"refresh_token": tokens["refresh_token"]})
        assert resp.status_code == 401

    def test_refresh_inactive_user_returns_401(self, client, db):
        """FR-010: deactivated user's refresh token is rejected."""
        tokens = register_and_login(client)
        from app.models.user import User

        user = db.query(User).filter(User.email == VALID_USER["email"]).first()
        user.is_active = False
        db.commit()

        resp = client.post(REFRESH_URL, json={"refresh_token": tokens["refresh_token"]})
        assert resp.status_code == 401

    def test_refresh_expired_token_returns_401(self, client, db):
        tokens = register_and_login(client)
        from app.core.security import hash_token
        from app.models.user import RefreshToken

        token_hash = hash_token(tokens["refresh_token"])
        db_token = db.query(RefreshToken).filter(
            RefreshToken.token_hash == token_hash
        ).first()
        db_token.expires_at = datetime.now(UTC) - timedelta(days=1)
        db.commit()

        resp = client.post(REFRESH_URL, json={"refresh_token": tokens["refresh_token"]})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# FR-004 / US2-AC3 — Logout
# ---------------------------------------------------------------------------

class TestLogout:
    def test_logout_revokes_token(self, client):
        tokens = register_and_login(client)
        resp = client.post(LOGOUT_URL, json={"refresh_token": tokens["refresh_token"]})
        assert resp.status_code == 204

        # Subsequent refresh must fail
        resp2 = client.post(
            REFRESH_URL, json={"refresh_token": tokens["refresh_token"]}
        )
        assert resp2.status_code == 401

    def test_logout_invalid_token_returns_401(self, client):
        resp = client.post(LOGOUT_URL, json={"refresh_token": "bogus"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# FR-008 / FR-011 — Forgot password
# ---------------------------------------------------------------------------

class TestForgotPassword:
    def test_forgot_password_registered_email_returns_200(self, client):
        client.post(REGISTER_URL, json=VALID_USER)
        resp = client.post(FORGOT_URL, json={"email": VALID_USER["email"]})
        assert resp.status_code == 200

    def test_forgot_password_unregistered_email_also_returns_200(self, client):
        """FR-011: no email enumeration."""
        resp = client.post(FORGOT_URL, json={"email": "ghost@example.com"})
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# FR-008 / FR-009 — Reset password
# ---------------------------------------------------------------------------

class TestResetPassword:
    def test_reset_password_success(self, client, db):
        client.post(REGISTER_URL, json=VALID_USER)
        from app.models.user import User

        user = db.query(User).filter(User.email == VALID_USER["email"]).first()
        raw_token = seed_reset_token(db, user.id)

        resp = client.post(
            RESET_URL, json={"token": raw_token, "new_password": "newpassword1"}
        )
        assert resp.status_code == 200

        # Old password must fail
        old_login = client.post(
            LOGIN_URL,
            json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        assert old_login.status_code == 401

        # New password must succeed
        new_login = client.post(
            LOGIN_URL,
            json={"email": VALID_USER["email"], "password": "newpassword1"},
        )
        assert new_login.status_code == 200

    def test_reset_password_used_token_returns_400(self, client, db):
        """FR-009: single-use token."""
        client.post(REGISTER_URL, json=VALID_USER)
        from app.models.user import User

        user = db.query(User).filter(User.email == VALID_USER["email"]).first()
        raw_token = seed_reset_token(db, user.id)

        client.post(RESET_URL, json={"token": raw_token, "new_password": "newpass1"})
        resp = client.post(
            RESET_URL, json={"token": raw_token, "new_password": "again1"}
        )
        assert resp.status_code == 400

    def test_reset_password_expired_token_returns_400(self, client, db):
        client.post(REGISTER_URL, json=VALID_USER)
        from app.models.user import User

        user = db.query(User).filter(User.email == VALID_USER["email"]).first()
        raw_token = seed_reset_token(db, user.id, hours_valid=-1)  # already expired

        resp = client.post(
            RESET_URL, json={"token": raw_token, "new_password": "newpass1"}
        )
        assert resp.status_code == 400

    def test_reset_password_invalid_token_returns_400(self, client):
        resp = client.post(
            RESET_URL, json={"token": "bogustoken", "new_password": "newpass1"}
        )
        assert resp.status_code == 400
