from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.deps import require_owner_or_above
from app.models.activity import Activity
from app.models.user import User
from app.schemas.activity import ActivityCreate, ActivityUpdate


def create_activity(
    db: Session, payload: ActivityCreate, current_user: User
) -> Activity:
    activity = Activity(
        type=payload.type,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        completed=False,
        deal_id=payload.deal_id,
        contact_id=payload.contact_id,
        lead_id=payload.lead_id,
        owner_id=current_user.id,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def get_activity_or_404(
    db: Session, activity_id: str, current_user: User, ownership_check: bool = True
) -> Activity:
    activity = db.get(Activity, activity_id)
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found"
        )
    if ownership_check:
        require_owner_or_above(activity.owner_id, current_user)
    return activity


def list_activities(
    db: Session,
    current_user: User,
    page: int = 1,
    page_size: int = 20,
    type: str | None = None,
    completed: bool | None = None,
    deal_id: str | None = None,
    contact_id: str | None = None,
    lead_id: str | None = None,
) -> tuple[list[Activity], int]:
    query = db.query(Activity)

    if current_user.role == "rep":
        query = query.filter(Activity.owner_id == current_user.id)

    if type is not None:
        query = query.filter(Activity.type == type)

    if completed is not None:
        query = query.filter(Activity.completed == completed)

    if deal_id is not None:
        query = query.filter(Activity.deal_id == deal_id)

    if contact_id is not None:
        query = query.filter(Activity.contact_id == contact_id)

    if lead_id is not None:
        query = query.filter(Activity.lead_id == lead_id)

    total = query.count()
    offset = (page - 1) * page_size
    activities = (
        query.order_by(Activity.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return activities, total


def update_activity(
    db: Session, activity_id: str, payload: ActivityUpdate, current_user: User
) -> Activity:
    updates = payload.model_dump(exclude_unset=True)

    # completed-only toggle: any authenticated user may toggle (spec FR-004)
    only_toggling_completed = set(updates.keys()) == {"completed"}
    activity = get_activity_or_404(
        db, activity_id, current_user, ownership_check=not only_toggling_completed
    )

    for field, value in updates.items():
        setattr(activity, field, value)

    db.commit()
    db.refresh(activity)
    return activity


def delete_activity(db: Session, activity_id: str, current_user: User) -> None:
    activity = get_activity_or_404(db, activity_id, current_user)
    db.delete(activity)
    db.commit()


def overdue_count(db: Session, current_user: User) -> int:
    now = datetime.now(timezone.utc)
    query = db.query(func.count(Activity.id)).filter(
        Activity.completed == False,  # noqa: E712
        Activity.due_date < now,
        Activity.due_date.isnot(None),
    )
    if current_user.role == "rep":
        query = query.filter(Activity.owner_id == current_user.id)
    return query.scalar() or 0
