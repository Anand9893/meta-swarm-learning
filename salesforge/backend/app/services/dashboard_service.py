from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.activity import Activity
from app.models.deal import STAGE_DEFAULT_PROBABILITY, Deal
from app.models.lead import Lead
from app.models.user import User

PIPELINE_STAGES = list(STAGE_DEFAULT_PROBABILITY.keys())


def _start_of_month() -> datetime:
    now = datetime.now(UTC)
    return datetime(now.year, now.month, 1, tzinfo=UTC)


def kpi_stats(db: Session, current_user: User) -> dict:
    is_rep = current_user.role == "rep"
    uid = current_user.id
    now = datetime.now(UTC)
    week_ago = now - timedelta(days=7)
    month_start = _start_of_month()

    leads_q = db.query(func.count(Lead.id)).filter(Lead.created_at >= week_ago)
    if is_rep:
        leads_q = leads_q.filter(Lead.owner_id == uid)
    leads_this_week = leads_q.scalar() or 0

    pipeline_q = db.query(Deal).filter(Deal.stage.notin_(["won", "lost"]))
    if is_rep:
        pipeline_q = pipeline_q.filter(Deal.owner_id == uid)
    pipeline_deals = pipeline_q.all()
    pipeline_value = float(sum(d.value or 0 for d in pipeline_deals))

    won_q = db.query(Deal).filter(
        Deal.stage == "won", Deal.updated_at >= month_start
    )
    if is_rep:
        won_q = won_q.filter(Deal.owner_id == uid)
    won_deals = won_q.all()
    deals_won_count = len(won_deals)
    deals_won_value = float(sum(d.value or 0 for d in won_deals))

    overdue_q = db.query(func.count(Activity.id)).filter(
        Activity.completed == False,  # noqa: E712
        Activity.due_date < now,
        Activity.due_date.isnot(None),
    )
    if is_rep:
        overdue_q = overdue_q.filter(Activity.owner_id == uid)
    overdue = overdue_q.scalar() or 0

    return {
        "leads_this_week": leads_this_week,
        "pipeline_value": pipeline_value,
        "deals_won_this_month": deals_won_count,
        "deals_won_value_this_month": deals_won_value,
        "overdue_activities": overdue,
    }


def pipeline_by_stage(db: Session, current_user: User) -> list[dict]:
    result = []
    is_rep = current_user.role == "rep"
    for stage in PIPELINE_STAGES:
        query = db.query(Deal).filter(Deal.stage == stage)
        if is_rep:
            query = query.filter(Deal.owner_id == current_user.id)
        deals = query.all()
        result.append(
            {
                "stage": stage,
                "count": len(deals),
                "total_value": float(sum(d.value or 0 for d in deals)),
            }
        )
    return result


def recent_activities(db: Session, current_user: User) -> list[dict]:
    query = (
        db.query(Activity)
        .options(
            joinedload(Activity.deal),
            joinedload(Activity.contact),
            joinedload(Activity.lead),
        )
        .order_by(Activity.created_at.desc())
    )
    if current_user.role == "rep":
        query = query.filter(Activity.owner_id == current_user.id)
    query = query.limit(10)

    activities = query.all()
    result = []
    for a in activities:
        name = None
        record_type = None
        if a.deal_id and a.deal:
            name = a.deal.title
            record_type = "deal"
        elif a.contact_id and a.contact:
            name = f"{a.contact.first_name} {a.contact.last_name}"
            record_type = "contact"
        elif a.lead_id and a.lead:
            name = f"{a.lead.first_name} {a.lead.last_name}"
            record_type = "lead"

        row = {c.key: getattr(a, c.key) for c in a.__mapper__.column_attrs}
        row["linked_record_name"] = name
        row["linked_record_type"] = record_type
        result.append(row)
    return result
