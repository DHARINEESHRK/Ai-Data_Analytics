import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
import bcrypt
from jose import jwt, JWTError

from app.config.settings import settings
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, UserResponse, TokenResponse
from app.utils.exceptions import AppException
from app.utils.logger import logger

class AuthService:
    """Authentication and session management service with native bcrypt hashing and JWT token issuance."""

    def __init__(self):
        self.users_file = settings.STORAGE_DIR / "users.json"
        self._users: Dict[str, Dict[str, Any]] = {}
        self._load_users()

    def _load_users(self) -> None:
        if self.users_file.exists():
            try:
                with open(self.users_file, 'r', encoding='utf-8') as f:
                    self._users = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load users storage: {e}")
                self._users = {}
        else:
            self._users = {}

    def _save_users(self) -> None:
        try:
            with open(self.users_file, 'w', encoding='utf-8') as f:
                json.dump(self._users, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save users storage: {e}")

    def hash_password(self, password: str) -> str:
        # Enforce 72 bytes maximum for standard bcrypt compatibility
        pw_bytes = password.encode("utf-8")[:72]
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hashed_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hashed_bytes)

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt

    def register(self, req: UserRegisterRequest) -> TokenResponse:
        email_clean = req.email.lower().strip()
        # Check if user already exists
        for u in self._users.values():
            if u["email"] == email_clean:
                raise AppException("An account with this email address already exists.", status_code=400)

        user_id = str(uuid.uuid4())
        timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        hashed_pw = self.hash_password(req.password)

        user_record = {
            "id": user_id,
            "email": email_clean,
            "full_name": req.full_name or email_clean.split("@")[0],
            "hashed_password": hashed_pw,
            "created_at": timestamp_str
        }

        self._users[user_id] = user_record
        self._save_users()

        token = self.create_access_token({"sub": user_id, "email": email_clean})
        user_resp = UserResponse(
            id=user_id,
            email=email_clean,
            full_name=user_record["full_name"],
            created_at=timestamp_str
        )
        return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

    def login(self, req: UserLoginRequest) -> TokenResponse:
        email_clean = req.email.lower().strip()
        matched_user = None
        for u in self._users.values():
            if u["email"] == email_clean:
                matched_user = u
                break

        if not matched_user or not self.verify_password(req.password, matched_user["hashed_password"]):
            raise AppException("Invalid email or password credentials.", status_code=401)

        token = self.create_access_token({"sub": matched_user["id"], "email": email_clean})
        user_resp = UserResponse(
            id=matched_user["id"],
            email=email_clean,
            full_name=matched_user.get("full_name"),
            created_at=matched_user.get("created_at", "")
        )
        return TokenResponse(access_token=token, token_type="bearer", user=user_resp)

    def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        u = self._users.get(user_id)
        if not u:
            return None
        return UserResponse(
            id=u["id"],
            email=u["email"],
            full_name=u.get("full_name"),
            created_at=u.get("created_at", "")
        )

    def verify_token(self, token: str) -> UserResponse:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id: str = payload.get("sub")
            if not user_id:
                raise AppException("Invalid authentication credentials.", status_code=401)
            user = self.get_user_by_id(user_id)
            if not user:
                raise AppException("User account not found.", status_code=401)
            return user
        except JWTError:
            raise AppException("Could not validate credentials or token expired.", status_code=401)

auth_service = AuthService()
