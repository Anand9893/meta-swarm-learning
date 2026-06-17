from __future__ import annotations

from pydantic import BaseModel

from app.schemas.activity import ActivityResponse


class DashboardStatsResponse(BaseModel):
    leads_this_week: int
    pipeline_value: float
    deals_won_this_month: int
    deals_won_value_this_month: float
    overdue_activities: int


class PipelineStageResponse(BaseModel):
    stage: str
    count: int
    total_value: float


class ActivityWithParentResponse(ActivityResponse):
    linked_record_name: str | None = None
    linked_record_type: str | None = None
