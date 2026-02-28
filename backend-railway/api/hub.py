"""
Hub Communication API
Receives data from central hub Pi units in the field:
- Heartbeat (status updates)
- Sensor readings
- Disease detection results
- Camera images
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.config import get_db
from models.database import (
    AgriVisionSystem, CameraNode, SensorReading,
    DiseaseDetection, Notification
)
from models.schemas import HubHeartbeat, HubSensorData, HubDetectionResult
from datetime import datetime
from typing import Optional

router = APIRouter()


@router.post("/heartbeat")
async def hub_heartbeat(data: HubHeartbeat, db: AsyncSession = Depends(get_db)):
    """
    Central hub sends periodic heartbeat with system status.
    Called every 5 minutes from the Pi.
    """
    result = await db.execute(
        select(AgriVisionSystem).where(AgriVisionSystem.hub_serial == data.hub_serial)
    )
    system = result.scalar_one_or_none()
    
    if not system:
        raise HTTPException(status_code=404, detail="System not registered")
    
    # Update system status
    system.is_online = True
    system.last_heartbeat = datetime.utcnow()
    system.battery_level = data.battery_level
    system.temperature_celsius = data.temperature
    system.signal_strength = data.signal_strength
    system.storage_used_gb = data.storage_used_gb
    system.hub_firmware_version = data.firmware_version
    
    # Update camera node statuses
    cam_result = await db.execute(
        select(CameraNode).where(CameraNode.system_id == system.id)
    )
    all_cameras = cam_result.scalars().all()
    
    for cam in all_cameras:
        cam.is_online = cam.serial_number in data.cameras_online
        if cam.is_online:
            cam.last_heartbeat = datetime.utcnow()
    
    # Alert if battery low
    if data.battery_level < 15:
        notif = Notification(
            user_id=1,  # TODO: get farm owner
            title="⚠️ Low Battery Alert",
            message=f"Hub {data.hub_serial} battery at {data.battery_level}%. Charge soon.",
            type="warning"
        )
        db.add(notif)
    
    return {
        "status": "ok",
        "hub_serial": data.hub_serial,
        "cameras_registered": len(all_cameras),
        "cameras_online": len(data.cameras_online),
        "server_time": datetime.utcnow().isoformat()
    }


@router.post("/sensors")
async def receive_sensor_data(data: HubSensorData, db: AsyncSession = Depends(get_db)):
    """
    Hub sends sensor readings (temperature, humidity, soil moisture).
    Called every 15 minutes from the Pi.
    """
    result = await db.execute(
        select(AgriVisionSystem).where(AgriVisionSystem.hub_serial == data.hub_serial)
    )
    system = result.scalar_one_or_none()
    
    if not system:
        raise HTTPException(status_code=404, detail="System not registered")
    
    reading = SensorReading(
        farm_id=system.farm_id,
        system_id=system.id,
        temperature_celsius=data.temperature,
        humidity_percent=data.humidity,
        soil_moisture_percent=data.soil_moisture,
        light_lux=data.light_lux,
        recorded_at=data.recorded_at or datetime.utcnow()
    )
    
    db.add(reading)
    
    # Alert on extreme values
    alerts = []
    if data.temperature and data.temperature > 45:
        alerts.append(f"🌡️ High temperature: {data.temperature}°C")
    if data.temperature and data.temperature < -5:
        alerts.append(f"❄️ Frost warning: {data.temperature}°C")
    if data.soil_moisture and data.soil_moisture < 15:
        alerts.append(f"💧 Low soil moisture: {data.soil_moisture}%")
    if data.humidity and data.humidity > 90:
        alerts.append(f"💨 High humidity (disease risk): {data.humidity}%")
    
    for alert_msg in alerts:
        notif = Notification(
            user_id=1,  # TODO: get farm owner
            title="Sensor Alert",
            message=alert_msg,
            type="alert"
        )
        db.add(notif)
    
    return {"status": "ok", "alerts": alerts}


@router.post("/detection")
async def receive_detection(data: HubDetectionResult, db: AsyncSession = Depends(get_db)):
    """
    Hub sends AI disease detection result.
    Called when the Pi detects a disease in a camera image.
    """
    result = await db.execute(
        select(AgriVisionSystem).where(AgriVisionSystem.hub_serial == data.hub_serial)
    )
    system = result.scalar_one_or_none()
    
    if not system:
        raise HTTPException(status_code=404, detail="System not registered")
    
    detection = DiseaseDetection(
        farm_id=system.farm_id,
        crop_id=data.crop_id,
        disease_name=data.disease_name,
        confidence_score=data.confidence,
        severity=data.severity,
        image_url=data.image_url,
        treatment_recommended=data.treatment,
        detected_at=datetime.utcnow()
    )
    
    db.add(detection)
    await db.flush()
    
    # Notify farmer
    severity_emoji = {"low": "🟡", "medium": "🟠", "high": "🔴", "critical": "🚨"}.get(data.severity, "⚠️")
    notif = Notification(
        user_id=1,  # TODO: get farm owner
        title=f"{severity_emoji} Disease Detected: {data.disease_name}",
        message=f"Confidence: {data.confidence*100:.0f}% | Severity: {data.severity}\n{data.treatment or 'Check dashboard for details'}",
        type="alert",
        link=f"/dashboard/detections/{detection.id}"
    )
    db.add(notif)
    
    return {
        "status": "ok",
        "detection_id": detection.id,
        "severity": data.severity
    }


@router.post("/image")
async def upload_image(
    hub_serial: str,
    camera_serial: str,
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Hub uploads camera image for storage.
    In production, images go to S3-compatible storage.
    """
    # Verify system
    result = await db.execute(
        select(AgriVisionSystem).where(AgriVisionSystem.hub_serial == hub_serial)
    )
    system = result.scalar_one_or_none()
    if not system:
        raise HTTPException(status_code=404, detail="System not registered")
    
    # Update camera last image time
    cam_result = await db.execute(
        select(CameraNode).where(CameraNode.serial_number == camera_serial)
    )
    camera = cam_result.scalar_one_or_none()
    if camera:
        camera.last_image_at = datetime.utcnow()
        camera.images_captured_today = (camera.images_captured_today or 0) + 1
    
    # TODO: Save to S3 storage
    # image_url = await upload_to_s3(image, hub_serial, camera_serial)
    image_url = f"/images/{hub_serial}/{camera_serial}/{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jpg"
    
    if camera:
        camera.last_image_url = image_url
    
    return {"status": "ok", "image_url": image_url}


@router.get("/config/{hub_serial}")
async def get_hub_config(hub_serial: str, db: AsyncSession = Depends(get_db)):
    """
    Hub requests its configuration on boot.
    Returns registered cameras, alert thresholds, capture intervals.
    """
    result = await db.execute(
        select(AgriVisionSystem)
        .where(AgriVisionSystem.hub_serial == hub_serial)
    )
    system = result.scalar_one_or_none()
    if not system:
        raise HTTPException(status_code=404, detail="System not registered")
    
    cam_result = await db.execute(
        select(CameraNode).where(CameraNode.system_id == system.id)
    )
    cameras = cam_result.scalars().all()
    
    return {
        "hub_serial": hub_serial,
        "farm_id": system.farm_id,
        "capture_interval_minutes": 15,
        "heartbeat_interval_minutes": 5,
        "sensor_interval_minutes": 15,
        "ai_model_version": "agrivision-v3.0",
        "alert_thresholds": {
            "temperature_max": 45,
            "temperature_min": -5,
            "humidity_max": 90,
            "soil_moisture_min": 15,
            "battery_min": 15
        },
        "registered_cameras": [{
            "serial": c.serial_number,
            "model": c.model,
            "position": {"lat": c.latitude, "lng": c.longitude}
        } for c in cameras],
        "api_endpoint": "https://api.theagrivision.com/api/hub",
        "mqtt_broker": "broker.hivemq.com",
        "mqtt_topic": f"agrivision/{hub_serial}"
    }
