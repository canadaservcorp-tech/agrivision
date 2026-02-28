"""
Admin Dashboard API
Your view: all farmers, farms, orders, revenue, analytics
This is the goldmine data dashboard
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case
from models.config import get_db
from models.database import (
    User, Farm, Crop, Order, AgriVisionSystem,
    DiseaseDetection, Company, RegionalCropData
)
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()


@router.get("/overview")
async def admin_overview(db: AsyncSession = Depends(get_db)):
    """Master dashboard - all key metrics"""
    
    # Totals
    farmers = await db.execute(select(func.count(User.id)).where(User.role == "farmer"))
    farms = await db.execute(select(func.count(Farm.id)).where(Farm.is_active == True))
    systems = await db.execute(select(func.count(AgriVisionSystem.id)))
    online = await db.execute(select(func.count(AgriVisionSystem.id)).where(AgriVisionSystem.is_online == True))
    orders = await db.execute(select(func.count(Order.id)))
    revenue = await db.execute(select(func.sum(Order.total_amount)).where(Order.status == "paid"))
    
    # This month revenue
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
    monthly = await db.execute(
        select(func.sum(Order.total_amount))
        .where(Order.status == "paid", Order.paid_at >= month_start)
    )
    
    # Top countries by farmer count
    countries = await db.execute(
        select(User.country, func.count(User.id).label("count"))
        .where(User.role == "farmer", User.country.isnot(None))
        .group_by(User.country)
        .order_by(desc("count"))
        .limit(10)
    )
    
    # Top crops
    top_crops = await db.execute(
        select(Crop.name, Crop.category, func.count(Crop.id).label("count"),
               func.sum(Crop.area_hectares).label("total_area"))
        .where(Crop.is_active == True)
        .group_by(Crop.name, Crop.category)
        .order_by(desc("count"))
        .limit(15)
    )
    
    # Recent orders
    recent = await db.execute(
        select(Order).order_by(desc(Order.created_at)).limit(10)
    )
    
    # Disease stats
    disease_stats = await db.execute(
        select(
            DiseaseDetection.disease_name,
            func.count(DiseaseDetection.id).label("count"),
            func.avg(DiseaseDetection.confidence_score).label("avg_confidence")
        )
        .where(DiseaseDetection.detected_at > datetime.utcnow() - timedelta(days=90))
        .group_by(DiseaseDetection.disease_name)
        .order_by(desc("count"))
        .limit(10)
    )
    
    return {
        "metrics": {
            "total_farmers": farmers.scalar() or 0,
            "total_farms": farms.scalar() or 0,
            "total_systems": systems.scalar() or 0,
            "systems_online": online.scalar() or 0,
            "total_orders": orders.scalar() or 0,
            "revenue_total": float(revenue.scalar() or 0),
            "revenue_this_month": float(monthly.scalar() or 0)
        },
        "top_countries": [{"country": r[0], "farmers": r[1]} for r in countries.all()],
        "top_crops": [{"name": r[0], "category": r[1], "farms": r[2], "total_hectares": float(r[3] or 0)} for r in top_crops.all()],
        "disease_stats": [{"disease": r[0], "detections": r[1], "avg_confidence": round(float(r[2] or 0), 2)} for r in disease_stats.all()],
        "recent_orders": [{
            "id": o.id,
            "reference": o.reference,
            "status": o.status,
            "total": float(o.total_amount),
            "cameras": o.num_cameras,
            "country": o.shipping_country,
            "date": o.created_at.isoformat()
        } for o in recent.scalars().all()]
    }


@router.get("/farmers")
async def list_all_farmers(
    country: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=25, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all farmers with filtering - for admin and B2B data"""
    
    query = select(User).where(User.role == "farmer")
    count_query = select(func.count(User.id)).where(User.role == "farmer")
    
    if country:
        query = query.where(User.country == country)
        count_query = count_query.where(User.country == country)
    if search:
        query = query.where(User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
    
    total = (await db.execute(count_query)).scalar()
    
    query = query.order_by(desc(User.created_at)).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    farmers = result.scalars().all()
    
    return {
        "farmers": [{
            "id": f.id,
            "name": f.full_name,
            "email": f.email,
            "phone": f.phone,
            "country": f.country,
            "language": f.language,
            "whatsapp": f.whatsapp_enabled,
            "consent_data_sharing": f.consent_data_sharing,
            "joined": f.created_at.isoformat(),
            "last_active": f.last_login.isoformat() if f.last_login else None
        } for f in farmers],
        "total": total,
        "page": page,
        "pages": -(-total // per_page) if total else 0
    }


@router.get("/crop-map")
async def get_crop_map(
    country: Optional[str] = None,
    crop: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Geographic crop distribution data - sellable to agri-companies"""
    
    query = (
        select(
            Farm.country, Farm.latitude, Farm.longitude,
            Crop.category, Crop.name,
            func.count(Crop.id).label("count"),
            func.sum(Crop.area_hectares).label("total_area")
        )
        .join(Crop, Farm.id == Crop.farm_id)
        .where(Farm.is_active == True, Crop.is_active == True)
        .group_by(Farm.country, Farm.latitude, Farm.longitude, Crop.category, Crop.name)
    )
    
    if country:
        query = query.where(Farm.country == country)
    if crop:
        query = query.where(Crop.name == crop)
    
    result = await db.execute(query)
    
    return [{
        "country": r[0],
        "lat": r[1],
        "lng": r[2],
        "crop_category": r[3],
        "crop_name": r[4],
        "farm_count": r[5],
        "total_hectares": float(r[6] or 0)
    } for r in result.all()]


@router.get("/market-intelligence")
async def market_intelligence(
    country: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Aggregated market intelligence report - premium B2B data"""
    
    # Crop distribution by country
    crop_dist = await db.execute(
        select(
            Farm.country, Crop.category, Crop.name,
            func.count(func.distinct(Farm.id)).label("farms"),
            func.sum(Crop.area_hectares).label("area"),
            func.avg(case((Crop.organic_certified == True, 1), else_=0)).label("organic_pct")
        )
        .join(Crop, Farm.id == Crop.farm_id)
        .where(Farm.is_active == True)
        .group_by(Farm.country, Crop.category, Crop.name)
        .order_by(desc("farms"))
    )
    
    # Disease prevalence by region
    disease_map = await db.execute(
        select(
            Farm.country,
            DiseaseDetection.disease_name,
            DiseaseDetection.disease_category,
            func.count(DiseaseDetection.id).label("detections"),
            func.avg(DiseaseDetection.confidence_score).label("avg_confidence")
        )
        .join(Farm, DiseaseDetection.farm_id == Farm.id)
        .where(DiseaseDetection.detected_at > datetime.utcnow() - timedelta(days=180))
        .group_by(Farm.country, DiseaseDetection.disease_name, DiseaseDetection.disease_category)
        .order_by(desc("detections"))
        .limit(50)
    )
    
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "crop_distribution": [{
            "country": r[0], "category": r[1], "crop": r[2],
            "farms": r[3], "total_hectares": float(r[4] or 0),
            "organic_percent": round(float(r[5] or 0) * 100, 1)
        } for r in crop_dist.all()],
        "disease_prevalence": [{
            "country": r[0], "disease": r[1], "category": r[2],
            "detections": r[3], "avg_confidence": round(float(r[4] or 0), 2)
        } for r in disease_map.all()]
    }


@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: int, status: str, tracking: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Update order status (admin action)"""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status
    if tracking:
        order.tracking_number = tracking
    if status == "shipped":
        order.shipped_at = datetime.utcnow()
    if status == "delivered":
        order.delivered_at = datetime.utcnow()
    
    return {"message": f"Order {order.reference} updated to {status}"}
