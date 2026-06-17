from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.activity import Activity
    from app.models.company import Company
    from app.models.deal import Deal
    from app.models.user import User


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid4())
    )
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
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

    owner: Mapped[User] = relationship("User", back_populates="contacts")
    company: Mapped[Company | None] = relationship(
        "Company", back_populates="contacts"
    )
    deals: Mapped[list[Deal]] = relationship(
        "Deal", back_populates="contact", foreign_keys="Deal.contact_id"
    )
    activities: Mapped[list[Activity]] = relationship(
        "Activity", back_populates="contact", foreign_keys="Activity.contact_id"
    )
