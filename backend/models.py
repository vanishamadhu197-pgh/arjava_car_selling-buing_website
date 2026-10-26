import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from backend.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    phone_number = Column(String(20), nullable=True)
    whatsapp_number = Column(String(20), nullable=False, index=True)
    auth_ref = Column(String(255), nullable=True) # External Auth or Secure Hash ref
    role = Column(String(20), default="seller") # 'buyer', 'seller', 'admin'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    listings = relationship("CarListing", back_populates="seller", cascade="all, delete-orphan")


class CarListing(Base):
    __tablename__ = "car_listings"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    seller_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    
    # Core Specifications
    brand = Column(String(80), nullable=False, index=True)
    model = Column(String(120), nullable=False, index=True)
    variant = Column(String(160), nullable=False)
    mfg_year = Column(Integer, nullable=False, index=True)
    reg_year = Column(Integer, nullable=False)
    km_driven = Column(Integer, nullable=False, index=True)
    fuel_type = Column(String(30), nullable=False, index=True) # Petrol, Diesel, CNG, Electric, Hybrid
    transmission = Column(String(30), nullable=False, index=True) # Manual, Automatic
    previous_owners = Column(Integer, default=1)
    
    # Regional Info
    reg_state = Column(String(80), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    
    # Confidential Field (Handled securely; not exposed publicly)
    reg_number = Column(String(50), nullable=True)

    # Pricing & Condition
    asking_price = Column(Float, nullable=False, index=True)
    is_negotiable = Column(String(10), default="yes") # 'yes', 'no'
    overall_condition = Column(String(40), default="excellent")
    engine_condition = Column(String(80), nullable=True)
    accident_history = Column(String(80), default="clean")
    insurance_status = Column(String(60), nullable=True)
    insurance_expiry = Column(String(30), nullable=True)
    service_history = Column(String(120), nullable=True)
    loan_status = Column(String(60), default="none")
    description = Column(Text, nullable=True)

    # Meta
    is_assured = Column(Boolean, default=False)
    listing_status = Column(String(20), default="published", index=True) # published, draft, sold
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    seller = relationship("User", back_populates="listings")
    media = relationship("CarMedia", back_populates="listing", cascade="all, delete-orphan", order_by="CarMedia.display_order")

    # Composite Index for fast marketplace filtering
    __table_args__ = (
        Index("idx_car_brand_price", "brand", "asking_price"),
        Index("idx_car_year_km", "mfg_year", "km_driven"),
    )


class CarMedia(Base):
    __tablename__ = "car_media"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    listing_id = Column(String(64), ForeignKey("car_listings.id"), nullable=False, index=True)
    storage_url = Column(String(500), nullable=False)
    media_type = Column(String(20), default="image") # 'image', '360'
    image_category = Column(String(40), default="general") # 'front', 'rear', 'interior', etc.
    display_order = Column(Integer, default=0)
    is_main = Column(Boolean, default=False, index=True)
    metadata_json = Column(Text, nullable=True) # Extra params for 360 frames / hotspot config
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    listing = relationship("CarListing", back_populates="media")
