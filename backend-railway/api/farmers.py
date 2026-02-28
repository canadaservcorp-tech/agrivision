"""
Farmers API - profile management
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.config import get_db
from models.schemas import UserResponse, UserUpdateRequest
from models.database import User

router = APIRouter()


@router.get("/profile", response_model=UserResponse)
async def get_profile(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """Get farmer profile"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/profile", response_model=UserResponse)
async def update_profile(req: UserUpdateRequest, user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """Update farmer profile"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    
    return user


@router.put("/consent")
async def update_consent(
    data_sharing: bool = False,
    marketing: bool = False,
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """Update privacy consent settings"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    from datetime import datetime
    user.consent_data_sharing = data_sharing
    user.consent_marketing = marketing
    user.consent_date = datetime.utcnow()
    
    return {"message": "Consent updated"}


@router.delete("/account")
async def delete_account(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """Deactivate farmer account (GDPR right to erasure)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = False
    user.consent_data_sharing = False
    user.consent_marketing = False
    # In production: anonymize personal data
    
    return {"message": "Account deactivated"}
