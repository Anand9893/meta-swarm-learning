from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.user import PasswordResetToken, RefreshToken, User

logger = logging.getLogger(__name__)


def register(db: Session, email: str, password: str, full_name: str) -> User:
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login(db: Session, email: str, password: str) -> tuple[str, str]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account deactivated",
        )

    access_token = create_access_token(user.id)
    raw_refresh = secrets.token_urlsafe(32)
    expires = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh),
            expires_at=expires,
        )
    )
    db.commit()
    return access_token, raw_refresh


def refresh_access_token(db: Session, raw_token: str) -> str:
    token_hash = hash_token(raw_token)
    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )

    if not db_token or db_token.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
        )

    expires_at = db_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    user = db.get(User, db_token.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account deactivated",
        )

    return create_access_token(user.id)


def logout(db: Session, raw_token: str) -> None:
    token_hash = hash_token(raw_token)
    db_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    db_token.revoked = True
    db.commit()


def forgot_password(db: Session, email: str) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return

    raw_token = secrets.token_urlsafe(32)
    expires = datetime.now(UTC) + timedelta(hours=1)

    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=expires,
        )
    )
    db.commit()
    logger.info(
        "Password reset URL: http://localhost:5173/reset-password?token=%s", raw_token
    )


def reset_password(db: Session, raw_token: str, new_password: str) -> None:
    token_hash = hash_token(raw_token)
    db_token = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )

    if not db_token or db_token.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already-used reset token",
        )

    expires_at = db_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token expired",
        )

    user = db.get(User, db_token.user_id)
    user.hashed_password = hash_password(new_password)  # type: ignore[union-attr]
    db_token.used = True
    db.commit()
