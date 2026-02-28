"""
Orders & Payments API - Stripe integration
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.config import get_db, settings
from models.schemas import OrderCreateRequest, OrderResponse, PaymentIntentResponse
from models.database import Order, Farm, AgriVisionSystem, CameraNode
from typing import List
from datetime import datetime
import secrets

router = APIRouter()


def generate_reference():
    """Generate unique order reference: AGV-XXXXXX"""
    return f"AGV-{secrets.token_hex(3).upper()}"


def calculate_order_total(num_hubs, num_cameras, num_repeaters):
    """Calculate order total"""
    hub_total = num_hubs * settings.HUB_PRICE
    camera_total = num_cameras * settings.CAMERA_NODE_PRICE
    repeater_total = num_repeaters * settings.WIFI_REPEATER_PRICE
    shipping = settings.SHIPPING_BASE + (num_cameras * settings.SHIPPING_PER_CAMERA)
    return {
        "hub_total": hub_total,
        "camera_total": camera_total,
        "repeater_total": repeater_total,
        "shipping": shipping,
        "total": hub_total + camera_total + repeater_total + shipping
    }


@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order(req: OrderCreateRequest, user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """Create a new order"""
    
    # Verify farm exists
    result = await db.execute(select(Farm).where(Farm.id == req.farm_id, Farm.user_id == user_id))
    farm = result.scalar_one_or_none()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
    
    # Calculate pricing
    pricing = calculate_order_total(req.num_hubs, req.num_cameras, req.num_wifi_repeaters)
    
    order = Order(
        user_id=user_id,
        reference=generate_reference(),
        status="pending",
        num_hubs=req.num_hubs,
        num_cameras=req.num_cameras,
        num_wifi_repeaters=req.num_wifi_repeaters,
        farm_area_hectares=farm.area_hectares,
        terrain_type=farm.terrain_type,
        hub_total=pricing["hub_total"],
        camera_total=pricing["camera_total"],
        repeater_total=pricing["repeater_total"],
        shipping_cost=pricing["shipping"],
        total_amount=pricing["total"],
        currency="USD",
        shipping_name=req.shipping_name,
        shipping_address=req.shipping_address,
        shipping_city=req.shipping_city,
        shipping_country=req.shipping_country,
        shipping_postal=req.shipping_postal,
        shipping_phone=req.shipping_phone,
        payment_provider=req.payment_method,
        customer_notes=req.customer_notes
    )
    
    db.add(order)
    await db.flush()
    await db.refresh(order)
    return order


@router.post("/{order_id}/payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(order_id: int, db: AsyncSession = Depends(get_db)):
    """Create Stripe payment intent for an order"""
    
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Payment not configured")
    
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    intent = stripe.PaymentIntent.create(
        amount=int(float(order.total_amount) * 100),  # Stripe uses cents
        currency=order.currency.lower(),
        metadata={
            "order_id": str(order.id),
            "reference": order.reference,
        },
        description=f"AgriVision System - {order.reference}"
    )
    
    order.payment_intent_id = intent.id
    order.payment_status = "pending"
    
    return PaymentIntentResponse(
        client_secret=intent.client_secret,
        payment_intent_id=intent.id,
        amount=float(order.total_amount),
        currency=order.currency
    )


@router.get("/", response_model=List[OrderResponse])
async def list_orders(user_id: int = 1, db: AsyncSession = Depends(get_db)):
    """List all orders for current user"""
    result = await db.execute(
        select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, db: AsyncSession = Depends(get_db)):
    """Get order details"""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/{order_id}/confirm")
async def confirm_order_payment(order_id: int, db: AsyncSession = Depends(get_db)):
    """Confirm order after successful payment"""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = "paid"
    order.payment_status = "paid"
    order.paid_at = datetime.utcnow()
    
    # Create system record
    system = AgriVisionSystem(
        farm_id=order.id,  # Link to farm
        order_id=order.id,
        hub_serial=f"HUB-{secrets.token_hex(4).upper()}",
        num_cameras=order.num_cameras,
        num_hubs=order.num_hubs,
        wifi_repeaters=order.num_wifi_repeaters,
        subscription_plan="professional",
    )
    db.add(system)
    await db.flush()
    
    # Create camera node records
    for i in range(order.num_cameras):
        node = CameraNode(
            system_id=system.id,
            serial_number=f"CAM-{secrets.token_hex(4).upper()}",
            model="ESP32-S3-OV5640"
        )
        db.add(node)
    
    return {"message": "Payment confirmed", "system_id": system.id}
