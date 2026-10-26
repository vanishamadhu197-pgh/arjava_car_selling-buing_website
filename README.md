# AK Cars — Auto Consulting (Wheels for Feels)

A pre-owned car selling, buying, and exchange platform built for **AK Cars Auto Consulting**, located in Karaikudi, Tamil Nadu.

![AK Cars Theme](https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80)

---

## 🌟 Key Highlights & Services

- **Auto Consulting**: Professional guidance for used car buyers and sellers.
- **Buy • Sell • Exchange**: Commercial vehicles (Tata Ace, Ashok Leyland Dost) and passenger vehicles (Creta, Fortuner, Swift, Thar, City, EVs).
- **Park & Sale on Commission Basis**: Sellers can park vehicles at our showroom; we manage buyer verification, test drives, and documentation.
- **Direct WhatsApp Connect**: Every car listing is integrated with one-click WhatsApp messaging to **8248828448** with automatically formatted car specs.
- **200-Point Inspection**: Genuine history verification, RTO NOC and hypothecation checks.

---

## 🏢 Showroom Location & Contact

- **Phone / WhatsApp**: **8248828448**
- **Address**: KVS Nagar Main Road, Kalanivasal, Karaikudi - 630001, Tamil Nadu, India
- **Motto**: *Drive Smart | Drive Happy*

---

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3 (Custom Responsive Red, Black, and White Theme), Modular JavaScript.
- **Backend**: Python FastAPI (`backend/main.py`).
- **Database**: PostgreSQL (with automatic SQLite fallback for zero-config local testing).
- **ORM & Models**: SQLAlchemy 2.0 with Pydantic validation schemas.
- **Media Storage**: Persistent disk object-storage with MIME type and size checks.

---

## 🚀 Getting Started

### 1. Run the FastAPI Backend

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Start backend server
python -m uvicorn backend.main:app --port 8000 --reload
```

* Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### 2. Run the Frontend

```bash
# Using Python built-in HTTP server
python -m http.server 5173
```

* Homepage: [http://localhost:5173/index.html](http://localhost:5173/index.html)
* Explore Cars: [http://localhost:5173/buy-cars.html](http://localhost:5173/buy-cars.html)
* Sell / Park & Sale: [http://localhost:5173/sell-car.html](http://localhost:5173/sell-car.html)

---

## 📄 License

© 2026 AK Cars Auto Consulting. All Rights Reserved.
