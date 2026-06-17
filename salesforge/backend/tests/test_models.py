"""TDD tests for WU-02: SQLAlchemy models and FK/cascade behaviour."""
from datetime import UTC, datetime, timedelta

import pytest

from app.models.activity import Activity
from app.models.company import Company
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.lead import Lead
from app.models.user import PasswordResetToken, RefreshToken, User

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(db, email="test@example.com", role="rep"):
    user = User(email=email, full_name="Test User", hashed_password="hashed", role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_company(db, owner):
    company = Company(name="Acme Corp", owner_id=owner.id)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def make_lead(db, owner):
    lead = Lead(first_name="Jane", last_name="Doe", owner_id=owner.id)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def make_contact(db, owner, company=None):
    contact = Contact(
        first_name="Jane",
        last_name="Doe",
        owner_id=owner.id,
        company_id=company.id if company else None,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def make_deal(db, owner, contact=None, company=None):
    deal = Deal(
        title="Big Deal",
        owner_id=owner.id,
        contact_id=contact.id if contact else None,
        company_id=company.id if company else None,
    )
    db.add(deal)
    db.commit()
    db.refresh(deal)
    return deal


def make_activity(db, owner, deal=None, contact=None, lead=None):
    activity = Activity(
        type="call",
        title="Follow-up call",
        owner_id=owner.id,
        deal_id=deal.id if deal else None,
        contact_id=contact.id if contact else None,
        lead_id=lead.id if lead else None,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


# ---------------------------------------------------------------------------
# User model
# ---------------------------------------------------------------------------

class TestUserModel:
    def test_create_user_defaults(self, db):
        user = make_user(db)
        assert user.id is not None
        assert user.role == "rep"
        assert user.is_active is True
        assert user.created_at is not None

    def test_user_uuid_primary_key(self, db):
        u1 = make_user(db, email="a@example.com")
        u2 = make_user(db, email="b@example.com")
        assert u1.id != u2.id
        assert len(u1.id) == 36  # UUID4 string

    def test_user_email_unique(self, db):
        make_user(db, email="dup@example.com")
        from sqlalchemy.exc import IntegrityError
        with pytest.raises(IntegrityError):
            make_user(db, email="dup@example.com")


# ---------------------------------------------------------------------------
# RefreshToken model
# ---------------------------------------------------------------------------

class TestRefreshTokenModel:
    def test_create_refresh_token(self, db):
        user = make_user(db)
        expires = datetime.now(UTC) + timedelta(days=7)
        token = RefreshToken(user_id=user.id, token_hash="abc123", expires_at=expires)
        db.add(token)
        db.commit()
        db.refresh(token)
        assert token.id is not None
        assert token.revoked is False

    def test_cascade_delete_user_removes_refresh_tokens(self, db):
        user = make_user(db)
        expires = datetime.now(UTC) + timedelta(days=7)
        token = RefreshToken(user_id=user.id, token_hash="abc123", expires_at=expires)
        db.add(token)
        db.commit()
        token_id = token.id

        db.delete(user)
        db.commit()

        assert db.get(RefreshToken, token_id) is None


# ---------------------------------------------------------------------------
# PasswordResetToken model
# ---------------------------------------------------------------------------

class TestPasswordResetTokenModel:
    def test_cascade_delete_user_removes_reset_tokens(self, db):
        user = make_user(db)
        expires = datetime.now(UTC) + timedelta(hours=1)
        reset_token = PasswordResetToken(
            user_id=user.id, token_hash="resettoken", expires_at=expires
        )
        db.add(reset_token)
        db.commit()
        token_id = reset_token.id

        db.delete(user)
        db.commit()

        assert db.get(PasswordResetToken, token_id) is None


# ---------------------------------------------------------------------------
# Lead model
# ---------------------------------------------------------------------------

class TestLeadModel:
    def test_create_lead_defaults(self, db):
        user = make_user(db)
        lead = make_lead(db, user)
        assert lead.id is not None
        assert lead.status == "new"
        assert lead.created_at is not None

    def test_lead_delete_sets_activity_lead_id_null(self, db):
        user = make_user(db)
        lead = make_lead(db, user)
        activity = make_activity(db, user, lead=lead)
        activity_id = activity.id

        db.delete(lead)
        db.commit()

        db.expire_all()
        refreshed = db.get(Activity, activity_id)
        assert refreshed is not None
        assert refreshed.lead_id is None


# ---------------------------------------------------------------------------
# Contact model
# ---------------------------------------------------------------------------

class TestContactModel:
    def test_create_contact(self, db):
        user = make_user(db)
        contact = make_contact(db, user)
        assert contact.id is not None
        assert contact.company_id is None

    def test_delete_company_sets_contact_company_id_null(self, db):
        user = make_user(db)
        company = make_company(db, user)
        contact = make_contact(db, user, company=company)
        contact_id = contact.id

        db.delete(company)
        db.commit()

        db.expire_all()
        refreshed = db.get(Contact, contact_id)
        assert refreshed is not None
        assert refreshed.company_id is None

    def test_delete_contact_sets_deal_contact_id_null(self, db):
        user = make_user(db)
        contact = make_contact(db, user)
        deal = make_deal(db, user, contact=contact)
        deal_id = deal.id

        db.delete(contact)
        db.commit()

        db.expire_all()
        refreshed = db.get(Deal, deal_id)
        assert refreshed is not None
        assert refreshed.contact_id is None

    def test_delete_contact_sets_activity_contact_id_null(self, db):
        user = make_user(db)
        contact = make_contact(db, user)
        activity = make_activity(db, user, contact=contact)
        activity_id = activity.id

        db.delete(contact)
        db.commit()

        db.expire_all()
        refreshed = db.get(Activity, activity_id)
        assert refreshed is not None
        assert refreshed.contact_id is None


# ---------------------------------------------------------------------------
# Company model
# ---------------------------------------------------------------------------

class TestCompanyModel:
    def test_create_company(self, db):
        user = make_user(db)
        company = make_company(db, user)
        assert company.id is not None
        assert company.name == "Acme Corp"


# ---------------------------------------------------------------------------
# Deal model
# ---------------------------------------------------------------------------

class TestDealModel:
    def test_create_deal_defaults(self, db):
        user = make_user(db)
        deal = make_deal(db, user)
        assert deal.id is not None
        assert deal.stage == "prospect"
        assert deal.probability == 10
        assert deal.currency == "USD"

    def test_delete_deal_sets_activity_deal_id_null(self, db):
        user = make_user(db)
        deal = make_deal(db, user)
        activity = make_activity(db, user, deal=deal)
        activity_id = activity.id

        db.delete(deal)
        db.commit()

        db.expire_all()
        refreshed = db.get(Activity, activity_id)
        assert refreshed is not None
        assert refreshed.deal_id is None


# ---------------------------------------------------------------------------
# Activity model
# ---------------------------------------------------------------------------

class TestActivityModel:
    def test_create_activity_defaults(self, db):
        user = make_user(db)
        activity = make_activity(db, user)
        assert activity.id is not None
        assert activity.completed is False
        assert activity.type == "call"
