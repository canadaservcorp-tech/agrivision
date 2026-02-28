"""
Crops API - CRUD for crop management per farm
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.config import get_db
from models.schemas import CropCreateRequest, CropResponse
from models.database import Crop
from typing import List

router = APIRouter()


@router.post("/", response_model=CropResponse, status_code=201)
async def create_crop(req: CropCreateRequest, db: AsyncSession = Depends(get_db)):
    """Add a crop to a farm"""
    crop = Crop(
        farm_id=req.farm_id,
        category=req.category,
        name=req.name,
        variety=req.variety,
        area_hectares=req.area_hectares,
        planting_month=req.planting_month,
        harvest_month=req.harvest_month,
        annual_production_tons=req.annual_production_tons,
        organic_certified=req.organic_certified,
        current_problems=req.current_problems
    )
    db.add(crop)
    await db.flush()
    await db.refresh(crop)
    return crop


@router.get("/farm/{farm_id}", response_model=List[CropResponse])
async def list_crops(farm_id: int, db: AsyncSession = Depends(get_db)):
    """List all crops for a farm"""
    result = await db.execute(
        select(Crop).where(Crop.farm_id == farm_id, Crop.is_active == True)
    )
    return result.scalars().all()


@router.put("/{crop_id}", response_model=CropResponse)
async def update_crop(crop_id: int, req: CropCreateRequest, db: AsyncSession = Depends(get_db)):
    """Update crop details"""
    result = await db.execute(select(Crop).where(Crop.id == crop_id))
    crop = result.scalar_one_or_none()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    
    for key, value in req.model_dump(exclude_unset=True).items():
        if key != "farm_id":
            setattr(crop, key, value)
    return crop


@router.delete("/{crop_id}")
async def delete_crop(crop_id: int, db: AsyncSession = Depends(get_db)):
    """Remove a crop"""
    result = await db.execute(select(Crop).where(Crop.id == crop_id))
    crop = result.scalar_one_or_none()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    crop.is_active = False
    return {"message": "Crop removed"}


@router.get("/database")
async def get_crop_database():
    """Return all available crops grouped by category"""
    return {
        "vegetables": ["Tomato", "Pepper", "Cucumber", "Eggplant", "Lettuce", "Onion", "Garlic",
                       "Potato", "Carrot", "Zucchini", "Beans", "Peas", "Spinach", "Cabbage",
                       "Cauliflower", "Broccoli"],
        "fruits": ["Apple", "Orange", "Grape", "Olive", "Date Palm", "Banana", "Strawberry",
                   "Watermelon", "Melon", "Fig", "Pomegranate", "Mango", "Avocado", "Cherry",
                   "Peach", "Lemon"],
        "grains": ["Wheat", "Rice", "Corn/Maize", "Barley", "Oat", "Sorghum", "Millet", "Quinoa"],
        "herbs": ["Mint", "Basil", "Thyme", "Rosemary", "Parsley", "Cilantro", "Oregano", "Saffron"],
        "industrial": ["Cotton", "Sugarcane", "Tobacco", "Coffee", "Tea", "Soybean", "Sunflower", "Rapeseed"]
    }
