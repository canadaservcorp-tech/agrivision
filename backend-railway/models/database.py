"""
AgriVision Database Models
PostgreSQL via SQLAlchemy + Alembic
All farmer, farm, crop, system, and order data
"""

from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    Text, JSON, ForeignKey, Enum, Numeric, Index, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()


# ============================================================
# ENUMS
# ============================================================

class UserRole(str, enum.Enum):
    FARMER = "farmer"
    COMPANY = "company"
    ADMIN = "admin"
    DEALER = "dealer"
    RESEARCHER = "researcher"

class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class SubscriptionPlan(str, enum.Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class TerrainType(str, enum.Enum):
    FLAT = "flat"
    HILLY = "hilly"
    GREENHOUSE = "greenhouse"
    INDOOR = "indoor"
    TERRACED = "terraced"

class SeverityLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ============================================================
# USERS & AUTHENTICATION
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default=UserRole.FARMER, nullable=False)
    
    # Profile
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50))
    country = Column(String(100))
    language = Column(String(10), default="en")
    whatsapp_enabled = Column(Boolean, default=True)
    profile_photo_url = Column(String(500))
    
    # Privacy & Consent
    consent_data_sharing = Column(Boolean, default=False)
    consent_marketing = Column(Boolean, default=False)
    consent_date = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255))
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    farms = relationship("Farm", back_populates="owner", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_users_country", "country"),
        Index("idx_users_role", "role"),
    )


# ============================================================
# FARMS
# ============================================================

class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Basic Info
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Location (Google Maps)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    polygon_coordinates = Column(JSON)  # Array of lat/lng pairs for farm boundary
    address = Column(String(500))
    region = Column(String(255))
    city = Column(String(255))
    country = Column(String(100))
    
    # Farm Details
    area_hectares = Column(Float, nullable=False)
    area_m2 = Column(Float)  # Auto-calculated
    terrain_type = Column(String(50), nullable=False)
    water_source = Column(String(100))
    soil_type = Column(String(50))
    workers_count = Column(Integer)
    
    # Climate (auto-populated from weather API based on location)
    avg_temperature = Column(Float)
    avg_rainfall_mm = Column(Float)
    climate_zone = Column(String(50))
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="farms")
    crops = relationship("Crop", back_populates="farm", cascade="all, delete-orphan")
    systems = relationship("AgriVisionSystem", back_populates="farm", cascade="all, delete-orphan")
    detections = relationship("DiseaseDetection", back_populates="farm", cascade="all, delete-orphan")
    sensor_readings = relationship("SensorReading", back_populates="farm", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_farms_location", "latitude", "longitude"),
        Index("idx_farms_country", "country"),
        Index("idx_farms_terrain", "terrain_type"),
    )


# ============================================================
# CROPS
# ============================================================

class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    
    # Crop Info
    category = Column(String(50), nullable=False)  # vegetables, fruits, grains, herbs, industrial
    name = Column(String(100), nullable=False)
    variety = Column(String(100))
    
    # Growing Details
    area_hectares = Column(Float)
    planting_month = Column(String(10))
    harvest_month = Column(String(10))
    annual_production_tons = Column(Float)
    organic_certified = Column(Boolean, default=False)
    
    # Problems & Notes
    current_problems = Column(JSON)  # Array of strings
    notes = Column(Text)
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    farm = relationship("Farm", back_populates="crops")
    detections = relationship("DiseaseDetection", back_populates="crop")

    __table_args__ = (
        Index("idx_crops_category", "category"),
        Index("idx_crops_name", "name"),
    )


# ============================================================
# AGRIVISION SYSTEM (Hub + Camera Nodes)
# ============================================================

class AgriVisionSystem(Base):
    __tablename__ = "agrivision_systems"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    
    # Hub Info
    hub_serial = Column(String(50), unique=True, index=True)
    hub_model = Column(String(50), default="Pi4B-4GB")
    hub_firmware_version = Column(String(20))
    hub_ip_address = Column(String(50))
    hub_mac_address = Column(String(50))
    
    # Configuration
    num_cameras = Column(Integer, nullable=False)
    num_hubs = Column(Integer, default=1)
    wifi_repeaters = Column(Integer, default=0)
    camera_positions = Column(JSON)  # Array of {lat, lng, angle, coverage_radius}
    hub_position = Column(JSON)  # {lat, lng}
    
    # System Status
    is_online = Column(Boolean, default=False)
    last_heartbeat = Column(DateTime)
    battery_level = Column(Float)
    signal_strength = Column(Integer)  # dBm
    storage_used_gb = Column(Float)
    temperature_celsius = Column(Float)
    
    # Subscription
    subscription_plan = Column(String(20), default=SubscriptionPlan.STARTER)
    subscription_start = Column(Date)
    subscription_end = Column(Date)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    farm = relationship("Farm", back_populates="systems")
    order = relationship("Order")
    camera_nodes = relationship("CameraNode", back_populates="system", cascade="all, delete-orphan")


class CameraNode(Base):
    __tablename__ = "camera_nodes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    system_id = Column(Integer, ForeignKey("agrivision_systems.id", ondelete="CASCADE"), nullable=False)
    
    # Node Info
    serial_number = Column(String(50), unique=True, index=True)
    model = Column(String(50), default="ESP32-S3-OV5640")
    firmware_version = Column(String(20))
    mac_address = Column(String(50))
    
    # Position
    latitude = Column(Float)
    longitude = Column(Float)
    mounting_height_m = Column(Float, default=2.0)
    angle_degrees = Column(Float, default=0)
    coverage_radius_m = Column(Float, default=35)
    
    # Status
    is_online = Column(Boolean, default=False)
    last_heartbeat = Column(DateTime)
    battery_level = Column(Float)
    signal_strength = Column(Integer)
    images_captured_today = Column(Integer, default=0)
    last_image_url = Column(String(500))
    last_image_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    system = relationship("AgriVisionSystem", back_populates="camera_nodes")


# ============================================================
# DISEASE DETECTIONS
# ============================================================

class DiseaseDetection(Base):
    __tablename__ = "disease_detections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    crop_id = Column(Integer, ForeignKey("crops.id"), nullable=True)
    camera_node_id = Column(Integer, ForeignKey("camera_nodes.id"), nullable=True)
    
    # Detection
    disease_name = Column(String(200), nullable=False)
    disease_category = Column(String(50))  # fungal, bacterial, viral, etc.
    confidence_score = Column(Float, nullable=False)  # 0.0 - 1.0
    severity = Column(String(20), default=SeverityLevel.LOW)
    
    # Image
    image_url = Column(String(500), nullable=False)
    image_thumbnail_url = Column(String(500))
    annotated_image_url = Column(String(500))  # Image with detection boxes
    
    # Location
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Treatment
    treatment_recommended = Column(Text)
    treatment_applied = Column(Text)  # Farmer feedback
    treatment_effective = Column(Boolean)  # Farmer feedback
    
    # Status
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime)
    
    detected_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    farm = relationship("Farm", back_populates="detections")
    crop = relationship("Crop", back_populates="detections")

    __table_args__ = (
        Index("idx_detections_disease", "disease_name"),
        Index("idx_detections_severity", "severity"),
        Index("idx_detections_date", "detected_at"),
    )


# ============================================================
# SENSOR READINGS
# ============================================================

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=False)
    system_id = Column(Integer, ForeignKey("agrivision_systems.id"), nullable=True)
    
    # Readings
    temperature_celsius = Column(Float)
    humidity_percent = Column(Float)
    soil_moisture_percent = Column(Float)
    light_lux = Column(Float)
    wind_speed_kmh = Column(Float)
    rainfall_mm = Column(Float)
    
    # Raw data
    raw_data = Column(JSON)
    
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    farm = relationship("Farm", back_populates="sensor_readings")

    __table_args__ = (
        Index("idx_sensor_farm_date", "farm_id", "recorded_at"),
    )


# ============================================================
# ORDERS & PAYMENTS
# ============================================================

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Order Details
    reference = Column(String(20), unique=True, nullable=False, index=True)
    status = Column(String(20), default=OrderStatus.PENDING, nullable=False)
    
    # System Configuration
    num_hubs = Column(Integer, default=1)
    num_cameras = Column(Integer, nullable=False)
    num_wifi_repeaters = Column(Integer, default=0)
    farm_area_hectares = Column(Float)
    terrain_type = Column(String(50))
    
    # Pricing (USD)
    hub_total = Column(Numeric(10, 2))
    camera_total = Column(Numeric(10, 2))
    repeater_total = Column(Numeric(10, 2), default=0)
    shipping_cost = Column(Numeric(10, 2))
    tax_amount = Column(Numeric(10, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    discount_code = Column(String(50))
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    
    # Payment
    payment_provider = Column(String(20))  # stripe, manual
    payment_intent_id = Column(String(255))
    payment_status = Column(String(20))
    paid_at = Column(DateTime)
    
    # Shipping
    shipping_name = Column(String(255))
    shipping_address = Column(Text)
    shipping_city = Column(String(100))
    shipping_country = Column(String(100))
    shipping_postal = Column(String(20))
    shipping_phone = Column(String(50))
    tracking_number = Column(String(100))
    shipped_at = Column(DateTime)
    delivered_at = Column(DateTime)
    
    # Notes
    admin_notes = Column(Text)
    customer_notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="orders")

    __table_args__ = (
        Index("idx_orders_status", "status"),
        Index("idx_orders_date", "created_at"),
    )


# ============================================================
# NOTIFICATIONS
# ============================================================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(20))  # alert, info, warning, order, system
    link = Column(String(500))
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


# ============================================================
# COMPANIES (B2B)
# ============================================================

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Company Info
    name = Column(String(255), nullable=False)
    type = Column(String(50))  # agri-pharma, seed, equipment, distributor
    website = Column(String(255))
    logo_url = Column(String(500))
    description = Column(Text)
    
    # Contact
    contact_name = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    
    # Location
    country = Column(String(100))
    region = Column(String(100))
    
    # Subscription
    plan = Column(String(20), default="free")  # free, decouverte, professionnel, entreprise
    plan_start = Column(Date)
    plan_end = Column(Date)
    messages_used = Column(Integer, default=0)
    messages_limit = Column(Integer, default=0)
    
    # Status
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ============================================================
# ANALYTICS (Aggregated data for B2B sales)
# ============================================================

class RegionalCropData(Base):
    """Aggregated, anonymized data for market intelligence reports"""
    __tablename__ = "regional_crop_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    country = Column(String(100), nullable=False)
    region = Column(String(255))
    crop_category = Column(String(50))
    crop_name = Column(String(100))
    
    # Aggregated Stats
    total_farms = Column(Integer, default=0)
    total_area_hectares = Column(Float, default=0)
    avg_production_tons = Column(Float)
    organic_percentage = Column(Float)
    
    # Disease Stats
    top_diseases = Column(JSON)  # [{name, count, avg_severity}]
    disease_frequency = Column(Float)  # detections per hectare
    
    # Period
    period_start = Column(Date)
    period_end = Column(Date)
    
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_regional_country_crop", "country", "crop_name"),
    )
