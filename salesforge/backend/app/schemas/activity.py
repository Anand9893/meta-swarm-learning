from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ActivityCreate(BaseModel):
    type: str
    title: str
    description: str | None = None
    due_date: datetime | None = None
    deal_id: str | None = None
    contact_id: str | None = None
    lead_id: str | None = None


class ActivityUpdate(BaseModel):
    type: str | None = None
    title: str | None = None
    description: str | None = None
    due_date: datetime | None = None
    completed: bool | None = None
    deal_id: str | None = None
    contact_id: str | None = None
    lead_id: str | None = None


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    title: str
    description: str | None
    due_date: datetime | None
    completed: bool
    deal_id: str | None
    contact_id: str | None
    lead_id: str | None
    owner_id: str
    created_at: datetime
    updated_at: datetime


class ActivityListResponse(BaseModel):
    items: list[ActivityResponse]
    total: int
    page: int
    page_size: int
