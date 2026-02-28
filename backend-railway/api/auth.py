"""
Authentication API - signup, login, token management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.config import get_db, settings
from models.schemas import SignUpRequest, LoginRequest, TokenResponse, UserResponse
from models.database import User
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    token: str = Depends(lambda: None),  # Placeholder - use OAuth2PasswordBearer in production
    db: AsyncSession = Depends(get_db)
) -> User:
    """Extract current user from JWT token"""
    from fastapi.security import OAuth2PasswordBearer
    # In production, extract token from Authorization header
    pass


@router.post("/signup", response_model=TokenResponse)
async def signup(req: SignUpRequest, db: AsyncSession = Depends(get_db)):
    """Create new farmer/user account"""
    
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == req.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    user = User(
        email=req.email,
        password_hash=pwd_context.hash(req.password),
        full_name=req.full_name,
        phone=req.phone,
        country=req.country,
        language=req.language,
        whatsapp_enabled=req.whatsapp_enabled,
        consent_data_sharing=req.consent_data_sharing,
        consent_marketing=req.consent_marketing,
        consent_date=datetime.utcnow() if req.consent_data_sharing else None,
        role=req.role
    )
    
    db.add(user)
    await db.flush()
    await db.refresh(user)
    
    # Generate token
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    
    # TODO: Send verification email
    # await send_verification_email(user.email, user.verification_token)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email and password"""
    
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
    
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(db: AsyncSession = Depends(get_db)):
    """Get current user profile"""
    # In production, extract user from token
    pass


@router.post("/forgot-password")
async def forgot_password(email: str, db: AsyncSession = Depends(get_db)):
    """Send password reset email"""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if user:
        # Generate reset token and send email
        # TODO: implement email sending
        pass
    
    # Always return success to prevent email enumeration
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/verify/{token}")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """Verify email address"""
    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    user.is_verified = True
    user.verification_token = None
    
    return {"message": "Email verified successfully"}
