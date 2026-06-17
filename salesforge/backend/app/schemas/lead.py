from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LeadCreate(BaseModel):
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    company_name: str | None = None
    status: str = "new"
    source: str | None = None
    notes: str | None = None


class LeadUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    company_name: str | None = None
    status: str | None = None
    source: str | None = None
    notes: str | None = None


class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    company_name: str | None
    status: str
    source: str | None
    notes: str | None
    owner_id: str
    created_at: datetime
    updated_at: datetime


class LeadListResponse(BaseModel):
    items: list[LeadResponse]
    total: int
    page: int
    page_size: int


class LeadConvertRequest(BaseModel):
    create_company: bool = True
    create_deal: bool = False
    deal_title: str | None = None
    deal_value: float | None = None


class LeadConvertResponse(BaseModel):
    contact_id: str
    company_id: str | None
    deal_id: str | None
