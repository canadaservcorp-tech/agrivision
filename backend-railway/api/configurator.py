"""
System Configurator API
Auto-calculates cameras, hubs, pricing based on farm dimensions
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from models.config import get_db, settings
from models.schemas import ConfiguratorRequest, ConfiguratorResponse
import math

router = APIRouter()

# Coverage radius per camera (meters)
CAMERA_COVERAGE = {
    "flat": 35,
    "hilly": 28,
    "greenhouse": 16,
    "indoor": 12,
    "terraced": 25,
}

# Area coverage per camera (m²) accounting for overlap
COVERAGE_PER_CAMERA = {
    "flat": 3200,
    "hilly": 2500,
    "greenhouse": 800,
    "indoor": 400,
    "terraced": 2000,
}

# Max cameras per hub before needing second hub
MAX_CAMERAS_PER_HUB = 15

# WiFi effective range (meters) before needing repeater
WIFI_RANGE = 150


def calculate_system(area_hectares: float, terrain_type: str):
    """Core calculation engine"""
    
    terrain_key = terrain_type.lower().split("/")[0].split(" ")[0].strip()
    if terrain_key not in COVERAGE_PER_CAMERA:
        terrain_key = "flat"  # default
    
    area_m2 = area_hectares * 10000
    coverage = COVERAGE_PER_CAMERA[terrain_key]
    camera_radius = CAMERA_COVERAGE[terrain_key]
    
    # Calculate cameras needed
    cameras = max(2, math.ceil(area_m2 / coverage))
    
    # Calculate hubs
    hubs = math.ceil(cameras / MAX_CAMERAS_PER_HUB)
    
    # Calculate WiFi repeaters based on farm dimensions
    # Assume roughly square farm
    side_length = math.sqrt(area_m2)
    if side_length > WIFI_RANGE * 2:
        wifi_repeaters = math.ceil((side_length / WIFI_RANGE) - 1)
    else:
        wifi_repeaters = 0
    
    # Generate camera positions (circular pattern around hub)
    camera_positions = []
    for i in range(cameras):
        angle = (i / cameras) * 2 * math.pi
        # Distribute in concentric rings
        ring = i // 8  # 8 cameras per ring
        radius_pct = 30 + (ring * 20)  # 30%, 50%, 70%...
        x = 50 + math.cos(angle) * min(radius_pct, 45)
        y = 50 + math.sin(angle) * min(radius_pct, 45)
        camera_positions.append({
            "id": i + 1,
            "x_percent": round(x, 1),
            "y_percent": round(y, 1),
            "coverage_radius_m": camera_radius,
            "angle": round(math.degrees(angle), 1)
        })
    
    hub_positions = []
    if hubs == 1:
        hub_positions = [{"id": 1, "x_percent": 50, "y_percent": 50}]
    else:
        for i in range(hubs):
            angle = (i / hubs) * 2 * math.pi
            x = 50 + math.cos(angle) * 25
            y = 50 + math.sin(angle) * 25
            hub_positions.append({"id": i + 1, "x_percent": round(x, 1), "y_percent": round(y, 1)})
    
    # Pricing
    hub_total = hubs * settings.HUB_PRICE
    camera_total = cameras * settings.CAMERA_NODE_PRICE
    repeater_total = wifi_repeaters * settings.WIFI_REPEATER_PRICE
    shipping = settings.SHIPPING_BASE + (cameras * settings.SHIPPING_PER_CAMERA)
    subtotal = hub_total + camera_total + repeater_total + shipping
    tax = 0  # Apply based on country
    total = subtotal + tax
    
    # Old system comparison
    old_cost = cameras * 577  # Each standalone unit
    savings = old_cost - total
    savings_pct = (savings / old_cost * 100) if old_cost > 0 else 0
    
    return {
        "area_hectares": area_hectares,
        "area_m2": area_m2,
        "terrain_type": terrain_type,
        "cameras_needed": cameras,
        "hubs_needed": hubs,
        "wifi_repeaters": wifi_repeaters,
        "camera_positions": camera_positions,
        "hub_positions": hub_positions,
        "hub_total": hub_total,
        "camera_total": camera_total,
        "repeater_total": repeater_total,
        "shipping_cost": shipping,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "currency": "USD",
        "old_system_cost": old_cost,
        "savings": savings,
        "savings_percent": round(savings_pct, 1)
    }


@router.post("/calculate", response_model=ConfiguratorResponse)
async def calculate_configuration(req: ConfiguratorRequest):
    """
    Auto-calculate system requirements based on farm dimensions.
    Returns cameras needed, positions, pricing, and savings.
    """
    result = calculate_system(req.area_hectares, req.terrain_type)
    return ConfiguratorResponse(**result)


@router.get("/pricing")
async def get_pricing():
    """Get current pricing for all components"""
    return {
        "hub_price": settings.HUB_PRICE,
        "camera_node_price": settings.CAMERA_NODE_PRICE,
        "wifi_repeater_price": settings.WIFI_REPEATER_PRICE,
        "shipping_base": settings.SHIPPING_BASE,
        "shipping_per_camera": settings.SHIPPING_PER_CAMERA,
        "currency": "USD",
        "subscription_plans": {
            "starter": {"price": 49, "devices": 1, "features": ["basic_detection", "email_alerts", "monthly_reports"]},
            "professional": {"price": 129, "devices": 5, "features": ["full_detection", "push_sms_alerts", "dashboard", "satellite", "priority_support"]},
            "enterprise": {"price": "custom", "devices": "unlimited", "features": ["all", "white_label", "api", "dedicated_manager", "sla"]}
        }
    }


@router.get("/coverage-specs")
async def get_coverage_specs():
    """Get camera coverage specifications per terrain type"""
    return {
        "terrain_types": [
            {"key": "flat", "label": "Flat / Open Field", "coverage_m2": 3200, "radius_m": 35, "description": "Best coverage - minimal obstacles"},
            {"key": "hilly", "label": "Hilly / Sloped", "coverage_m2": 2500, "radius_m": 28, "description": "Reduced range due to elevation changes"},
            {"key": "greenhouse", "label": "Greenhouse", "coverage_m2": 800, "radius_m": 16, "description": "Dense planting requires more cameras"},
            {"key": "indoor", "label": "Indoor / Vertical Farm", "coverage_m2": 400, "radius_m": 12, "description": "Close-up monitoring for multi-level farming"},
            {"key": "terraced", "label": "Terraced", "coverage_m2": 2000, "radius_m": 25, "description": "Step terrain needs cameras per terrace level"},
        ],
        "camera_model": "ESP32-S3 + OV5640 5MP",
        "hub_model": "Raspberry Pi 4B",
        "max_cameras_per_hub": MAX_CAMERAS_PER_HUB,
        "wifi_range_m": WIFI_RANGE
    }
