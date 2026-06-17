from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.contact import (
    ContactCreate,
    ContactDetailResponse,
    ContactListResponse,
    ContactResponse,
    ContactUpdate,
    LinkedActivityResponse,
    LinkedDealResponse,
)
from app.services import contact_service

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_contact(
    body: ContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContactResponse:
    contact = contact_service.create_contact(db, body, current_user)
    return ContactResponse.model_validate(contact)


@router.get("", response_model=ContactListResponse)
def list_contacts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    company_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContactListResponse:
    contacts, total = contact_service.list_contacts(
        db,
        current_user,
        page=page,
        page_size=page_size,
        company_id=company_id,
        search=search,
    )
    return ContactListResponse(
        items=[ContactResponse.model_validate(c) for c in contacts],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{contact_id}", response_model=ContactDetailResponse)
def get_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContactDetailResponse:
    contact = contact_service.get_contact_detail_or_404(db, contact_id, current_user)
    activities_sorted = sorted(
        contact.activities, key=lambda a: a.created_at, reverse=True
    )
    return ContactDetailResponse(
        **ContactResponse.model_validate(contact).model_dump(),
        deals=[LinkedDealResponse.model_validate(d) for d in contact.deals],
        activities=[LinkedActivityResponse.model_validate(a) for a in activities_sorted],
    )


@router.patch("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: str,
    body: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContactResponse:
    contact = contact_service.update_contact(db, contact_id, body, current_user)
    return ContactResponse.model_validate(contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    contact_service.delete_contact(db, contact_id, current_user)
