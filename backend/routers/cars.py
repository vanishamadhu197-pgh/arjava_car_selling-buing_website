from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc
from typing import Optional, List
import uuid

from backend.database import get_db
from backend.models import CarListing, CarMedia, User
from backend.schemas import (
    CarListingCreate, 
    CarListingUpdate, 
    CarListingPublicResponse, 
    CarListingDetailResponse,
    ListingListResponse
)

router = APIRouter(prefix="/cars", tags=["Car Listings"])

def calculate_emi(price: float) -> str:
    """Helper to calculate standard 5-year Indian auto loan EMI estimate at 9.5% APR."""
    try:
        principal = price * 0.8 # 80% on-road financing
        monthly_rate = 0.095 / 12
        months = 60
        emi = (principal * monthly_rate * ((1 + monthly_rate) ** months)) / (((1 + monthly_rate) ** months) - 1)
        return f"₹{int(emi):,}/mo"
    except Exception:
        return f"₹{int(price * 0.02):,}/mo"

def mask_registration(reg: Optional[str]) -> str:
    """Mask private registration plate for public view (e.g. TN •••• 1234)."""
    if not reg or len(reg) < 5:
        return "Protected"
    return f"{reg[:2]} •••• {reg[-4:]}"

@router.get("", response_model=ListingListResponse)
def list_cars(
    search: Optional[str] = Query(None, description="Search brand, model, or city"),
    brand: Optional[str] = Query(None, description="Comma-separated brands"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_year: Optional[int] = Query(None, ge=1990),
    max_km: Optional[int] = Query(None, ge=0),
    fuel: Optional[str] = Query(None, description="Comma-separated fuel types"),
    transmission: Optional[str] = Query(None, description="Comma-separated transmissions"),
    owners: Optional[str] = Query(None, description="Comma-separated owner numbers"),
    city: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("newest", description="newest, price-low, price-high, km-low, year-new"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(CarListing).filter(CarListing.listing_status == "published")

    # Search query
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                CarListing.brand.ilike(s),
                CarListing.model.ilike(s),
                CarListing.variant.ilike(s),
                CarListing.city.ilike(s)
            )
        )

    # Multi-Brand Filter
    if brand:
        brands_list = [b.strip() for b in brand.split(",") if b.strip()]
        if brands_list:
            query = query.filter(CarListing.brand.in_(brands_list))

    # Price Range
    if min_price is not None:
        query = query.filter(CarListing.asking_price >= min_price)
    if max_price is not None:
        query = query.filter(CarListing.asking_price <= max_price)

    # Minimum Year
    if min_year is not None:
        query = query.filter(CarListing.mfg_year >= min_year)

    # Maximum KM
    if max_km is not None:
        query = query.filter(CarListing.km_driven <= max_km)

    # Fuel Types
    if fuel:
        fuel_list = [f.strip() for f in fuel.split(",") if f.strip()]
        if fuel_list:
            query = query.filter(CarListing.fuel_type.in_(fuel_list))

    # Transmission
    if transmission:
        trans_list = [t.strip() for t in transmission.split(",") if t.strip()]
        if trans_list:
            query = query.filter(CarListing.transmission.in_(trans_list))

    # Owners
    if owners:
        owner_ints = []
        for o in owners.split(","):
            try:
                owner_ints.append(int(o.strip()))
            except ValueError:
                pass
        if owner_ints:
            query = query.filter(CarListing.previous_owners.in_(owner_ints))

    # City
    if city and city != "all":
        query = query.filter(CarListing.city.ilike(f"%{city.strip()}%"))

    # Sorting
    if sort_by == "price-low":
        query = query.order_by(asc(CarListing.asking_price))
    elif sort_by == "price-high":
        query = query.order_by(desc(CarListing.asking_price))
    elif sort_by == "km-low":
        query = query.order_by(asc(CarListing.km_driven))
    elif sort_by == "year-new":
        query = query.order_by(desc(CarListing.mfg_year))
    else:
        # Default: newest listed
        query = query.order_by(desc(CarListing.created_at))

    total = query.count()
    offset = (page - 1) * limit
    listings = query.offset(offset).limit(limit).all()

    # Transform into Public Responses
    results = []
    for car in listings:
        # Find main image or first media
        main_img = None
        for m in car.media:
            if m.is_main:
                main_img = m.storage_url
                break
        if not main_img and car.media:
            main_img = car.media[0].storage_url

        item = CarListingPublicResponse(
            id=car.id,
            brand=car.brand,
            model=car.model,
            variant=car.variant,
            mfg_year=car.mfg_year,
            asking_price=car.asking_price,
            km_driven=car.km_driven,
            fuel_type=car.fuel_type,
            transmission=car.transmission,
            previous_owners=car.previous_owners,
            city=car.city,
            image=main_img or "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80",
            is_assured=car.is_assured,
            emi=calculate_emi(car.asking_price),
            created_at=car.created_at
        )
        results.append(item)

    return ListingListResponse(total=total, page=page, limit=limit, cars=results)


@router.get("/{listing_id}", response_model=CarListingDetailResponse)
def get_car_details(listing_id: str, db: Session = Depends(get_db)):
    car = db.query(CarListing).filter(CarListing.id == listing_id).first()
    if not car:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Car listing with ID '{listing_id}' not found."
        )

    # Prepare response
    resp = CarListingDetailResponse(
        id=car.id,
        brand=car.brand,
        model=car.model,
        variant=car.variant,
        mfg_year=car.mfg_year,
        reg_year=car.reg_year,
        km_driven=car.km_driven,
        fuel_type=car.fuel_type,
        transmission=car.transmission,
        previous_owners=car.previous_owners,
        reg_state=car.reg_state,
        city=car.city,
        masked_reg_number=mask_registration(car.reg_number),
        asking_price=car.asking_price,
        is_negotiable=car.is_negotiable,
        overall_condition=car.overall_condition,
        engine_condition=car.engine_condition,
        accident_history=car.accident_history,
        insurance_status=car.insurance_status,
        insurance_expiry=car.insurance_expiry,
        service_history=car.service_history,
        loan_status=car.loan_status,
        description=car.description,
        is_assured=car.is_assured,
        listing_status=car.listing_status,
        created_at=car.created_at,
        seller_name=car.seller.full_name if car.seller else "AK Cars Verified Seller",
        whatsapp_number=car.seller.whatsapp_number if car.seller else "8248828448",
        contact_time="Anytime",
        media=car.media
    )
    return resp


@router.post("", status_code=status.HTTP_201_CREATED)
def create_car_listing(payload: CarListingCreate, db: Session = Depends(get_db)):
    # 1. Get or create seller user record
    seller = db.query(User).filter(User.whatsapp_number == payload.whatsapp_number).first()
    if not seller:
        seller = User(
            full_name=payload.seller_name,
            whatsapp_number=payload.whatsapp_number,
            email=payload.email,
            role="seller"
        )
        db.add(seller)
        db.flush()

    # 2. Create listing record
    listing_id = f"ak_{uuid.uuid4().hex[:8]}"
    car = CarListing(
        id=listing_id,
        seller_id=seller.id,
        brand=payload.brand,
        model=payload.model,
        variant=payload.variant,
        mfg_year=payload.mfg_year,
        reg_year=payload.reg_year,
        km_driven=payload.km_driven,
        fuel_type=payload.fuel_type,
        transmission=payload.transmission,
        previous_owners=payload.previous_owners,
        reg_state=payload.reg_state,
        city=payload.city,
        reg_number=payload.reg_number,
        asking_price=payload.asking_price,
        is_negotiable=payload.is_negotiable,
        overall_condition=payload.overall_condition,
        engine_condition=payload.engine_condition,
        accident_history=payload.accident_history,
        insurance_status=payload.insurance_status,
        insurance_expiry=payload.insurance_expiry,
        service_history=payload.service_history,
        loan_status=payload.loan_status,
        description=payload.description,
        is_assured=False,
        listing_status="published"
    )
    db.add(car)
    db.flush()

    # 3. Attach media files
    if payload.media:
        for idx, m in enumerate(payload.media):
            media_item = CarMedia(
                listing_id=car.id,
                storage_url=m.storage_url,
                media_type=m.media_type,
                image_category=m.image_category,
                display_order=m.display_order if m.display_order else idx,
                is_main=m.is_main if m.is_main else (idx == 0),
                metadata_json=m.metadata_json
            )
            db.add(media_item)

    db.commit()
    db.refresh(car)

    return {
        "success": True,
        "message": "Car listing created successfully on AK Cars",
        "listing_id": car.id,
        "status": car.listing_status
    }


@router.put("/{listing_id}")
def update_car_listing(
    listing_id: str, 
    payload: CarListingUpdate, 
    db: Session = Depends(get_db)
):
    car = db.query(CarListing).filter(CarListing.id == listing_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Listing not found")

    update_data = payload.dict(exclude_unset=True)
    for key, val in update_data.items():
        setattr(car, key, val)

    db.commit()
    db.refresh(car)
    return {"success": True, "listing_id": car.id, "message": "Listing updated successfully"}


@router.delete("/{listing_id}")
def delete_car_listing(listing_id: str, db: Session = Depends(get_db)):
    car = db.query(CarListing).filter(CarListing.id == listing_id).first()
    if not car:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Soft delete / unpublish
    car.listing_status = "archived"
    db.commit()
    return {"success": True, "message": f"Listing '{listing_id}' has been un-published."}
