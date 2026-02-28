"""
Webhooks API - Stripe payment webhooks
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.config import get_db, settings
from models.database import Order, Notification
from datetime import datetime

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe payment events"""
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe not configured")
    
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {str(e)}")
    
    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        order_id = intent.get("metadata", {}).get("order_id")
        
        if order_id:
            result = await db.execute(select(Order).where(Order.id == int(order_id)))
            order = result.scalar_one_or_none()
            
            if order:
                order.status = "paid"
                order.payment_status = "paid"
                order.paid_at = datetime.utcnow()
                
                # Notify farmer
                notif = Notification(
                    user_id=order.user_id,
                    title="✅ Payment Confirmed!",
                    message=f"Order {order.reference} has been paid. We're preparing your AgriVision system.",
                    type="order",
                    link=f"/orders/{order.id}"
                )
                db.add(notif)
    
    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        order_id = intent.get("metadata", {}).get("order_id")
        
        if order_id:
            result = await db.execute(select(Order).where(Order.id == int(order_id)))
            order = result.scalar_one_or_none()
            if order:
                order.payment_status = "failed"
    
    return {"received": True}
