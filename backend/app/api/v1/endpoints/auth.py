from fastapi import APIRouter, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

from app.schemas.auth import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
from app.services.auth_service import auth_service
from app.utils.logger import logger

router = APIRouter(prefix="/auth", tags=["Authentication & Security"])
security_scheme = HTTPBearer(auto_error=False)

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> Optional[UserResponse]:
    """Dependency returning authenticated user if token present."""
    if not credentials:
        return None
    return auth_service.verify_token(credentials.credentials)

def require_auth(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=True))) -> UserResponse:
    """Dependency requiring valid authentication."""
    return auth_service.verify_token(credentials.credentials)

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New User",
    description="Registers a new user account with bcrypt password hashing and returns JWT access token."
)
def register(request: UserRegisterRequest) -> TokenResponse:
    logger.info(f"Registering user {request.email}")
    return auth_service.register(request)

@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login",
    description="Authenticates credentials and returns a secure JWT bearer token."
)
def login(request: UserLoginRequest) -> TokenResponse:
    logger.info(f"User login attempt for {request.email}")
    return auth_service.login(request)

@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Current Authenticated User Profile"
)
def get_profile(current_user: UserResponse = Depends(require_auth)) -> UserResponse:
    return current_user
