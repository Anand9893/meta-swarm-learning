from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class DealCreate(BaseModel):
    title: str
    value: float | None = None
    currency: str = "USD"
    stage: str = "prospect"
    probability: int | None = None
    expected_close_date: date | None = None
    contact_id: str | None = None
    company_id: str | None = None


class DealUpdate(BaseModel):
    title: str | None = None
    value: float | None = None
    currency: str | None = None
    stage: str | None = None
    probability: int | None = None
    expected_close_date: date | None = None
    contact_id: str | None = None
    company_id: str | None = None


class DealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    value: float | None
    currency: str
    stage: str
    probability: int
    expected_close_date: date | None
    contact_id: str | None
    company_id: str | None
    owner_id: str
    created_at: datetime
    updated_at: datetime


class DealListResponse(BaseModel):
    items: list[DealResponse]
    total: int
    page: int
    page_size: int


class PipelineStageSummary(BaseModel):
    stage: str
    count: int
    total_value: float
