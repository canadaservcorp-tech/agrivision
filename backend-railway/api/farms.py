"""
Farms API - CRUD operations for farm management
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from models.config import get_db
from models.schemas import FarmCreateRequest, FarmResponse, FarmUpdateRequest
from models.database import Farm, Crop, User
from typing import List, Optional

router = APIRouter()


@router.post("/", response_model=FarmResponse, status_code=201)
async def create_farm(req: FarmCreateRequest, user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """Create a new farm for the current user"""
    
    farm = Farm(
        user_id=user_id,
        name=req.name,
        latitude=req.latitude,
        longitude=req.longitude,
        polygon_coordinates=req.polygon_coordinates,
        area_hectares=req.area_hectares,
        area_m2=req.area_hectares * 10000,
        terrain_type=req.terrain_type,
        water_source=req.water_source,
        soil_type=req.soil_type,
        workers_count=req.workers_count,
        address=req.address,
        region=req.region,
        city=req.city,
        country=req.country or "Unknown"
    )
    
    db.add(farm)
    await db.flush()
    await db.refresh(farm)
    
    return farm


@router.get("/", response_model=List[FarmResponse])
async def list_farms(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """List all farms for the current user"""
    result = await db.execute(
        select(Farm)
        .options(selectinload(Farm.crops))
        .where(Farm.user_id == user_id, Farm.is_active == True)
        .order_by(Farm.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{farm_id}", response_model=FarmResponse)
async def get_farm(farm_id: int, db: AsyncSession = Depends(get_db)):
    """Get farm details by ID"""
    result = await db.execute(
        select(Farm)
        .options(selectinload(Farm.crops))
        .where(Farm.id == farm_id)
    )
    farm = result.scalar_one_or_none()
    
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    return farm


@router.put("/{farm_id}", response_model=FarmResponse)
async def update_farm(farm_id: int, req: FarmUpdateRequest, db: AsyncSession = Depends(get_db)):
    """Update farm details"""
    result = await db.execute(select(Farm).where(Farm.id == farm_id))
    farm = result.scalar_one_or_none()
    
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(farm, key, value)
    
    if "area_hectares" in update_data:
        farm.area_m2 = farm.area_hectares * 10000
    
    return farm


@router.delete("/{farm_id}")
async def delete_farm(farm_id: int, db: AsyncSession = Depends(get_db)):
    """Soft delete a farm"""
    result = await db.execute(select(Farm).where(Farm.id == farm_id))
    farm = result.scalar_one_or_none()
    
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    farm.is_active = False
    return {"message": "Farm deactivated"}


@router.get("/{farm_id}/stats")
async def get_farm_stats(farm_id: int, db: AsyncSession = Depends(get_db)):
    """Get farm statistics - crops, detections, sensor averages"""
    result = await db.execute(
        select(Farm).options(selectinload(Farm.crops)).where(Farm.id == farm_id)
    )
    farm = result.scalar_one_or_none()
    
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    return {
        "farm_id": farm_id,
        "name": farm.name,
        "area_hectares": farm.area_hectares,
        "total_crops": len([c for c in farm.crops if c.is_active]),
        "crop_categories": list(set(c.category for c in farm.crops if c.is_active)),
    }
