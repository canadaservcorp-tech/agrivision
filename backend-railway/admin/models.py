"""
╔══════════════════════════════════════════════════════════╗
║  AgriVision Admin Dashboard — Database Models            ║
║  Full schema: users, dealers, payments, subscriptions,   ║
║  invoices, library, detections, farms, analytics         ║
║  © 2026 PCTA S.A.                                        ║
╚══════════════════════════════════════════════════════════╝
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, Enum,
    ForeignKey, JSON, Date, Numeric, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()


# ═══════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════

class UserRole(str, enum.Enum):
    FARMER = "farmer"
    DEALER = "dealer"
    ACCOUNT_MANAGER = "account_manager"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"

class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING = "pending"
    DEACTIVATED = "deactivated"

class SubPlan(str, enum.Enum):
    TRIAL = "trial"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class SubStatus(str, enum.Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    TRIAL = "trial"

class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    DISPUTED = "disputed"

class PaymentMethod(str, enum.Enum):
    PAYPAL = "paypal"
    STRIPE = "stripe"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class LibraryItemType(str, enum.Enum):
    DOCUMENT = "document"
    NEWS = "news"
    ADVERTISEMENT = "advertisement"
    GUIDE = "guide"
    VIDEO = "video"
    FIRMWARE = "firmware"

class DetectionSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ═══════════════════════════════════════
# USERS & AUTH
# ═══════════════════════════════════════

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=UserRole.FARMER)
    status = Column(String(20), nullable=False, default=UserStatus.PENDING)
    
    # Profile
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(30))
    company = Column(String(200))
    avatar_url = Column(String(500))
    language = Column(String(5), default="en")
    
    # Location
    country = Column(String(100), index=True)
    region = Column(String(100))
    city = Column(String(100))
    address = Column(Text)
    timezone = Column(String(50))
    
    # Business
    dealer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    account_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Metadata
    last_login = Column(DateTime)
    login_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    notes = Column(Text)
    metadata_json = Column(JSON)
    
    # Relationships
    farms = relationship("Farm", back_populates="owner", foreign_keys="Farm.owner_id")
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    payments = relationship("Payment", back_populates="user")
    invoices = relationship("Invoice", back_populates="user")
    
    __table_args__ = (
        Index("idx_user_role_status", "role", "status"),
        Index("idx_user_country", "country"),
    )


# ═══════════════════════════════════════
# FARMS
# ═══════════════════════════════════════

class Farm(Base):
    __tablename__ = "farms"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    country = Column(String(100), index=True)
    region = Column(String(100))
    city = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    area_hectares = Column(Float)
    crop_types = Column(JSON)  # ["wheat", "tomato", "olive"]
    soil_type = Column(String(50))
    irrigation_type = Column(String(50))
    hub_serial = Column(String(50), unique=True)
    total_cameras = Column(Integer, default=0)
    active_cameras = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    owner = relationship("User", back_populates="farms", foreign_keys=[owner_id])
    detections = relationship("Detection", back_populates="farm")
    sensor_data = relationship("SensorReading", back_populates="farm")
    
    __table_args__ = (
        Index("idx_farm_country", "country"),
        Index("idx_farm_hub", "hub_serial"),
    )


# ═══════════════════════════════════════
# DETECTIONS (AI Results)
# ═══════════════════════════════════════

class Detection(Base):
    __tablename__ = "detections"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    camera_serial = Column(String(50), index=True)
    disease_name = Column(String(100), nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    severity = Column(String(10), default=DetectionSeverity.LOW)
    crop_type = Column(String(50))
    image_url = Column(String(500))
    thumbnail_url = Column(String(500))
    zone = Column(String(50))
    lat = Column(Float)
    lng = Column(Float)
    ai_model_version = Column(String(20))
    is_confirmed = Column(Boolean, default=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    treatment_applied = Column(Text)
    notes = Column(Text)
    detected_at = Column(DateTime, server_default=func.now())
    metadata_json = Column(JSON)
    
    farm = relationship("Farm", back_populates="detections")
    
    __table_args__ = (
        Index("idx_detection_disease", "disease_name"),
        Index("idx_detection_date", "detected_at"),
        Index("idx_detection_farm_date", "farm_id", "detected_at"),
    )


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    farm_id = Column(Integer, ForeignKey("farms.id"), nullable=False)
    camera_serial = Column(String(50))
    temperature = Column(Float)
    humidity = Column(Float)
    soil_moisture = Column(Float)
    light_level = Column(Float)
    battery_mv = Column(Integer)
    rssi = Column(Integer)
    recorded_at = Column(DateTime, server_default=func.now())
    
    farm = relationship("Farm", back_populates="sensor_data")


# ═══════════════════════════════════════
# SUBSCRIPTIONS
# ═══════════════════════════════════════

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    plan = Column(String(20), nullable=False, default=SubPlan.TRIAL)
    status = Column(String(20), nullable=False, default=SubStatus.TRIAL)
    max_cameras = Column(Integer, default=5)
    max_farms = Column(Integer, default=1)
    price_monthly = Column(Numeric(10, 2), default=0)
    price_yearly = Column(Numeric(10, 2), default=0)
    billing_cycle = Column(String(10), default="monthly")  # monthly, yearly
    currency = Column(String(3), default="USD")
    
    # PayPal
    paypal_subscription_id = Column(String(100))
    paypal_payer_id = Column(String(100))
    
    # Dates
    trial_ends_at = Column(DateTime)
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    cancelled_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="subscription")
    
    __table_args__ = (
        Index("idx_sub_status", "status"),
        Index("idx_sub_plan", "plan"),
    )


# ═══════════════════════════════════════
# PAYMENTS
# ═══════════════════════════════════════

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(String(20), nullable=False, default=PaymentStatus.PENDING)
    method = Column(String(20), nullable=False, default=PaymentMethod.PAYPAL)
    
    # PayPal specific
    paypal_order_id = Column(String(100))
    paypal_capture_id = Column(String(100))
    paypal_payer_email = Column(String(255))
    
    description = Column(String(500))
    receipt_url = Column(String(500))
    refund_amount = Column(Numeric(10, 2))
    refund_reason = Column(Text)
    
    paid_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    metadata_json = Column(JSON)
    
    user = relationship("User", back_populates="payments")
    invoice = relationship("Invoice", back_populates="payments")
    
    __table_args__ = (
        Index("idx_payment_status", "status"),
        Index("idx_payment_date", "created_at"),
        Index("idx_payment_user", "user_id"),
    )


# ═══════════════════════════════════════
# INVOICES
# ═══════════════════════════════════════

class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invoice_number = Column(String(50), unique=True, nullable=False)
    status = Column(String(20), nullable=False, default=InvoiceStatus.DRAFT)
    
    subtotal = Column(Numeric(10, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0)
    tax_amount = Column(Numeric(10, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    total = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    
    line_items = Column(JSON)  # [{"desc":"...", "qty":1, "price":99.00}]
    
    billing_name = Column(String(200))
    billing_email = Column(String(255))
    billing_address = Column(Text)
    billing_country = Column(String(100))
    billing_tax_id = Column(String(50))
    
    notes = Column(Text)
    due_date = Column(Date)
    paid_at = Column(DateTime)
    sent_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="invoices")
    payments = relationship("Payment", back_populates="invoice")
    
    __table_args__ = (
        Index("idx_invoice_status", "status"),
        Index("idx_invoice_user", "user_id"),
        Index("idx_invoice_number", "invoice_number"),
    )


# ═══════════════════════════════════════
# LIBRARY (Files, News, Ads)
# ═══════════════════════════════════════

class LibraryItem(Base):
    __tablename__ = "library_items"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    item_type = Column(String(20), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    slug = Column(String(300), unique=True)
    content = Column(Text)
    summary = Column(Text)
    
    # Media
    file_url = Column(String(500))
    thumbnail_url = Column(String(500))
    file_size_bytes = Column(Integer)
    file_type = Column(String(50))  # pdf, mp4, jpg...
    
    # Metadata
    author_id = Column(Integer, ForeignKey("users.id"))
    category = Column(String(100), index=True)
    tags = Column(JSON)  # ["wheat", "disease", "guide"]
    language = Column(String(5), default="en")
    
    # Publishing
    is_published = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    publish_date = Column(DateTime)
    expiry_date = Column(DateTime)
    
    # Advertising specific
    ad_target_countries = Column(JSON)
    ad_target_plans = Column(JSON)
    ad_click_url = Column(String(500))
    ad_impressions = Column(Integer, default=0)
    ad_clicks = Column(Integer, default=0)
    ad_budget = Column(Numeric(10, 2))
    ad_spent = Column(Numeric(10, 2), default=0)
    
    # Stats
    view_count = Column(Integer, default=0)
    download_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_library_type_cat", "item_type", "category"),
        Index("idx_library_published", "is_published", "publish_date"),
    )


# ═══════════════════════════════════════
# DISEASE LIBRARY
# ═══════════════════════════════════════

class Disease(Base):
    __tablename__ = "diseases"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), unique=True, nullable=False)
    scientific_name = Column(String(200))
    category = Column(String(50))  # fungal, bacterial, viral, pest
    affected_crops = Column(JSON)
    symptoms = Column(Text)
    treatment = Column(Text)
    prevention = Column(Text)
    severity_default = Column(String(10), default="medium")
    image_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


# ═══════════════════════════════════════
# AUDIT LOG
# ═══════════════════════════════════════

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)  # create, update, delete, login, export
    entity_type = Column(String(50))  # user, farm, payment, invoice...
    entity_id = Column(Integer)
    details = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_date", "created_at"),
    )


# ═══════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text)
    category = Column(String(30))  # alert, payment, system, detection
    is_read = Column(Boolean, default=False)
    action_url = Column(String(500))
    created_at = Column(DateTime, server_default=func.now())


# ═══════════════════════════════════════
# DEALER COMMISSIONS
# ═══════════════════════════════════════

class DealerCommission(Base):
    __tablename__ = "dealer_commissions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    dealer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    farmer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    commission_rate = Column(Numeric(5, 2), nullable=False)  # percentage
    commission_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(String(20), default="pending")  # pending, paid, cancelled
    paid_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
