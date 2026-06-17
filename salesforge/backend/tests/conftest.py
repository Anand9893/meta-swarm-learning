import secrets
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 — registers all models with Base.metadata
from app.core.database import Base, get_db
from app.main import app


@pytest.fixture(scope="function")
def engine():
    eng = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(eng, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(eng)
    yield eng
    Base.metadata.drop_all(eng)


@pytest.fixture(scope="function")
def db(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture(scope="function")
def client(engine):
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Shared helper: create a reset token directly in the DB (avoids log parsing)
# ---------------------------------------------------------------------------

def seed_reset_token(db: Session, user_id: str, hours_valid: float = 1) -> str:
    from app.core.security import hash_token
    from app.models.user import PasswordResetToken

    raw = secrets.token_urlsafe(32)
    expires = datetime.now(UTC) + timedelta(hours=hours_valid)
    db.add(
        PasswordResetToken(
            user_id=user_id,
            token_hash=hash_token(raw),
            expires_at=expires,
        )
    )
    db.commit()
    return raw
