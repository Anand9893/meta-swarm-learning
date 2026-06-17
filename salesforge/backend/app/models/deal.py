from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.activity import Activity
    from app.models.company import Company
    from app.models.contact import Contact
    from app.models.user import User

STAGE_DEFAULT_PROBABILITY = {
    "prospect": 10,
    "proposal": 30,
    "negotiation": 60,
    "won": 100,
    "lost": 0,
}


class Deal(Base):
    __tablename__ = "deals"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid4())
    )
    title: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    stage: Mapped[str] = mapped_column(String, nullable=False, default="prospect")
    probability: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    expected_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    contact_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("contacts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    company_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("companies.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped[User] = relationship("User", back_populates="deals")
    contact: Mapped[Contact | None] = relationship(
        "Contact", back_populates="deals", foreign_keys=[contact_id]
    )
    company: Mapped[Company | None] = relationship(
        "Company", back_populates="deals", foreign_keys=[company_id]
    )
    activities: Mapped[list[Activity]] = relationship(
        "Activity", back_populates="deal", foreign_keys="Activity.deal_id"
    )

    __table_args__ = (Index("ix_deals_owner_stage", "owner_id", "stage"),)
