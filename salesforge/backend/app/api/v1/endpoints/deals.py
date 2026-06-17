from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.deal import (
    DealCreate,
    DealListResponse,
    DealResponse,
    DealUpdate,
    PipelineStageSummary,
)
from app.services import deal_service

router = APIRouter(prefix="/deals", tags=["deals"])


# pipeline-summary must be defined BEFORE /{deal_id} to avoid route conflict
@router.get("/pipeline-summary", response_model=list[PipelineStageSummary])
def get_pipeline_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PipelineStageSummary]:
    summary = deal_service.pipeline_summary(db, current_user)
    return [PipelineStageSummary(**s) for s in summary]


@router.post("", response_model=DealResponse, status_code=status.HTTP_201_CREATED)
def create_deal(
    body: DealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DealResponse:
    deal = deal_service.create_deal(db, body, current_user)
    return DealResponse.model_validate(deal)


@router.get("", response_model=DealListResponse)
def list_deals(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    stage: str | None = Query(default=None),
    owner_id: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DealListResponse:
    deals, total = deal_service.list_deals(
        db,
        current_user,
        page=page,
        page_size=page_size,
        stage=stage,
        owner_id=owner_id,
        search=search,
    )
    return DealListResponse(
        items=[DealResponse.model_validate(d) for d in deals],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{deal_id}", response_model=DealResponse)
def get_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DealResponse:
    deal = deal_service.get_deal_or_404(db, deal_id, current_user)
    return DealResponse.model_validate(deal)


@router.patch("/{deal_id}", response_model=DealResponse)
def update_deal(
    deal_id: str,
    body: DealUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DealResponse:
    deal = deal_service.update_deal(db, deal_id, body, current_user)
    return DealResponse.model_validate(deal)


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deal(
    deal_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    deal_service.delete_deal(db, deal_id, current_user)
