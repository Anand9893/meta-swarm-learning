from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    title: str | None = None
    company_id: str | None = None


class ContactUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    title: str | None = None
    company_id: str | None = None


class ContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_name: str
    last_name: str
    email: str | None
    phone: str | None
    title: str | None
    company_id: str | None
    owner_id: str
    created_at: datetime
    updated_at: datetime


class LinkedDealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    stage: str
    value: float | None
    expected_close_date: date | None = None


class LinkedActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    title: str
    due_date: datetime | None
    completed: bool
    created_at: datetime


class ContactDetailResponse(ContactResponse):
    deals: list[LinkedDealResponse] = []
    activities: list[LinkedActivityResponse] = []


class ContactListResponse(BaseModel):
    items: list[ContactResponse]
    total: int
    page: int
    page_size: int
