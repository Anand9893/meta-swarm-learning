from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.lead import (
    LeadConvertRequest,
    LeadConvertResponse,
    LeadCreate,
    LeadListResponse,
    LeadResponse,
    LeadUpdate,
)
from app.services import lead_service

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(
    body: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadResponse:
    lead = lead_service.create_lead(db, body, current_user)
    return LeadResponse.model_validate(lead)


@router.get("", response_model=LeadListResponse)
def list_leads(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadListResponse:
    leads, total = lead_service.list_leads(
        db,
        current_user,
        page=page,
        page_size=page_size,
        status_filter=status,
        search=search,
    )
    return LeadListResponse(
        items=[LeadResponse.model_validate(lead) for lead in leads],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadResponse:
    lead = lead_service.get_lead_or_404(db, lead_id, current_user)
    return LeadResponse.model_validate(lead)


@router.patch("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: str,
    body: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadResponse:
    lead = lead_service.update_lead(db, lead_id, body, current_user)
    return LeadResponse.model_validate(lead)


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    lead_service.delete_lead(db, lead_id, current_user)


@router.post("/{lead_id}/convert", response_model=LeadConvertResponse)
def convert_lead(
    lead_id: str,
    body: LeadConvertRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LeadConvertResponse:
    return lead_service.convert_lead(db, lead_id, body, current_user)
