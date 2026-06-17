from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.contact import Contact
    from app.models.deal import Deal
    from app.models.lead import Lead
    from app.models.user import User


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid4())
    )
    type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deal_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("deals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    contact_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("contacts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    lead_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("leads.id", ondelete="SET NULL"),
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

    owner: Mapped[User] = relationship("User", back_populates="activities")
    deal: Mapped[Deal | None] = relationship(
        "Deal", back_populates="activities", foreign_keys=[deal_id]
    )
    contact: Mapped[Contact | None] = relationship(
        "Contact", back_populates="activities", foreign_keys=[contact_id]
    )
    lead: Mapped[Lead | None] = relationship(
        "Lead", back_populates="activities", foreign_keys=[lead_id]
    )

    __table_args__ = (Index("ix_activities_owner_completed", "owner_id", "completed"),)
