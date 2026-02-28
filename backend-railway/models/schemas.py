"""
AgriVision API Schemas
Pydantic models for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


# ============================================================
# AUTH
# ============================================================

class SignUpRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None
    country: Optional[str] = None
    language: str = "en"
    whatsapp_enabled: bool = True
    consent_data_sharing: bool = False
    consent_marketing: bool = False
    role: str = "farmer"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)


# ============================================================
# USER
# ============================================================

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    phone: Optional[str]
    country: Optional[str]
    language: str
    whatsapp_enabled: bool
    role: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    language: Optional[str] = None
    whatsapp_enabled: Optional[bool] = None


# ============================================================
# FARM
# ============================================================

class FarmCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    polygon_coordinates: Optional[List[dict]] = None
    area_hectares: float = Field(..., gt=0)
    terrain_type: str
    water_source: Optional[str] = None
    soil_type: Optional[str] = None
    workers_count: Optional[int] = None
    address: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None

class FarmResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    polygon_coordinates: Optional[List[dict]]
    area_hectares: float
    area_m2: Optional[float]
    terrain_type: str
    water_source: Optional[str]
    soil_type: Optional[str]
    workers_count: Optional[int]
    country: Optional[str]
    region: Optional[str]
    is_active: bool
    created_at: datetime
    crops: List["CropResponse"] = []

    class Config:
        from_attributes = True

class FarmUpdateRequest(BaseModel):
    name: Optional[str] = None
    area_hectares: Optional[float] = None
    terrain_type: Optional[str] = None
    water_source: Optional[str] = None
    soil_type: Optional[str] = None
    workers_count: Optional[int] = None


# ============================================================
# CROP
# ============================================================

class CropCreateRequest(BaseModel):
    farm_id: int
    category: str  # vegetables, fruits, grains, herbs, industrial
    name: str
    variety: Optional[str] = None
    area_hectares: Optional[float] = None
    planting_month: Optional[str] = None
    harvest_month: Optional[str] = None
    annual_production_tons: Optional[float] = None
    organic_certified: bool = False
    current_problems: Optional[List[str]] = None

class CropResponse(BaseModel):
    id: int
    farm_id: int
    category: str
    name: str
    variety: Optional[str]
    area_hectares: Optional[float]
    planting_month: Optional[str]
    harvest_month: Optional[str]
    organic_certified: bool
    current_problems: Optional[List[str]]
    is_active: bool

    class Config:
        from_attributes = True


# ============================================================
# SYSTEM CONFIGURATOR
# ============================================================

class ConfiguratorRequest(BaseModel):
    area_hectares: float = Field(..., gt=0)
    terrain_type: str
    num_crops: int = 1

class ConfiguratorResponse(BaseModel):
    area_hectares: float
    area_m2: float
    terrain_type: str
    cameras_needed: int
    hubs_needed: int
    wifi_repeaters: int
    camera_positions: List[dict]  # [{x, y, radius}]
    hub_positions: List[dict]
    
    # Pricing
    hub_total: float
    camera_total: float
    repeater_total: float
    shipping_cost: float
    subtotal: float
    tax: float
    total: float
    currency: str = "USD"
    
    # Comparison
    old_system_cost: float  # What it would cost with standalone units
    savings: float
    savings_percent: float


# ============================================================
# ORDERS
# ============================================================

class OrderCreateRequest(BaseModel):
    farm_id: int
    num_hubs: int = 1
    num_cameras: int
    num_wifi_repeaters: int = 0
    
    # Shipping
    shipping_name: str
    shipping_address: str
    shipping_city: str
    shipping_country: str
    shipping_postal: str
    shipping_phone: str
    
    # Payment
    payment_method: str = "stripe"  # stripe or manual
    discount_code: Optional[str] = None
    customer_notes: Optional[str] = None

class OrderResponse(BaseModel):
    id: int
    reference: str
    status: str
    num_hubs: int
    num_cameras: int
    num_wifi_repeaters: int
    total_amount: float
    currency: str
    payment_status: Optional[str]
    tracking_number: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentIntentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    amount: float
    currency: str


# ============================================================
# DASHBOARD
# ============================================================

class DashboardResponse(BaseModel):
    farmer: UserResponse
    farms: List[FarmResponse]
    systems: List["SystemStatusResponse"]
    recent_detections: List["DetectionResponse"]
    sensor_summary: Optional["SensorSummaryResponse"]
    unread_notifications: int

class SystemStatusResponse(BaseModel):
    id: int
    hub_serial: Optional[str]
    is_online: bool
    last_heartbeat: Optional[datetime]
    battery_level: Optional[float]
    num_cameras: int
    cameras_online: int
    subscription_plan: str
    subscription_end: Optional[date]

    class Config:
        from_attributes = True

class DetectionResponse(BaseModel):
    id: int
    disease_name: str
    disease_category: Optional[str]
    confidence_score: float
    severity: str
    image_url: str
    crop_name: Optional[str]
    treatment_recommended: Optional[str]
    detected_at: datetime
    is_acknowledged: bool

    class Config:
        from_attributes = True

class SensorSummaryResponse(BaseModel):
    temperature: Optional[float]
    humidity: Optional[float]
    soil_moisture: Optional[float]
    last_reading: Optional[datetime]


# ============================================================
# HUB COMMUNICATION
# ============================================================

class HubHeartbeat(BaseModel):
    hub_serial: str
    battery_level: float
    temperature: float
    signal_strength: int
    storage_used_gb: float
    cameras_online: List[str]  # List of camera serials
    firmware_version: str

class HubImageUpload(BaseModel):
    hub_serial: str
    camera_serial: str
    image_base64: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    metadata: Optional[dict] = None

class HubSensorData(BaseModel):
    hub_serial: str
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    soil_moisture: Optional[float] = None
    light_lux: Optional[float] = None
    recorded_at: Optional[datetime] = None

class HubDetectionResult(BaseModel):
    hub_serial: str
    camera_serial: str
    disease_name: str
    confidence: float
    severity: str
    image_url: str
    crop_id: Optional[int] = None
    treatment: Optional[str] = None


# ============================================================
# ADMIN
# ============================================================

class AdminDashboardResponse(BaseModel):
    total_farmers: int
    total_farms: int
    total_systems: int
    systems_online: int
    total_orders: int
    revenue_total: float
    revenue_this_month: float
    recent_orders: List[OrderResponse]
    top_countries: List[dict]
    top_crops: List[dict]
    disease_stats: List[dict]

class AdminFarmerListResponse(BaseModel):
    farmers: List[UserResponse]
    total: int
    page: int
    pages: int


# Resolve forward references
TokenResponse.model_rebuild()
DashboardResponse.model_rebuild()
FarmResponse.model_rebuild()
