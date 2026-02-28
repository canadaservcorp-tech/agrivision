"""
╔══════════════════════════════════════════════════════════╗
║  AgriVision Admin Dashboard — Backend API                ║
║  FastAPI + SQLAlchemy | 60+ endpoints                    ║
║  © 2026 PCTA S.A.                                        ║
╚══════════════════════════════════════════════════════════╝
"""

import os, io, csv, json, hashlib, secrets
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, desc, and_, or_, extract, cast, Date
from sqlalchemy.orm import Session

from database import get_db, init_db
from models import *

# Optional imports
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False


# ═══════════════════════════════════════
# APP SETUP
# ═══════════════════════════════════════

app = FastAPI(title="AgriVision Admin API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "")
PAYPAL_SECRET = os.getenv("PAYPAL_SECRET", "")
PAYPAL_BASE = os.getenv("PAYPAL_BASE", "https://api-m.sandbox.paypal.com")


@app.on_event("startup")
def startup():
    init_db()


# ═══════════════════════════════════════
# PYDANTIC SCHEMAS
# ═══════════════════════════════════════

class UserCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    role: str = "farmer"
    phone: str = ""
    company: str = ""
    country: str = ""
    region: str = ""
    city: str = ""
    dealer_id: Optional[int] = None
    account_manager_id: Optional[int] = None

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    status: Optional[str] = None
    role: Optional[str] = None
    dealer_id: Optional[int] = None
    account_manager_id: Optional[int] = None
    notes: Optional[str] = None

class FarmCreate(BaseModel):
    owner_id: int
    name: str
    country: str = ""
    region: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_hectares: Optional[float] = None
    crop_types: Optional[list] = None

class SubscriptionCreate(BaseModel):
    user_id: int
    plan: str = "trial"
    billing_cycle: str = "monthly"
    max_cameras: int = 5
    max_farms: int = 1
    price_monthly: float = 0
    price_yearly: float = 0

class PaymentCreate(BaseModel):
    user_id: int
    amount: float
    currency: str = "USD"
    method: str = "paypal"
    description: str = ""
    invoice_id: Optional[int] = None

class InvoiceCreate(BaseModel):
    user_id: int
    line_items: list  # [{"desc":"...", "qty":1, "price":99.00}]
    tax_rate: float = 0
    discount_amount: float = 0
    billing_name: str = ""
    billing_email: str = ""
    billing_address: str = ""
    billing_country: str = ""
    billing_tax_id: str = ""
    notes: str = ""
    due_date: Optional[str] = None

class LibraryItemCreate(BaseModel):
    item_type: str  # document, news, advertisement, guide, video, firmware
    title: str
    content: str = ""
    summary: str = ""
    category: str = ""
    tags: Optional[list] = None
    language: str = "en"
    is_published: bool = False
    is_featured: bool = False
    file_url: str = ""
    thumbnail_url: str = ""
    # Ad fields
    ad_target_countries: Optional[list] = None
    ad_target_plans: Optional[list] = None
    ad_click_url: str = ""
    ad_budget: Optional[float] = None

class DiseaseCreate(BaseModel):
    name: str
    scientific_name: str = ""
    category: str = ""
    affected_crops: Optional[list] = None
    symptoms: str = ""
    treatment: str = ""
    prevention: str = ""
    severity_default: str = "medium"

class SearchQuery(BaseModel):
    q: str = ""
    country: str = ""
    farmer_name: str = ""
    farm_name: str = ""
    disease_name: str = ""
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    page: int = 1
    per_page: int = 25


# ═══════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def gen_invoice_number() -> str:
    return f"INV-{datetime.now().strftime('%Y%m')}-{secrets.token_hex(3).upper()}"

def audit(db: Session, user_id: int, action: str, entity_type: str, entity_id: int, details: dict = None):
    log = AuditLog(user_id=user_id, action=action, entity_type=entity_type,
                   entity_id=entity_id, details=details or {})
    db.add(log)
    db.commit()

def paginate(query, page: int, per_page: int):
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page,
            "pages": (total + per_page - 1) // per_page}

def model_to_dict(obj):
    d = {}
    for c in obj.__table__.columns:
        val = getattr(obj, c.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        elif isinstance(val, date):
            val = val.isoformat()
        elif isinstance(val, Decimal):
            val = float(val)
        d[c.name] = val
    return d


# ═══════════════════════════════════════
# AUTH
# ═══════════════════════════════════════

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or user.password_hash != hash_password(req.password):
        raise HTTPException(400, "Invalid credentials")
    if user.status != UserStatus.ACTIVE and user.role != "superadmin":
        raise HTTPException(403, "Account not active")
    user.last_login = datetime.utcnow()
    user.login_count += 1
    db.commit()
    return {"user": model_to_dict(user), "token": secrets.token_urlsafe(32)}


# ═══════════════════════════════════════
# USERS CRUD
# ═══════════════════════════════════════

@app.get("/api/users")
def list_users(role: str = "", status: str = "", country: str = "",
               search: str = "", page: int = 1, per_page: int = 25,
               sort: str = "created_at", order: str = "desc",
               db: Session = Depends(get_db)):
    q = db.query(User)
    if role: q = q.filter(User.role == role)
    if status: q = q.filter(User.status == status)
    if country: q = q.filter(User.country.ilike(f"%{country}%"))
    if search:
        s = f"%{search}%"
        q = q.filter(or_(User.first_name.ilike(s), User.last_name.ilike(s),
                         User.email.ilike(s), User.company.ilike(s)))
    sort_col = getattr(User, sort, User.created_at)
    q = q.order_by(desc(sort_col) if order == "desc" else sort_col)
    result = paginate(q, page, per_page)
    result["items"] = [model_to_dict(u) for u in result["items"]]
    return result

@app.post("/api/users")
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already exists")
    user = User(email=data.email, password_hash=hash_password(data.password),
                first_name=data.first_name, last_name=data.last_name,
                role=data.role, status=UserStatus.ACTIVE,
                phone=data.phone, company=data.company,
                country=data.country, region=data.region, city=data.city,
                dealer_id=data.dealer_id, account_manager_id=data.account_manager_id)
    db.add(user)
    db.commit()
    db.refresh(user)
    return model_to_dict(user)

@app.get("/api/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user: raise HTTPException(404, "User not found")
    d = model_to_dict(user)
    d["farms"] = [model_to_dict(f) for f in user.farms]
    d["subscription"] = model_to_dict(user.subscription) if user.subscription else None
    d["recent_payments"] = [model_to_dict(p) for p in
                            db.query(Payment).filter(Payment.user_id == user_id)
                            .order_by(desc(Payment.created_at)).limit(10).all()]
    return d

@app.put("/api/users/{user_id}")
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user: raise HTTPException(404, "User not found")
    for k, v in data.dict(exclude_unset=True).items():
        if v is not None:
            setattr(user, k, v)
    db.commit()
    return model_to_dict(user)

@app.delete("/api/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user: raise HTTPException(404, "User not found")
    user.status = UserStatus.DEACTIVATED
    db.commit()
    return {"status": "deactivated"}

@app.post("/api/users/{user_id}/reset-password")
def reset_password(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user: raise HTTPException(404)
    temp_pw = secrets.token_urlsafe(10)
    user.password_hash = hash_password(temp_pw)
    db.commit()
    return {"temporary_password": temp_pw}


# ═══════════════════════════════════════
# DEALERS
# ═══════════════════════════════════════

@app.get("/api/dealers")
def list_dealers(db: Session = Depends(get_db)):
    dealers = db.query(User).filter(User.role == "dealer", User.status == UserStatus.ACTIVE).all()
    result = []
    for d in dealers:
        dd = model_to_dict(d)
        dd["farmer_count"] = db.query(User).filter(User.dealer_id == d.id).count()
        dd["total_revenue"] = float(db.query(func.coalesce(func.sum(Payment.amount), 0))
            .join(User, Payment.user_id == User.id)
            .filter(User.dealer_id == d.id, Payment.status == "completed").scalar() or 0)
        dd["total_commission"] = float(db.query(func.coalesce(func.sum(DealerCommission.commission_amount), 0))
            .filter(DealerCommission.dealer_id == d.id).scalar() or 0)
        result.append(dd)
    return result

@app.get("/api/dealers/{dealer_id}/farmers")
def dealer_farmers(dealer_id: int, db: Session = Depends(get_db)):
    farmers = db.query(User).filter(User.dealer_id == dealer_id).all()
    return [model_to_dict(f) for f in farmers]

@app.get("/api/dealers/{dealer_id}/commissions")
def dealer_commissions(dealer_id: int, db: Session = Depends(get_db)):
    comms = db.query(DealerCommission).filter(DealerCommission.dealer_id == dealer_id)\
        .order_by(desc(DealerCommission.created_at)).all()
    return [model_to_dict(c) for c in comms]

@app.post("/api/dealers/{dealer_id}/assign-farmer/{farmer_id}")
def assign_farmer_to_dealer(dealer_id: int, farmer_id: int, db: Session = Depends(get_db)):
    farmer = db.query(User).get(farmer_id)
    if not farmer: raise HTTPException(404)
    farmer.dealer_id = dealer_id
    db.commit()
    return {"status": "assigned"}


# ═══════════════════════════════════════
# ACCOUNT MANAGERS
# ═══════════════════════════════════════

@app.get("/api/account-managers")
def list_account_managers(db: Session = Depends(get_db)):
    managers = db.query(User).filter(User.role == "account_manager").all()
    result = []
    for m in managers:
        md = model_to_dict(m)
        md["assigned_farmers"] = db.query(User).filter(User.account_manager_id == m.id).count()
        md["assigned_dealers"] = db.query(User).filter(
            User.dealer_id.in_(
                db.query(User.id).filter(User.account_manager_id == m.id)
            )
        ).count()
        result.append(md)
    return result

@app.post("/api/account-managers/{manager_id}/assign-user/{user_id}")
def assign_to_manager(manager_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user: raise HTTPException(404)
    user.account_manager_id = manager_id
    db.commit()
    return {"status": "assigned"}


# ═══════════════════════════════════════
# FARMS
# ═══════════════════════════════════════

@app.get("/api/farms")
def list_farms(country: str = "", search: str = "", owner_id: int = 0,
               page: int = 1, per_page: int = 25, db: Session = Depends(get_db)):
    q = db.query(Farm)
    if country: q = q.filter(Farm.country.ilike(f"%{country}%"))
    if search: q = q.filter(or_(Farm.name.ilike(f"%{search}%"), Farm.hub_serial.ilike(f"%{search}%")))
    if owner_id: q = q.filter(Farm.owner_id == owner_id)
    q = q.order_by(desc(Farm.created_at))
    result = paginate(q, page, per_page)
    result["items"] = [model_to_dict(f) for f in result["items"]]
    return result

@app.post("/api/farms")
def create_farm(data: FarmCreate, db: Session = Depends(get_db)):
    farm = Farm(**data.dict())
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return model_to_dict(farm)

@app.get("/api/farms/{farm_id}")
def get_farm(farm_id: int, db: Session = Depends(get_db)):
    farm = db.query(Farm).get(farm_id)
    if not farm: raise HTTPException(404)
    d = model_to_dict(farm)
    d["owner"] = model_to_dict(farm.owner) if farm.owner else None
    d["recent_detections"] = [model_to_dict(det) for det in
        db.query(Detection).filter(Detection.farm_id == farm_id)
        .order_by(desc(Detection.detected_at)).limit(20).all()]
    d["detection_count"] = db.query(Detection).filter(Detection.farm_id == farm_id).count()
    return d


# ═══════════════════════════════════════
# DETECTIONS
# ═══════════════════════════════════════

@app.get("/api/detections")
def list_detections(farm_id: int = 0, disease: str = "", severity: str = "",
                    date_from: str = "", date_to: str = "",
                    page: int = 1, per_page: int = 25, db: Session = Depends(get_db)):
    q = db.query(Detection)
    if farm_id: q = q.filter(Detection.farm_id == farm_id)
    if disease: q = q.filter(Detection.disease_name.ilike(f"%{disease}%"))
    if severity: q = q.filter(Detection.severity == severity)
    if date_from:
        q = q.filter(Detection.detected_at >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.filter(Detection.detected_at <= datetime.fromisoformat(date_to))
    q = q.order_by(desc(Detection.detected_at))
    result = paginate(q, page, per_page)
    result["items"] = [model_to_dict(d) for d in result["items"]]
    return result

@app.get("/api/detections/stats")
def detection_stats(days: int = 30, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    
    # Top diseases
    top_diseases = db.query(
        Detection.disease_name,
        func.count(Detection.id).label("count"),
        func.avg(Detection.confidence).label("avg_confidence")
    ).filter(Detection.detected_at >= since)\
     .group_by(Detection.disease_name)\
     .order_by(desc("count")).limit(15).all()
    
    # By severity
    by_severity = db.query(
        Detection.severity,
        func.count(Detection.id).label("count")
    ).filter(Detection.detected_at >= since)\
     .group_by(Detection.severity).all()
    
    # Daily trend
    daily = db.query(
        func.date(Detection.detected_at).label("day"),
        func.count(Detection.id).label("count")
    ).filter(Detection.detected_at >= since)\
     .group_by("day").order_by("day").all()
    
    # By country
    by_country = db.query(
        Farm.country,
        func.count(Detection.id).label("count")
    ).join(Farm).filter(Detection.detected_at >= since)\
     .group_by(Farm.country).order_by(desc("count")).limit(20).all()
    
    return {
        "top_diseases": [{"name": d[0], "count": d[1], "avg_confidence": round(float(d[2] or 0), 2)} for d in top_diseases],
        "by_severity": {s[0]: s[1] for s in by_severity},
        "daily_trend": [{"date": str(d[0]), "count": d[1]} for d in daily],
        "by_country": [{"country": c[0] or "Unknown", "count": c[1]} for c in by_country],
        "total": db.query(Detection).filter(Detection.detected_at >= since).count()
    }


# ═══════════════════════════════════════
# SUBSCRIPTIONS
# ═══════════════════════════════════════

@app.get("/api/subscriptions")
def list_subscriptions(plan: str = "", status: str = "",
                       page: int = 1, per_page: int = 25, db: Session = Depends(get_db)):
    q = db.query(Subscription)
    if plan: q = q.filter(Subscription.plan == plan)
    if status: q = q.filter(Subscription.status == status)
    q = q.order_by(desc(Subscription.created_at))
    result = paginate(q, page, per_page)
    items = []
    for sub in result["items"]:
        d = model_to_dict(sub)
        user = db.query(User).get(sub.user_id)
        if user:
            d["user_name"] = f"{user.first_name} {user.last_name}"
            d["user_email"] = user.email
            d["user_country"] = user.country
        items.append(d)
    result["items"] = items
    return result

@app.post("/api/subscriptions")
def create_subscription(data: SubscriptionCreate, db: Session = Depends(get_db)):
    existing = db.query(Subscription).filter(Subscription.user_id == data.user_id).first()
    if existing:
        for k, v in data.dict().items():
            setattr(existing, k, v)
        db.commit()
        return model_to_dict(existing)
    sub = Subscription(**data.dict(), status="active",
                       current_period_start=datetime.utcnow(),
                       current_period_end=datetime.utcnow() + timedelta(days=30))
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return model_to_dict(sub)

@app.put("/api/subscriptions/{sub_id}")
def update_subscription(sub_id: int, plan: str = "", status: str = "",
                        max_cameras: int = 0, db: Session = Depends(get_db)):
    sub = db.query(Subscription).get(sub_id)
    if not sub: raise HTTPException(404)
    if plan: sub.plan = plan
    if status: sub.status = status
    if max_cameras: sub.max_cameras = max_cameras
    db.commit()
    return model_to_dict(sub)

@app.get("/api/subscriptions/stats")
def subscription_stats(db: Session = Depends(get_db)):
    by_plan = db.query(Subscription.plan, func.count(Subscription.id))\
        .group_by(Subscription.plan).all()
    by_status = db.query(Subscription.status, func.count(Subscription.id))\
        .group_by(Subscription.status).all()
    mrr = float(db.query(func.coalesce(func.sum(Subscription.price_monthly), 0))
        .filter(Subscription.status == "active").scalar() or 0)
    return {
        "by_plan": {p[0]: p[1] for p in by_plan},
        "by_status": {s[0]: s[1] for s in by_status},
        "mrr": mrr,
        "arr": mrr * 12,
        "total_active": db.query(Subscription).filter(Subscription.status == "active").count()
    }


# ═══════════════════════════════════════
# PAYMENTS
# ═══════════════════════════════════════

@app.get("/api/payments")
def list_payments(status: str = "", method: str = "", user_id: int = 0,
                  date_from: str = "", date_to: str = "",
                  page: int = 1, per_page: int = 25, db: Session = Depends(get_db)):
    q = db.query(Payment)
    if status: q = q.filter(Payment.status == status)
    if method: q = q.filter(Payment.method == method)
    if user_id: q = q.filter(Payment.user_id == user_id)
    if date_from: q = q.filter(Payment.created_at >= datetime.fromisoformat(date_from))
    if date_to: q = q.filter(Payment.created_at <= datetime.fromisoformat(date_to))
    q = q.order_by(desc(Payment.created_at))
    result = paginate(q, page, per_page)
    items = []
    for p in result["items"]:
        d = model_to_dict(p)
        user = db.query(User).get(p.user_id)
        if user:
            d["user_name"] = f"{user.first_name} {user.last_name}"
            d["user_email"] = user.email
        items.append(d)
    result["items"] = items
    return result

@app.post("/api/payments")
def create_payment(data: PaymentCreate, db: Session = Depends(get_db)):
    payment = Payment(
        user_id=data.user_id, amount=data.amount, currency=data.currency,
        method=data.method, description=data.description,
        invoice_id=data.invoice_id, status="completed",
        paid_at=datetime.utcnow()
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return model_to_dict(payment)

@app.post("/api/payments/{payment_id}/refund")
def refund_payment(payment_id: int, reason: str = "", db: Session = Depends(get_db)):
    payment = db.query(Payment).get(payment_id)
    if not payment: raise HTTPException(404)
    payment.status = "refunded"
    payment.refund_amount = payment.amount
    payment.refund_reason = reason
    db.commit()
    return model_to_dict(payment)

@app.get("/api/payments/stats")
def payment_stats(days: int = 30, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    total_rev = float(db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.status == "completed", Payment.created_at >= since).scalar() or 0)
    total_refunds = float(db.query(func.coalesce(func.sum(Payment.refund_amount), 0))
        .filter(Payment.status == "refunded", Payment.created_at >= since).scalar() or 0)
    
    daily = db.query(
        func.date(Payment.created_at).label("day"),
        func.sum(Payment.amount).label("revenue"),
        func.count(Payment.id).label("count")
    ).filter(Payment.status == "completed", Payment.created_at >= since)\
     .group_by("day").order_by("day").all()
    
    by_method = db.query(Payment.method, func.sum(Payment.amount), func.count(Payment.id))\
        .filter(Payment.status == "completed", Payment.created_at >= since)\
        .group_by(Payment.method).all()
    
    return {
        "total_revenue": total_rev,
        "total_refunds": total_refunds,
        "net_revenue": total_rev - total_refunds,
        "transaction_count": db.query(Payment).filter(Payment.created_at >= since).count(),
        "daily_revenue": [{"date": str(d[0]), "revenue": float(d[1] or 0), "count": d[2]} for d in daily],
        "by_method": [{"method": m[0], "total": float(m[1] or 0), "count": m[2]} for m in by_method]
    }


# ═══════════════════════════════════════
# PAYPAL INTEGRATION
# ═══════════════════════════════════════

async def _paypal_token():
    if not HAS_HTTPX or not PAYPAL_CLIENT_ID:
        return None
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{PAYPAL_BASE}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET))
        return resp.json().get("access_token")

@app.post("/api/paypal/create-order")
async def paypal_create_order(user_id: int, amount: float, currency: str = "USD",
                               db: Session = Depends(get_db)):
    token = await _paypal_token()
    if not token:
        raise HTTPException(503, "PayPal not configured")
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{PAYPAL_BASE}/v2/checkout/orders",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {"currency_code": currency, "value": str(amount)},
                    "description": "AgriVision Subscription"
                }]
            })
        order = resp.json()
    
    # Record pending payment
    payment = Payment(user_id=user_id, amount=amount, currency=currency,
                      method="paypal", paypal_order_id=order.get("id"),
                      status="pending", description="PayPal order")
    db.add(payment)
    db.commit()
    return {"order_id": order.get("id"), "payment_id": payment.id, "links": order.get("links")}

@app.post("/api/paypal/capture-order/{order_id}")
async def paypal_capture_order(order_id: str, db: Session = Depends(get_db)):
    token = await _paypal_token()
    if not token:
        raise HTTPException(503, "PayPal not configured")
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{PAYPAL_BASE}/v2/checkout/orders/{order_id}/capture",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        capture = resp.json()
    
    payment = db.query(Payment).filter(Payment.paypal_order_id == order_id).first()
    if payment:
        payment.status = "completed"
        payment.paid_at = datetime.utcnow()
        payment.paypal_capture_id = capture.get("id")
        payer = capture.get("payer", {})
        payment.paypal_payer_email = payer.get("email_address")
        db.commit()
    return {"status": capture.get("status"), "payment": model_to_dict(payment) if payment else None}

@app.post("/api/paypal/create-subscription")
async def paypal_create_subscription(user_id: int, plan_id: str, db: Session = Depends(get_db)):
    token = await _paypal_token()
    if not token:
        raise HTTPException(503, "PayPal not configured")
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{PAYPAL_BASE}/v1/billing/subscriptions",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"plan_id": plan_id, "application_context": {
                "return_url": "https://theagrivision.com/payment/success",
                "cancel_url": "https://theagrivision.com/payment/cancel"
            }})
        sub = resp.json()
    return {"subscription_id": sub.get("id"), "approve_url": next(
        (l["href"] for l in sub.get("links", []) if l["rel"] == "approve"), None)}


# ═══════════════════════════════════════
# INVOICES
# ═══════════════════════════════════════

@app.get("/api/invoices")
def list_invoices(status: str = "", user_id: int = 0,
                  page: int = 1, per_page: int = 25, db: Session = Depends(get_db)):
    q = db.query(Invoice)
    if status: q = q.filter(Invoice.status == status)
    if user_id: q = q.filter(Invoice.user_id == user_id)
    q = q.order_by(desc(Invoice.created_at))
    result = paginate(q, page, per_page)
    items = []
    for inv in result["items"]:
        d = model_to_dict(inv)
        user = db.query(User).get(inv.user_id)
        if user: d["user_name"] = f"{user.first_name} {user.last_name}"
        items.append(d)
    result["items"] = items
    return result

@app.post("/api/invoices")
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db)):
    subtotal = sum(item.get("qty", 1) * item.get("price", 0) for item in data.line_items)
    tax = subtotal * data.tax_rate / 100
    total = subtotal + tax - data.discount_amount
    
    inv = Invoice(
        user_id=data.user_id, invoice_number=gen_invoice_number(),
        status="draft", subtotal=subtotal, tax_rate=data.tax_rate,
        tax_amount=tax, discount_amount=data.discount_amount, total=total,
        currency="USD", line_items=data.line_items,
        billing_name=data.billing_name, billing_email=data.billing_email,
        billing_address=data.billing_address, billing_country=data.billing_country,
        billing_tax_id=data.billing_tax_id, notes=data.notes,
        due_date=datetime.fromisoformat(data.due_date).date() if data.due_date else
                 (datetime.utcnow() + timedelta(days=30)).date()
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return model_to_dict(inv)

@app.put("/api/invoices/{inv_id}/send")
def send_invoice(inv_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).get(inv_id)
    if not inv: raise HTTPException(404)
    inv.status = "sent"
    inv.sent_at = datetime.utcnow()
    db.commit()
    return model_to_dict(inv)

@app.put("/api/invoices/{inv_id}/mark-paid")
def mark_invoice_paid(inv_id: int, db: Session = Depends(get_db)):
    inv = db.query(Invoice).get(inv_id)
    if not inv: raise HTTPException(404)
    inv.status = "paid"
    inv.paid_at = datetime.utcnow()
    db.commit()
    return model_to_dict(inv)

@app.get("/api/invoices/{inv_id}/pdf")
def invoice_pdf(inv_id: int, db: Session = Depends(get_db)):
    if not HAS_REPORTLAB:
        raise HTTPException(503, "ReportLab not installed")
    inv = db.query(Invoice).get(inv_id)
    if not inv: raise HTTPException(404)
    user = db.query(User).get(inv.user_id)
    
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []
    
    elements.append(Paragraph("🌱 AgriVision — Invoice", styles['Title']))
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Invoice #: {inv.invoice_number}", styles['Normal']))
    elements.append(Paragraph(f"Date: {inv.created_at.strftime('%Y-%m-%d') if inv.created_at else ''}", styles['Normal']))
    elements.append(Paragraph(f"Due: {inv.due_date}", styles['Normal']))
    elements.append(Paragraph(f"Bill To: {inv.billing_name or (f'{user.first_name} {user.last_name}' if user else '')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Line items table
    data = [["Description", "Qty", "Price", "Total"]]
    for item in (inv.line_items or []):
        data.append([
            item.get("desc", ""),
            str(item.get("qty", 1)),
            f"${item.get('price', 0):.2f}",
            f"${item.get('qty', 1) * item.get('price', 0):.2f}"
        ])
    data.append(["", "", "Subtotal:", f"${float(inv.subtotal):.2f}"])
    if inv.tax_amount and float(inv.tax_amount) > 0:
        data.append(["", "", f"Tax ({float(inv.tax_rate)}%):", f"${float(inv.tax_amount):.2f}"])
    if inv.discount_amount and float(inv.discount_amount) > 0:
        data.append(["", "", "Discount:", f"-${float(inv.discount_amount):.2f}"])
    data.append(["", "", "TOTAL:", f"${float(inv.total):.2f}"])
    
    t = Table(data, colWidths=[250, 60, 80, 80])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a2f')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -2), 0.5, colors.grey),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("© 2026 Performance Cristal Technologies Avancées S.A.", styles['Normal']))
    
    doc.build(elements)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{inv.invoice_number}.pdf"})


# ═══════════════════════════════════════
# LIBRARY (Documents, News, Ads)
# ═══════════════════════════════════════

@app.get("/api/library")
def list_library(item_type: str = "", category: str = "", search: str = "",
                 published_only: bool = False, page: int = 1, per_page: int = 25,
                 db: Session = Depends(get_db)):
    q = db.query(LibraryItem)
    if item_type: q = q.filter(LibraryItem.item_type == item_type)
    if category: q = q.filter(LibraryItem.category.ilike(f"%{category}%"))
    if search:
        s = f"%{search}%"
        q = q.filter(or_(LibraryItem.title.ilike(s), LibraryItem.content.ilike(s)))
    if published_only: q = q.filter(LibraryItem.is_published == True)
    q = q.order_by(desc(LibraryItem.created_at))
    result = paginate(q, page, per_page)
    result["items"] = [model_to_dict(i) for i in result["items"]]
    return result

@app.post("/api/library")
def create_library_item(data: LibraryItemCreate, db: Session = Depends(get_db)):
    slug = data.title.lower().replace(" ", "-")[:200]
    item = LibraryItem(**data.dict(), slug=slug)
    if data.is_published:
        item.publish_date = datetime.utcnow()
    db.add(item)
    db.commit()
    db.refresh(item)
    return model_to_dict(item)

@app.put("/api/library/{item_id}")
def update_library_item(item_id: int, data: LibraryItemCreate, db: Session = Depends(get_db)):
    item = db.query(LibraryItem).get(item_id)
    if not item: raise HTTPException(404)
    for k, v in data.dict().items():
        setattr(item, k, v)
    db.commit()
    return model_to_dict(item)

@app.delete("/api/library/{item_id}")
def delete_library_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(LibraryItem).get(item_id)
    if not item: raise HTTPException(404)
    db.delete(item)
    db.commit()
    return {"status": "deleted"}

@app.put("/api/library/{item_id}/publish")
def publish_library_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(LibraryItem).get(item_id)
    if not item: raise HTTPException(404)
    item.is_published = True
    item.publish_date = datetime.utcnow()
    db.commit()
    return model_to_dict(item)


# ═══════════════════════════════════════
# DISEASE LIBRARY
# ═══════════════════════════════════════

@app.get("/api/diseases")
def list_diseases(search: str = "", category: str = "", db: Session = Depends(get_db)):
    q = db.query(Disease)
    if search:
        s = f"%{search}%"
        q = q.filter(or_(Disease.name.ilike(s), Disease.scientific_name.ilike(s)))
    if category: q = q.filter(Disease.category == category)
    return [model_to_dict(d) for d in q.order_by(Disease.name).all()]

@app.post("/api/diseases")
def create_disease(data: DiseaseCreate, db: Session = Depends(get_db)):
    disease = Disease(**data.dict())
    db.add(disease)
    db.commit()
    db.refresh(disease)
    return model_to_dict(disease)


# ═══════════════════════════════════════
# GLOBAL SEARCH
# ═══════════════════════════════════════

@app.get("/api/search")
def global_search(q: str = "", country: str = "", farmer_name: str = "",
                  farm_name: str = "", disease_name: str = "",
                  date_from: str = "", date_to: str = "",
                  page: int = 1, per_page: int = 25,
                  db: Session = Depends(get_db)):
    results = {"users": [], "farms": [], "detections": [], "payments": [], "invoices": []}
    
    # Users / Farmers
    if q or farmer_name or country:
        uq = db.query(User)
        if farmer_name:
            s = f"%{farmer_name}%"
            uq = uq.filter(or_(User.first_name.ilike(s), User.last_name.ilike(s)))
        if country:
            uq = uq.filter(User.country.ilike(f"%{country}%"))
        if q:
            s = f"%{q}%"
            uq = uq.filter(or_(User.first_name.ilike(s), User.last_name.ilike(s),
                                User.email.ilike(s), User.company.ilike(s)))
        results["users"] = [model_to_dict(u) for u in uq.limit(per_page).all()]
    
    # Farms
    if q or farm_name or country:
        fq = db.query(Farm)
        if farm_name: fq = fq.filter(Farm.name.ilike(f"%{farm_name}%"))
        if country: fq = fq.filter(Farm.country.ilike(f"%{country}%"))
        if q: fq = fq.filter(or_(Farm.name.ilike(f"%{q}%"), Farm.hub_serial.ilike(f"%{q}%")))
        results["farms"] = [model_to_dict(f) for f in fq.limit(per_page).all()]
    
    # Detections
    if q or disease_name:
        dq = db.query(Detection)
        if disease_name: dq = dq.filter(Detection.disease_name.ilike(f"%{disease_name}%"))
        if q: dq = dq.filter(Detection.disease_name.ilike(f"%{q}%"))
        if date_from: dq = dq.filter(Detection.detected_at >= datetime.fromisoformat(date_from))
        if date_to: dq = dq.filter(Detection.detected_at <= datetime.fromisoformat(date_to))
        dq = dq.order_by(desc(Detection.detected_at))
        results["detections"] = [model_to_dict(d) for d in dq.limit(per_page).all()]
    
    return results


# ═══════════════════════════════════════
# ANALYTICS DASHBOARD
# ═══════════════════════════════════════

@app.get("/api/analytics/overview")
def analytics_overview(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    month_ago = now - timedelta(days=30)
    week_ago = now - timedelta(days=7)
    
    return {
        "users": {
            "total": db.query(User).count(),
            "farmers": db.query(User).filter(User.role == "farmer").count(),
            "dealers": db.query(User).filter(User.role == "dealer").count(),
            "managers": db.query(User).filter(User.role == "account_manager").count(),
            "active": db.query(User).filter(User.status == "active").count(),
            "new_this_month": db.query(User).filter(User.created_at >= month_ago).count(),
            "new_this_week": db.query(User).filter(User.created_at >= week_ago).count(),
        },
        "farms": {
            "total": db.query(Farm).count(),
            "active": db.query(Farm).filter(Farm.is_active == True).count(),
            "total_cameras": int(db.query(func.coalesce(func.sum(Farm.total_cameras), 0)).scalar() or 0),
            "active_cameras": int(db.query(func.coalesce(func.sum(Farm.active_cameras), 0)).scalar() or 0),
            "total_hectares": float(db.query(func.coalesce(func.sum(Farm.area_hectares), 0)).scalar() or 0),
            "by_country": [{"country": c[0] or "Unknown", "count": c[1]}
                           for c in db.query(Farm.country, func.count(Farm.id))
                           .group_by(Farm.country).order_by(desc(func.count(Farm.id))).limit(15).all()]
        },
        "detections": {
            "total": db.query(Detection).count(),
            "this_month": db.query(Detection).filter(Detection.detected_at >= month_ago).count(),
            "this_week": db.query(Detection).filter(Detection.detected_at >= week_ago).count(),
            "critical": db.query(Detection).filter(Detection.severity == "critical").count(),
        },
        "revenue": {
            "total_all_time": float(db.query(func.coalesce(func.sum(Payment.amount), 0))
                .filter(Payment.status == "completed").scalar() or 0),
            "this_month": float(db.query(func.coalesce(func.sum(Payment.amount), 0))
                .filter(Payment.status == "completed", Payment.created_at >= month_ago).scalar() or 0),
            "this_week": float(db.query(func.coalesce(func.sum(Payment.amount), 0))
                .filter(Payment.status == "completed", Payment.created_at >= week_ago).scalar() or 0),
            "pending": float(db.query(func.coalesce(func.sum(Payment.amount), 0))
                .filter(Payment.status == "pending").scalar() or 0),
        },
        "subscriptions": {
            "total_active": db.query(Subscription).filter(Subscription.status == "active").count(),
            "mrr": float(db.query(func.coalesce(func.sum(Subscription.price_monthly), 0))
                .filter(Subscription.status == "active").scalar() or 0),
            "trial": db.query(Subscription).filter(Subscription.status == "trial").count(),
        },
        "invoices": {
            "total": db.query(Invoice).count(),
            "unpaid": db.query(Invoice).filter(Invoice.status.in_(["sent", "overdue"])).count(),
            "overdue": db.query(Invoice).filter(Invoice.status == "overdue").count(),
        }
    }

@app.get("/api/analytics/revenue-chart")
def revenue_chart(days: int = 90, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    daily = db.query(
        func.date(Payment.created_at).label("day"),
        func.sum(Payment.amount).label("revenue"),
        func.count(Payment.id).label("count")
    ).filter(Payment.status == "completed", Payment.created_at >= since)\
     .group_by("day").order_by("day").all()
    
    return [{"date": str(d[0]), "revenue": float(d[1] or 0), "transactions": d[2]} for d in daily]

@app.get("/api/analytics/user-growth")
def user_growth(days: int = 90, db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=days)
    daily = db.query(
        func.date(User.created_at).label("day"),
        func.count(User.id).label("count")
    ).filter(User.created_at >= since)\
     .group_by("day").order_by("day").all()
    return [{"date": str(d[0]), "new_users": d[1]} for d in daily]

@app.get("/api/analytics/country-distribution")
def country_distribution(db: Session = Depends(get_db)):
    data = db.query(User.country, func.count(User.id).label("count"))\
        .filter(User.country.isnot(None), User.country != "")\
        .group_by(User.country).order_by(desc("count")).all()
    return [{"country": c[0], "users": c[1]} for c in data]


# ═══════════════════════════════════════
# EXPORT & REPORTS
# ═══════════════════════════════════════

@app.get("/api/export/users")
def export_users(format: str = "csv", role: str = "", country: str = "",
                 db: Session = Depends(get_db)):
    q = db.query(User)
    if role: q = q.filter(User.role == role)
    if country: q = q.filter(User.country.ilike(f"%{country}%"))
    users = q.all()
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Email", "First Name", "Last Name", "Role", "Status",
                         "Phone", "Company", "Country", "Region", "City", "Created"])
        for u in users:
            writer.writerow([u.id, u.email, u.first_name, u.last_name, u.role, u.status,
                             u.phone, u.company, u.country, u.region, u.city,
                             u.created_at.isoformat() if u.created_at else ""])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=users_export_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    else:
        return [model_to_dict(u) for u in users]

@app.get("/api/export/payments")
def export_payments(format: str = "csv", date_from: str = "", date_to: str = "",
                    db: Session = Depends(get_db)):
    q = db.query(Payment)
    if date_from: q = q.filter(Payment.created_at >= datetime.fromisoformat(date_from))
    if date_to: q = q.filter(Payment.created_at <= datetime.fromisoformat(date_to))
    payments = q.order_by(desc(Payment.created_at)).all()
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "User ID", "Amount", "Currency", "Status", "Method",
                         "PayPal Order", "Description", "Paid At", "Created"])
        for p in payments:
            writer.writerow([p.id, p.user_id, float(p.amount), p.currency, p.status,
                             p.method, p.paypal_order_id, p.description,
                             p.paid_at.isoformat() if p.paid_at else "",
                             p.created_at.isoformat() if p.created_at else ""])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=payments_export_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    return [model_to_dict(p) for p in payments]

@app.get("/api/export/detections")
def export_detections(format: str = "csv", farm_id: int = 0, disease: str = "",
                      date_from: str = "", date_to: str = "",
                      db: Session = Depends(get_db)):
    q = db.query(Detection)
    if farm_id: q = q.filter(Detection.farm_id == farm_id)
    if disease: q = q.filter(Detection.disease_name.ilike(f"%{disease}%"))
    if date_from: q = q.filter(Detection.detected_at >= datetime.fromisoformat(date_from))
    if date_to: q = q.filter(Detection.detected_at <= datetime.fromisoformat(date_to))
    dets = q.order_by(desc(Detection.detected_at)).all()
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Farm ID", "Camera", "Disease", "Confidence", "Severity",
                         "Crop", "Zone", "Confirmed", "Detected At"])
        for d in dets:
            writer.writerow([d.id, d.farm_id, d.camera_serial, d.disease_name,
                             d.confidence, d.severity, d.crop_type, d.zone,
                             d.is_confirmed, d.detected_at.isoformat() if d.detected_at else ""])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=detections_export_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    return [model_to_dict(d) for d in dets]

@app.get("/api/export/invoices")
def export_invoices(format: str = "csv", status: str = "",
                    db: Session = Depends(get_db)):
    q = db.query(Invoice)
    if status: q = q.filter(Invoice.status == status)
    invoices = q.order_by(desc(Invoice.created_at)).all()
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Invoice #", "User ID", "Status", "Subtotal", "Tax", "Discount",
                         "Total", "Currency", "Due Date", "Paid At", "Created"])
        for inv in invoices:
            writer.writerow([inv.invoice_number, inv.user_id, inv.status,
                             float(inv.subtotal), float(inv.tax_amount or 0),
                             float(inv.discount_amount or 0), float(inv.total),
                             inv.currency, inv.due_date,
                             inv.paid_at.isoformat() if inv.paid_at else "",
                             inv.created_at.isoformat() if inv.created_at else ""])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=invoices_export_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    return [model_to_dict(inv) for inv in invoices]

@app.get("/api/export/farms")
def export_farms(format: str = "csv", country: str = "", db: Session = Depends(get_db)):
    q = db.query(Farm)
    if country: q = q.filter(Farm.country.ilike(f"%{country}%"))
    farms = q.all()
    
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Name", "Owner ID", "Country", "Region", "Lat", "Lng",
                         "Area (ha)", "Cameras", "Active", "Hub Serial", "Created"])
        for f in farms:
            writer.writerow([f.id, f.name, f.owner_id, f.country, f.region,
                             f.latitude, f.longitude, f.area_hectares,
                             f.total_cameras, f.active_cameras, f.hub_serial,
                             f.created_at.isoformat() if f.created_at else ""])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=farms_export_{datetime.now().strftime('%Y%m%d')}.csv"}
        )
    return [model_to_dict(f) for f in farms]


# ═══════════════════════════════════════
# AUDIT LOG
# ═══════════════════════════════════════

@app.get("/api/audit-log")
def list_audit_log(action: str = "", entity_type: str = "", user_id: int = 0,
                   page: int = 1, per_page: int = 50, db: Session = Depends(get_db)):
    q = db.query(AuditLog)
    if action: q = q.filter(AuditLog.action == action)
    if entity_type: q = q.filter(AuditLog.entity_type == entity_type)
    if user_id: q = q.filter(AuditLog.user_id == user_id)
    q = q.order_by(desc(AuditLog.created_at))
    result = paginate(q, page, per_page)
    result["items"] = [model_to_dict(a) for a in result["items"]]
    return result


# ═══════════════════════════════════════
# NOTIFICATIONS
# ═══════════════════════════════════════

@app.get("/api/notifications")
def list_notifications(user_id: int = 0, unread_only: bool = False,
                       page: int = 1, per_page: int = 20, db: Session = Depends(get_db)):
    q = db.query(Notification)
    if user_id: q = q.filter(Notification.user_id == user_id)
    if unread_only: q = q.filter(Notification.is_read == False)
    q = q.order_by(desc(Notification.created_at))
    result = paginate(q, page, per_page)
    result["items"] = [model_to_dict(n) for n in result["items"]]
    return result

@app.put("/api/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, db: Session = Depends(get_db)):
    n = db.query(Notification).get(notif_id)
    if n: n.is_read = True; db.commit()
    return {"status": "ok"}


# ═══════════════════════════════════════
# SEED DATA (for demo)
# ═══════════════════════════════════════

@app.post("/api/seed")
def seed_demo_data(db: Session = Depends(get_db)):
    """Populate database with demo data for testing."""
    if db.query(User).count() > 0:
        return {"status": "already seeded"}
    
    import random
    
    countries = ["UAE", "Saudi Arabia", "Qatar", "Oman", "Bahrain", "Kuwait",
                 "Jordan", "Egypt", "Morocco", "Turkey", "Tunisia", "Iraq"]
    crops = ["wheat", "tomato", "olive", "date palm", "citrus", "grape",
             "almond", "pepper", "cucumber", "lettuce", "strawberry", "potato"]
    diseases = [
        ("Powdery Mildew", "Erysiphales", "fungal"),
        ("Leaf Rust", "Puccinia triticina", "fungal"),
        ("Tomato Blight", "Phytophthora infestans", "fungal"),
        ("Bacterial Spot", "Xanthomonas campestris", "bacterial"),
        ("Citrus Canker", "Xanthomonas citri", "bacterial"),
        ("Mosaic Virus", "TMV", "viral"),
        ("Leaf Curl Virus", "TYLCV", "viral"),
        ("Aphid Infestation", "Aphididae", "pest"),
        ("Whitefly", "Bemisia tabaci", "pest"),
        ("Root Rot", "Fusarium oxysporum", "fungal"),
        ("Downy Mildew", "Peronospora", "fungal"),
        ("Anthracnose", "Colletotrichum", "fungal"),
        ("Fire Blight", "Erwinia amylovora", "bacterial"),
        ("Botrytis", "Botrytis cinerea", "fungal"),
        ("Spider Mites", "Tetranychidae", "pest"),
    ]
    plans = [("trial", 0, 5, 1), ("basic", 29.99, 10, 2), ("pro", 79.99, 25, 5), ("enterprise", 199.99, 100, 20)]
    
    # Create admin
    admin = User(email="admin@agrivision.com", password_hash=hash_password("admin2026"),
                 first_name="Hicham", last_name="Admin", role="superadmin", status="active",
                 country="Canada", company="PCTA S.A.")
    db.add(admin)
    
    # Create account managers
    managers = []
    for i, name in enumerate(["Ahmad", "Sara", "Omar"]):
        m = User(email=f"{name.lower()}@agrivision.com", password_hash=hash_password("pass123"),
                 first_name=name, last_name="Manager", role="account_manager", status="active",
                 country=random.choice(countries[:3]))
        db.add(m)
        managers.append(m)
    
    # Create dealers
    dealers = []
    for i in range(6):
        country = countries[i % len(countries)]
        d = User(email=f"dealer{i+1}@{country.lower().replace(' ','')}.com",
                 password_hash=hash_password("pass123"),
                 first_name=f"Dealer{i+1}", last_name=country,
                 role="dealer", status="active", country=country,
                 company=f"{country} AgriTech Co.",
                 account_manager_id=random.randint(2, 4))
        db.add(d)
        dealers.append(d)
    
    db.flush()  # Get IDs
    
    # Create farmers
    farmers = []
    for i in range(40):
        country = random.choice(countries)
        dealer = random.choice(dealers)
        f = User(email=f"farmer{i+1}@{country.lower().replace(' ','')}.farm",
                 password_hash=hash_password("pass123"),
                 first_name=random.choice(["Mohammed", "Ali", "Hassan", "Fatima", "Aisha",
                                           "Youssef", "Ibrahim", "Khalid", "Nour", "Layla"]),
                 last_name=f"Farm{i+1}",
                 role="farmer", status=random.choice(["active"] * 8 + ["pending", "suspended"]),
                 country=country, dealer_id=dealer.id,
                 account_manager_id=random.choice(managers).id if random.random() > 0.3 else None,
                 phone=f"+{random.randint(100,999)}{random.randint(1000000,9999999)}",
                 company=f"{random.choice(['Al', 'El', 'Abu'])} {random.choice(['Rashid', 'Salem', 'Noor'])} Farms")
        db.add(f)
        farmers.append(f)
    
    db.flush()
    
    # Create farms
    farm_objs = []
    for farmer in farmers:
        for j in range(random.randint(1, 3)):
            farm = Farm(
                owner_id=farmer.id, name=f"{farmer.company} - Field {j+1}",
                country=farmer.country, region=random.choice(["North", "South", "East", "West"]),
                latitude=random.uniform(22, 38), longitude=random.uniform(30, 56),
                area_hectares=random.uniform(5, 500),
                crop_types=random.sample(crops, random.randint(1, 4)),
                total_cameras=random.randint(2, 20),
                active_cameras=random.randint(1, 15),
                hub_serial=f"HUB-{secrets.token_hex(4).upper()}")
            db.add(farm)
            farm_objs.append(farm)
    
    db.flush()
    
    # Create subscriptions
    for farmer in farmers:
        plan = random.choice(plans)
        sub = Subscription(
            user_id=farmer.id, plan=plan[0], status="active" if plan[0] != "trial" else "trial",
            price_monthly=plan[1], max_cameras=plan[2], max_farms=plan[3],
            billing_cycle="monthly", currency="USD",
            current_period_start=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
            current_period_end=datetime.utcnow() + timedelta(days=random.randint(1, 30)))
        db.add(sub)
    
    # Create payments
    for _ in range(200):
        farmer = random.choice(farmers)
        amount = random.choice([29.99, 79.99, 199.99, 299.99, 49.99])
        p = Payment(
            user_id=farmer.id, amount=amount, currency="USD",
            method=random.choice(["paypal", "stripe", "bank_transfer"]),
            status=random.choice(["completed"] * 8 + ["pending", "refunded"]),
            description="Subscription payment",
            paid_at=datetime.utcnow() - timedelta(days=random.randint(0, 180)),
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 180)))
        db.add(p)
    
    # Create invoices
    for _ in range(80):
        farmer = random.choice(farmers)
        items = [{"desc": "Monthly Subscription", "qty": 1, "price": random.choice([29.99, 79.99, 199.99])}]
        if random.random() > 0.6:
            items.append({"desc": "Additional Camera License", "qty": random.randint(1, 5), "price": 9.99})
        subtotal = sum(i["qty"] * i["price"] for i in items)
        tax = subtotal * 0.05
        inv = Invoice(
            user_id=farmer.id, invoice_number=gen_invoice_number(),
            status=random.choice(["paid"] * 5 + ["sent", "overdue", "draft"]),
            subtotal=subtotal, tax_rate=5, tax_amount=tax,
            total=subtotal + tax, line_items=items,
            billing_name=f"{farmer.first_name} {farmer.last_name}",
            billing_email=farmer.email, billing_country=farmer.country,
            due_date=(datetime.utcnow() + timedelta(days=random.randint(-30, 30))).date(),
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 120)))
        db.add(inv)
    
    # Create detections
    for _ in range(500):
        farm = random.choice(farm_objs)
        disease = random.choice(diseases)
        det = Detection(
            farm_id=farm.id,
            camera_serial=f"CAM-{secrets.token_hex(3).upper()}",
            disease_name=disease[0],
            confidence=round(random.uniform(0.5, 0.99), 2),
            severity=random.choice(["low", "medium", "high", "critical"]),
            crop_type=random.choice(farm.crop_types) if farm.crop_types else "wheat",
            zone=random.choice(["north", "south", "east", "west", "center"]),
            ai_model_version="v3.1",
            is_confirmed=random.random() > 0.5,
            detected_at=datetime.utcnow() - timedelta(days=random.randint(0, 180)))
        db.add(det)
    
    # Create diseases
    for name, sci, cat in diseases:
        d = Disease(name=name, scientific_name=sci, category=cat,
                    affected_crops=random.sample(crops, random.randint(2, 5)),
                    symptoms=f"Symptoms of {name}", treatment=f"Treatment for {name}",
                    prevention=f"Prevention measures for {name}")
        db.add(d)
    
    # Create library items
    for i in range(15):
        item_type = random.choice(["document", "news", "advertisement", "guide"])
        item = LibraryItem(
            item_type=item_type,
            title=f"{'📄📰📢📖'[['document','news','advertisement','guide'].index(item_type)]} {random.choice(['Crop Protection Guide', 'Market Analysis Report', 'New Feature Update', 'Precision Agriculture Tips', 'Seasonal Alert', 'Partner Spotlight', 'Research Paper'])} #{i+1}",
            content=f"Content for library item {i+1}...",
            summary=f"Summary of item {i+1}",
            category=random.choice(["agriculture", "technology", "business", "research"]),
            tags=random.sample(["AI", "farming", "crops", "disease", "IoT", "sensors"], 3),
            is_published=random.random() > 0.3,
            publish_date=datetime.utcnow() - timedelta(days=random.randint(0, 60)),
            view_count=random.randint(10, 5000),
            download_count=random.randint(0, 500))
        if item_type == "advertisement":
            item.ad_target_countries = random.sample(countries, 3)
            item.ad_budget = random.uniform(100, 5000)
            item.ad_impressions = random.randint(100, 50000)
            item.ad_clicks = random.randint(10, 3000)
        db.add(item)
    
    db.commit()
    return {"status": "seeded", "users": 50, "farms": len(farm_objs), "detections": 500,
            "payments": 200, "invoices": 80, "diseases": 15, "library": 15}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
