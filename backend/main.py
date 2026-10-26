import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.database import engine, Base, SessionLocal
from backend.models import CarListing, CarMedia, User
from backend.routers import cars, media, health

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ak_cars")

# Seed initial inventory if database is empty
def seed_initial_inventory():
    db = SessionLocal()
    try:
        count = db.query(CarListing).count()
        if count == 0:
            logger.info("Database is empty. Seeding initial AK Cars inventory...")

            # 1. Create AK Cars Admin/Consultant Seller
            admin_seller = User(
                id="ak_consultant_01",
                full_name="AK Cars Auto Consulting",
                whatsapp_number="8248828448",
                phone_number="8248828448",
                email="contact@akcars.in",
                role="admin"
            )
            db.add(admin_seller)
            db.flush()

            # 2. Seed inventory based on AK Cars showroom stock
            initial_stock = [
                {
                    "brand": "Hyundai",
                    "model": "Creta",
                    "variant": "1.5 SX (O) IVT Automatic",
                    "mfg_year": 2022,
                    "reg_year": 2022,
                    "km_driven": 26000,
                    "fuel_type": "Petrol",
                    "transmission": "Automatic",
                    "previous_owners": 1,
                    "reg_state": "Tamil Nadu",
                    "city": "Karaikudi",
                    "reg_number": "TN63AB1234",
                    "asking_price": 1540000,
                    "is_negotiable": "yes",
                    "overall_condition": "excellent",
                    "accident_history": "clean",
                    "insurance_status": "comprehensive",
                    "service_history": "Authorized Dealership",
                    "description": "Showroom condition Creta in Karaikudi. Zero dep insurance active, complete service history available at AK Cars.",
                    "is_assured": True,
                    "image": "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80"
                },
                {
                    "brand": "Toyota",
                    "model": "Fortuner",
                    "variant": "2.8 4x2 AT Diesel Luxury",
                    "mfg_year": 2020,
                    "reg_year": 2020,
                    "km_driven": 48000,
                    "fuel_type": "Diesel",
                    "transmission": "Automatic",
                    "previous_owners": 1,
                    "reg_state": "Tamil Nadu",
                    "city": "Karaikudi",
                    "reg_number": "TN63CD5678",
                    "asking_price": 2890000,
                    "is_negotiable": "yes",
                    "overall_condition": "excellent",
                    "accident_history": "clean",
                    "insurance_status": "comprehensive",
                    "service_history": "Authorized Dealership",
                    "description": "AK Cars Certified Fortuner with complete history. Park & Sale direct from first owner.",
                    "is_assured": True,
                    "image": "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80"
                },
                {
                    "brand": "Honda",
                    "model": "City",
                    "variant": "ZX CVT 5th Gen Sunroof",
                    "mfg_year": 2021,
                    "reg_year": 2021,
                    "km_driven": 36000,
                    "fuel_type": "Petrol",
                    "transmission": "Automatic",
                    "previous_owners": 1,
                    "reg_state": "Tamil Nadu",
                    "city": "Madurai",
                    "reg_number": "TN58EF9012",
                    "asking_price": 1050000,
                    "is_negotiable": "yes",
                    "overall_condition": "excellent",
                    "accident_history": "clean",
                    "insurance_status": "comprehensive",
                    "service_history": "Authorized Dealership",
                    "description": "Pristine sedan available at AK Cars consulting. Genuine 36,000 km.",
                    "is_assured": True,
                    "image": "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80"
                },
                {
                    "brand": "Maruti Suzuki",
                    "model": "Swift",
                    "variant": "ZXI Plus Dual Tone",
                    "mfg_year": 2022,
                    "reg_year": 2022,
                    "km_driven": 24000,
                    "fuel_type": "Petrol",
                    "transmission": "Manual",
                    "previous_owners": 1,
                    "reg_state": "Tamil Nadu",
                    "city": "Karaikudi",
                    "reg_number": "TN63GH3456",
                    "asking_price": 695000,
                    "is_negotiable": "yes",
                    "overall_condition": "excellent",
                    "accident_history": "clean",
                    "insurance_status": "comprehensive",
                    "service_history": "Full Authorized Dealership",
                    "description": "Solid Red Swift at AK Cars Kalanivasal showroom. Low mileage, single owner.",
                    "is_assured": True,
                    "image": "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=800&q=80"
                },
                {
                    "brand": "Mahindra",
                    "model": "Thar",
                    "variant": "LX 4-Str Hard Top Diesel AT 4WD",
                    "mfg_year": 2022,
                    "reg_year": 2022,
                    "km_driven": 21000,
                    "fuel_type": "Diesel",
                    "transmission": "Automatic",
                    "previous_owners": 1,
                    "reg_state": "Tamil Nadu",
                    "city": "Trichy",
                    "reg_number": "TN45JK7890",
                    "asking_price": 1675000,
                    "is_negotiable": "yes",
                    "overall_condition": "excellent",
                    "accident_history": "clean",
                    "insurance_status": "comprehensive",
                    "service_history": "Company Maintained",
                    "description": "Napoli Black Thar 4x4. Inspected across 200+ points by AK Cars Auto Consulting.",
                    "is_assured": True,
                    "image": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80"
                },
                {
                    "brand": "Tata",
                    "model": "Nexon EV",
                    "variant": "Max XZ Plus Lux 40.5kWh",
                    "mfg_year": 2023,
                    "reg_year": 2023,
                    "km_driven": 14000,
                    "fuel_type": "Electric",
                    "transmission": "Automatic",
                    "previous_owners": 1,
                    "reg_state": "Tamil Nadu",
                    "city": "Chennai",
                    "reg_number": "TN01LM1122",
                    "asking_price": 1420000,
                    "is_negotiable": "yes",
                    "overall_condition": "excellent",
                    "accident_history": "clean",
                    "insurance_status": "comprehensive",
                    "service_history": "Authorized Dealership",
                    "description": "Fast charging supported, 400km range, 8-year battery warranty intact.",
                    "is_assured": True,
                    "image": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"
                }
            ]

            for item in initial_stock:
                img_url = item.pop("image")
                car = CarListing(
                    seller_id=admin_seller.id,
                    **item
                )
                db.add(car)
                db.flush()

                media_obj = CarMedia(
                    listing_id=car.id,
                    storage_url=img_url,
                    media_type="image",
                    image_category="front",
                    display_order=0,
                    is_main=True
                )
                db.add(media_obj)

            db.commit()
            logger.info("AK Cars seed inventory inserted successfully.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and seed
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    seed_initial_inventory()
    yield
    logger.info("Shutting down AK Cars API...")


app = FastAPI(
    title="AK Cars API - Wheels for Feels",
    description="Backend REST API for AK Cars Auto Consulting (Karaikudi). Supports listing management, media uploads, and database filtering.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows frontend on 5173 or other ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files for Uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(cars.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(health.router, prefix="/api")

@app.get("/")
def root():
    return {
        "message": "Welcome to AK Cars API - Wheels for Feels",
        "docs": "/docs",
        "health": "/api/health",
        "contact": "8248828448",
        "location": "KVS Nagar Main Road, Kalanivasal, Karaikudi - 630001"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
