from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.activity import (
    ActivityCreate,
    ActivityListResponse,
    ActivityResponse,
    ActivityUpdate,
)
from app.services import activity_service

router = APIRouter(prefix="/activities", tags=["activities"])


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(
    body: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityResponse:
    activity = activity_service.create_activity(db, body, current_user)
    return ActivityResponse.model_validate(activity)


@router.get("", response_model=ActivityListResponse)
def list_activities(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    type: str | None = Query(default=None),
    completed: bool | None = Query(default=None),
    deal_id: str | None = Query(default=None),
    contact_id: str | None = Query(default=None),
    lead_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityListResponse:
    activities, total = activity_service.list_activities(
        db,
        current_user,
        page=page,
        page_size=page_size,
        type=type,
        completed=completed,
        deal_id=deal_id,
        contact_id=contact_id,
        lead_id=lead_id,
    )
    return ActivityListResponse(
        items=[ActivityResponse.model_validate(a) for a in activities],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{activity_id}", response_model=ActivityResponse)
def get_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityResponse:
    activity = activity_service.get_activity_or_404(db, activity_id, current_user)
    return ActivityResponse.model_validate(activity)


@router.patch("/{activity_id}", response_model=ActivityResponse)
def update_activity(
    activity_id: str,
    body: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ActivityResponse:
    activity = activity_service.update_activity(db, activity_id, body, current_user)
    return ActivityResponse.model_validate(activity)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    activity_service.delete_activity(db, activity_id, current_user)
