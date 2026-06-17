from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None
