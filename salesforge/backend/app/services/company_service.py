from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_owner_or_above
from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyUpdate


def create_company(db: Session, payload: CompanyCreate, current_user: User) -> Company:
    company = Company(
        name=payload.name,
        website=payload.website,
        industry=payload.industry,
        phone=payload.phone,
        address=payload.address,
        notes=payload.notes,
        owner_id=current_user.id,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def get_company_or_404(db: Session, company_id: str, current_user: User) -> Company:
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Company not found"
        )
    require_owner_or_above(company.owner_id, current_user)
    return company


def get_company_detail_or_404(
    db: Session, company_id: str, current_user: User
) -> Company:
    company = (
        db.query(Company)
        .options(
            selectinload(Company.contacts),
            selectinload(Company.deals),
        )
        .filter(Company.id == company_id)
        .first()
    )
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Company not found"
        )
    require_owner_or_above(company.owner_id, current_user)
    return company


def list_companies(
    db: Session,
    current_user: User,
    page: int = 1,
    page_size: int = 20,
    industry: str | None = None,
    search: str | None = None,
) -> tuple[list[Company], int]:
    query = db.query(Company)

    if current_user.role == "rep":
        query = query.filter(Company.owner_id == current_user.id)

    if industry:
        query = query.filter(Company.industry == industry)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Company.name.ilike(term),
                Company.website.ilike(term),
                Company.notes.ilike(term),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    companies = (
        query.order_by(Company.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return companies, total


def update_company(
    db: Session, company_id: str, payload: CompanyUpdate, current_user: User
) -> Company:
    company = get_company_or_404(db, company_id, current_user)

    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates and updates["name"] is None:
        updates.pop("name")

    for field, value in updates.items():
        setattr(company, field, value)

    db.commit()
    db.refresh(company)
    return company


def delete_company(db: Session, company_id: str, current_user: User) -> None:
    company = get_company_or_404(db, company_id, current_user)
    db.delete(company)
    db.commit()
