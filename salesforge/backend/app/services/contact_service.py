from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_owner_or_above
from app.models.contact import Contact
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactUpdate


def create_contact(db: Session, payload: ContactCreate, current_user: User) -> Contact:
    contact = Contact(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        title=payload.title,
        company_id=payload.company_id,
        owner_id=current_user.id,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def get_contact_or_404(db: Session, contact_id: str, current_user: User) -> Contact:
    contact = db.get(Contact, contact_id)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found"
        )
    require_owner_or_above(contact.owner_id, current_user)
    return contact


def get_contact_detail_or_404(
    db: Session, contact_id: str, current_user: User
) -> Contact:
    contact = (
        db.query(Contact)
        .options(
            selectinload(Contact.deals),
            selectinload(Contact.activities),
        )
        .filter(Contact.id == contact_id)
        .first()
    )
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found"
        )
    require_owner_or_above(contact.owner_id, current_user)
    return contact


def list_contacts(
    db: Session,
    current_user: User,
    page: int = 1,
    page_size: int = 20,
    company_id: str | None = None,
    search: str | None = None,
) -> tuple[list[Contact], int]:
    query = db.query(Contact)

    if current_user.role == "rep":
        query = query.filter(Contact.owner_id == current_user.id)

    if company_id:
        query = query.filter(Contact.company_id == company_id)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Contact.first_name.ilike(term),
                Contact.last_name.ilike(term),
                Contact.email.ilike(term),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    contacts = (
        query.order_by(Contact.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return contacts, total


def update_contact(
    db: Session, contact_id: str, payload: ContactUpdate, current_user: User
) -> Contact:
    contact = get_contact_or_404(db, contact_id, current_user)

    # exclude_unset=True distinguishes "not sent" from "sent as null"
    updates = payload.model_dump(exclude_unset=True)

    # Guard non-nullable string fields against accidentally being set to None
    for field in ("first_name", "last_name"):
        if field in updates and updates[field] is None:
            updates.pop(field)

    for field, value in updates.items():
        setattr(contact, field, value)

    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, contact_id: str, current_user: User) -> None:
    contact = get_contact_or_404(db, contact_id, current_user)
    db.delete(contact)
    db.commit()
