from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CompanyCreate(BaseModel):
    name: str
    website: str | None = None
    industry: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None


class CompanyUpdate(BaseModel):
    name: str | None = None
    website: str | None = None
    industry: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    website: str | None
    industry: str | None
    phone: str | None
    address: str | None
    notes: str | None
    owner_id: str
    created_at: datetime
    updated_at: datetime


class LinkedContactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    first_name: str
    last_name: str
    email: str | None
    title: str | None


class LinkedDealResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    stage: str
    value: float | None
    expected_close_date: object | None = None


class CompanyDetailResponse(CompanyResponse):
    contacts: list[LinkedContactResponse] = []
    deals: list[LinkedDealResponse] = []


class CompanyListResponse(BaseModel):
    items: list[CompanyResponse]
    total: int
    page: int
    page_size: int
