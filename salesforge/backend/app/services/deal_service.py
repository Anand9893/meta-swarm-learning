from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.deps import require_owner_or_above
from app.models.deal import STAGE_DEFAULT_PROBABILITY, Deal
from app.models.user import User
from app.schemas.deal import DealCreate, DealUpdate

VALID_STAGES = list(STAGE_DEFAULT_PROBABILITY.keys())


def create_deal(db: Session, payload: DealCreate, current_user: User) -> Deal:
    probability = payload.probability
    if probability is None:
        probability = STAGE_DEFAULT_PROBABILITY.get(payload.stage, 10)

    deal = Deal(
        title=payload.title,
        value=payload.value,
        currency=payload.currency,
        stage=payload.stage,
        probability=probability,
        expected_close_date=payload.expected_close_date,
        contact_id=payload.contact_id,
        company_id=payload.company_id,
        owner_id=current_user.id,
    )
    db.add(deal)
    db.commit()
    db.refresh(deal)
    return deal


def get_deal_or_404(db: Session, deal_id: str, current_user: User) -> Deal:
    deal = db.get(Deal, deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Deal not found"
        )
    require_owner_or_above(deal.owner_id, current_user)
    return deal


def list_deals(
    db: Session,
    current_user: User,
    page: int = 1,
    page_size: int = 20,
    stage: str | None = None,
    owner_id: str | None = None,
    search: str | None = None,
) -> tuple[list[Deal], int]:
    query = db.query(Deal)

    if current_user.role == "rep":
        query = query.filter(Deal.owner_id == current_user.id)
    elif owner_id:
        query = query.filter(Deal.owner_id == owner_id)

    if stage:
        query = query.filter(Deal.stage == stage)

    if search:
        term = f"%{search}%"
        query = query.filter(Deal.title.ilike(term))

    total = query.count()
    offset = (page - 1) * page_size
    deals = (
        query.order_by(Deal.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return deals, total


def update_deal(
    db: Session, deal_id: str, payload: DealUpdate, current_user: User
) -> Deal:
    deal = get_deal_or_404(db, deal_id, current_user)

    updates = payload.model_dump(exclude_unset=True)

    # Auto-reset probability when stage changes without an explicit probability
    if "stage" in updates and "probability" not in updates:
        updates["probability"] = STAGE_DEFAULT_PROBABILITY.get(updates["stage"], 10)

    if "title" in updates and updates["title"] is None:
        updates.pop("title")

    for field, value in updates.items():
        setattr(deal, field, value)

    db.commit()
    db.refresh(deal)
    return deal


def delete_deal(db: Session, deal_id: str, current_user: User) -> None:
    deal = get_deal_or_404(db, deal_id, current_user)
    db.delete(deal)
    db.commit()


def pipeline_summary(db: Session, current_user: User) -> list[dict]:
    result = []
    for stage in VALID_STAGES:
        query = db.query(Deal).filter(Deal.stage == stage)
        if current_user.role == "rep":
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
