from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.company import (
    CompanyCreate,
    CompanyDetailResponse,
    CompanyListResponse,
    CompanyResponse,
    CompanyUpdate,
    LinkedContactResponse,
    LinkedDealResponse,
)
from app.services import company_service

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    body: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyResponse:
    company = company_service.create_company(db, body, current_user)
    return CompanyResponse.model_validate(company)


@router.get("", response_model=CompanyListResponse)
def list_companies(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    industry: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyListResponse:
    companies, total = company_service.list_companies(
        db,
        current_user,
        page=page,
        page_size=page_size,
        industry=industry,
        search=search,
    )
    return CompanyListResponse(
        items=[CompanyResponse.model_validate(c) for c in companies],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{company_id}", response_model=CompanyDetailResponse)
def get_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyDetailResponse:
    company = company_service.get_company_detail_or_404(db, company_id, current_user)
    return CompanyDetailResponse(
        **CompanyResponse.model_validate(company).model_dump(),
        contacts=[LinkedContactResponse.model_validate(c) for c in company.contacts],
        deals=[LinkedDealResponse.model_validate(d) for d in company.deals],
    )


@router.patch("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: str,
    body: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyResponse:
    company = company_service.update_company(db, company_id, body, current_user)
    return CompanyResponse.model_validate(company)


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    company_service.delete_company(db, company_id, current_user)
