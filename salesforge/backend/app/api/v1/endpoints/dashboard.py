from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.dashboard import (
    ActivityWithParentResponse,
    DashboardStatsResponse,
    PipelineStageResponse,
)
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardStatsResponse:
    stats = dashboard_service.kpi_stats(db, current_user)
    return DashboardStatsResponse(**stats)


@router.get("/pipeline-by-stage", response_model=list[PipelineStageResponse])
def get_pipeline_by_stage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PipelineStageResponse]:
    stages = dashboard_service.pipeline_by_stage(db, current_user)
    return [PipelineStageResponse(**s) for s in stages]


@router.get("/recent-activities", response_model=list[ActivityWithParentResponse])
def get_recent_activities(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ActivityWithParentResponse]:
    activities = dashboard_service.recent_activities(db, current_user)
    return [ActivityWithParentResponse(**a) for a in activities]
