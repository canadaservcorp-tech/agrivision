"""
Farmer Dashboard API - real-time farm data, detections, sensors
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from models.config import get_db
from models.database import (
    User, Farm, Crop, AgriVisionSystem, CameraNode,
    DiseaseDetection, SensorReading, Notification
)
from models.schemas import DashboardResponse, DetectionResponse, SensorSummaryResponse
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/overview")
async def get_dashboard(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """Get complete dashboard overview for farmer"""
    
    # Get user
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get farms with crops
    farms_result = await db.execute(
        select(Farm)
        .options(selectinload(Farm.crops))
        .where(Farm.user_id == user_id, Farm.is_active == True)
    )
    farms = farms_result.scalars().all()
    
    # Get systems
    farm_ids = [f.id for f in farms]
    systems = []
    if farm_ids:
        sys_result = await db.execute(
            select(AgriVisionSystem)
            .options(selectinload(AgriVisionSystem.camera_nodes))
            .where(AgriVisionSystem.farm_id.in_(farm_ids))
        )
        systems = sys_result.scalars().all()
    
    # Get recent detections (last 30 days)
    detections = []
    if farm_ids:
        det_result = await db.execute(
            select(DiseaseDetection)
            .where(
                DiseaseDetection.farm_id.in_(farm_ids),
                DiseaseDetection.detected_at > datetime.utcnow() - timedelta(days=30)
            )
            .order_by(desc(DiseaseDetection.detected_at))
            .limit(20)
        )
        detections = det_result.scalars().all()
    
    # Get latest sensor reading
    sensor_data = None
    if farm_ids:
        sensor_result = await db.execute(
            select(SensorReading)
            .where(SensorReading.farm_id.in_(farm_ids))
            .order_by(desc(SensorReading.recorded_at))
            .limit(1)
        )
        latest_sensor = sensor_result.scalar_one_or_none()
        if latest_sensor:
            sensor_data = {
                "temperature": latest_sensor.temperature_celsius,
                "humidity": latest_sensor.humidity_percent,
                "soil_moisture": latest_sensor.soil_moisture_percent,
                "last_reading": latest_sensor.recorded_at.isoformat() if latest_sensor.recorded_at else None
            }
    
    # Unread notifications
    notif_result = await db.execute(
        select(func.count(Notification.id))
        .where(Notification.user_id == user_id, Notification.is_read == False)
    )
    unread = notif_result.scalar() or 0
    
    return {
        "farmer": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "country": user.country
        },
        "farms": [{
            "id": f.id,
            "name": f.name,
            "area_hectares": f.area_hectares,
            "terrain": f.terrain_type,
            "location": {"lat": f.latitude, "lng": f.longitude},
            "crops": [{"id": c.id, "name": c.name, "category": c.category} for c in f.crops if c.is_active]
        } for f in farms],
        "systems": [{
            "id": s.id,
            "hub_serial": s.hub_serial,
            "is_online": s.is_online,
            "last_heartbeat": s.last_heartbeat.isoformat() if s.last_heartbeat else None,
            "battery_level": s.battery_level,
            "num_cameras": s.num_cameras,
            "cameras_online": len([c for c in s.camera_nodes if c.is_online]),
            "plan": s.subscription_plan
        } for s in systems],
        "recent_detections": [{
            "id": d.id,
            "disease": d.disease_name,
            "category": d.disease_category,
            "confidence": d.confidence_score,
            "severity": d.severity,
            "image_url": d.image_url,
            "treatment": d.treatment_recommended,
            "detected_at": d.detected_at.isoformat(),
            "acknowledged": d.is_acknowledged
        } for d in detections],
        "sensor_data": sensor_data,
        "unread_notifications": unread,
        "stats": {
            "total_farms": len(farms),
            "total_crops": sum(len([c for c in f.crops if c.is_active]) for f in farms),
            "total_detections_30d": len(detections),
            "critical_alerts": len([d for d in detections if d.severity == "critical"])
        }
    }


@router.get("/detections")
async def get_detections(
    farm_id: Optional[int] = None,
    severity: Optional[str] = None,
    days: int = Query(default=30, le=365),
    limit: int = Query(default=50, le=200),
    user_id: int = 1,
    db: AsyncSession = Depends(get_db)
):
    """Get disease detections with filtering"""
    
    query = select(DiseaseDetection).where(
        DiseaseDetection.detected_at > datetime.utcnow() - timedelta(days=days)
    )
    
    if farm_id:
        query = query.where(DiseaseDetection.farm_id == farm_id)
    if severity:
        query = query.where(DiseaseDetection.severity == severity)
    
    query = query.order_by(desc(DiseaseDetection.detected_at)).limit(limit)
    result = await db.execute(query)
    detections = result.scalars().all()
    
    return [{
        "id": d.id,
        "disease": d.disease_name,
        "confidence": d.confidence_score,
        "severity": d.severity,
        "image_url": d.image_url,
        "treatment": d.treatment_recommended,
        "detected_at": d.detected_at.isoformat()
    } for d in detections]


@router.get("/sensors/{farm_id}")
async def get_sensor_history(
    farm_id: int,
    hours: int = Query(default=24, le=168),
    db: AsyncSession = Depends(get_db)
):
    """Get sensor reading history for charts"""
    
    result = await db.execute(
        select(SensorReading)
        .where(
            SensorReading.farm_id == farm_id,
            SensorReading.recorded_at > datetime.utcnow() - timedelta(hours=hours)
        )
        .order_by(SensorReading.recorded_at)
    )
    readings = result.scalars().all()
    
    return [{
        "timestamp": r.recorded_at.isoformat(),
        "temperature": r.temperature_celsius,
        "humidity": r.humidity_percent,
        "soil_moisture": r.soil_moisture_percent,
        "light": r.light_lux
    } for r in readings]


@router.get("/notifications")
async def get_notifications(
    user_id: int = 1,
    unread_only: bool = False,
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get user notifications"""
    
    query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    
    query = query.order_by(desc(Notification.created_at)).limit(limit)
    result = await db.execute(query)
    notifs = result.scalars().all()
    
    return [{
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "type": n.type,
        "link": n.link,
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat()
    } for n in notifs]


@router.put("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: int, db: AsyncSession = Depends(get_db)):
    """Mark notification as read"""
    result = await db.execute(select(Notification).where(Notification.id == notif_id))
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        notif.read_at = datetime.utcnow()
    return {"message": "Marked as read"}
