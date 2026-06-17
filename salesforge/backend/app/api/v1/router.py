from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    activities,
    auth,
    companies,
    contacts,
    dashboard,
    deals,
    leads,
    users,
)

router = APIRouter()
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(leads.router)
router.include_router(contacts.router)
router.include_router(companies.router)
router.include_router(deals.router)
router.include_router(activities.router)
router.include_router(dashboard.router)
