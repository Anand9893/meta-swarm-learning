from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import (
    AccessTokenResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    user = auth_service.register(db, body.email, body.password, body.full_name)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    access_token, refresh_token = auth_service.login(db, body.email, body.password)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)) -> AccessTokenResponse:
    access_token = auth_service.refresh_access_token(db, body.refresh_token)
    return AccessTokenResponse(access_token=access_token)


@router.post("/logout", status_code=204)
def logout(
    body: LogoutRequest, response: Response, db: Session = Depends(get_db)
) -> None:
    auth_service.logout(db, body.refresh_token)


@router.post("/forgot-password", status_code=200)
def forgot_password(
    body: ForgotPasswordRequest, db: Session = Depends(get_db)
) -> dict[str, str]:
    auth_service.forgot_password(db, body.email)
    return {"message": "If this email is registered, you will receive a reset link."}


@router.post("/reset-password", status_code=200)
def reset_password(
    body: ResetPasswordRequest, db: Session = Depends(get_db)
) -> dict[str, str]:
    auth_service.reset_password(db, body.token, body.new_password)
    return {"message": "Password reset successful."}
