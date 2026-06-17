# SalesForge CRM — Implementation Plan

**Version**: 1.0  
**Date**: 2026-06-16  
**Status**: Ready for CTO Review  
**Specs**: All seven feature specs in `specs/` (source of truth)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Work Units](#3-work-units)
4. [API Contracts](#4-api-contracts)
5. [Testing Strategy](#5-testing-strategy)
6. [Key Decisions](#6-key-decisions)
7. [Risks and Mitigations](#7-risks-and-mitigations)

---

## 1. Architecture Overview

### Backend Directory Structure

```
backend/
├── pyproject.toml                    # deps: fastapi, uvicorn, sqlalchemy, alembic, pyjwt, bcrypt, pydantic-settings, httpx, pytest, pytest-cov, pytest-asyncio, ruff, mypy
├── alembic.ini
├── alembic/
│   └── versions/                     # Migration files (auto-generated)
├── app/
│   ├── main.py                       # FastAPI app factory; mounts /api/v1 router; CORS
│   ├── core/
│   │   ├── config.py                 # pydantic-settings: DATABASE_URL, SECRET_KEY, env vars
│   │   ├── security.py               # JWT encode/decode, bcrypt hash/verify, token generation
│   │   ├── deps.py                   # FastAPI dependency functions: get_db, get_current_user, require_role
│   │   └── database.py               # SQLAlchemy engine, SessionLocal, Base declarative
│   ├── models/
│   │   ├── __init__.py               # Re-exports all models so Alembic autogenerates correctly
│   │   ├── user.py                   # User, RefreshToken, PasswordResetToken
│   │   ├── lead.py                   # Lead
│   │   ├── contact.py                # Contact
│   │   ├── company.py                # Company
│   │   ├── deal.py                   # Deal
│   │   └── activity.py               # Activity
│   ├── schemas/
│   │   ├── auth.py                   # RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, PasswordResetRequest, PasswordResetConfirm
│   │   ├── user.py                   # UserResponse, UserUpdate (admin role/active patch)
│   │   ├── lead.py                   # LeadCreate, LeadUpdate, LeadResponse, LeadConvertRequest, LeadConvertResponse, LeadListResponse
│   │   ├── contact.py                # ContactCreate, ContactUpdate, ContactResponse, ContactListResponse
│   │   ├── company.py                # CompanyCreate, CompanyUpdate, CompanyResponse, CompanyListResponse
│   │   ├── deal.py                   # DealCreate, DealUpdate, DealResponse, DealListResponse, PipelineSummaryResponse
│   │   ├── activity.py               # ActivityCreate, ActivityUpdate, ActivityResponse, ActivityListResponse
│   │   └── dashboard.py              # DashboardStatsResponse, PipelineStageResponse
│   ├── api/
│   │   └── v1/
│   │       ├── router.py             # Aggregates all endpoint routers under /api/v1
│   │       └── endpoints/
│   │           ├── auth.py           # /auth/*
│   │           ├── users.py          # /users/* (admin only)
│   │           ├── leads.py          # /leads/* + /leads/{id}/convert
│   │           ├── contacts.py       # /contacts/*
│   │           ├── companies.py      # /companies/*
│   │           ├── deals.py          # /deals/*
│   │           ├── activities.py     # /activities/*
│   │           └── dashboard.py      # /dashboard/*
│   └── services/
│       ├── auth_service.py           # register, login, refresh, logout, forgot_password, reset_password
│       ├── lead_service.py           # CRUD + convert_lead (atomic)
│       ├── contact_service.py        # CRUD
│       ├── company_service.py        # CRUD
│       ├── deal_service.py           # CRUD + pipeline_summary
│       ├── activity_service.py       # CRUD + overdue_count
│       └── dashboard_service.py      # kpi_stats, pipeline_by_stage, recent_activities
└── tests/
    ├── conftest.py                   # pytest fixtures: engine (SQLite in-memory), db session, authenticated client per role
    ├── test_auth.py
    ├── test_leads.py
    ├── test_contacts.py
    ├── test_companies.py
    ├── test_deals.py
    ├── test_activities.py
    └── test_dashboard.py
```

### Frontend Directory Structure

```
frontend/
├── package.json                      # deps: react, react-router-dom v6, @tanstack/react-query, axios, recharts, @dnd-kit/core, @dnd-kit/sortable, tailwindcss; devDeps: vitest, @vitest/coverage-v8, @testing-library/react, @testing-library/jest-dom, msw, jsdom
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx                      # ReactDOM.createRoot; wrap with QueryClientProvider + BrowserRouter
│   ├── App.tsx                       # Routes defined inside BrowserRouter (classic RRD v6 API); ProtectedRoute wrapper
│   ├── api/                          # React Query hooks (one file per domain)
│   │   ├── auth.ts                   # useLogin, useRegister, useLogout, useRefreshToken, useForgotPassword, useResetPassword
│   │   ├── users.ts                  # useUsers, useUpdateUser (Admin role/deactivate)
│   │   ├── leads.ts                  # useLeads, useLead, useCreateLead, useUpdateLead, useDeleteLead, useConvertLead
│   │   ├── contacts.ts               # useContacts, useContact, useCreateContact, useUpdateContact, useDeleteContact
│   │   ├── companies.ts              # useCompanies, useCompany, useCreateCompany, useUpdateCompany, useDeleteCompany
│   │   ├── deals.ts                  # useDeals, useDeal, useCreateDeal, useUpdateDeal, useDeleteDeal, usePipelineSummary
│   │   ├── activities.ts             # useActivities, useActivity, useCreateActivity, useUpdateActivity, useDeleteActivity, useToggleComplete
│   │   └── dashboard.ts              # useDashboardStats, usePipelineByStage, useRecentActivities
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Layout.tsx            # App shell: sidebar nav, header, outlet
│   │   │   ├── ProtectedRoute.tsx    # Redirects to /login if unauthenticated
│   │   │   ├── Pagination.tsx        # Reusable pagination control
│   │   │   ├── SearchBar.tsx
│   │   │   ├── StatusBadge.tsx       # Coloured pill badge for lead status, deal stage
│   │   │   ├── ConfirmModal.tsx      # Generic "Are you sure?" dialog
│   │   │   └── ErrorBoundary.tsx
│   │   ├── leads/
│   │   │   ├── LeadForm.tsx          # Create/edit form (shared)
│   │   │   ├── LeadCard.tsx          # Row in list
│   │   │   └── ConvertLeadModal.tsx  # Convert wizard with toggles for Company + Deal
│   │   ├── contacts/
│   │   │   ├── ContactForm.tsx
│   │   │   └── ActivityTimeline.tsx  # Reusable timeline (used by Contact + Deal + Lead detail)
│   │   ├── companies/
│   │   │   └── CompanyForm.tsx
│   │   ├── deals/
│   │   │   ├── DealForm.tsx
│   │   │   ├── KanbanBoard.tsx       # @dnd-kit DndContext wrapper
│   │   │   ├── KanbanColumn.tsx      # Per-stage droppable column with count + total value header
│   │   │   └── DealCard.tsx          # Draggable deal card
│   │   ├── activities/
│   │   │   ├── ActivityForm.tsx      # Modal form; accepts optional pre-filled parentId + parentType
│   │   │   └── ActivityListItem.tsx  # Row with inline complete toggle; shows linked record name (deal title / contact name / lead name)
│   │   ├── admin/
│   │   │   └── UsersTable.tsx        # Table of all users with role badge, is_active toggle, role change (Admin only)
│   │   └── dashboard/
│   │       ├── KpiTile.tsx           # Single KPI tile component
│   │       └── PipelineChart.tsx     # Recharts BarChart for pipeline by stage
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── UsersPage.tsx             # Admin-only: list users, deactivate, change role (spec 001-auth FR-012)
│   │   ├── LeadsPage.tsx             # List
│   │   ├── LeadDetailPage.tsx        # Detail + activities timeline
│   │   ├── ContactsPage.tsx
│   │   ├── ContactDetailPage.tsx
│   │   ├── CompaniesPage.tsx
│   │   ├── CompanyDetailPage.tsx     # Tabbed: Contacts + Deals
│   │   ├── DealsPage.tsx             # List + Kanban toggle
│   │   ├── DealDetailPage.tsx
│   │   └── ActivitiesPage.tsx        # Global activities list
│   ├── hooks/
│   │   ├── useAuth.ts                # Auth context consumer: currentUser, role helpers, logout
│   │   └── useOwnerGuard.ts          # Returns true if current user can edit a record (owner || manager || admin)
│   └── types/
│       ├── auth.ts
│       ├── lead.ts
│       ├── contact.ts
│       ├── company.ts
│       ├── deal.ts
│       ├── activity.ts
│       └── dashboard.ts
└── tests/                            # vitest + React Testing Library
    ├── setup.ts                      # imports @testing-library/jest-dom; starts MSW server
    ├── mocks/
    │   ├── server.ts                 # MSW setupServer() export
    │   └── handlers/                 # Per-domain handler files (auth.ts, leads.ts, etc.)
    ├── auth.test.tsx
    ├── leads.test.tsx
    ├── contacts.test.tsx
    ├── companies.test.tsx
    ├── deals.test.tsx
    ├── activities.test.tsx
    └── dashboard.test.tsx
```

---

## 2. Database Schema

### Enumerations (Python Enums → Pydantic literals → SQLAlchemy String columns with check constraints)

```python
class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    rep = "rep"

class LeadStatus(str, Enum):
    new = "new"
    contacted = "contacted"
    qualified = "qualified"
    converted = "converted"
    lost = "lost"

class DealStage(str, Enum):
    prospect = "prospect"       # default probability: 10
    proposal = "proposal"       # 30
    negotiation = "negotiation" # 60
    won = "won"                 # 100
    lost = "lost"               # 0

class ActivityType(str, Enum):
    call = "call"
    email = "email"
    meeting = "meeting"
    task = "task"
```

### SQLAlchemy Models

```python
# models/user.py
class User(Base):
    __tablename__ = "users"
    id: Mapped[str]              = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str]           = mapped_column(String, unique=True, nullable=False, index=True)
    full_name: Mapped[str]       = mapped_column(String, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str]            = mapped_column(String, nullable=False, default="rep")
    is_active: Mapped[bool]      = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    reset_tokens   = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    leads          = relationship("Lead", back_populates="owner")
    contacts       = relationship("Contact", back_populates="owner")
    companies      = relationship("Company", back_populates="owner")
    deals          = relationship("Deal", back_populates="owner")
    activities     = relationship("Activity", back_populates="owner")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[str]              = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str]         = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str]      = mapped_column(String, nullable=False, unique=True)  # SHA-256 of raw token
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool]        = mapped_column(Boolean, nullable=False, default=False)
    user = relationship("User", back_populates="refresh_tokens")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id: Mapped[str]              = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str]         = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str]      = mapped_column(String, nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used: Mapped[bool]           = mapped_column(Boolean, nullable=False, default=False)
    user = relationship("User", back_populates="reset_tokens")


# models/lead.py
class Lead(Base):
    __tablename__ = "leads"
    id: Mapped[str]              = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    first_name: Mapped[str]      = mapped_column(String, nullable=False)
    last_name: Mapped[str]       = mapped_column(String, nullable=False)
    email: Mapped[str | None]    = mapped_column(String, nullable=True)
    phone: Mapped[str | None]    = mapped_column(String, nullable=True)
    company_name: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str]          = mapped_column(String, nullable=False, default="new")
    source: Mapped[str | None]   = mapped_column(String, nullable=True)
    notes: Mapped[str | None]    = mapped_column(Text, nullable=True)
    owner_id: Mapped[str]        = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    owner      = relationship("User", back_populates="leads")
    activities = relationship("Activity", back_populates="lead", foreign_keys="Activity.lead_id")
    # Index for list queries
    __table_args__ = (Index("ix_leads_owner_status", "owner_id", "status"),)


# models/contact.py
class Contact(Base):
    __tablename__ = "contacts"
    id: Mapped[str]              = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    first_name: Mapped[str]      = mapped_column(String, nullable=False)
    last_name: Mapped[str]       = mapped_column(String, nullable=False)
    email: Mapped[str | None]    = mapped_column(String, nullable=True)
    phone: Mapped[str | None]    = mapped_column(String, nullable=True)
    title: Mapped[str | None]    = mapped_column(String, nullable=True)
    company_id: Mapped[str | None] = mapped_column(String, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    owner_id: Mapped[str]        = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    owner      = relationship("User", back_populates="contacts")
    company    = relationship("Company", back_populates="contacts")
    deals      = relationship("Deal", back_populates="contact", foreign_keys="Deal.contact_id")
    activities = relationship("Activity", back_populates="contact", foreign_keys="Activity.contact_id")


# models/company.py
class Company(Base):
    __tablename__ = "companies"
    id: Mapped[str]              = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str]            = mapped_column(String, nullable=False)
    website: Mapped[str | None]  = mapped_column(String, nullable=True)
    industry: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None]    = mapped_column(String, nullable=True)
    address: Mapped[str | None]  = mapped_column(Text, nullable=True)
    notes: Mapped[str | None]    = mapped_column(Text, nullable=True)
    owner_id: Mapped[str]        = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    owner    = relationship("User", back_populates="companies")
    contacts = relationship("Contact", back_populates="company")
    deals    = relationship("Deal", back_populates="company", foreign_keys="Deal.company_id")


# models/deal.py
STAGE_DEFAULT_PROBABILITY = {
    "prospect": 10, "proposal": 30, "negotiation": 60, "won": 100, "lost": 0
}
class Deal(Base):
    __tablename__ = "deals"
    id: Mapped[str]                   = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str]                = mapped_column(String, nullable=False)
    value: Mapped[float | None]       = mapped_column(Float, nullable=True)
    currency: Mapped[str]             = mapped_column(String(3), nullable=False, default="USD")
    stage: Mapped[str]                = mapped_column(String, nullable=False, default="prospect")
    probability: Mapped[int]          = mapped_column(Integer, nullable=False, default=10)
    expected_close_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    contact_id: Mapped[str | None]    = mapped_column(String, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, index=True)
    company_id: Mapped[str | None]    = mapped_column(String, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    owner_id: Mapped[str]             = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    owner      = relationship("User", back_populates="deals")
    contact    = relationship("Contact", back_populates="deals", foreign_keys=[contact_id])
    company    = relationship("Company", back_populates="deals", foreign_keys=[company_id])
    activities = relationship("Activity", back_populates="deal", foreign_keys="Activity.deal_id")
    __table_args__ = (Index("ix_deals_owner_stage", "owner_id", "stage"),)


# models/activity.py
class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[str]               = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    type: Mapped[str]             = mapped_column(String, nullable=False)          # call | email | meeting | task
    title: Mapped[str]            = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed: Mapped[bool]       = mapped_column(Boolean, nullable=False, default=False)
    deal_id: Mapped[str | None]   = mapped_column(String, ForeignKey("deals.id", ondelete="SET NULL"), nullable=True, index=True)
    contact_id: Mapped[str | None] = mapped_column(String, ForeignKey("contacts.id", ondelete="SET NULL"), nullable=True, index=True)
    lead_id: Mapped[str | None]   = mapped_column(String, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    owner_id: Mapped[str]         = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime]  = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    owner   = relationship("User", back_populates="activities")
    deal    = relationship("Deal", back_populates="activities", foreign_keys=[deal_id])
    contact = relationship("Contact", back_populates="activities", foreign_keys=[contact_id])
    lead    = relationship("Lead", back_populates="activities", foreign_keys=[lead_id])
    __table_args__ = (Index("ix_activities_owner_completed", "owner_id", "completed"),)
```

### Alembic Migration Strategy

- Single initial migration contains all tables in dependency order: users → companies → contacts → deals → leads → activities → refresh_tokens → password_reset_tokens.
- `ondelete="SET NULL"` FK constraints handle cascade nullification for contacts/deals/activities when parent records are deleted (specs: companies-FR-009, contacts-FR-009, leads-FR-012, deals-FR-011, activities-FR-010).
- `ondelete="CASCADE"` on refresh_tokens and password_reset_tokens (user-owned, no orphans needed).
- Composite indexes: `(owner_id, status)` on leads, `(owner_id, stage)` on deals, `(owner_id, completed)` on activities — supports the filtered list queries that RBAC scoping requires.

---

## 3. Work Units

Each Work Unit (WU) is a self-contained chunk of max ~5 files, with clear acceptance criteria traceable to spec FRs and a dependency graph enabling maximum parallelism.

```
WU-01 → WU-02 → WU-03 ─┐
                         ├─ WU-04 ─┬─ WU-06 → WU-07
                         │          ├─ WU-08 → WU-09
                         │          ├─ WU-10 → WU-11
                         │          ├─ WU-12 → WU-13
                         │          ├─ WU-14 → WU-15
                         │          └─ WU-16 → WU-17
                WU-05 ───┘
All WUs above → WU-18
```

---

### WU-01 — Project Scaffolding

**Type**: Sequential (first)  
**Description**: Create backend and frontend project structures with all configuration files and dependency manifests. No business logic.

**Files**:
- `backend/pyproject.toml` (all deps: fastapi, uvicorn, sqlalchemy, alembic, pyjwt, bcrypt, pydantic-settings, httpx, pytest, pytest-cov, pytest-asyncio, ruff, mypy, pytest-cov)
- `backend/alembic.ini`
- `backend/app/__init__.py`, `backend/app/main.py`
- `backend/app/core/config.py`, `backend/app/core/database.py`
- `backend/app/core/utils.py` (contains `start_of_month() -> datetime` helper and other shared utilities)
- `frontend/package.json` (all deps + devDeps including axios, msw, vitest, @vitest/coverage-v8, @testing-library/react, @testing-library/jest-dom)
- `frontend/vite.config.ts`, `frontend/tailwind.config.ts`, `frontend/tsconfig.json`
- `frontend/tests/mocks/server.ts` (MSW `setupServer()` export)
- `frontend/tests/mocks/handlers/index.ts` (aggregates all domain handlers)
- `frontend/tests/setup.ts` (imports jest-dom; starts MSW server)
- `docker-compose.yml` (PostgreSQL dev database; Redis optional)

**Definition of Done**:
- `cd backend && pip install -e ".[dev]"` succeeds with no errors
- `cd frontend && npm install` succeeds
- `cd backend && uvicorn app.main:app --reload` starts and `GET /` returns 200
- `cd frontend && npm run dev` starts Vite dev server without errors
- `cd backend && ruff check .` passes with zero violations
- `cd frontend && npm run lint` passes
- `docker-compose up -d db` starts PostgreSQL; `alembic upgrade head` (WU-02) can connect

**Dependencies**: None  
**Parallel**: No (foundation)

---

### WU-02 — Database Models and Alembic Migrations

**Type**: Sequential after WU-01  
**Description**: Implement all SQLAlchemy models and generate the initial Alembic migration. No business logic yet.

**Files**:
- `backend/app/models/__init__.py`
- `backend/app/models/user.py` (User, RefreshToken, PasswordResetToken)
- `backend/app/models/lead.py`
- `backend/app/models/contact.py`
- `backend/app/models/company.py`
- `backend/app/models/deal.py`
- `backend/app/models/activity.py`
- `backend/alembic/versions/0001_initial_schema.py`
- `backend/tests/conftest.py` (SQLite in-memory engine fixture)
- `backend/tests/test_models.py`

**Definition of Done**:
- `alembic upgrade head` runs against a fresh PostgreSQL DB with no errors (requires `docker-compose up db` or a local PostgreSQL instance; a `docker-compose.yml` is created in WU-01 for dev convenience)
- `alembic downgrade base` reverses cleanly
- All FK `ondelete` rules verified: deleting a Company sets Contact.company_id to null; deleting a Contact sets Deal.contact_id and Activity.contact_id to null; deleting a Deal sets Activity.deal_id to null; deleting a Lead sets Activity.lead_id to null
- All enums validated: inserting an invalid role/status/stage raises an integrity error
- `pytest tests/test_models.py` passes

**Dependencies**: WU-01  
**Parallel**: No

---

### WU-03 — Auth Backend

**Type**: Sequential after WU-02  
**Description**: All authentication endpoints and the security/service layer. Implements JWT token lifecycle, refresh, logout, and password reset. No RBAC ownership enforcement yet (that's WU-04).

**Files**:
- `backend/app/core/security.py`
- `backend/app/schemas/auth.py`, `backend/app/schemas/user.py`
- `backend/app/services/auth_service.py`
- `backend/app/api/v1/endpoints/auth.py`
- `backend/tests/test_auth.py`

**Definition of Done (traceable to spec 001-auth)**:
- FR-001/FR-002: `POST /api/v1/auth/register` creates user with role=rep; returns 409 on duplicate email
- FR-003: `POST /api/v1/auth/login` returns `{access_token, refresh_token, token_type}`; access_token expires in 30 min, refresh_token in 7 days
- FR-004: RefreshToken row written to DB on login; lookup by SHA-256 hash of raw token
- FR-005: `POST /api/v1/auth/refresh` issues new access_token from valid, non-revoked refresh_token; returns 401 otherwise
- FR-004/US2-AC3: `POST /api/v1/auth/logout` sets `revoked=true` on the RefreshToken row; subsequent use of that refresh token returns 401
- FR-008/FR-009: `POST /api/v1/auth/forgot-password` logs reset URL to console; always returns 200 (no email enumeration); `POST /api/v1/auth/reset-password` validates token not used/expired (1h), hashes new password, marks token used
- FR-010: Any endpoint with `get_current_user` dep returns 401 if `user.is_active=False`
- FR-011: forgot-password response is identical whether email is registered or not
- `pytest tests/test_auth.py -v` passes with ≥80% coverage for this module

**Dependencies**: WU-02  
**Parallel**: No (WU-04 and WU-05 depend on this)

---

### WU-04 — RBAC Middleware and Ownership Guards

**Type**: Sequential after WU-03  
**Description**: FastAPI dependency functions that enforce role-based access and ownership. These are injected into all downstream endpoint WUs; implementing them before those WUs keeps permission logic centralised.

**Files**:
- `backend/app/core/deps.py` (get_db, get_current_user, require_role, require_owner_or_above)
- `backend/app/api/v1/endpoints/users.py` (Admin: list/deactivate users, change role)
- `backend/tests/test_rbac.py`

**Design**:
```
get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    # Decode JWT, load user, check is_active, raise 401/403

require_role(*allowed_roles: UserRole):
    # Returns a dependency that raises 403 if current_user.role not in allowed_roles

require_owner_or_above(record_owner_id: str, current_user: User):
    # Rep must be owner; Manager or Admin always pass; raises 403 otherwise
    # Called at the SERVICE layer, not just the route, to prevent bypass via direct service calls
```

**Definition of Done (traceable to spec 001-auth)**:
- FR-006: Rep accessing GET /leads returns only own records; Manager/Admin see all
- FR-007: Rep PATCHing another rep's lead returns 403
- FR-010: Deactivated user's valid JWT returns 401 on next request
- FR-012: `PATCH /api/v1/users/{id}` by Admin can set `is_active=false`; only Admin can change role
- `pytest tests/test_rbac.py` passes covering all role × action combinations

**Dependencies**: WU-03  
**Parallel**: No (all subsequent backend WUs inject these deps)

---

### WU-05 — Auth Frontend

**Type**: Parallel with WU-04 (depends on WU-03 being deployed or proxied)  
**Description**: All auth pages, token storage strategy, axios interceptor for transparent token refresh.

**Files**:
- `frontend/src/types/auth.ts`
- `frontend/src/api/auth.ts`
- `frontend/src/api/users.ts` (useUsers, useUpdateUser — Admin role management)
- `frontend/src/hooks/useAuth.ts`
- `frontend/src/components/shared/ProtectedRoute.tsx`
- `frontend/src/components/admin/UsersTable.tsx` (list, deactivate, role change — Admin only)
- `frontend/src/pages/LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`
- `frontend/src/pages/UsersPage.tsx` (Admin-only; guarded by role check; spec 001-auth FR-012 / US4-AC3)
- `frontend/tests/auth.test.tsx`

**Token Storage Decision**: `localStorage` (see Section 6 — Key Decisions).

**Refresh Logic**:
- Axios response interceptor: on 401, attempt `POST /auth/refresh` with stored refresh_token. On success, retry original request with new access_token. On failure, clear localStorage and redirect to `/login`.
- React Query's `onError` global handler also redirects on 401 to handle edge cases.

**Definition of Done (traceable to spec 001-auth)**:
- US1: Register form → success → redirected to /login
- US1-AC2: Duplicate email shows inline error; no duplicate account created
- US1-AC3: Login → tokens stored → redirect to /dashboard
- US1-AC4: Wrong credentials → generic "invalid email or password" message; no field-specific hint
- US2-AC1: Expired access token auto-refreshed transparently (interceptor tested with mocked 401)
- US2-AC3: Logout clears localStorage and redirects to /login; refresh token cannot be reused
- US3-AC1/AC4: Forgot-password form always shows neutral confirmation; reset form validates token expiry on submit
- ProtectedRoute redirects unauthenticated users to /login
- FR-012 / US4-AC3: UsersPage is visible only to Admin users (non-Admin redirect to dashboard); Admin can deactivate a user account (is_active toggled); Admin can change user role via dropdown; both actions call `PATCH /api/v1/users/{id}` and reflect in the table immediately via React Query cache update
- `npm run test -- auth` passes for auth tests (vitest pattern)

**Dependencies**: WU-03  
**Parallel**: Can run parallel to WU-04

---

### WU-06 — Leads Backend

**Type**: Parallel-eligible after WU-04  
**Description**: Full CRUD plus the atomic Convert Lead action and paginated/filtered list endpoint.

**Files**:
- `backend/app/schemas/lead.py`
- `backend/app/services/lead_service.py`
- `backend/app/api/v1/endpoints/leads.py`
- `backend/tests/test_leads.py`

**Convert Lead Atomicity**:
```python
def convert_lead(db: Session, lead_id: str, current_user: User, payload: LeadConvertRequest) -> LeadConvertResponse:
    with db.begin_nested():  # SAVEPOINT for atomic rollback
        lead = get_lead_or_404(db, lead_id)
        if lead.status == LeadStatus.converted:
            raise HTTPException(400, "Lead already converted")
        # 1. Always create Contact
        contact = Contact(first_name=lead.first_name, ..., owner_id=current_user.id)
        db.add(contact)
        db.flush()  # get contact.id without committing
        # 2. Optionally create Company (skip if company_name blank)
        company = None
        if payload.create_company:
            if not lead.company_name:
                # warn but do not fail; skip company creation per spec edge case
                pass
            else:
                company = Company(name=lead.company_name, owner_id=current_user.id)
                db.add(company)
                db.flush()
                contact.company_id = company.id
        # 3. Optionally create Deal
        deal = None
        if payload.create_deal and payload.deal_title:
            deal = Deal(title=payload.deal_title, value=payload.deal_value,
                        contact_id=contact.id, company_id=company.id if company else None,
                        stage="prospect", probability=10, owner_id=current_user.id)
            db.add(deal)
        # 4. Mark lead converted
        lead.status = LeadStatus.converted
    # SAVEPOINT commits here; outer transaction commits with db.commit() in route
    return LeadConvertResponse(contact_id=contact.id, company_id=company.id if company else None, deal_id=deal.id if deal else None)
```

**Definition of Done (traceable to spec 002-leads)**:
- FR-001: POST /api/v1/leads creates lead with owner=current_user, status=new
- FR-002: owner_id set automatically; status defaults to "new"
- FR-003: GET /api/v1/leads paginates at 20/page; Rep sees only own, Manager/Admin sees all
- FR-004: `?status=qualified&search=acme` filters correctly
- FR-005: PATCH /api/v1/leads/{id} allows owner or Manager/Admin; Rep blocked for others (403)
- FR-006: All five statuses (new/contacted/qualified/converted/lost) are accepted
- FR-007/FR-008: POST /api/v1/leads/{id}/convert atomic; all-or-nothing (rollback tested)
- FR-009: Lead record retained after conversion; status=converted
- FR-010: Converted lead returns 400 on re-conversion attempt
- FR-012: DELETE /api/v1/leads/{id} hard-deletes; Activity.lead_id set to null (FK ondelete=SET NULL)
- `pytest tests/test_leads.py` passes

**Dependencies**: WU-04  
**Parallel**: Can run parallel to WU-08, WU-10, WU-12, WU-14, WU-16

---

### WU-07 — Leads Frontend

**Type**: Sequential after WU-06  
**Description**: Leads list page, detail page, create/edit form, and Convert Lead modal.

**Files**:
- `frontend/src/types/lead.ts`
- `frontend/src/api/leads.ts`
- `frontend/src/components/leads/LeadForm.tsx`
- `frontend/src/components/leads/LeadCard.tsx`
- `frontend/src/components/leads/ConvertLeadModal.tsx`
- `frontend/src/pages/LeadsPage.tsx`
- `frontend/src/pages/LeadDetailPage.tsx`
- `frontend/tests/leads.test.tsx`

**Convert Lead Modal UX**:
- Three-section modal: always-on "Contact" section (pre-filled from lead), toggle "Create Company" (shows Company name field, warns if lead.company_name blank), toggle "Create Deal" (shows Title + Value fields).
- On submit: fire `POST /leads/{id}/convert`; on success navigate to `/contacts/{contact_id}`; on error show toast "Conversion failed — no records were created".
- Convert button hidden/disabled when `lead.status === "converted"`.

**Definition of Done**:
- US1-AC3: Leads list shows newest first; status badge and source visible
- US2-AC2: Manager filter `?status=qualified` shows all reps' leads
- US2-AC3: Rep editing another rep's lead gets 403 → shown as permission toast
- US3-AC4: After successful convert, rep redirected to new Contact detail page; lead record still shows `converted` badge
- US3-AC5: Simulated server error during convert shows error toast; no partial records in DB (tested with mocked API)
- US4-AC4: List with >20 records shows pagination controls; nav between pages works
- Convert button absent on converted leads
- `npm run test -- leads` passes (vitest pattern filter)

**Dependencies**: WU-06, WU-05  
**Parallel**: No (sequential after backend)

---

### WU-08 — Contacts Backend

**Type**: Parallel after WU-04  
**Description**: Contact CRUD with company-link support, paginated list with search/filter, and activities timeline sub-resource.

**Files**:
- `backend/app/schemas/contact.py`
- `backend/app/services/contact_service.py`
- `backend/app/api/v1/endpoints/contacts.py`
- `backend/tests/test_contacts.py`

**Definition of Done (traceable to spec 003-contacts)**:
- FR-001/FR-002: POST creates contact with owner=current_user
- FR-003: Paginated list; Rep sees own; Manager/Admin sees all
- FR-004: `?company_id=x&search=smith` filters correctly
- FR-005: PATCH enforces ownership (FR-005); 403 for Rep editing non-owned contact
- FR-006: GET /contacts/{id} returns full detail including linked deals list and activities sorted by created_at desc
- FR-007/FR-008: Company link update immediately reflected in Company's contacts (FK change tested)
- FR-009: DELETE sets Activity.contact_id and Deal.contact_id to null; contact hard-deleted
- `pytest tests/test_contacts.py` passes

**Dependencies**: WU-04  
**Parallel**: With WU-06, WU-10, WU-12, WU-14, WU-16

---

### WU-09 — Contacts Frontend

**Type**: Sequential after WU-08  
**Description**: Contacts list, detail page (with Deals list and Activities timeline), and create/edit form.

**Files**:
- `frontend/src/types/contact.ts`
- `frontend/src/api/contacts.ts`
- `frontend/src/components/contacts/ContactForm.tsx`
- `frontend/src/components/contacts/ActivityTimeline.tsx` (reusable; also used by Lead/Deal detail)
- `frontend/src/pages/ContactsPage.tsx`
- `frontend/src/pages/ContactDetailPage.tsx`
- `frontend/tests/contacts.test.tsx`

**Definition of Done**:
- US1-AC2: Linking contact to company shows contact under company's Contacts tab
- US1-AC4: Detail page shows all fields + Deals list + Activities timeline
- US2-AC2: Changing company link removes contact from old company tab
- US4-AC1: Activities tab shows activities in reverse-chronological order
- US4-AC2: Empty state shown when no activities
- US4-AC3: "Log Activity" button opens ActivityForm modal pre-filled with contact_id
- `npm run test -- contacts` passes (vitest pattern filter)

**Dependencies**: WU-08, WU-05  
**Parallel**: No (sequential after backend)

---

### WU-10 — Companies Backend

**Type**: Parallel after WU-04  
**Description**: Company CRUD with paginated list, search/filter, and company detail with embedded contacts/deals.

**Files**:
- `backend/app/schemas/company.py`
- `backend/app/services/company_service.py`
- `backend/app/api/v1/endpoints/companies.py`
- `backend/tests/test_companies.py`

**Definition of Done (traceable to spec 004-companies)**:
- FR-001/FR-002: POST requires name; owner set automatically
- FR-003: Paginated; Rep sees own; Manager/Admin sees all
- FR-004: `?industry=tech&search=acme` filters correctly
- FR-005: PATCH with ownership enforcement
- FR-006/FR-007/FR-008: GET /companies/{id} returns company fields + contacts sub-list + deals sub-list (all linked records regardless of ownership, since tabs are read-only relationship data)
- FR-009: DELETE company: Contact.company_id = null, Deal.company_id = null; company hard-deleted; contacts and deals retained
- `pytest tests/test_companies.py` passes

**Dependencies**: WU-04  
**Parallel**: With WU-06, WU-08, WU-12, WU-14, WU-16

---

### WU-11 — Companies Frontend

**Type**: Sequential after WU-10  
**Description**: Companies list and detail page with tabbed Contacts/Deals view.

**Files**:
- `frontend/src/types/company.ts`
- `frontend/src/api/companies.ts`
- `frontend/src/components/companies/CompanyForm.tsx`
- `frontend/src/pages/CompaniesPage.tsx`
- `frontend/src/pages/CompanyDetailPage.tsx` (tabs: Overview / Contacts / Deals)
- `frontend/tests/companies.test.tsx`

**Definition of Done**:
- US1-AC2: Contacts tab lists all linked contacts with name, email, title
- US1-AC2: Deals tab lists linked deals with title, stage, value, close date
- US2-AC3: Empty-state message shown in each empty tab
- US3-AC1: Industry filter returns only matching companies
- US4-AC1: Name update reflected on list, detail, linked contact/deal references (via React Query cache invalidation)
- Deleting company: confirmation modal required; after delete, contacts/deals that referenced it still exist in their own lists
- `npm run test -- companies` passes (vitest pattern filter)

**Dependencies**: WU-10, WU-05  
**Parallel**: No

---

### WU-12 — Deals Backend

**Type**: Parallel after WU-04  
**Description**: Deal CRUD, probability auto-update on stage change, pipeline summary aggregation endpoint.

**Files**:
- `backend/app/schemas/deal.py`
- `backend/app/services/deal_service.py`
- `backend/app/api/v1/endpoints/deals.py`
- `backend/tests/test_deals.py`

**Probability Auto-Update Rule** (FR-003):
```python
def update_deal(db, deal_id, payload: DealUpdate, current_user):
    deal = get_deal_or_404(db, deal_id)
    require_owner_or_above(deal.owner_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    # If stage changed but probability NOT explicitly provided in same request,
    # reset probability to stage default
    if "stage" in data and "probability" not in data:
        data["probability"] = STAGE_DEFAULT_PROBABILITY[data["stage"]]
    for k, v in data.items():
        setattr(deal, k, v)
    db.commit()
    return deal
```

**Pipeline Summary Endpoint**: `GET /api/v1/deals/pipeline-summary`
```python
# Returns list of {stage, count, total_value} for ALL five stages (zero-filled for empty stages)
# Scoped to current user's visibility
```

**Definition of Done (traceable to spec 005-deals)**:
- FR-001/FR-002: POST defaults stage=prospect, probability=10
- FR-003: Stage change without probability → probability resets to default; stage + probability → uses provided probability (manual override)
- FR-004: Paginated list; Rep sees own; Manager/Admin sees all; `?stage=proposal&search=enterprise`
- FR-005: Pipeline summary returns all 5 stages; empty stages show count=0, total_value=0
- FR-006: PATCH /deals/{id}/stage (or PATCH /deals/{id}) supports stage change with optimistic-UI friendly response
- FR-007: `?stage=won&owner_id=x` filter works for Manager
- FR-008/FR-009: Ownership enforcement; 403 for Rep editing non-owned
- FR-011: DELETE sets Activity.deal_id = null; deal hard-deleted
- FR-012: GET /deals/pipeline-summary returns correct counts and values from seeded test data
- `pytest tests/test_deals.py` passes

**Dependencies**: WU-04  
**Parallel**: With WU-06, WU-08, WU-10, WU-14, WU-16

---

### WU-13 — Deals Frontend (List + Kanban Board)

**Type**: Sequential after WU-12  
**Description**: Deals list page and the Kanban pipeline board with @dnd-kit drag-and-drop, optimistic UI, and rollback.

**Files**:
- `frontend/src/types/deal.ts`
- `frontend/src/api/deals.ts`
- `frontend/src/components/deals/DealForm.tsx`
- `frontend/src/components/deals/KanbanBoard.tsx`
- `frontend/src/components/deals/KanbanColumn.tsx`
- `frontend/src/components/deals/DealCard.tsx`
- `frontend/src/pages/DealsPage.tsx` (toggle between List and Kanban view)
- `frontend/src/pages/DealDetailPage.tsx`
- `frontend/tests/deals.test.tsx`

**Drag-and-Drop Architecture (@dnd-kit)**:
```tsx
// KanbanBoard.tsx
const [localDeals, setLocalDeals] = useState(deals);
const updateDeal = useUpdateDeal();

function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.stage === over.id) return;
    const prevDeals = localDeals;
    // Optimistic update
    setLocalDeals(prev => prev.map(d => d.id === active.id ? { ...d, stage: over.id as DealStage } : d));
    updateDeal.mutate(
        { id: active.id, stage: over.id },
        {
            onError: () => {
                setLocalDeals(prevDeals);  // rollback
                toast.error("Stage update failed — deal moved back");
            },
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["deals"] });        // TanStack Query v5 API
                queryClient.invalidateQueries({ queryKey: ["pipeline-summary"] });
            }
        }
    );
}
```

**Definition of Done**:
- US1-AC2: New deal appears in correct Kanban column immediately after creation
- US2-AC2: Drag card → card moves immediately (optimistic); column totals update
- US2-AC3: Simulated 500 from server → card snaps back; error toast shown
- US2-AC4: Deal moved to Won → probability=100%; deal shown distinctly (greyed/tagged)
- US2-AC5: Deal moved to Lost → probability=0%; visually distinguished
- US3-AC1: Manual probability override persists after save; stage unchanged
- US3-AC2: Subsequent drag resets probability to stage default
- US4-AC1: Column headers show correct count and total value per stage
- US4-AC3: Empty stage columns still rendered at zero, not hidden
- FR-010: DealDetailPage renders an Activities tab/section using `ActivityTimeline` component; activities are filtered by `deal_id` via `GET /activities?deal_id={id}`; "Log Activity" button opens ActivityForm pre-filled with deal_id; empty state shown when no activities linked
- `npm run test -- deals` passes (vitest pattern filter)

**Dependencies**: WU-12, WU-05  
**Parallel**: No

---

### WU-14 — Activities Backend

**Type**: Parallel after WU-04  
**Description**: Activity CRUD, completion toggle, paginated global list with multi-filter, and overdue count for dashboard.

**Files**:
- `backend/app/schemas/activity.py`
- `backend/app/services/activity_service.py`
- `backend/app/api/v1/endpoints/activities.py`
- `backend/tests/test_activities.py`

**Overdue Logic**:
```python
def overdue_count(db: Session, current_user: User) -> int:
    q = db.query(func.count(Activity.id)).filter(
        Activity.completed == False,
        Activity.due_date < datetime.utcnow(),
        Activity.due_date != None,
    )
    if current_user.role == UserRole.rep:
        q = q.filter(Activity.owner_id == current_user.id)
    return q.scalar()
```

**Definition of Done (traceable to spec 006-activities)**:
- FR-001/FR-002/FR-003: POST creates activity with owner=current_user, completed=false
- FR-004: PATCH /activities/{id} toggles completed; any authenticated user who can read the activity can toggle (not ownership-restricted per spec edge-case note)
- FR-005: Paginated; Rep sees own; Manager/Admin sees all
- FR-006: `?type=call&completed=false&deal_id=x` filters correctly (all combinable)
- FR-007: GET /contacts/{id}/activities returns activities with contact_id=x, sorted by created_at desc (implemented in contact_service or via activity_service)
- FR-008: Context-aware pre-fill is a frontend concern; backend just accepts nullable FKs
- FR-009: PATCH/DELETE ownership check; Manager/Admin can update any
- FR-010: Deleting parent sets FK to null (cascade handled by SQLAlchemy FK ondelete)
- FR-011: Overdue count endpoint (used by dashboard_service)
- `pytest tests/test_activities.py` passes

**Dependencies**: WU-04  
**Parallel**: With WU-06, WU-08, WU-10, WU-12, WU-16

---

### WU-15 — Activities Frontend

**Type**: Sequential after WU-14  
**Description**: Global activities list page and activity form modal (used from all detail pages).

**Files**:
- `frontend/src/types/activity.ts`
- `frontend/src/api/activities.ts`
- `frontend/src/components/activities/ActivityForm.tsx`
- `frontend/src/components/activities/ActivityListItem.tsx` (with inline complete toggle)
- `frontend/src/pages/ActivitiesPage.tsx`
- `frontend/tests/activities.test.tsx`

**Inline Complete Toggle**:
```tsx
// ActivityListItem.tsx
function ActivityListItem({ activity }) {
    const toggle = useToggleComplete();
    return (
        <div>
            <input
                type="checkbox"
                checked={activity.completed}
                onChange={() => toggle.mutate({ id: activity.id, completed: !activity.completed })}
            />
            {/* optimistic via React Query's onMutate */}
        </div>
    );
}
```

**ActivityForm Pre-fill**:
```tsx
// Accepts optional props: dealId, contactId, leadId
// Pre-fills the hidden fields so user doesn't need to select parent manually (FR-008)
```

**Definition of Done**:
- US1-AC4: ActivityForm opened from Deal detail has deal_id pre-filled; rep does not need to select
- US2-AC1: Completion toggle persists immediately (≤500ms visual feedback)
- US2-AC2: Re-toggling sets completed=false
- US2-AC3: Activity with past due date and completed=false shows overdue indicator
- US3-AC1: Filter by type="call" + completed=false works
- US4-AC1: Contact's Activities tab shows only contact's activities in reverse-chron order
- US4-AC2: Empty state shown when no activities
- US4-AC3: Inline toggle works without full page reload
- `npm run test -- activities` passes (vitest pattern filter)

**Dependencies**: WU-14, WU-05  
**Parallel**: No

---

### WU-16 — Dashboard Backend

**Type**: Parallel after WU-04  
**Description**: Aggregation endpoints for KPI tiles, pipeline-by-stage chart data, and recent activities feed.

**Files**:
- `backend/app/schemas/dashboard.py`
- `backend/app/services/dashboard_service.py`
- `backend/app/api/v1/endpoints/dashboard.py`
- `backend/tests/test_dashboard.py`

**Aggregation Queries**:
```python
class DashboardService:
    def kpi_stats(self, db: Session, current_user: User) -> DashboardStats:
        scope = self._scope_filter(current_user)
        leads_this_week = db.query(func.count(Lead.id)).filter(
            scope(Lead), Lead.created_at >= datetime.utcnow() - timedelta(days=7)
        ).scalar()
        pipeline_value = db.query(func.coalesce(func.sum(Deal.value), 0)).filter(
            scope(Deal), Deal.stage.notin_(["won", "lost"])
        ).scalar()
        deals_won_count = db.query(func.count(Deal.id)).filter(
            scope(Deal), Deal.stage == "won",
            Deal.updated_at >= start_of_month()  # from app.core.utils: datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        ).scalar()
        deals_won_value = db.query(func.coalesce(func.sum(Deal.value), 0)).filter(
            scope(Deal), Deal.stage == "won",
            Deal.updated_at >= start_of_month()
        ).scalar()
        overdue = db.query(func.count(Activity.id)).filter(
            scope(Activity), Activity.completed == False,
            Activity.due_date < datetime.utcnow(), Activity.due_date != None
        ).scalar()
        return DashboardStats(...)

    def pipeline_by_stage(self, db, current_user) -> list[PipelineStageData]:
        # All 5 stages zero-filled; aggregate from DB and merge
        ...

    def recent_activities(self, db, current_user) -> list[ActivityWithParentResponse]:
        # Last 10 by created_at desc, scoped to current user
        # Enriched with linked_record_name (deal.title | contact.full_name | lead.full_name)
        # and linked_record_type ("deal" | "contact" | "lead" | null)
        # Uses joined loads to avoid N+1
        ...
```

**Definition of Done (traceable to spec 007-dashboard)**:
- FR-001–FR-005: GET /api/v1/dashboard/stats returns all 4 KPI values; calculations verified against seeded test data
- FR-006: GET /api/v1/dashboard/pipeline-by-stage returns all 5 stages; zero stages not omitted
- FR-007: GET /api/v1/dashboard/recent-activities returns exactly 10 (or fewer if <10 exist), newest first; each item includes `linked_record_name` (resolved deal.title / contact.full_name / lead first+last name) and `linked_record_type` ("deal" | "contact" | "lead" | null) via JOIN to avoid N+1 (spec 007-dashboard US3-AC2)
- FR-008: Rep scope: only own data; Manager/Admin: all
- FR-009: All data from dedicated endpoints, not computed from paginated lists
- "Pipeline Value" excludes won and lost deals
- "Deals Won This Month" uses updated_at within current calendar month
- `pytest tests/test_dashboard.py` passes with multiple seeded scenarios

**Dependencies**: WU-04 (and logically all models from WU-02, but no dependency on other WU-06–14)  
**Parallel**: With WU-06, WU-08, WU-10, WU-12, WU-14

---

### WU-17 — Dashboard Frontend

**Type**: Sequential after WU-16  
**Description**: Dashboard page with four KPI tiles, Recharts pipeline bar chart, and recent activities feed.

**Files**:
- `frontend/src/types/dashboard.ts`
- `frontend/src/api/dashboard.ts`
- `frontend/src/components/dashboard/KpiTile.tsx`
- `frontend/src/components/dashboard/PipelineChart.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/tests/dashboard.test.tsx`

**React Query Cache Strategy**:
- `staleTime: 0` on all Dashboard queries (refetch on every mount/navigation, per spec FR-010)
- `refetchOnWindowFocus: true`
- Three separate queries: `useDashboardStats`, `usePipelineByStage`, `useRecentActivities`

**PipelineChart**:
```tsx
// Recharts BarChart with two bars per stage group: count and total_value
// All 5 stages always shown on X-axis; empty stages at zero height (spec US2-AC2)
<BarChart data={pipelineData}>
    <XAxis dataKey="stage" />
    <YAxis yAxisId="left" />
    <YAxis yAxisId="right" orientation="right" />
    <Bar yAxisId="left" dataKey="count" name="Deals" />
    <Bar yAxisId="right" dataKey="total_value" name="Value ($)" />
</BarChart>
```

**Definition of Done**:
- US1-AC1: Four KPI tiles visible on load
- US1-AC2–AC5: Correct values for each KPI against known seeded data (verified with mocked API)
- US2-AC2: All 5 stage bars rendered including zero-height bars
- US3-AC1: Exactly 10 recent activities shown (or empty state if 0)
- US3-AC2: Each activity entry shows type icon, title, linked_record_name (e.g. "Acme Corp Deal"), and created_at timestamp (spec 007-dashboard US3-AC2)
- US4-AC1/AC2/AC3: Navigating back to dashboard after mutation shows updated values (staleTime=0 forces refetch)
- `npm run test -- dashboard` passes (vitest pattern filter)

**Dependencies**: WU-16, WU-05  
**Parallel**: No

---

### WU-18 — Integration: App Shell, Routing, and Navigation

**Type**: Sequential — final integration WU (all others complete)  
**Description**: Wire all pages into the React Router config, implement the sidebar navigation, finalize the app shell layout, set up React Query client provider with global error handler, and run the full end-to-end integration smoke tests.

**Files**:
- `frontend/src/App.tsx` (all route definitions; nested protected routes)
- `frontend/src/components/shared/Layout.tsx` (sidebar with all nav links)
- `frontend/src/components/shared/ErrorBoundary.tsx`
- `frontend/src/main.tsx` (QueryClient setup with global onError)
- `backend/app/api/v1/router.py` (register all endpoint routers)
- `frontend/tests/integration.test.tsx` (smoke tests: login → dashboard → navigate to each module)

**Route Definitions**:
```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/register" element={<RegisterPage />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
  <Route path="/reset-password" element={<ResetPasswordPage />} />
  <Route element={<ProtectedRoute />}>
    <Route element={<Layout />}>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/leads" element={<LeadsPage />} />
      <Route path="/leads/:id" element={<LeadDetailPage />} />
      <Route path="/contacts" element={<ContactsPage />} />
      <Route path="/contacts/:id" element={<ContactDetailPage />} />
      <Route path="/companies" element={<CompaniesPage />} />
      <Route path="/companies/:id" element={<CompanyDetailPage />} />
      <Route path="/deals" element={<DealsPage />} />
      <Route path="/deals/:id" element={<DealDetailPage />} />
      <Route path="/activities" element={<ActivitiesPage />} />
      <Route path="/users" element={<UsersPage />} />  {/* Admin-only; component guards internally */}
    </Route>
  </Route>
</Routes>
```

**Definition of Done**:
- Full navigation flow: login → dashboard → every module page → detail page loads without white screen
- 401 on any API call → redirect to /login (interceptor functional)
- Sidebar nav links all functional; active route highlighted
- React Query DevTools present in dev mode only
- `cd backend && pytest --cov --cov-fail-under=80` passes
- `cd frontend && npm run test:coverage` passes at ≥80% coverage
- `cd backend && ruff check .` passes
- `cd frontend && npm run lint` passes

**Dependencies**: All WU-01 through WU-17  
**Parallel**: No

---

## 4. API Contracts

### Base Path: `/api/v1`

All authenticated endpoints require `Authorization: Bearer <access_token>` header.  
All list endpoints support `?page=1&limit=20` pagination (default: page=1, limit=20).  
Error responses: `{"detail": "<message>"}` with appropriate HTTP status code.

---

### Auth (`/auth`)

| Method | Path                     | Auth | Request Body                              | Response (200)                         | Errors         |
|--------|--------------------------|------|-------------------------------------------|----------------------------------------|----------------|
| POST   | `/auth/register`         | No   | `{email, full_name, password}`            | `{id, email, full_name, role, created_at}` | 409 email exists |
| POST   | `/auth/login`            | No   | `{email, password}`                       | `{access_token, refresh_token, token_type: "bearer"}` | 401 invalid creds |
| POST   | `/auth/refresh`          | No   | `{refresh_token}`                         | `{access_token, token_type: "bearer"}` | 401 invalid/expired/revoked |
| POST   | `/auth/logout`           | Yes  | `{refresh_token}`                         | `{message: "logged out"}`              | 401            |
| POST   | `/auth/forgot-password`  | No   | `{email}`                                 | `{message: "If registered, a link was sent"}` | Never 404 |
| POST   | `/auth/reset-password`   | No   | `{token, new_password}`                   | `{message: "Password updated"}`        | 400 token invalid/expired/used |

### Users (`/users`) — Admin only

| Method | Path            | Auth        | Request Body                     | Response       | Errors       |
|--------|-----------------|-------------|----------------------------------|----------------|--------------|
| GET    | `/users`        | Admin       | —                                | `[UserResponse]` paginated | 403 |
| PATCH  | `/users/{id}`   | Admin       | `{role?, is_active?}`            | `UserResponse` | 403, 404     |

---

### Leads (`/leads`)

| Method | Path                      | Auth | Request Body                                | Response (200/201)          | Errors        |
|--------|---------------------------|------|---------------------------------------------|-----------------------------|---------------|
| GET    | `/leads`                  | Yes  | `?status=&search=&page=&limit=`             | `{items: [LeadResponse], total, page, limit}` | 401 |
| POST   | `/leads`                  | Yes  | `{first_name, last_name, email?, phone?, company_name?, source?, notes?}` | `LeadResponse` 201 | 422 validation |
| GET    | `/leads/{id}`             | Yes  | —                                           | `LeadResponse`              | 404, 403      |
| PATCH  | `/leads/{id}`             | Yes  | `{first_name?, last_name?, email?, phone?, company_name?, source?, notes?, status?}` | `LeadResponse` | 403, 404 |
| DELETE | `/leads/{id}`             | Yes  | —                                           | 204 No Content              | 403, 404      |
| POST   | `/leads/{id}/convert`     | Yes  | `{create_company: bool, create_deal: bool, deal_title?: str, deal_value?: float}` | `{contact_id, company_id?, deal_id?}` | 400 already_converted, 403, 404 |

**LeadResponse schema**:
```json
{
  "id": "uuid",
  "first_name": "string",
  "last_name": "string",
  "email": "string|null",
  "phone": "string|null",
  "company_name": "string|null",
  "status": "new|contacted|qualified|converted|lost",
  "source": "string|null",
  "notes": "string|null",
  "owner_id": "uuid",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

---

### Contacts (`/contacts`)

| Method | Path            | Auth | Request Body | Response (200/201) | Errors    |
|--------|-----------------|------|-------------|---------------------|-----------|
| GET    | `/contacts`     | Yes  | `?company_id=&search=&page=&limit=` | `{items, total, page, limit}` | 401 |
| POST   | `/contacts`     | Yes  | `{first_name, last_name, email?, phone?, title?, company_id?}` | `ContactResponse` 201 | 422 |
| GET    | `/contacts/{id}` | Yes | — | `ContactDetailResponse` (includes linked deals + activities) | 403, 404 |
| PATCH  | `/contacts/{id}` | Yes | `{first_name?, last_name?, email?, phone?, title?, company_id?}` | `ContactResponse` | 403, 404 |
| DELETE | `/contacts/{id}` | Yes | — | 204 | 403, 404 |

**ContactDetailResponse** adds:
```json
{
  "deals": [{"id", "title", "stage", "value", "expected_close_date"}],
  "activities": [{"id", "type", "title", "due_date", "completed", "created_at"}]
}
```

---

### Companies (`/companies`)

| Method | Path              | Auth | Request Body | Response | Errors |
|--------|-------------------|------|-------------|----------|--------|
| GET    | `/companies`      | Yes  | `?industry=&search=&page=&limit=` | `{items, total, page, limit}` | 401 |
| POST   | `/companies`      | Yes  | `{name, website?, industry?, phone?, address?, notes?}` | `CompanyResponse` 201 | 422 |
| GET    | `/companies/{id}` | Yes  | — | `CompanyDetailResponse` | 403, 404 |
| PATCH  | `/companies/{id}` | Yes  | `{name?, website?, industry?, phone?, address?, notes?}` | `CompanyResponse` | 403, 404 |
| DELETE | `/companies/{id}` | Yes  | — | 204 | 403, 404 |

**CompanyDetailResponse** adds:
```json
{
  "contacts": [{"id", "first_name", "last_name", "email", "title"}],
  "deals": [{"id", "title", "stage", "value", "expected_close_date"}]
}
```

---

### Deals (`/deals`)

| Method | Path                       | Auth | Request Body | Response | Errors |
|--------|----------------------------|------|-------------|----------|--------|
| GET    | `/deals`                   | Yes  | `?stage=&owner_id=&search=&page=&limit=` | `{items, total, page, limit}` | 401 |
| POST   | `/deals`                   | Yes  | `{title, value?, currency?, stage?, probability?, expected_close_date?, contact_id?, company_id?}` | `DealResponse` 201 | 422 |
| GET    | `/deals/{id}`              | Yes  | — | `DealDetailResponse` | 403, 404 |
| PATCH  | `/deals/{id}`              | Yes  | `{title?, value?, currency?, stage?, probability?, expected_close_date?, contact_id?, company_id?}` | `DealResponse` | 403, 404 |
| DELETE | `/deals/{id}`              | Yes  | — | 204 | 403, 404 |
| GET    | `/deals/pipeline-summary`  | Yes  | — | `[{stage, count, total_value}]` (all 5 stages) | 401 |

**Probability auto-update note**: When PATCH includes `stage` but not `probability`, server auto-sets `probability` to stage default. When both are provided, the explicit probability is used (manual override, spec US3).

---

### Activities (`/activities`)

| Method | Path               | Auth | Request Body | Response | Errors |
|--------|--------------------|------|-------------|----------|--------|
| GET    | `/activities`      | Yes  | `?type=&completed=&deal_id=&contact_id=&lead_id=&page=&limit=` | `{items, total, page, limit}` | 401 |
| POST   | `/activities`      | Yes  | `{type, title, description?, due_date?, deal_id?, contact_id?, lead_id?}` | `ActivityResponse` 201 | 422 |
| GET    | `/activities/{id}` | Yes  | — | `ActivityResponse` | 403, 404 |
| PATCH  | `/activities/{id}` | Yes  | `{type?, title?, description?, due_date?, completed?, deal_id?, contact_id?, lead_id?}` | `ActivityResponse` | 403, 404 |
| DELETE | `/activities/{id}` | Yes  | — | 204 | 403, 404 |

**Note**: `completed` toggle is done via PATCH with `{completed: true/false}`. Any authenticated user who can read the activity can toggle completion (not ownership-gated per spec 006-activities note).

---

### Dashboard (`/dashboard`)

| Method | Path                              | Auth | Response |
|--------|-----------------------------------|------|---------|
| GET    | `/dashboard/stats`                | Yes  | `{leads_this_week, pipeline_value, deals_won_this_month, deals_won_value_this_month, overdue_activities}` |
| GET    | `/dashboard/pipeline-by-stage`    | Yes  | `[{stage, count, total_value}]` (all 5 stages, zero-filled) |
| GET    | `/dashboard/recent-activities`    | Yes  | `[ActivityWithParentResponse]` (max 10, newest first; includes `linked_record_name` and `linked_record_type`) |

All three endpoints scoped by RBAC: Rep sees own data; Manager/Admin sees all.

---

## 5. Testing Strategy

### Backend: pytest

**Configuration** (`pyproject.toml`):
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.coverage.run]
source = ["app"]
omit = ["app/main.py"]

[tool.coverage.report]
fail_under = 80
```

**Test Fixtures** (`tests/conftest.py`):
```python
@pytest.fixture(scope="session")
def engine():
    """SQLite in-memory engine; runs all migrations in-memory."""
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(engine)
    return engine

@pytest.fixture
def db(engine):
    """Transactional test isolation: rollback after each test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client_rep(db):
    """TestClient authenticated as a Rep user."""
    user = create_test_user(db, role="rep")
    token = create_access_token(user.id)
    return TestClient(app), {"Authorization": f"Bearer {token}"}, user

@pytest.fixture
def client_manager(db): ...  # same pattern

@pytest.fixture
def client_admin(db): ...
```

**Coverage Approach**:
- Each test module covers one domain's service + endpoints
- No mocking of the database — SQLite in-memory is the test DB
- External services (email) are mocked with `unittest.mock.patch`
- Target: 80% line coverage enforced by `--cov-fail-under=80`

**Key Test Scenarios by Module**:

| Module | Critical Tests |
|--------|---------------|
| auth | register duplicate email → 409; login wrong password → 401; refresh with revoked token → 401; deactivated user → 401; reset token expiry; forgot-password same response for unknown email |
| leads | convert lead atomic rollback (mock Company.create to raise, verify Contact not created); Rep 403 on another's lead; pagination; status filter |
| contacts | company link change reflected; cascading null on company delete |
| companies | contacts + deals tabs in detail response; company delete nullifies FK |
| deals | stage change without probability → auto-reset; stage + probability → manual override; pipeline summary all 5 stages; Rep 403 on other's deal |
| activities | toggle completion by non-owner (allowed); overdue count; multi-FK filter; lead/contact/deal delete nullifies activity FK |
| dashboard | KPI values verified against known seeded data; Rep sees only own; Manager sees all; pipeline all 5 stages including zero |

### Frontend: vitest + React Testing Library

**Configuration**:
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    coverage: { provider: "v8", reporter: ["text", "html"], threshold: { lines: 80 } }
  }
});
```

**Setup** (`tests/setup.ts`):
```ts
import "@testing-library/jest-dom";
import { server } from "./mocks/server"; // MSW service worker
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Mocking Strategy**: MSW (Mock Service Worker) for all API calls. Handlers defined per domain:
```ts
// tests/mocks/handlers/leads.ts
export const leadHandlers = [
    http.get("/api/v1/leads", () => HttpResponse.json({ items: mockLeads, total: 2, page: 1, limit: 20 })),
    http.post("/api/v1/leads/:id/convert", async ({ request }) => { ... }),
    // Error scenario handler:
    http.post("/api/v1/leads/:id/convert", () => HttpResponse.error(), { once: true })
];
```

**Key Test Scenarios by Module**:

| Module | Critical Frontend Tests |
|--------|------------------------|
| auth | Login form submits → tokens stored → redirect; 401 response → redirect to login; ProtectedRoute blocks unauthed access |
| leads | ConvertLeadModal toggles; convert success → navigate to contact; convert error → toast + no navigation; converted lead has no Convert button |
| deals | KanbanBoard drag-end optimistic update; drag-end 500 → card rollback + toast; column total recalculates |
| activities | Inline toggle updates immediately; ActivityForm pre-fills parentId from page context |
| dashboard | All 4 KPI tiles render correct values from mock; PipelineChart renders 5 bars; empty Recent Activities shows empty state |

---

## 6. Key Decisions

### Decision 1: JWT stored in `localStorage` (not httpOnly cookie)

**Choice**: `localStorage`

**Reasoning**:
- The project is a single-origin SPA (React frontend served from same domain or proxied via Vite). CSRF attacks are not a concern for bearer token auth (CSRF only applies to cookie-based auth).
- `httpOnly` cookies require the FastAPI backend to set `Set-Cookie` headers with correct `SameSite`, `Secure`, and `Domain` attributes, adding operational complexity for the Vite dev proxy and any future CDN setup.
- `localStorage` is simpler to implement correctly, easier to debug, and industry-standard for SPAs using bearer tokens.
- **XSS mitigation**: CSP headers will be added in the Nginx/serving layer to restrict script sources. Input sanitization via Pydantic on all API inputs prevents stored XSS in API responses.

**Token lifecycle in localStorage**:
- `access_token`: `localStorage.setItem("at", token)` on login/refresh; `Authorization: Bearer` header on every request via Axios default.
- `refresh_token`: `localStorage.setItem("rt", token)` on login; sent as body in `POST /auth/refresh`.
- On logout: both keys cleared; server revokes refresh token.
- On 401: Axios interceptor attempts refresh; on refresh failure, clears both keys and redirects.

---

### Decision 2: `@dnd-kit/core` + `@dnd-kit/sortable` for Kanban drag-and-drop

**Choice**: `@dnd-kit`

**Reasoning**:
- `react-beautiful-dnd` is unmaintained (archived by Atlassian in 2023) and has open React 18 compatibility issues.
- `@dnd-kit` is actively maintained, React 18 compatible, and tree-shakeable.
- Supports accessible drag-and-drop out of the box (keyboard navigation).
- The Kanban use case is cross-list drag (from one column/droppable to another), which `@dnd-kit` handles cleanly with `DndContext` + per-column `useDroppable` + per-card `useDraggable`.

---

### Decision 3: React Query (TanStack Query) v5 — no Redux

**Choice**: React Query (TanStack Query) v5 only — no Redux.

**Reasoning**:
- All "global" state in this app is server state (data from the API). React Query handles fetching, caching, revalidation, and optimistic updates natively.
- The only client state that could warrant Redux is auth context (current user), which we manage with a lightweight `useAuth` hook backed by `localStorage` — no Redux overhead needed.
- React Query's `queryClient.invalidateQueries` provides post-mutation cache invalidation across the app without a global store.

**v5 API Note (IMPORTANT)**: TanStack Query v5 changed `invalidateQueries` from accepting an array argument to requiring an object: `queryClient.invalidateQueries({ queryKey: ["deals"] })` — NOT `queryClient.invalidateQueries(["deals"])`. All code in this plan uses v5 syntax. Implementers must use v5 throughout.

---

### Decision 4: Enums as Python `str, Enum` with Pydantic literal validation

**Choice**: Python `enum.Enum` with string values; Pydantic schemas use `Literal` or `Enum` validators; SQLAlchemy columns are `String` with no DB-level enum type.

**Reasoning**:
- PostgreSQL `ENUM` types are painful to migrate (require `ALTER TYPE`). Storing as `VARCHAR` with a check constraint or just application-level validation is simpler for a v1.
- Python enums provide type safety at the service layer and in tests.
- Pydantic `model_validator` or `field_validator` catches invalid values before they reach the DB.
- SQLite (test DB) does not support PostgreSQL enums, so `String` columns work identically in both environments.

---

### Decision 5: Alembic `begin_nested()` (SAVEPOINT) for Lead Convert atomicity

**Choice**: SQLAlchemy `Session.begin_nested()` SAVEPOINT

**Reasoning**:
- The Convert Lead action spans multiple `INSERT` operations (Contact, optionally Company and Deal, plus UPDATE on Lead). If any fails, all must be rolled back.
- Using `begin_nested()` within the FastAPI route's session context creates a SAVEPOINT. If any operation raises, the entire SAVEPOINT rolls back, the outer transaction remains open, and we re-raise the exception to FastAPI's error handler, which triggers the session's rollback.
- This is the SQLAlchemy-idiomatic way to implement nested transactions without manually managing connection-level transactions.
- SQLite supports SAVEPOINTs, so this works in both dev (SQLite) and production (PostgreSQL).

---

### Decision 6: Activities completion toggle — not ownership-gated

**Choice**: Any authenticated user who can read an activity can toggle its `completed` field.

**Reasoning**: Spec 006-activities FR-004 states "any authenticated user" can toggle. This differs from CRUD ownership enforcement on other entities. The `require_owner_or_above` guard is NOT applied to the `completed` toggle PATCH. However, PATCH for all other activity fields (title, type, description, etc.) remains ownership-gated (FR-009).

Implementation: The PATCH endpoint checks if the request only contains `completed`. If so, permission check is skipped. If other fields are included, ownership check applies.

---

### Decision 7: Soft-delete vs Hard-delete

**Choice**: Hard delete for all entities.

**Reasoning**: All specs explicitly state "hard-deleted" for the primary entity with cascading FK nullification on related records. No spec mentions soft-delete or audit trails for v1. Adding a `deleted_at` column would complicate every query with `WHERE deleted_at IS NULL`. We implement exactly what the specs require and defer soft-delete to v2.

---

## 7. Risks and Mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|-----------|
| R-01 | **Lead Convert partial failure**: Company creation succeeds but Deal creation fails, leaving orphan records | Medium | High | Use `Session.begin_nested()` (SAVEPOINT). Test the rollback path explicitly: mock `db.add(deal)` to raise, verify neither Contact nor Company row exists after the exception. |
| R-02 | **RBAC bypass via direct service call**: A route that skips the `require_owner_or_above` check but calls the service directly | Medium | High | Enforce ownership check inside the service function, not only in the route. The `deps.py` dependency is an additional gate, not the only gate. Test services directly with mixed-role callers. |
| R-03 | **Deactivated user mid-session**: User is deactivated while their access token is still valid (up to 30 min window) | Low | High | `get_current_user` re-queries the DB on every request (no caching of user object in JWT payload beyond `user_id`). `is_active` check is live, not from token claims. |
| R-04 | **Kanban optimistic UI desync**: Drag-drop succeeds on frontend but server returns error after a delay; card appears in wrong column | Medium | Medium | Store pre-drag state in `useDraggable`'s `onDragStart`. On server error, call `setLocalDeals(savedState)` to rollback. Show error toast. Test with mocked server 500. |
| R-05 | **SQLite vs PostgreSQL enum differences**: `STAGE_DEFAULT_PROBABILITY` dict lookup fails for unexpected string value in SQLite tests | Low | Low | Add explicit Pydantic validators on all enum fields in schemas. Any invalid value is rejected at schema validation before reaching the DB. |
| R-06 | **Refresh token race condition**: Two concurrent 401s both trigger refresh, second uses already-rotated token | Low | Medium | Implement a single in-flight refresh promise in the Axios interceptor. If a refresh is already in progress, queue subsequent 401s to wait for the same promise result rather than issuing duplicate refresh requests. |
| R-07 | **Dashboard KPI staleness**: "Deals Won This Month" counts by `updated_at`, but a deal updated for a non-stage reason in the current month could be miscounted | Low | Medium | Filter must include `Deal.stage == "won" AND Deal.updated_at >= start_of_month()`. Consider adding a `won_at` timestamp column in a future migration to make this unambiguous. For v1, the spec explicitly uses `updated_at`. |
| R-08 | **alembic downgrade** on `SET NULL` FK: Some DBs require explicit migration ordering for FK references | Low | Low | Use a single initial migration that creates all tables in dependency order with explicit FK declarations. Test `alembic downgrade base` in CI. |
| R-09 | **Test isolation**: `db` fixture uses rollback, but SQLite WAL mode or autoflush can leak state between tests | Low | Medium | Use `scope="function"` on the `db` fixture with explicit rollback. Disable SQLite WAL mode in test engine (`PRAGMA journal_mode=DELETE`). |
| R-10 | **Type safety gaps**: Using `str` for enum columns instead of a DB enum type means invalid values could be stored if bypassing Pydantic | Low | Low | Add SQLAlchemy `CheckConstraint` on each enum column as a belt-and-suspenders guard. Document that all writes MUST go through Pydantic-validated schemas. |

---

## Implementation Execution Order

The WU dependency graph allows the following parallel execution batches:

**Batch 1** (sequential foundation):
- WU-01 → WU-02 → WU-03 → WU-04

**Batch 2** (parallel after WU-04, frontend starts after WU-03):
- WU-05 (Auth Frontend)
- WU-06 (Leads Backend)
- WU-08 (Contacts Backend)
- WU-10 (Companies Backend)
- WU-12 (Deals Backend)
- WU-14 (Activities Backend)
- WU-16 (Dashboard Backend)

**Batch 3** (frontend WUs, each sequential after its backend):
- WU-07 (Leads Frontend) — after WU-06
- WU-09 (Contacts Frontend) — after WU-08
- WU-11 (Companies Frontend) — after WU-10
- WU-13 (Deals Frontend) — after WU-12
- WU-15 (Activities Frontend) — after WU-14
- WU-17 (Dashboard Frontend) — after WU-16

**Batch 4** (integration):
- WU-18 — after all above

---

## Appendix: Stage Default Probabilities

| Stage       | Default Probability |
|-------------|---------------------|
| prospect    | 10%                 |
| proposal    | 30%                 |
| negotiation | 60%                 |
| won         | 100%                |
| lost        | 0%                  |

## Appendix: RBAC Matrix

| Action                    | Rep (own) | Rep (other) | Manager | Admin |
|---------------------------|-----------|-------------|---------|-------|
| Read own records          | YES       | NO          | YES     | YES   |
| Read all records          | NO        | NO          | YES     | YES   |
| Create records            | YES       | —           | YES     | YES   |
| Update own records        | YES       | NO (403)    | YES     | YES   |
| Delete own records        | YES       | NO (403)    | YES     | YES   |
| Toggle activity complete  | YES       | YES         | YES     | YES   |
| Deactivate user accounts  | NO        | NO          | NO      | YES   |
| Change user roles         | NO        | NO          | NO      | YES   |

## Appendix: Coverage Thresholds

Thresholds are enforced via `.coverage-thresholds.json` (for metaswarm) and pytest/vitest config:

| Layer    | Threshold |
|----------|-----------|
| Backend  | 80% lines |
| Frontend | 80% lines |
