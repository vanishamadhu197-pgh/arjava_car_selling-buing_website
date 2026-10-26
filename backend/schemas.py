from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime

# Media Schemas
class CarMediaBase(BaseModel):
    storage_url: str
    media_type: str = "image"
    image_category: str = "general"
    display_order: int = 0
    is_main: bool = False
    metadata_json: Optional[str] = None

class CarMediaCreate(CarMediaBase):
    pass

class CarMediaResponse(CarMediaBase):
    id: str
    listing_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# User / Seller Schemas
class SellerInfoCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    whatsapp_number: str = Field(..., min_length=10, max_length=15)
    email: Optional[str] = None
    preferred_contact_time: Optional[str] = "Anytime"

class UserResponse(BaseModel):
    id: str
    full_name: str
    whatsapp_number: str
    email: Optional[str] = None
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# Listing Creation & Validation Schema
class CarListingCreate(BaseModel):
    brand: str = Field(..., min_length=2, max_length=80)
    model: str = Field(..., min_length=1, max_length=120)
    variant: str = Field(..., min_length=1, max_length=160)
    mfg_year: int = Field(..., ge=1990, le=2026)
    reg_year: int = Field(..., ge=1990, le=2026)
    km_driven: int = Field(..., ge=0)
    fuel_type: str = Field(..., pattern="^(Petrol|Diesel|CNG|Electric|Hybrid)$")
    transmission: str = Field(..., pattern="^(Manual|Automatic)$")
    previous_owners: int = Field(1, ge=1, le=10)
    
    reg_state: str = Field(..., min_length=2)
    city: str = Field(..., min_length=2)
    reg_number: str = Field(..., min_length=6, max_length=15) # Protected on backend

    asking_price: float = Field(..., gt=10000)
    is_negotiable: str = "yes"
    overall_condition: str = "excellent"
    engine_condition: Optional[str] = None
    accident_history: str = "clean"
    insurance_status: Optional[str] = None
    insurance_expiry: Optional[str] = None
    service_history: Optional[str] = None
    loan_status: str = "none"
    description: Optional[str] = None

    # Embedded Seller Info
    seller_name: str = Field(..., min_length=2)
    whatsapp_number: str = Field(..., min_length=10)
    email: Optional[str] = None
    contact_time: Optional[str] = "Anytime"

    # Associated Media URLs
    media: Optional[List[CarMediaCreate]] = []


# Listing Update Schema
class CarListingUpdate(BaseModel):
    asking_price: Optional[float] = Field(None, gt=10000)
    is_negotiable: Optional[str] = None
    km_driven: Optional[int] = None
    description: Optional[str] = None
    listing_status: Optional[str] = None # 'published', 'sold', 'archived'


# Public Listing Item (For Buy Cars Grid & Homepage)
class CarListingPublicResponse(BaseModel):
    id: str
    brand: str
    model: str
    variant: str
    year: int = Field(alias="mfg_year")
    price: float = Field(alias="asking_price")
    km: int = Field(alias="km_driven")
    fuel: str = Field(alias="fuel_type")
    transmission: str
    owners: int = Field(alias="previous_owners")
    location: str = Field(alias="city")
    image: Optional[str] = None
    assured: bool = Field(alias="is_assured")
    emi: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


# Detailed Listing (For Car Details Page)
class CarListingDetailResponse(BaseModel):
    id: str
    brand: str
    model: str
    variant: str
    mfg_year: int
    reg_year: int
    km_driven: int
    fuel_type: str
    transmission: str
    previous_owners: int
    reg_state: str
    city: str
    masked_reg_number: Optional[str] = None # Masked e.g. "TN •••• 1234"
    asking_price: float
    is_negotiable: str
    overall_condition: str
    engine_condition: Optional[str] = None
    accident_history: str
    insurance_status: Optional[str] = None
    insurance_expiry: Optional[str] = None
    service_history: Optional[str] = None
    loan_status: str
    description: Optional[str] = None
    is_assured: bool
    listing_status: str
    created_at: datetime
    
    # Seller Contact
    seller_name: Optional[str] = None
    whatsapp_number: Optional[str] = None
    contact_time: Optional[str] = None

    # Full Media List
    media: List[CarMediaResponse] = []

    class Config:
        from_attributes = True


class ListingListResponse(BaseModel):
    total: int
    page: int
    limit: int
    cars: List[CarListingPublicResponse]
