"""
AgriVision Backend API
FastAPI + PostgreSQL (Railway)
Main application entry point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.auth import router as auth_router
from api.farmers import router as farmers_router
from api.farms import router as farms_router
from api.crops import router as crops_router
from api.configurator import router as configurator_router
from api.orders import router as orders_router
from api.dashboard import router as dashboard_router
from api.admin import router as admin_router
from api.webhooks import router as webhooks_router
from api.hub import router as hub_router
from models.config import engine, Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("agrivision")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("🌱 AgriVision API starting up...")
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database tables ready")
    yield
    logger.info("🛑 AgriVision API shutting down...")


app = FastAPI(
    title="AgriVision API",
    description="AI-Powered Agricultural Monitoring Platform",
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://theagrivision.com",
        "https://www.theagrivision.com",
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(farmers_router, prefix="/api/farmers", tags=["Farmers"])
app.include_router(farms_router, prefix="/api/farms", tags=["Farms"])
app.include_router(crops_router, prefix="/api/crops", tags=["Crops"])
app.include_router(configurator_router, prefix="/api/configurator", tags=["System Configurator"])
app.include_router(orders_router, prefix="/api/orders", tags=["Orders & Payments"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Farmer Dashboard"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin Panel"])
app.include_router(webhooks_router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(hub_router, prefix="/api/hub", tags=["Hub Communication"])


@app.get("/")
async def root():
    return {
        "name": "AgriVision API",
        "version": "3.0.0",
        "status": "online",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "agrivision-api"}
