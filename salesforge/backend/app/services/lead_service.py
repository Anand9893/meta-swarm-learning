from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_owner_or_above
from app.models.company import Company
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.lead import Lead
from app.models.user import User
from app.schemas.lead import (
    LeadConvertRequest,
    LeadConvertResponse,
    LeadCreate,
    LeadUpdate,
)


def create_lead(db: Session, payload: LeadCreate, current_user: User) -> Lead:
    lead = Lead(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        company_name=payload.company_name,
        status=payload.status,
        source=payload.source,
        notes=payload.notes,
        owner_id=current_user.id,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def get_lead_or_404(db: Session, lead_id: str, current_user: User) -> Lead:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found"
        )
    require_owner_or_above(lead.owner_id, current_user)
    return lead


def list_leads(
    db: Session,
    current_user: User,
    page: int = 1,
    page_size: int = 20,
    status_filter: str | None = None,
    search: str | None = None,
) -> tuple[list[Lead], int]:
    query = db.query(Lead)

    # RBAC: reps only see their own leads
    if current_user.role == "rep":
        query = query.filter(Lead.owner_id == current_user.id)

    if status_filter:
        query = query.filter(Lead.status == status_filter)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Lead.first_name.ilike(term),
                Lead.last_name.ilike(term),
                Lead.company_name.ilike(term),
                Lead.email.ilike(term),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    leads = query.order_by(Lead.created_at.desc()).offset(offset).limit(page_size).all()
    return leads, total


def update_lead(
    db: Session, lead_id: str, payload: LeadUpdate, current_user: User
) -> Lead:
    lead = get_lead_or_404(db, lead_id, current_user)

    if payload.first_name is not None:
        lead.first_name = payload.first_name
    if payload.last_name is not None:
        lead.last_name = payload.last_name
    if payload.email is not None:
        lead.email = payload.email
    if payload.phone is not None:
        lead.phone = payload.phone
    if payload.company_name is not None:
        lead.company_name = payload.company_name
    if payload.status is not None:
        lead.status = payload.status
    if payload.source is not None:
        lead.source = payload.source
    if payload.notes is not None:
        lead.notes = payload.notes

    db.commit()
    db.refresh(lead)
    return lead


def delete_lead(db: Session, lead_id: str, current_user: User) -> None:
    lead = get_lead_or_404(db, lead_id, current_user)
    db.delete(lead)
    db.commit()


def convert_lead(
    db: Session,
    lead_id: str,
    payload: LeadConvertRequest,
    current_user: User,
) -> LeadConvertResponse:
    lead = get_lead_or_404(db, lead_id, current_user)

    if lead.status == "converted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead already converted",
        )

    with db.begin_nested():  # SAVEPOINT for atomicity
        contact = Contact(
            first_name=lead.first_name,
            last_name=lead.last_name,
            email=lead.email,
            phone=lead.phone,
            owner_id=current_user.id,
        )
        db.add(contact)
        db.flush()

        company = None
        if payload.create_company and lead.company_name:
            company = Company(
                name=lead.company_name,
                owner_id=current_user.id,
            )
            db.add(company)
            db.flush()
            contact.company_id = company.id

        deal = None
        if payload.create_deal and payload.deal_title:
            deal = Deal(
                title=payload.deal_title,
                value=payload.deal_value,
                contact_id=contact.id,
                company_id=company.id if company else None,
                owner_id=current_user.id,
            )
            db.add(deal)

        lead.status = "converted"

    db.commit()

    return LeadConvertResponse(
        contact_id=contact.id,
        company_id=company.id if company else None,
        deal_id=deal.id if deal else None,
    )
