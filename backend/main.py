from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import mysql.connector
from datetime import datetime, timedelta, date
from jose import jwt
import bcrypt
import random
import math
import re
import os


# =========================================
# APP & CORS
# =========================================

app = FastAPI(title="Nestora API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================
# DATABASE
# =========================================

from urllib.parse import urlparse

def get_db_connection():
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("MYSQL_URL")
    if db_url:
        parsed = urlparse(db_url)
        db_config = {
            "host": parsed.hostname or "localhost",
            "user": parsed.username or "root",
            "password": parsed.password or "",
            "database": parsed.path.lstrip("/") if parsed.path else "nestora",
            "port": parsed.port or 3306
        }
    else:
        db_config = {
            "host": os.environ.get("DB_HOST", "localhost"),
            "user": os.environ.get("DB_USER", "root"),
            "password": os.environ.get("DB_PASSWORD", "kafiha@123"),
            "database": os.environ.get("DB_NAME", "nestora"),
            "port": int(os.environ.get("DB_PORT", 3306))
        }

    # For remote cloud databases, SSL is often required unless explicitly disabled
    ssl_ca = os.environ.get("DB_SSL_CA")
    if ssl_ca:
        db_config["ssl_ca"] = ssl_ca
    elif os.environ.get("DB_SSL_DISABLED", "").lower() == "true":
        db_config["ssl_disabled"] = True

    return mysql.connector.connect(**db_config)


# =========================================
# SECURITY (NATIVE BCRYPT)
# =========================================

SECRET_KEY = "nestora-secret-key-change-later"
ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = password.encode("utf-8")[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


# =========================================
# REQUEST MODELS
# =========================================

class TenantSignup(BaseModel):
    name: str
    phone: str
    email: str
    age: int
    gender: str
    address: str
    password: str


class OwnerSignup(BaseModel):
    name: str
    phone: str
    email: str
    address: str
    password: str
    pg_name: Optional[str] = None


class LoginRequest(BaseModel):
    user_id: str
    password: str
    role: Optional[str] = None


class JoinPGRequest(BaseModel):
    tenant_id: Any
    pg_id: str
    room_id: Optional[int] = None
    bed_id: Optional[int] = None
    move_in_date: Optional[str] = None


class CancelRequest(BaseModel):
    request_id: int
    tenant_id: Any


class LeavePGRequest(BaseModel):
    tenant_id: Any


class BookPGRequest(BaseModel):
    tenant_id: int
    pg_id: int
    room_id: int
    bed_id: int
    move_in_date: str
    advance_amount: float
    payment_method: str = "UPI"
    payment_for: str = "Booking Advance"


class PayRentRequest(BaseModel):
    tenant_id: int
    pg_id: int
    amount: float
    payment_for: str = "Monthly Rent"
    payment_month: str
    payment_method: str = "UPI"


class ComplaintRequest(BaseModel):
    tenant_id: Any
    pg_id: Optional[Any] = None
    subject: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = "General"
    description: str


class ReviewRequest(BaseModel):
    tenant_id: Any
    pg_id: Optional[Any] = None
    rating: int = 5
    review: str


class AppReportRequest(BaseModel):
    user_id: Any
    role: Optional[str] = "tenant"
    category: Optional[str] = "Bug Report"
    subject: Optional[str] = None
    title: Optional[str] = None
    description: str


# =========================================
# ROOT & HEALTH CHECK
# =========================================

@app.get("/")
def home():
    return {
        "status": "success",
        "message": "Nestora Backend is Running!"
    }


@app.get("/api/test-db")
def test_database():
    try:
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT DATABASE()")
        result = cursor.fetchone()
        cursor.close()
        db.close()
        return {
            "status": "success",
            "database": result[0]
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


# =========================================
# USER ID GENERATOR
# =========================================

def generate_user_id(role):
    db = get_db_connection()
    cursor = db.cursor()

    prefix = "NEST" if role == "tenant" else "OWN"
    cursor.execute(
        "SELECT user_id FROM users WHERE role = %s ORDER BY id DESC LIMIT 1",
        (role,)
    )
    last_user = cursor.fetchone()

    if last_user:
        last_id = last_user[0]
        number = int(last_id.replace(prefix, ""))
        new_number = number + 1
    else:
        new_number = 1001

    user_id = f"{prefix}{new_number}"
    cursor.close()
    db.close()
    return user_id


def generate_pg_id():
    db = get_db_connection()
    cursor = db.cursor()
    cursor.execute("SELECT pg_id FROM pgs WHERE pg_id LIKE 'PG%' ORDER BY id DESC LIMIT 1")
    last_pg = cursor.fetchone()
    if last_pg and last_pg[0]:
        try:
            num = int(str(last_pg[0]).replace("PG", ""))
            new_num = num + 1
        except Exception:
            new_num = random.randint(3000, 9999)
    else:
        new_num = 3001
    cursor.close()
    db.close()
    return f"PG{new_num}"


# =========================================
# AUTHENTICATION APIS
# =========================================

@app.post("/api/auth/tenant/signup")
def tenant_signup(data: TenantSignup):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (data.email,))
        existing = cursor.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = generate_user_id("tenant")
        hashed_password = hash_password(data.password)

        query = """
        INSERT INTO users
        (user_id, name, email, phone, password, plain_password, age, gender, address, role)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'tenant')
        """
        values = (
            user_id, data.name, data.email, data.phone,
            hashed_password, data.password, data.age, data.gender, data.address
        )
        cursor.execute(query, values)
        db.commit()

        return {
            "status": "success",
            "message": "Tenant registered successfully",
            "user_id": user_id
        }
    finally:
        cursor.close()
        db.close()


@app.post("/api/auth/owner/signup")
def owner_signup(data: OwnerSignup):
    db = get_db_connection()
    cursor = db.cursor()

    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (data.email,))
        existing = cursor.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = generate_user_id("owner")
        hashed_password = hash_password(data.password)

        query = """
        INSERT INTO users
        (user_id, name, email, phone, password, plain_password, address, role)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'owner')
        """
        values = (user_id, data.name, data.email, data.phone, hashed_password, data.password, data.address)
        cursor.execute(query, values)
        owner_db_id = cursor.lastrowid
        db.commit()

        # If owner provided a PG name on signup, auto-create the PG with Room 101 & 102
        if data.pg_name and data.pg_name.strip():
            pg_title = data.pg_name.strip()
            new_pg_id = generate_pg_id()
            cursor.execute(
                """
                INSERT INTO pgs (pg_id, owner_id, pg_name, address, city, pincode, pg_type, gender_allowed, description, monthly_rent, security_deposit, status, latitude, longitude)
                VALUES (%s, %s, %s, %s, 'Jamshedpur', '831001', 'Single / Double Sharing', 'All', %s, 7500.0, 7500.0, 'approved', 22.8046, 86.2029)
                """,
                (new_pg_id, owner_db_id, pg_title, data.address, f"{pg_title} managed by {data.name}.")
            )
            pg_db_id = cursor.lastrowid

            # Room 101
            cursor.execute(
                "INSERT INTO rooms (room_id, pg_id, room_number, room_type, rent) VALUES (%s, %s, '101', 'Single Room', 7500.0)",
                (f"{new_pg_id}-R101", pg_db_id)
            )
            r1_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO beds (bed_id, room_id, bed_number, status) VALUES (%s, %s, 'Bed 1', 'available')",
                (f"{new_pg_id}-R101-B1", r1_id)
            )

            # Room 102
            cursor.execute(
                "INSERT INTO rooms (room_id, pg_id, room_number, room_type, rent) VALUES (%s, %s, '102', 'Double Sharing', 6000.0)",
                (f"{new_pg_id}-R102", pg_db_id)
            )
            r2_id = cursor.lastrowid
            cursor.execute(
                """
                INSERT INTO beds (bed_id, room_id, bed_number, status)
                VALUES (%s, %s, 'Bed A', 'available'), (%s, %s, 'Bed B', 'available')
                """,
                (f"{new_pg_id}-R102-BA", r2_id, f"{new_pg_id}-R102-BB", r2_id)
            )
            db.commit()

        return {
            "status": "success",
            "message": "Owner registered successfully",
            "user_id": user_id
        }
    finally:
        cursor.close()
        db.close()


@app.post("/api/auth/login")
def login(data: LoginRequest):
    db = get_db_connection()
    cursor = db.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM users WHERE user_id = %s", (data.user_id.strip(),))
        user = cursor.fetchone()

        if not user or not verify_password(data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid User ID or Password")

        # Strict Role Enforcement
        if data.role:
            expected_role = data.role.strip().lower()
            actual_role = (user.get("role") or "").strip().lower()
            if actual_role != expected_role:
                portal_map = {
                    "tenant": "Tenant Portal",
                    "owner": "Owner Portal",
                    "admin": "Admin Portal"
                }
                portal_name = portal_map.get(expected_role, f"{expected_role.capitalize()} Portal")
                account_type = actual_role.capitalize() if actual_role else "Unknown"
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied: {account_type} accounts cannot sign in to the {portal_name}. Please use the {account_type} Sign In."
                )

        token_data = {
            "user_id": user["user_id"],
            "role": user["role"],
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

        return {
            "status": "success",
            "message": "Login successful",
            "token": token,
            "id": user["id"],
            "user_id": user["user_id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user["phone"],
            "role": user["role"]
        }
    finally:
        cursor.close()
        db.close()


# =========================================
# FIND PG (SEARCH & FILTERS)
# =========================================

@app.get("/api/pgs")
def get_pgs(
    search: str = "",
    gender: str = "",
    pg_type: str = "",
    max_rent: float = 0.0,
    city: str = ""
):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = """
            SELECT
                p.id,
                p.pg_id,
                p.pg_name,
                p.address,
                p.city,
                p.pincode,
                p.pg_type,
                p.gender_allowed,
                p.description,
                p.monthly_rent,
                p.security_deposit,
                p.status,
                p.latitude,
                p.longitude,
                p.owner_id,
                u.name AS owner_name,
                u.user_id AS owner_code,
                u.phone AS owner_phone,
                COUNT(DISTINCT r.id) AS total_rooms,
                COUNT(DISTINCT CASE WHEN b.status = 'available' THEN b.id END) AS available_beds,
                AVG(rev.rating) as avg_rating,
                COUNT(DISTINCT rev.id) as review_count
            FROM pgs p
            LEFT JOIN users u ON p.owner_id = u.id
            LEFT JOIN rooms r ON p.id = r.pg_id
            LEFT JOIN beds b ON r.id = b.room_id
            LEFT JOIN reviews rev ON p.id = rev.pg_id
            WHERE p.status = 'approved'
        """
        params = []

        if search.strip():
            query += """ AND (
                p.pg_name LIKE %s
                OR p.pg_id LIKE %s
                OR p.address LIKE %s
                OR p.city LIKE %s
                OR p.pincode LIKE %s
            )"""
            val = f"%{search.strip()}%"
            params.extend([val, val, val, val, val])

        if gender.strip() and gender != "All":
            query += " AND (p.gender_allowed = %s OR p.gender_allowed = 'Unisex' OR p.gender_allowed = 'All')"
            params.append(gender.strip())

        if pg_type.strip() and pg_type != "All":
            query += " AND p.pg_type LIKE %s"
            params.append(f"%{pg_type.strip()}%")

        if max_rent > 0:
            query += " AND p.monthly_rent <= %s"
            params.append(max_rent)

        if city.strip() and city != "All":
            query += " AND p.city LIKE %s"
            params.append(f"%{city.strip()}%")

        query += " GROUP BY p.id, u.name, u.user_id, u.phone ORDER BY p.id DESC"
        cursor.execute(query, tuple(params))
        pgs = cursor.fetchall()

        for pg in pgs:
            pg["avg_rating"] = round(float(pg["avg_rating"]), 1) if pg.get("avg_rating") else 4.6
            if pg.get("monthly_rent"):
                pg["monthly_rent"] = float(pg["monthly_rent"])
            if pg.get("security_deposit"):
                pg["security_deposit"] = float(pg["security_deposit"])
            if pg.get("latitude"):
                pg["latitude"] = float(pg["latitude"])
            if pg.get("longitude"):
                pg["longitude"] = float(pg["longitude"])
            pg["is_nestora_verified"] = True
            pg["source"] = "nestora"

        return {
            "status": "success",
            "pgs": pgs
        }
    finally:
        cursor.close()
        conn.close()


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> Optional[float]:
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


@app.get("/api/pgs/nearby")
def get_nearby_pgs(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: float = 20.0,
    search: str = "",
    rent: float = 0.0,
    gender: str = "",
    sharing: str = "",
    rating: float = 0.0,
    amenities: str = "",
    sort_by: str = "nearest"
):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        query = """
            SELECT
                p.id,
                p.pg_id,
                p.pg_name,
                p.address,
                p.city,
                p.pincode,
                p.pg_type,
                p.gender_allowed,
                p.description,
                p.monthly_rent,
                p.security_deposit,
                p.status,
                p.latitude,
                p.longitude,
                COUNT(DISTINCT r.id) AS total_rooms,
                COUNT(DISTINCT CASE WHEN b.status = 'available' THEN b.id END) AS available_beds,
                AVG(rev.rating) as avg_rating,
                COUNT(DISTINCT rev.id) as review_count
            FROM pgs p
            LEFT JOIN rooms r ON p.id = r.pg_id
            LEFT JOIN beds b ON r.id = b.room_id
            LEFT JOIN reviews rev ON p.id = rev.pg_id
            WHERE p.status = 'approved'
        """
        params = []

        if search.strip():
            query += """ AND (
                p.pg_name LIKE %s
                OR p.pg_id LIKE %s
                OR p.address LIKE %s
                OR p.city LIKE %s
                OR p.pincode LIKE %s
            )"""
            val = f"%{search.strip()}%"
            params.extend([val, val, val, val, val])

        if gender.strip() and gender != "All":
            query += " AND (p.gender_allowed = %s OR p.gender_allowed = 'Unisex' OR p.gender_allowed = 'All')"
            params.append(gender.strip())

        if sharing.strip() and sharing != "All":
            query += " AND p.pg_type LIKE %s"
            params.append(f"%{sharing.strip()}%")

        if rent > 0:
            query += " AND p.monthly_rent <= %s"
            params.append(rent)

        query += " GROUP BY p.id"
        cursor.execute(query, tuple(params))
        pgs = cursor.fetchall()

        # If user did not provide coordinates, default to Sakchi, Jamshedpur center (22.8055, 86.2045)
        ref_lat = latitude if latitude is not None else 22.8055
        ref_lng = longitude if longitude is not None else 86.2045

        results = []
        for pg in pgs:
            pg["avg_rating"] = round(float(pg["avg_rating"]), 1) if pg.get("avg_rating") else 4.6
            if pg.get("monthly_rent"):
                pg["monthly_rent"] = float(pg["monthly_rent"])
            if pg.get("security_deposit"):
                pg["security_deposit"] = float(pg["security_deposit"])
            if pg.get("latitude"):
                pg["latitude"] = float(pg["latitude"])
            if pg.get("longitude"):
                pg["longitude"] = float(pg["longitude"])

            # Filter by rating if specified
            if rating > 0 and pg["avg_rating"] < rating:
                continue

            # Filter by amenities if specified
            if amenities.strip():
                req_amenities = [a.strip().lower() for a in amenities.split(",") if a.strip()]
                desc = (pg.get("description") or "").lower()
                match_all = True
                for a in req_amenities:
                    if a == "wifi" and not ("wifi" in desc or "wi-fi" in desc or "internet" in desc):
                        match_all = False; break
                    elif a == "food" and not ("food" in desc or "meal" in desc or "mess" in desc):
                        match_all = False; break
                    elif a == "ac" and not ("ac" in desc):
                        match_all = False; break
                    elif a == "laundry" and not ("laundry" in desc or "washing" in desc):
                        match_all = False; break
                    elif a == "parking" and not ("parking" in desc):
                        match_all = False; break
                    elif a == "backup" and not ("power" in desc or "backup" in desc or "inverter" in desc):
                        match_all = False; break
                    elif a == "cctv" and not ("cctv" in desc or "security" in desc):
                        match_all = False; break
                    elif a == "attached_bathroom" and not ("bathroom" in desc or "attached" in desc):
                        match_all = False; break
                if not match_all:
                    continue

            # Calculate distance
            pg_lat = pg.get("latitude")
            pg_lng = pg.get("longitude")
            dist = None
            if pg_lat is not None and pg_lng is not None:
                dist = haversine_distance(ref_lat, ref_lng, pg_lat, pg_lng)
                pg["distance_km"] = dist
                if dist < 1.0:
                    pg["distance_text"] = f"{int(dist * 1000)} m away"
                else:
                    pg["distance_text"] = f"{dist:.1f} km away"
            else:
                pg["distance_km"] = 999.0
                pg["distance_text"] = "Distance unavailable"

            # Filter by radius if radius > 0 and coordinates are active
            if radius > 0 and dist is not None and dist > radius:
                continue

            pg["is_nestora_verified"] = True
            pg["source"] = "nestora"
            results.append(pg)

        # Sorting
        if sort_by == "lowest_rent":
            results.sort(key=lambda x: x.get("monthly_rent", 0))
        elif sort_by == "highest_rent":
            results.sort(key=lambda x: x.get("monthly_rent", 0), reverse=True)
        elif sort_by == "highest_rated":
            results.sort(key=lambda x: x.get("avg_rating", 0), reverse=True)
        else: # nearest
            results.sort(key=lambda x: x.get("distance_km", 999))

        return {
            "status": "success",
            "searched_location": {
                "latitude": ref_lat,
                "longitude": ref_lng,
                "radius_km": radius
            },
            "total_found": len(results),
            "pgs": results
        }
    finally:
        cursor.close()
        conn.close()


def get_nearby_services_for_pg(city: str = "", address: str = ""):
    return [
        {
            "category": "Food & Mess",
            "name": "Annapurna Home Tiffin & Mess",
            "distance": "180 m",
            "rating": 4.8,
            "timings": "7:00 AM - 10:30 PM",
            "phone": "+91 98351 22410",
            "address": "Near City Market Complex",
            "description": "Pure veg & non-veg home style tiffin subscription & daily meals."
        },
        {
            "category": "Food & Mess",
            "name": "The Daily Brew Cafe & Bakery",
            "distance": "320 m",
            "rating": 4.6,
            "timings": "8:00 AM - 11:00 PM",
            "phone": "+91 94311 88921",
            "address": "Ground Floor, Metro Arcade",
            "description": "Coffee, healthy snacks, study-friendly environment with fast Wi-Fi."
        },
        {
            "category": "Laundry",
            "name": "QuickWash Laundry & Dry Cleaning",
            "distance": "220 m",
            "rating": 4.7,
            "timings": "8:30 AM - 9:00 PM",
            "phone": "+91 91234 56789",
            "address": "Shop 4, Market Complex",
            "description": "Express 24-hr wash, fold, steam ironing with doorstep delivery."
        },
        {
            "category": "Gym",
            "name": "IronFit Unisex Fitness Gym",
            "distance": "450 m",
            "rating": 4.9,
            "timings": "5:30 AM - 10:00 PM",
            "phone": "+91 88776 54321",
            "address": "2nd Floor, Grand Center",
            "description": "Modern fitness equipment, cardio, personal trainers, student discounts."
        },
        {
            "category": "Pharmacy",
            "name": "MedPlus 24/7 Pharmacy & Clinic",
            "distance": "120 m",
            "rating": 4.8,
            "timings": "Open 24 Hours",
            "phone": "+91 99887 76655",
            "address": "Main Road Corner",
            "description": "Prescription medicines, first aid, emergency healthcare supplies."
        },
        {
            "category": "Grocery",
            "name": "SmartPoint Supermarket & Daily Needs",
            "distance": "280 m",
            "rating": 4.5,
            "timings": "7:30 AM - 10:00 PM",
            "phone": "+91 97711 23456",
            "address": "Cross Road 3",
            "description": "Fresh dairy, snacks, packaged groceries, beverages and daily essentials."
        },
        {
            "category": "Transit",
            "name": "Central Metro & City Bus Stand",
            "distance": "300 m",
            "rating": 4.4,
            "timings": "24/7 Transit",
            "phone": "Transit Hub",
            "address": "Sakchi Roundabout",
            "description": "Direct metro feeder buses, e-rickshaws, and auto stands to IT parks."
        }
    ]


@app.get("/api/pgs/{pg_id}/details")
def get_pg_details(pg_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if pg_id.isdigit():
            cursor.execute(
                """
                SELECT p.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email
                FROM pgs p
                JOIN users u ON p.owner_id = u.id
                WHERE p.id = %s
                """,
                (int(pg_id),)
            )
        else:
            cursor.execute(
                """
                SELECT p.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email
                FROM pgs p
                JOIN users u ON p.owner_id = u.id
                WHERE p.pg_id = %s
                """,
                (pg_id.strip(),)
            )

        pg = cursor.fetchone()
        if not pg:
            raise HTTPException(status_code=404, detail="PG not found")

        if pg.get("monthly_rent"):
            pg["monthly_rent"] = float(pg["monthly_rent"])
        if pg.get("security_deposit"):
            pg["security_deposit"] = float(pg["security_deposit"])

        cursor.execute(
            """
            SELECT id as room_id, room_id as room_code, room_number, room_type, rent
            FROM rooms
            WHERE pg_id = %s
            ORDER BY room_number
            """,
            (pg["id"],)
        )
        rooms = cursor.fetchall()

        for r in rooms:
            if r.get("rent"):
                r["rent"] = float(r["rent"])
            cursor.execute(
                """
                SELECT id as bed_id, bed_id as bed_code, bed_number, status
                FROM beds
                WHERE room_id = %s
                ORDER BY bed_number
                """,
                (r["room_id"],)
            )
            r["beds"] = cursor.fetchall()

        cursor.execute(
            """
            SELECT rev.id, rev.rating, rev.review, rev.created_at, u.name as tenant_name
            FROM reviews rev
            JOIN users u ON rev.tenant_id = u.id
            WHERE rev.pg_id = %s
            ORDER BY rev.created_at DESC
            """,
            (pg["id"],)
        )
        reviews = cursor.fetchall()
        for rev in reviews:
            rev["created_at"] = str(rev["created_at"])

        avg_rating = 4.6
        if reviews:
            avg_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 1)

        services = get_nearby_services_for_pg(pg.get("city", ""), pg.get("address", ""))

        return {
            "status": "success",
            "pg": pg,
            "rooms": rooms,
            "reviews": reviews,
            "avg_rating": avg_rating,
            "nearby_services": services
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/pgs/{pg_id}/nearby-services")
def get_nearby_services_api(pg_id: str):
    return {
        "status": "success",
        "services": get_nearby_services_for_pg()
    }


# =========================================
# TENANT CURRENT PG (MY PG)
# =========================================

@app.get("/api/tenant/{tenant_id}/current-pg")
def get_tenant_current_pg(tenant_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        t_str = str(tenant_id).strip()
        if t_str.isdigit():
            cursor.execute("SELECT id, user_id, name FROM users WHERE id = %s", (int(t_str),))
        else:
            cursor.execute("SELECT id, user_id, name FROM users WHERE user_id = %s", (t_str,))
        t_user = cursor.fetchone()
        if not t_user:
            return {
                "status": "success",
                "has_pg": False,
                "data": None
            }
        actual_tenant_id = t_user["id"]

        cursor.execute(
            """
            SELECT 
                tp.id as request_id,
                tp.status as connection_status,
                tp.move_in_date,
                tp.created_at as joined_at,
                p.id as pg_id,
                p.pg_id as pg_code,
                p.pg_name,
                p.address as pg_address,
                p.city,
                p.pincode,
                p.pg_type,
                p.gender_allowed,
                p.description,
                p.monthly_rent,
                p.security_deposit,
                r.id as room_id,
                r.room_number,
                r.room_type,
                r.rent as room_rent,
                b.id as bed_id,
                b.bed_number,
                u.name as owner_name,
                u.phone as owner_phone,
                u.email as owner_email
            FROM tenant_pg tp
            JOIN pgs p ON tp.pg_id = p.id
            LEFT JOIN rooms r ON tp.room_id = r.id
            LEFT JOIN beds b ON tp.bed_id = b.id
            LEFT JOIN users u ON p.owner_id = u.id
            WHERE tp.tenant_id = %s AND tp.status IN ('approved', 'active', 'pending')
            ORDER BY 
                CASE 
                    WHEN tp.status IN ('approved', 'active') THEN 1 
                    WHEN tp.status = 'pending' THEN 2 
                    ELSE 3 
                END ASC,
                tp.id DESC
            LIMIT 1
            """,
            (actual_tenant_id,)
        )
        record = cursor.fetchone()

        if not record:
            return {
                "status": "success",
                "has_pg": False,
                "data": None
            }

        current_month = datetime.now().strftime("%B %Y")
        cursor.execute(
            """
            SELECT id, transaction_id, amount, paid_at, status
            FROM payments
            WHERE tenant_id = %s AND pg_id = %s AND payment_month = %s AND status = 'success'
            ORDER BY id DESC LIMIT 1
            """,
            (tenant_id, record["pg_id"], current_month)
        )
        payment = cursor.fetchone()

        rent_status = "paid" if payment else "due"
        effective_rent = float(record["room_rent"]) if record.get("room_rent") else float(record["monthly_rent"])

        cursor.execute(
            "SELECT COUNT(*) as count FROM complaints WHERE tenant_id = %s AND status != 'resolved'",
            (tenant_id,)
        )
        complaints_count = cursor.fetchone()["count"]

        cursor.execute(
            "SELECT COUNT(*) as count FROM notices WHERE pg_id = %s",
            (record["pg_id"],)
        )
        notices_count = cursor.fetchone()["count"]

        return {
            "status": "success",
            "has_pg": True,
            "connection_status": record["connection_status"],
            "request_id": record["request_id"],
            "pg": {
                "id": record["pg_id"],
                "pg_id": record["pg_code"],
                "pg_name": record["pg_name"],
                "address": record["pg_address"],
                "city": record["city"],
                "pincode": record["pincode"],
                "pg_type": record["pg_type"],
                "gender_allowed": record["gender_allowed"],
                "description": record["description"],
                "monthly_rent": effective_rent,
                "security_deposit": float(record["security_deposit"]) if record["security_deposit"] else 0.0,
                "move_in_date": str(record["move_in_date"]) if record["move_in_date"] else None,
                "joined_at": str(record["joined_at"]) if record["joined_at"] else None
            },
            "room": {
                "id": record["room_id"],
                "room_number": record["room_number"],
                "room_type": record["room_type"]
            } if record.get("room_number") else None,
            "bed": {
                "id": record["bed_id"],
                "bed_number": record["bed_number"]
            } if record.get("bed_number") else None,
            "owner": {
                "name": record["owner_name"],
                "phone": record["owner_phone"],
                "email": record["owner_email"]
            },
            "rent_info": {
                "amount_due": effective_rent,
                "current_month": current_month,
                "status": rent_status,
                "last_payment": payment
            },
            "stats": {
                "open_complaints": complaints_count,
                "notices_count": notices_count
            }
        }
    finally:
        cursor.close()
        conn.close()


# =========================================
# JOIN CURRENT PG
# =========================================

@app.post("/api/tenant/join-pg")
def tenant_join_pg(data: JoinPGRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        t_id = data.tenant_id
        if isinstance(t_id, int) or (isinstance(t_id, str) and str(t_id).strip().isdigit()):
            cursor.execute("SELECT id, user_id, name FROM users WHERE id = %s", (int(t_id),))
        else:
            cursor.execute("SELECT id, user_id, name FROM users WHERE user_id = %s", (str(t_id).strip(),))
        tenant = cursor.fetchone()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant account not found.")
        actual_tenant_id = tenant["id"]

        pg_param = str(data.pg_id).strip()
        pg = None
        if pg_param.isdigit():
            cursor.execute("SELECT id, pg_id, pg_name, owner_id, status FROM pgs WHERE id = %s", (int(pg_param),))
            pg = cursor.fetchone()
        
        if not pg:
            cursor.execute("SELECT id, pg_id, pg_name, owner_id, status FROM pgs WHERE pg_id = %s", (pg_param,))
            pg = cursor.fetchone()

        if not pg:
            cursor.execute("SELECT id, pg_id, pg_name, owner_id, status FROM pgs WHERE pg_name = %s", (pg_param,))
            pg = cursor.fetchone()

        if not pg:
            raise HTTPException(status_code=404, detail="PG not found. Please verify the PG ID/Code.")

        if pg["status"] != "approved":
            raise HTTPException(status_code=400, detail="This PG is currently not available for joining.")

        cursor.execute(
            """
            SELECT id, status FROM tenant_pg
            WHERE tenant_id = %s AND status IN ('pending', 'approved', 'active')
            """,
            (actual_tenant_id,)
        )
        existing_list = cursor.fetchall()

        if existing_list:
            has_pending = any(e["status"] == "pending" for e in existing_list)
            if has_pending:
                raise HTTPException(
                    status_code=400,
                    detail="You already have a pending join request. Please wait for owner verification or cancel your existing request."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="You already have an active PG connection. Please leave your current PG first before requesting to join a new one."
                )

        cursor.execute(
            """
            INSERT INTO tenant_pg (tenant_id, pg_id, room_id, bed_id, move_in_date, status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
            """,
            (actual_tenant_id, pg["id"], data.room_id, data.bed_id, data.move_in_date)
        )
        conn.commit()

        cursor.execute("SELECT id, user_id, name, phone, email FROM users WHERE id = %s", (pg["owner_id"],))
        owner_info = cursor.fetchone() or {}

        return {
            "status": "success",
            "message": f"Join request sent to {pg['pg_name']}! Awaiting owner verification.",
            "pg_name": pg["pg_name"],
            "owner_id": owner_info.get("id"),
            "owner_code": owner_info.get("user_id"),
            "owner_name": owner_info.get("name"),
            "owner_phone": owner_info.get("phone")
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/owner/pending-summary")
def get_owner_pending_summary():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT 
                u.id as owner_id,
                u.user_id as owner_code,
                u.name as owner_name,
                p.pg_name,
                COUNT(tp.id) as pending_count
            FROM tenant_pg tp
            JOIN pgs p ON tp.pg_id = p.id
            JOIN users u ON p.owner_id = u.id
            WHERE tp.status = 'pending'
            GROUP BY u.id, u.user_id, u.name, p.pg_name
            """
        )
        return {"status": "success", "pending": cursor.fetchall()}
    finally:
        cursor.close()
        conn.close()



@app.post("/api/pgs/{pg_id}/request")
def request_to_join_pg_legacy(pg_id: str, tenant_user_id: Any):
    return tenant_join_pg(JoinPGRequest(tenant_id=tenant_user_id, pg_id=pg_id))


@app.post("/api/tenant/cancel-request")
def cancel_join_request(data: CancelRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        t_id = data.tenant_id
        if isinstance(t_id, int) or (isinstance(t_id, str) and str(t_id).strip().isdigit()):
            cursor.execute("SELECT id FROM users WHERE id = %s", (int(t_id),))
        else:
            cursor.execute("SELECT id FROM users WHERE user_id = %s", (str(t_id).strip(),))
        tenant = cursor.fetchone()
        actual_tenant_id = tenant["id"] if tenant else data.tenant_id

        cursor.execute(
            "DELETE FROM tenant_pg WHERE id = %s AND tenant_id = %s AND status = 'pending'",
            (data.request_id, actual_tenant_id)
        )
        conn.commit()
        return {
            "status": "success",
            "message": "Join request cancelled successfully"
        }
    finally:
        cursor.close()
        conn.close()


@app.post("/api/tenant/leave-pg")
def leave_pg(data: LeavePGRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        t_id = data.tenant_id
        if isinstance(t_id, int) or (isinstance(t_id, str) and str(t_id).strip().isdigit()):
            cursor.execute("SELECT id, user_id, name FROM users WHERE id = %s", (int(t_id),))
        else:
            cursor.execute("SELECT id, user_id, name FROM users WHERE user_id = %s", (str(t_id).strip(),))
        tenant = cursor.fetchone()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant account not found.")
        actual_tenant_id = tenant["id"]

        # Fetch all active / approved records (fetchall prevents unread results!)
        cursor.execute(
            "SELECT id, bed_id, pg_id FROM tenant_pg WHERE tenant_id = %s AND status IN ('approved', 'active')",
            (actual_tenant_id,)
        )
        active_records = cursor.fetchall()

        # Fetch all pending records
        cursor.execute(
            "SELECT id FROM tenant_pg WHERE tenant_id = %s AND status = 'pending'",
            (actual_tenant_id,)
        )
        pending_records = cursor.fetchall()

        if not active_records and not pending_records:
            raise HTTPException(status_code=400, detail="No active or pending PG connection found to leave.")

        # Release any beds from active/approved stays
        for rec in active_records:
            if rec.get("bed_id"):
                cursor.execute("UPDATE beds SET status = 'available' WHERE id = %s", (rec["bed_id"],))

        # Release any beds from bookings and update booking status
        cursor.execute(
            "SELECT id, bed_id FROM bookings WHERE tenant_id = %s AND status IN ('approved', 'active')",
            (actual_tenant_id,)
        )
        active_bookings = cursor.fetchall()
        for bkg in active_bookings:
            if bkg.get("bed_id"):
                cursor.execute("UPDATE beds SET status = 'available' WHERE id = %s", (bkg["bed_id"],))
            cursor.execute("UPDATE bookings SET status = 'completed' WHERE id = %s", (bkg["id"],))

        # Mark all active/approved connections as left
        cursor.execute(
            "UPDATE tenant_pg SET status = 'left' WHERE tenant_id = %s AND status IN ('approved', 'active')",
            (actual_tenant_id,)
        )

        # Cancel/remove all pending requests
        cursor.execute(
            "DELETE FROM tenant_pg WHERE tenant_id = %s AND status = 'pending'",
            (actual_tenant_id,)
        )

        conn.commit()

        return {
            "status": "success",
            "message": "You have left your current PG. All allocations and active stays have been cleared."
        }
    finally:
        cursor.close()
        conn.close()


# =========================================
# CHANGE PG & BOOKING FLOW
# =========================================

@app.post("/api/tenant/book-pg")
def book_new_pg(data: BookPGRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT b.id as bed_id, b.status as bed_status, r.id as room_id, r.room_number, r.rent, p.id as pg_id, p.pg_name
            FROM beds b
            JOIN rooms r ON b.room_id = r.id
            JOIN pgs p ON r.pg_id = p.id
            WHERE b.id = %s
            """,
            (data.bed_id,)
        )
        bed = cursor.fetchone()

        if not bed:
            raise HTTPException(status_code=404, detail="Selected bed not found.")

        if bed["bed_status"] == "occupied":
            raise HTTPException(status_code=400, detail="This bed is already occupied. Please select an available bed.")

        cursor.execute(
            "SELECT id, bed_id FROM tenant_pg WHERE tenant_id = %s AND status IN ('active', 'approved')",
            (data.tenant_id,)
        )
        old_pgs = cursor.fetchall()
        for old_pg in old_pgs:
            if old_pg.get("bed_id"):
                cursor.execute("UPDATE beds SET status = 'available' WHERE id = %s", (old_pg["bed_id"],))
            cursor.execute("UPDATE tenant_pg SET status = 'left' WHERE id = %s", (old_pg["id"],))

        cursor.execute(
            "DELETE FROM tenant_pg WHERE tenant_id = %s AND status = 'pending'",
            (data.tenant_id,)
        )

        booking_code = f"BKG{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{random.randint(10,99)}"

        cursor.execute(
            """
            INSERT INTO bookings (booking_id, tenant_id, pg_id, room_id, bed_id, status)
            VALUES (%s, %s, %s, %s, %s, 'approved')
            """,
            (booking_code, data.tenant_id, data.pg_id, data.room_id, data.bed_id)
        )

        cursor.execute("UPDATE beds SET status = 'occupied' WHERE id = %s", (data.bed_id,))

        cursor.execute(
            """
            INSERT INTO tenant_pg (tenant_id, pg_id, room_id, bed_id, move_in_date, status)
            VALUES (%s, %s, %s, %s, %s, 'active')
            """,
            (data.tenant_id, data.pg_id, data.room_id, data.bed_id, data.move_in_date)
        )

        txn_id = f"TXN{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{random.randint(100,999)}"
        month_name = datetime.now().strftime("%B %Y")
        cursor.execute(
            """
            INSERT INTO payments (transaction_id, tenant_id, pg_id, amount, payment_for, payment_month, payment_method, status, paid_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'success', NOW())
            """,
            (txn_id, data.tenant_id, data.pg_id, data.advance_amount, data.payment_for, month_name, data.payment_method)
        )

        receipt_code = f"RCP-{datetime.utcnow().strftime('%Y%m')}-{random.randint(1000,9999)}"
        cursor.execute(
            """
            INSERT INTO receipts (receipt_id, transaction_id, tenant_id, amount)
            VALUES (%s, %s, %s, %s)
            """,
            (receipt_code, txn_id, data.tenant_id, data.advance_amount)
        )

        conn.commit()

        return {
            "status": "success",
            "message": f"Congratulations! You have successfully booked {bed['pg_name']}.",
            "booking_id": booking_code,
            "transaction_id": txn_id,
            "receipt_id": receipt_code,
            "pg_name": bed["pg_name"],
            "room_number": bed["room_number"]
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/tenant/{tenant_id}/bookings")
def get_tenant_bookings(tenant_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT 
                b.id,
                b.booking_id,
                b.status,
                b.booking_date,
                p.pg_name,
                p.address,
                p.city,
                r.room_number,
                r.room_type,
                r.rent,
                bed.bed_number
            FROM bookings b
            JOIN pgs p ON b.pg_id = p.id
            LEFT JOIN rooms r ON b.room_id = r.id
            LEFT JOIN beds bed ON b.bed_id = bed.id
            WHERE b.tenant_id = %s
            ORDER BY b.booking_date DESC
            """,
            (tenant_id,)
        )
        bookings = cursor.fetchall()
        for b in bookings:
            b["booking_date"] = str(b["booking_date"])
            if b.get("rent"):
                b["rent"] = float(b["rent"])
        return {
            "status": "success",
            "bookings": bookings
        }
    finally:
        cursor.close()
        conn.close()


# =========================================
# RENT PAYMENT & RECEIPTS
# =========================================

@app.post("/api/tenant/pay-rent")
def pay_rent(data: PayRentRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        txn_id = f"TXN{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{random.randint(100,999)}"
        cursor.execute(
            """
            INSERT INTO payments (transaction_id, tenant_id, pg_id, amount, payment_for, payment_month, payment_method, status, paid_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'success', NOW())
            """,
            (txn_id, data.tenant_id, data.pg_id, data.amount, data.payment_for, data.payment_month, data.payment_method)
        )

        receipt_code = f"RCP-{datetime.utcnow().strftime('%Y%m')}-{random.randint(1000,9999)}"
        cursor.execute(
            """
            INSERT INTO receipts (receipt_id, transaction_id, tenant_id, amount)
            VALUES (%s, %s, %s, %s)
            """,
            (receipt_code, txn_id, data.tenant_id, data.amount)
        )

        conn.commit()

        cursor.execute("SELECT pg_name FROM pgs WHERE id = %s", (data.pg_id,))
        pg = cursor.fetchone()
        pg_name = pg["pg_name"] if pg else "PG"

        return {
            "status": "success",
            "message": "Payment successful!",
            "transaction_id": txn_id,
            "receipt_id": receipt_code,
            "amount": data.amount,
            "payment_for": data.payment_for,
            "payment_month": data.payment_month,
            "payment_method": data.payment_method,
            "pg_name": pg_name,
            "paid_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/tenant/{tenant_id}/payments")
def get_tenant_payments(tenant_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT 
                p.id,
                p.transaction_id,
                p.amount,
                p.payment_for,
                p.payment_month,
                p.payment_method,
                p.status,
                p.paid_at,
                pg.pg_name,
                r.receipt_id
            FROM payments p
            JOIN pgs pg ON p.pg_id = pg.id
            LEFT JOIN receipts r ON p.transaction_id = r.transaction_id
            WHERE p.tenant_id = %s
            ORDER BY p.paid_at DESC, p.id DESC
            """,
            (tenant_id,)
        )
        payments = cursor.fetchall()
        for p in payments:
            if p["paid_at"]:
                p["paid_at"] = str(p["paid_at"])
            p["amount"] = float(p["amount"])
        return {
            "status": "success",
            "payments": payments
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/tenant/{tenant_id}/receipts")
def get_tenant_receipts(tenant_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT 
                r.id,
                r.receipt_id,
                r.transaction_id,
                r.amount,
                r.receipt_date,
                p.payment_for,
                p.payment_month,
                p.payment_method,
                pg.pg_name,
                pg.address as pg_address,
                u.name as tenant_name,
                u.user_id as tenant_code
            FROM receipts r
            JOIN payments p ON r.transaction_id = p.transaction_id
            JOIN pgs pg ON p.pg_id = pg.id
            JOIN users u ON r.tenant_id = u.id
            WHERE r.tenant_id = %s
            ORDER BY r.receipt_date DESC, r.id DESC
            """,
            (tenant_id,)
        )
        receipts = cursor.fetchall()
        for r in receipts:
            r["amount"] = float(r["amount"])
            r["receipt_date"] = str(r["receipt_date"])
        return {
            "status": "success",
            "receipts": receipts
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/receipts/{receipt_id}")
def get_single_receipt(receipt_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT 
                r.id,
                r.receipt_id,
                r.transaction_id,
                r.amount,
                r.receipt_date,
                p.payment_for,
                p.payment_month,
                p.payment_method,
                p.status as payment_status,
                pg.pg_name,
                pg.pg_id as pg_code,
                pg.address as pg_address,
                pg.city as pg_city,
                u.name as tenant_name,
                u.user_id as tenant_code,
                u.email as tenant_email,
                u.phone as tenant_phone,
                owner.name as owner_name,
                owner.phone as owner_phone
            FROM receipts r
            JOIN payments p ON r.transaction_id = p.transaction_id
            JOIN pgs pg ON p.pg_id = pg.id
            JOIN users u ON r.tenant_id = u.id
            JOIN users owner ON pg.owner_id = owner.id
            WHERE r.receipt_id = %s
            """,
            (receipt_id,)
        )
        receipt = cursor.fetchone()
        if not receipt:
            raise HTTPException(status_code=404, detail="Receipt not found")
        receipt["amount"] = float(receipt["amount"])
        receipt["receipt_date"] = str(receipt["receipt_date"])
        return {
            "status": "success",
            "receipt": receipt
        }
    finally:
        cursor.close()
        conn.close()


# =========================================
# COMPLAINTS
# =========================================

@app.post("/api/tenant/complaints")
def raise_complaint(data: ComplaintRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        t_id = data.tenant_id
        if isinstance(t_id, int) or (isinstance(t_id, str) and str(t_id).strip().isdigit()):
            cursor.execute("SELECT id FROM users WHERE id = %s", (int(t_id),))
        else:
            cursor.execute("SELECT id FROM users WHERE user_id = %s", (str(t_id).strip(),))
        tenant = cursor.fetchone()
        actual_tenant_id = tenant["id"] if tenant else (int(t_id) if str(t_id).isdigit() else 1)

        resolved_pg_id = None
        if data.pg_id:
            pg_str = str(data.pg_id).strip()
            if pg_str.isdigit():
                resolved_pg_id = int(pg_str)
            else:
                cursor.execute("SELECT id FROM pgs WHERE pg_id = %s OR pg_name = %s", (pg_str, pg_str))
                p = cursor.fetchone()
                if p:
                    resolved_pg_id = p["id"]

        if not resolved_pg_id:
            cursor.execute(
                """
                SELECT pg_id FROM tenant_pg
                WHERE tenant_id = %s AND status IN ('approved', 'active', 'pending')
                ORDER BY id DESC LIMIT 1
                """,
                (actual_tenant_id,)
            )
            tpg = cursor.fetchone()
            if tpg:
                resolved_pg_id = tpg["pg_id"]
            else:
                cursor.execute("SELECT id FROM pgs ORDER BY id ASC LIMIT 1")
                first_pg = cursor.fetchone()
                resolved_pg_id = first_pg["id"] if first_pg else 1

        sub = data.subject or data.title or f"{data.category or 'General'} Issue"
        cat = data.category or "General"
        complaint_code = f"CMP{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        cursor.execute(
            """
            INSERT INTO complaints (complaint_id, tenant_id, pg_id, subject, category, description, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'submitted')
            """,
            (complaint_code, actual_tenant_id, resolved_pg_id, sub, cat, data.description)
        )
        conn.commit()

        cursor.execute("SELECT pg_name FROM pgs WHERE id = %s", (resolved_pg_id,))
        pg_row = cursor.fetchone()
        pg_name = pg_row["pg_name"] if pg_row else "PG"

        return {
            "status": "success",
            "message": "Complaint submitted successfully",
            "complaint_id": complaint_code,
            "pg_name": pg_name
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/tenant/{tenant_id}/complaints")
def get_tenant_complaints(tenant_id: Any):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        t_id_str = str(tenant_id).strip()
        if t_id_str.isdigit():
            cursor.execute("SELECT id FROM users WHERE id = %s", (int(t_id_str),))
        else:
            cursor.execute("SELECT id FROM users WHERE user_id = %s", (t_id_str,))
        u = cursor.fetchone()
        actual_id = u["id"] if u else (int(t_id_str) if t_id_str.isdigit() else 1)

        cursor.execute(
            """
            SELECT c.*, p.pg_name
            FROM complaints c
            JOIN pgs p ON c.pg_id = p.id
            WHERE c.tenant_id = %s
            ORDER BY c.created_at DESC
            """,
            (actual_id,)
        )
        complaints = cursor.fetchall()
        for c in complaints:
            c["created_at"] = str(c["created_at"])
            c["title"] = c.get("subject") or "Complaint"
            c["category"] = c.get("category") or "General"
        return {
            "status": "success",
            "complaints": complaints
        }
    finally:
        cursor.close()
        conn.close()


# =========================================
# NOTICES
# =========================================

@app.get("/api/tenant/{tenant_id}/notices")
def get_tenant_notices(tenant_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            "SELECT pg_id FROM tenant_pg WHERE tenant_id = %s AND status IN ('active', 'approved', 'pending') LIMIT 1",
            (tenant_id,)
        )
        tpg = cursor.fetchone()
        if not tpg:
            return {"status": "success", "notices": []}

        cursor.execute(
            """
            SELECT n.*, p.pg_name, u.name as posted_by
            FROM notices n
            JOIN pgs p ON n.pg_id = p.id
            JOIN users u ON n.owner_id = u.id
            WHERE n.pg_id = %s
            ORDER BY n.created_at DESC
            """,
            (tpg["pg_id"],)
        )
        notices = cursor.fetchall()
        for n in notices:
            n["created_at"] = str(n["created_at"])
        return {
            "status": "success",
            "notices": notices
        }
    finally:
        cursor.close()
        conn.close()


# =========================================
# REVIEWS
# =========================================

@app.post("/api/tenant/reviews")
def submit_review(data: ReviewRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        t_id = data.tenant_id
        if isinstance(t_id, int) or (isinstance(t_id, str) and str(t_id).strip().isdigit()):
            cursor.execute("SELECT id FROM users WHERE id = %s", (int(t_id),))
        else:
            cursor.execute("SELECT id FROM users WHERE user_id = %s", (str(t_id).strip(),))
        tenant = cursor.fetchone()
        actual_tenant_id = tenant["id"] if tenant else (int(t_id) if str(t_id).isdigit() else 1)

        resolved_pg_id = None
        if data.pg_id:
            pg_str = str(data.pg_id).strip()
            if pg_str.isdigit():
                resolved_pg_id = int(pg_str)
            else:
                cursor.execute("SELECT id FROM pgs WHERE pg_id = %s OR pg_name = %s", (pg_str, pg_str))
                p = cursor.fetchone()
                if p:
                    resolved_pg_id = p["id"]

        if not resolved_pg_id:
            cursor.execute(
                """
                SELECT pg_id FROM tenant_pg
                WHERE tenant_id = %s AND status IN ('approved', 'active', 'pending')
                ORDER BY id DESC LIMIT 1
                """,
                (actual_tenant_id,)
            )
            tpg = cursor.fetchone()
            if tpg:
                resolved_pg_id = tpg["pg_id"]
            else:
                cursor.execute("SELECT id FROM pgs ORDER BY id ASC LIMIT 1")
                first_pg = cursor.fetchone()
                resolved_pg_id = first_pg["id"] if first_pg else 1

        cursor.execute(
            """
            INSERT INTO reviews (tenant_id, pg_id, rating, review)
            VALUES (%s, %s, %s, %s)
            """,
            (actual_tenant_id, resolved_pg_id, data.rating, data.review)
        )
        conn.commit()

        cursor.execute("SELECT pg_name FROM pgs WHERE id = %s", (resolved_pg_id,))
        pg_row = cursor.fetchone()
        pg_name = pg_row["pg_name"] if pg_row else "PG"

        return {
            "status": "success",
            "message": "Thank you! Review submitted successfully.",
            "pg_name": pg_name
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/tenant/{tenant_id}/reviews")
def get_tenant_reviews(tenant_id: Any):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        t_id_str = str(tenant_id).strip()
        if t_id_str.isdigit():
            cursor.execute("SELECT id FROM users WHERE id = %s", (int(t_id_str),))
        else:
            cursor.execute("SELECT id FROM users WHERE user_id = %s", (t_id_str,))
        u = cursor.fetchone()
        actual_id = u["id"] if u else (int(t_id_str) if t_id_str.isdigit() else 1)

        cursor.execute(
            """
            SELECT r.*, p.pg_name, u.name as tenant_name
            FROM reviews r
            JOIN pgs p ON r.pg_id = p.id
            JOIN users u ON r.tenant_id = u.id
            WHERE r.tenant_id = %s
            ORDER BY r.created_at DESC
            """,
            (actual_id,)
        )
        reviews = cursor.fetchall()
        for r in reviews:
            r["created_at"] = str(r["created_at"])
        return {
            "status": "success",
            "reviews": reviews
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/reviews")
def get_all_reviews():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT r.*, p.pg_name, u.name as tenant_name
            FROM reviews r
            JOIN pgs p ON r.pg_id = p.id
            JOIN users u ON r.tenant_id = u.id
            ORDER BY r.created_at DESC
            LIMIT 50
            """
        )
        reviews = cursor.fetchall()
        for r in reviews:
            r["created_at"] = str(r["created_at"])
        return {
            "status": "success",
            "reviews": reviews
        }
    finally:
        cursor.close()
        conn.close()


# =========================================
# TENANT PROFILE APIS
# =========================================

def resolve_tenant_user(conn, identifier):
    cursor = conn.cursor(dictionary=True)
    clean = str(identifier).strip()
    tenant = None

    if clean.isdigit():
        cursor.execute(
            "SELECT id, user_id, name, email, phone, address, created_at, role FROM users WHERE (id = %s OR phone = %s) AND role = 'tenant'",
            (int(clean), clean)
        )
        tenant = cursor.fetchone()

    if not tenant:
        cursor.execute(
            "SELECT id, user_id, name, email, phone, address, created_at, role FROM users WHERE (user_id = %s OR email = %s OR phone = %s) AND role = 'tenant'",
            (clean, clean, clean)
        )
        tenant = cursor.fetchone()

    cursor.close()
    return tenant


@app.get("/api/tenant/{tenant_identifier}/profile")
def get_tenant_profile(tenant_identifier: str):
    conn = get_db_connection()
    tenant = resolve_tenant_user(conn, tenant_identifier)
    if not tenant:
        conn.close()
        raise HTTPException(status_code=404, detail="Tenant not found. Access denied.")

    tenant["created_at"] = str(tenant["created_at"])
    conn.close()
    return {"status": "success", "profile": tenant}


@app.put("/api/tenant/{tenant_identifier}/profile")
def update_tenant_profile(tenant_identifier: str, data: dict):
    conn = get_db_connection()
    tenant = resolve_tenant_user(conn, tenant_identifier)
    if not tenant:
        conn.close()
        raise HTTPException(status_code=404, detail="Tenant not found. Access denied.")

    cursor = conn.cursor()
    try:
        name = data.get("name")
        phone = data.get("phone")
        address = data.get("address")

        cursor.execute(
            "UPDATE users SET name = COALESCE(%s, name), phone = COALESCE(%s, phone), address = COALESCE(%s, address) WHERE id = %s",
            (name, phone, address, tenant["id"])
        )
        conn.commit()

        cursor_dict = conn.cursor(dictionary=True)
        cursor_dict.execute(
            "SELECT id, user_id, name, email, phone, address, created_at, role FROM users WHERE id = %s",
            (tenant["id"],)
        )
        updated = cursor_dict.fetchone()
        if updated:
            updated["created_at"] = str(updated["created_at"])
        cursor_dict.close()

        return {
            "status": "success",
            "message": "Tenant profile updated successfully",
            "profile": updated
        }
    finally:
        cursor.close()
        conn.close()


@app.put("/api/tenant/{tenant_identifier}/change-password")
def change_tenant_password(tenant_identifier: str, data: dict):
    conn = get_db_connection()
    tenant = resolve_tenant_user(conn, tenant_identifier)
    if not tenant:
        conn.close()
        raise HTTPException(status_code=404, detail="Tenant not found. Access denied.")

    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")

    if not new_password or len(new_password) < 6:
        conn.close()
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT password FROM users WHERE id = %s", (tenant["id"],))
        pwd_row = cursor.fetchone()
        if not pwd_row or not verify_password(old_password, pwd_row["password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        hashed = hash_password(new_password)
        cursor.execute(
            "UPDATE users SET password = %s, plain_password = %s WHERE id = %s",
            (hashed, new_password, tenant["id"])
        )
        conn.commit()
        return {"status": "success", "message": "Password changed successfully"}
    finally:
        cursor.close()
        conn.close()


# =========================================
# OWNER APIS (STRICT OWNER DATA ISOLATION)
# =========================================

def resolve_owner_user(conn, identifier):
    cursor = conn.cursor(dictionary=True)
    clean = str(identifier).strip()
    owner = None

    if clean.isdigit():
        cursor.execute(
            "SELECT id, user_id, name, email, phone, address, created_at, role FROM users WHERE (id = %s OR phone = %s) AND role = 'owner'",
            (int(clean), clean)
        )
        owner = cursor.fetchone()

    if not owner:
        cursor.execute(
            "SELECT id, user_id, name, email, phone, address, created_at, role FROM users WHERE (user_id = %s OR phone = %s) AND role = 'owner'",
            (clean, clean)
        )
        owner = cursor.fetchone()

    if not owner:
        cursor.execute(
            """
            SELECT u.id, u.user_id, u.name, u.email, u.phone, u.address, u.created_at, u.role
            FROM pgs p
            JOIN users u ON p.owner_id = u.id
            WHERE p.pg_id = %s AND u.role = 'owner'
            """,
            (clean,)
        )
        owner = cursor.fetchone()

    cursor.close()
    return owner


# 1. OWNER DASHBOARD
@app.get("/api/owner/{owner_identifier}/dashboard")
def get_owner_dashboard(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        owner_id = owner["id"]

        # Total PGs
        cursor.execute("SELECT COUNT(*) as count FROM pgs WHERE owner_id = %s", (owner_id,))
        total_pgs = cursor.fetchone()["count"]

        # Total Rooms
        cursor.execute(
            """
            SELECT COUNT(*) as count
            FROM rooms r
            JOIN pgs p ON r.pg_id = p.id
            WHERE p.owner_id = %s
            """,
            (owner_id,)
        )
        total_rooms = cursor.fetchone()["count"]

        # Total, Occupied, Available Beds
        cursor.execute(
            """
            SELECT
                COUNT(b.id) as total_beds,
                SUM(CASE WHEN b.status = 'occupied' THEN 1 ELSE 0 END) as occupied_beds,
                SUM(CASE WHEN b.status = 'available' THEN 1 ELSE 0 END) as available_beds
            FROM beds b
            JOIN rooms r ON b.room_id = r.id
            JOIN pgs p ON r.pg_id = p.id
            WHERE p.owner_id = %s
            """,
            (owner_id,)
        )
        b_stats = cursor.fetchone()
        total_beds = b_stats["total_beds"] or 0
        occupied_beds = int(b_stats["occupied_beds"] or 0)
        available_beds = int(b_stats["available_beds"] or 0)

        # Total Tenants
        cursor.execute(
            """
            SELECT COUNT(DISTINCT tp.tenant_id) as count
            FROM tenant_pg tp
            JOIN pgs p ON tp.pg_id = p.id
            WHERE p.owner_id = %s AND tp.status IN ('approved', 'active')
            """,
            (owner_id,)
        )
        total_tenants = cursor.fetchone()["count"]

        # Pending Join Requests
        cursor.execute(
            """
            SELECT COUNT(*) as count
            FROM tenant_pg tp
            JOIN pgs p ON tp.pg_id = p.id
            WHERE p.owner_id = %s AND tp.status = 'pending'
            """,
            (owner_id,)
        )
        pending_requests = cursor.fetchone()["count"]

        # Pending Payments
        cursor.execute(
            """
            SELECT COUNT(*) as count
            FROM payments py
            JOIN pgs p ON py.pg_id = p.id
            WHERE p.owner_id = %s AND py.status = 'pending'
            """,
            (owner_id,)
        )
        pending_payments = cursor.fetchone()["count"]

        # Overdue Payments
        cursor.execute(
            """
            SELECT COUNT(*) as count
            FROM payments py
            JOIN pgs p ON py.pg_id = p.id
            WHERE p.owner_id = %s AND (py.status = 'overdue' OR (py.status = 'pending' AND py.due_date IS NOT NULL AND py.due_date < CURDATE()))
            """,
            (owner_id,)
        )
        overdue_payments = cursor.fetchone()["count"]

        # Open Complaints
        cursor.execute(
            """
            SELECT COUNT(*) as count
            FROM complaints c
            JOIN pgs p ON c.pg_id = p.id
            WHERE p.owner_id = %s AND c.status IN ('submitted', 'pending', 'in_progress')
            """,
            (owner_id,)
        )
        open_complaints = cursor.fetchone()["count"]

        # Recent Join Requests (LIMIT 5)
        cursor.execute(
            """
            SELECT tp.id, tp.id as request_id, tp.status, tp.created_at, tp.pg_id, u.id as tenant_id, u.name as tenant_name, u.user_id as tenant_user_id,
                   u.phone as tenant_phone, p.pg_name, p.pg_id as pg_code, p.pg_type as preferred_sharing
            FROM tenant_pg tp
            JOIN users u ON tp.tenant_id = u.id
            JOIN pgs p ON tp.pg_id = p.id
            WHERE p.owner_id = %s
            ORDER BY tp.created_at DESC LIMIT 5
            """,
            (owner_id,)
        )
        recent_requests = cursor.fetchall()
        for r in recent_requests:
            r["created_at"] = str(r["created_at"])

        # Recent Payments (LIMIT 5)
        cursor.execute(
            """
            SELECT py.id, py.transaction_id, py.amount, py.payment_for, py.payment_month, py.status, py.paid_at,
                   u.name as tenant_name, p.pg_name
            FROM payments py
            JOIN users u ON py.tenant_id = u.id
            JOIN pgs p ON py.pg_id = p.id
            WHERE p.owner_id = %s
            ORDER BY py.id DESC LIMIT 5
            """,
            (owner_id,)
        )
        recent_payments = cursor.fetchall()
        for py in recent_payments:
            py["amount"] = float(py["amount"])
            py["paid_at"] = str(py["paid_at"]) if py.get("paid_at") else ""

        # Recent Complaints (LIMIT 5)
        cursor.execute(
            """
            SELECT c.id, c.complaint_id, c.subject, c.description, c.status, c.created_at,
                   u.name as tenant_name, p.pg_name, r.room_number
            FROM complaints c
            JOIN users u ON c.tenant_id = u.id
            JOIN pgs p ON c.pg_id = p.id
            LEFT JOIN tenant_pg tp ON tp.tenant_id = u.id AND tp.pg_id = p.id AND tp.status IN ('approved', 'active')
            LEFT JOIN rooms r ON tp.room_id = r.id
            WHERE p.owner_id = %s
            ORDER BY c.created_at DESC LIMIT 5
            """,
            (owner_id,)
        )
        recent_complaints = cursor.fetchall()
        for c in recent_complaints:
            c["created_at"] = str(c["created_at"])

        return {
            "status": "success",
            "owner": {
                "id": owner["id"],
                "user_id": owner["user_id"],
                "name": owner["name"],
                "email": owner["email"],
                "phone": owner["phone"]
            },
            "stats": {
                "total_pgs": total_pgs,
                "total_rooms": total_rooms,
                "total_beds": total_beds,
                "occupied_beds": occupied_beds,
                "available_beds": available_beds,
                "total_tenants": total_tenants,
                "pending_requests": pending_requests,
                "pending_payments": pending_payments,
                "overdue_payments": overdue_payments,
                "open_complaints": open_complaints
            },
            "recent_requests": recent_requests,
            "recent_payments": recent_payments,
            "recent_complaints": recent_complaints
        }
    finally:
        cursor.close()
        conn.close()


# 2. MY PGS (LIST, CREATE, UPDATE, DELETE)
@app.get("/api/owner/{owner_identifier}/pgs")
@app.get("/api/owner/{owner_identifier}/my-pgs")
def get_owner_pgs_list(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, pg_id, owner_id, pg_name, address, city, pincode, pg_type,
                   gender_allowed, description, monthly_rent, security_deposit,
                   status, latitude, longitude, created_at
            FROM pgs
            WHERE owner_id = %s
            ORDER BY id DESC
            """,
            (owner["id"],)
        )
        pgs = cursor.fetchall()

        results = []
        for p in pgs:
            pg_db_id = p["id"]

            # Room count
            cursor.execute("SELECT COUNT(*) as count FROM rooms WHERE pg_id = %s", (pg_db_id,))
            total_rooms = cursor.fetchone()["count"]

            # Bed counts
            cursor.execute(
                """
                SELECT
                    COUNT(b.id) as total_beds,
                    SUM(CASE WHEN b.status = 'occupied' THEN 1 ELSE 0 END) as occupied_beds,
                    SUM(CASE WHEN b.status = 'available' THEN 1 ELSE 0 END) as available_beds
                FROM beds b
                JOIN rooms r ON b.room_id = r.id
                WHERE r.pg_id = %s
                """,
                (pg_db_id,)
            )
            b_stats = cursor.fetchone()
            total_beds = b_stats["total_beds"] or 0
            occupied_beds = int(b_stats["occupied_beds"] or 0)
            available_beds = int(b_stats["available_beds"] or 0)

            # Active tenants
            cursor.execute(
                "SELECT COUNT(*) as count FROM tenant_pg WHERE pg_id = %s AND status IN ('approved', 'active')",
                (pg_db_id,)
            )
            active_tenants = cursor.fetchone()["count"]

            # Pending requests
            cursor.execute(
                "SELECT COUNT(*) as count FROM tenant_pg WHERE pg_id = %s AND status = 'pending'",
                (pg_db_id,)
            )
            pending_requests = cursor.fetchone()["count"]

            results.append({
                "db_id": p["id"],
                "pg_id": p["pg_id"],
                "pg_name": p["pg_name"],
                "address": p["address"],
                "city": p.get("city") or "Jamshedpur",
                "pincode": p.get("pincode") or "831001",
                "pg_type": p.get("pg_type") or "Single / Double Sharing",
                "gender_allowed": p.get("gender_allowed") or "All",
                "monthly_rent": float(p["monthly_rent"]) if p.get("monthly_rent") is not None else 0.0,
                "security_deposit": float(p["security_deposit"]) if p.get("security_deposit") is not None else 0.0,
                "status": p.get("status") or "approved",
                "description": p.get("description") or "",
                "latitude": float(p["latitude"]) if p.get("latitude") is not None else 22.8046,
                "longitude": float(p["longitude"]) if p.get("longitude") is not None else 86.2029,
                "total_rooms": total_rooms,
                "total_beds": total_beds,
                "occupied_beds": occupied_beds,
                "available_beds": available_beds,
                "active_tenants": active_tenants,
                "pending_requests": pending_requests,
                "created_at": str(p["created_at"]) if p.get("created_at") else ""
            })

        return {
            "status": "success",
            "owner": {
                "id": owner["id"],
                "user_id": owner["user_id"],
                "name": owner["name"]
            },
            "total_pgs": len(results),
            "pgs": results
        }
    finally:
        cursor.close()
        conn.close()


@app.post("/api/owner/{owner_identifier}/pgs")
def create_owner_pg(owner_identifier: str, data: dict):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    pg_name = data.get("pg_name", "").strip()
    if not pg_name:
        conn.close()
        raise HTTPException(status_code=400, detail="PG Name is required.")

    cursor = conn.cursor(dictionary=True)
    try:
        new_pg_id = generate_pg_id()
        address = data.get("address", "").strip() or "Sakchi, Jamshedpur"
        city = data.get("city", "Jamshedpur").strip()
        pincode = data.get("pincode", "831001").strip()
        pg_type = data.get("pg_type", "Single / Double Sharing").strip()
        gender_allowed = data.get("gender_allowed", "All").strip()
        monthly_rent = float(data.get("monthly_rent", 7500.0))
        security_deposit = float(data.get("security_deposit", monthly_rent))
        description = data.get("description", f"{pg_name} located in {city}.").strip()
        lat = float(data.get("latitude", 22.8046))
        lng = float(data.get("longitude", 86.2029))

        cursor.execute(
            """
            INSERT INTO pgs (pg_id, owner_id, pg_name, address, city, pincode, pg_type,
                            gender_allowed, description, monthly_rent, security_deposit,
                            status, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'approved', %s, %s)
            """,
            (
                new_pg_id, owner["id"], pg_name, address, city, pincode,
                pg_type, gender_allowed, description, monthly_rent,
                security_deposit, lat, lng
            )
        )
        pg_db_id = cursor.lastrowid

        # Auto-create Room 101 and Room 102
        cursor.execute(
            "INSERT INTO rooms (room_id, pg_id, room_number, room_type, rent) VALUES (%s, %s, %s, %s, %s)",
            (f"{new_pg_id}-R101", pg_db_id, "101", "Single Room", monthly_rent)
        )
        r1_id = cursor.lastrowid
        cursor.execute(
            "INSERT INTO beds (bed_id, room_id, bed_number, status) VALUES (%s, %s, %s, 'available')",
            (f"{new_pg_id}-R101-B1", r1_id, "Bed 1")
        )

        cursor.execute(
            "INSERT INTO rooms (room_id, pg_id, room_number, room_type, rent) VALUES (%s, %s, %s, %s, %s)",
            (f"{new_pg_id}-R102", pg_db_id, "102", "Double Sharing", round(monthly_rent * 0.85, 2))
        )
        r2_id = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO beds (bed_id, room_id, bed_number, status)
            VALUES (%s, %s, %s, 'available'), (%s, %s, %s, 'available')
            """,
            (f"{new_pg_id}-R102-BA", r2_id, "Bed A", f"{new_pg_id}-R102-BB", r2_id, "Bed B")
        )

        conn.commit()

        return {
            "status": "success",
            "message": f"PG '{pg_name}' ({new_pg_id}) added successfully!",
            "pg_id": new_pg_id,
            "pg_db_id": pg_db_id
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/owner/pgs/{pg_id}")
def get_owner_pg_detail(pg_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if pg_id.isdigit():
            cursor.execute("SELECT * FROM pgs WHERE id = %s", (int(pg_id),))
        else:
            cursor.execute("SELECT * FROM pgs WHERE pg_id = %s", (pg_id,))
        pg = cursor.fetchone()
        if not pg:
            raise HTTPException(status_code=404, detail="PG not found")

        pg["monthly_rent"] = float(pg["monthly_rent"]) if pg.get("monthly_rent") else 0.0
        pg["security_deposit"] = float(pg["security_deposit"]) if pg.get("security_deposit") else 0.0
        pg["latitude"] = float(pg["latitude"]) if pg.get("latitude") else 22.8046
        pg["longitude"] = float(pg["longitude"]) if pg.get("longitude") else 86.2029
        pg["created_at"] = str(pg["created_at"]) if pg.get("created_at") else ""
        return {"status": "success", "pg": pg}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/pgs/{pg_id}")
def update_owner_pg(pg_id: str, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if pg_id.isdigit():
            cursor.execute("SELECT id FROM pgs WHERE id = %s", (int(pg_id),))
        else:
            cursor.execute("SELECT id FROM pgs WHERE pg_id = %s", (pg_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="PG not found")

        db_id = existing["id"]

        fields = []
        vals = []
        for key in ["pg_name", "address", "city", "pincode", "pg_type", "gender_allowed", "description", "status"]:
            if key in data and data[key] is not None:
                fields.append(f"{key} = %s")
                vals.append(str(data[key]).strip())

        for key in ["monthly_rent", "security_deposit", "latitude", "longitude"]:
            if key in data and data[key] is not None:
                fields.append(f"{key} = %s")
                vals.append(float(data[key]))

        if fields:
            vals.append(db_id)
            query = f"UPDATE pgs SET {', '.join(fields)} WHERE id = %s"
            cursor.execute(query, tuple(vals))
            conn.commit()

        return {"status": "success", "message": "PG details updated successfully"}
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/owner/pgs/{pg_id}")
def delete_owner_pg(pg_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if pg_id.isdigit():
            cursor.execute("SELECT id FROM pgs WHERE id = %s", (int(pg_id),))
        else:
            cursor.execute("SELECT id FROM pgs WHERE pg_id = %s", (pg_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="PG not found")

        db_id = existing["id"]
        # Set status to rejected
        cursor.execute("UPDATE pgs SET status = 'rejected' WHERE id = %s", (db_id,))
        conn.commit()
        return {"status": "success", "message": "PG deactivated successfully"}
    finally:
        cursor.close()
        conn.close()


# 3. ROOMS & BEDS
@app.get("/api/owner/{owner_identifier}/rooms-beds")
def get_owner_rooms_and_beds(owner_identifier: str, pg_id: Optional[str] = None):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        owner_id = owner["id"]

        # Base rooms query filtered strictly by owner
        if pg_id and pg_id != "all":
            if pg_id.isdigit():
                cursor.execute(
                    """
                    SELECT r.id as room_db_id, r.room_id, r.room_number, r.room_type, r.rent,
                           p.id as pg_db_id, p.pg_id as pg_code, p.pg_name
                    FROM rooms r
                    JOIN pgs p ON r.pg_id = p.id
                    WHERE p.owner_id = %s AND (p.id = %s OR p.pg_id = %s)
                    ORDER BY p.id ASC, r.room_number ASC
                    """,
                    (owner_id, int(pg_id), pg_id)
                )
            else:
                cursor.execute(
                    """
                    SELECT r.id as room_db_id, r.room_id, r.room_number, r.room_type, r.rent,
                           p.id as pg_db_id, p.pg_id as pg_code, p.pg_name
                    FROM rooms r
                    JOIN pgs p ON r.pg_id = p.id
                    WHERE p.owner_id = %s AND p.pg_id = %s
                    ORDER BY p.id ASC, r.room_number ASC
                    """,
                    (owner_id, pg_id)
                )
        else:
            cursor.execute(
                """
                SELECT r.id as room_db_id, r.room_id, r.room_number, r.room_type, r.rent,
                       p.id as pg_db_id, p.pg_id as pg_code, p.pg_name
                FROM rooms r
                JOIN pgs p ON r.pg_id = p.id
                WHERE p.owner_id = %s
                ORDER BY p.id ASC, r.room_number ASC
                """,
                (owner_id,)
            )

        rooms = cursor.fetchall()
        results = []

        for rm in rooms:
            room_db_id = rm["room_db_id"]
            # Fetch beds in this room with tenant assignment
            cursor.execute(
                """
                SELECT b.id as bed_db_id, b.bed_id, b.bed_number, b.status as bed_status,
                       u.id as tenant_id, u.user_id as tenant_user_id, u.name as occupied_by_name, u.phone as occupied_by_phone
                FROM beds b
                LEFT JOIN tenant_pg tp ON tp.bed_id = b.id AND tp.status IN ('approved', 'active')
                LEFT JOIN users u ON tp.tenant_id = u.id
                WHERE b.room_id = %s
                ORDER BY b.bed_number ASC
                """,
                (room_db_id,)
            )
            beds = cursor.fetchall()

            total_beds = len(beds)
            occupied_beds = sum(1 for b in beds if b["bed_status"] == "occupied")
            available_beds = total_beds - occupied_beds

            results.append({
                "room_db_id": rm["room_db_id"],
                "room_id": rm["room_id"],
                "room_number": rm["room_number"],
                "room_type": rm["room_type"],
                "rent": float(rm["rent"]) if rm.get("rent") else 0.0,
                "pg_db_id": rm["pg_db_id"],
                "pg_code": rm["pg_code"],
                "pg_name": rm["pg_name"],
                "total_beds": total_beds,
                "occupied_beds": occupied_beds,
                "available_beds": available_beds,
                "beds": beds
            })

        return {
            "status": "success",
            "total_rooms": len(results),
            "rooms": results
        }
    finally:
        cursor.close()
        conn.close()


@app.post("/api/owner/rooms")
def add_owner_room(data: dict):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        pg_id = int(data.get("pg_id"))
        room_number = str(data.get("room_number", "")).strip()
        room_type = data.get("room_type", "Single Room").strip()
        rent = float(data.get("rent", 7500.0))
        bed_count = int(data.get("bed_count", 1))

        if not room_number:
            raise HTTPException(status_code=400, detail="Room number is required")

        cursor.execute("SELECT pg_id FROM pgs WHERE id = %s", (pg_id,))
        pg = cursor.fetchone()
        if not pg:
            raise HTTPException(status_code=404, detail="PG not found")

        pg_code = pg["pg_id"]
        room_code = f"{pg_code}-R{room_number}"

        cursor.execute(
            "INSERT INTO rooms (room_id, pg_id, room_number, room_type, rent) VALUES (%s, %s, %s, %s, %s)",
            (room_code, pg_id, room_number, room_type, rent)
        )
        room_db_id = cursor.lastrowid

        # Create beds
        bed_letters = ["A", "B", "C", "D", "E", "F"]
        for i in range(bed_count):
            label = f"Bed {bed_letters[i]}" if bed_count > 1 else "Bed 1"
            bed_code = f"{room_code}-B{bed_letters[i] if bed_count > 1 else '1'}"
            cursor.execute(
                "INSERT INTO beds (bed_id, room_id, bed_number, status) VALUES (%s, %s, %s, 'available')",
                (bed_code, room_db_id, label)
            )

        conn.commit()
        return {"status": "success", "message": f"Room {room_number} added with {bed_count} beds!"}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/rooms/{room_id}")
def update_owner_room(room_id: int, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        room_number = data.get("room_number")
        room_type = data.get("room_type")
        rent = data.get("rent")

        cursor.execute(
            "UPDATE rooms SET room_number = COALESCE(%s, room_number), room_type = COALESCE(%s, room_type), rent = COALESCE(%s, rent) WHERE id = %s",
            (room_number, room_type, rent, room_id)
        )
        conn.commit()
        return {"status": "success", "message": "Room updated successfully"}
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/owner/rooms/{room_id}")
def delete_owner_room(room_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM beds WHERE room_id = %s", (room_id,))
        cursor.execute("DELETE FROM rooms WHERE id = %s", (room_id,))
        conn.commit()
        return {"status": "success", "message": "Room and its beds deleted successfully"}
    finally:
        cursor.close()
        conn.close()


@app.post("/api/owner/beds")
def add_owner_bed(data: dict):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        room_id = int(data.get("room_id"))
        bed_number = str(data.get("bed_number", "")).strip()
        status = data.get("status", "available")

        if not bed_number:
            raise HTTPException(status_code=400, detail="Bed number is required")

        cursor.execute("SELECT room_id FROM rooms WHERE id = %s", (room_id,))
        room = cursor.fetchone()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")

        bed_code = f"{room['room_id']}-B{bed_number.replace(' ', '')}"
        cursor.execute(
            "INSERT INTO beds (bed_id, room_id, bed_number, status) VALUES (%s, %s, %s, %s)",
            (bed_code, room_id, bed_number, status)
        )
        conn.commit()
        return {"status": "success", "message": f"{bed_number} added successfully"}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/beds/{bed_id}")
def update_owner_bed(bed_id: int, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        bed_number = data.get("bed_number")
        status = data.get("status")
        cursor.execute(
            "UPDATE beds SET bed_number = COALESCE(%s, bed_number), status = COALESCE(%s, status) WHERE id = %s",
            (bed_number, status, bed_id)
        )
        conn.commit()
        return {"status": "success", "message": "Bed updated successfully"}
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/owner/beds/{bed_id}")
def delete_owner_bed(bed_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM beds WHERE id = %s", (bed_id,))
        conn.commit()
        return {"status": "success", "message": "Bed removed"}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/beds/{bed_id}/status")
def toggle_bed_status(bed_id: int, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        new_status = data.get("status", "available")
        cursor.execute("UPDATE beds SET status = %s WHERE id = %s", (new_status, bed_id))
        conn.commit()
        return {"status": "success", "message": f"Bed status set to {new_status}"}
    finally:
        cursor.close()
        conn.close()


# 4. JOIN REQUESTS (LIST, APPROVE, REJECT)
@app.get("/api/owner/{owner_identifier}/tenant-requests")
def get_owner_join_requests(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                tp.id AS request_id,
                tp.status,
                tp.created_at,
                tp.room_id,
                tp.bed_id,
                u.id AS tenant_id,
                u.user_id AS tenant_user_id,
                u.name AS tenant_name,
                u.email AS tenant_email,
                u.phone AS tenant_phone,
                p.id AS pg_id,
                p.pg_id AS pg_code,
                p.pg_name,
                p.pg_type AS preferred_sharing,
                p.address
            FROM tenant_pg tp
            JOIN users u ON tp.tenant_id = u.id
            JOIN pgs p ON tp.pg_id = p.id
            WHERE p.owner_id = %s
            ORDER BY tp.created_at DESC
            """,
            (owner["id"],)
        )
        requests = cursor.fetchall()
        for r in requests:
            r["created_at"] = str(r["created_at"])
        return {"status": "success", "requests": requests}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/tenant-requests/{request_id}")
def process_tenant_request(request_id: int, data: dict = None, status: str = None):
    # Support status from query or body
    target_status = status
    room_id = None
    bed_id = None
    if data:
        target_status = data.get("status", target_status)
        room_id = data.get("room_id")
        bed_id = data.get("bed_id")

    if target_status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, status, tenant_id, pg_id, room_id, bed_id FROM tenant_pg WHERE id = %s", (request_id,))
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")

        if req["status"] != "pending":
            raise HTTPException(status_code=400, detail=f"This request has already been processed (Current status: {req['status']})")

        if target_status == "approved":
            allocated_room = room_id or req.get("room_id")
            allocated_bed = bed_id or req.get("bed_id")

            # If no bed chosen, auto-select first available bed
            if not allocated_bed:
                cursor.execute(
                    """
                    SELECT b.id as bed_id, r.id as room_id
                    FROM beds b
                    JOIN rooms r ON b.room_id = r.id
                    WHERE r.pg_id = %s AND b.status = 'available'
                    LIMIT 1
                    """,
                    (req["pg_id"],)
                )
                avail = cursor.fetchone()
                if avail:
                    allocated_bed = avail["bed_id"]
                    allocated_room = avail["room_id"]

            # Free any previous allocations for this tenant
            cursor.execute(
                "SELECT bed_id FROM tenant_pg WHERE tenant_id = %s AND id != %s AND status IN ('approved', 'active')",
                (req["tenant_id"], request_id)
            )
            old_allocs = cursor.fetchall()
            for oa in old_allocs:
                if oa.get("bed_id") and oa["bed_id"] != allocated_bed:
                    cursor.execute("UPDATE beds SET status = 'available' WHERE id = %s", (oa["bed_id"],))

            cursor.execute(
                "UPDATE tenant_pg SET status = 'left' WHERE tenant_id = %s AND id != %s AND status IN ('approved', 'active')",
                (req["tenant_id"], request_id)
            )

            if allocated_bed:
                cursor.execute("UPDATE beds SET status = 'occupied' WHERE id = %s", (allocated_bed,))

            cursor.execute(
                "UPDATE tenant_pg SET status = 'approved', room_id = %s, bed_id = %s WHERE id = %s",
                (allocated_room, allocated_bed, request_id)
            )

            # Sync bookings table
            booking_code = f"BK-{random.randint(100000, 999999)}"
            cursor.execute(
                """
                INSERT INTO bookings (booking_id, tenant_id, pg_id, room_id, bed_id, status)
                VALUES (%s, %s, %s, %s, %s, 'approved')
                """,
                (booking_code, req["tenant_id"], req["pg_id"], allocated_room, allocated_bed)
            )

        else:
            cursor.execute("UPDATE tenant_pg SET status = 'rejected' WHERE id = %s", (request_id,))

        conn.commit()
        return {"status": "success", "message": f"Join request {target_status} successfully!"}
    finally:
        cursor.close()
        conn.close()


# 5. TENANTS
@app.get("/api/owner/{owner_identifier}/tenants")
def get_owner_tenants_list(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                u.id as tenant_id,
                u.user_id as tenant_user_id,
                u.name as tenant_name,
                u.phone as tenant_phone,
                u.email as tenant_email,
                u.address as tenant_address,
                p.id as pg_db_id,
                p.pg_id as pg_code,
                p.pg_name,
                p.monthly_rent,
                r.room_number,
                r.room_type,
                b.bed_number,
                tp.move_in_date,
                tp.created_at as joined_at,
                tp.status as occupancy_status,
                (SELECT status FROM payments WHERE tenant_id = u.id AND pg_id = p.id ORDER BY id DESC LIMIT 1) as latest_payment_status
            FROM tenant_pg tp
            JOIN users u ON tp.tenant_id = u.id
            JOIN pgs p ON tp.pg_id = p.id
            LEFT JOIN rooms r ON tp.room_id = r.id
            LEFT JOIN beds b ON tp.bed_id = b.id
            WHERE p.owner_id = %s AND tp.status IN ('approved', 'active')
            ORDER BY tp.id DESC
            """,
            (owner["id"],)
        )
        tenants = cursor.fetchall()
        for t in tenants:
            t["monthly_rent"] = float(t["monthly_rent"]) if t.get("monthly_rent") else 0.0
            t["joining_date"] = str(t.get("move_in_date") or t.get("joined_at") or "")
            t["payment_status"] = t.get("latest_payment_status") or "pending"
        return {"status": "success", "total_tenants": len(tenants), "tenants": tenants}
    finally:
        cursor.close()
        conn.close()


@app.get("/api/owner/tenants/{tenant_id}/details")
def get_owner_tenant_full_details(tenant_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, user_id, name, email, phone, age, gender, address, created_at FROM users WHERE id = %s", (tenant_id,))
        tenant = cursor.fetchone()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        tenant["created_at"] = str(tenant["created_at"])

        # Current PG allocation
        cursor.execute(
            """
            SELECT p.pg_name, p.address as pg_address, p.monthly_rent, r.room_number, r.room_type, b.bed_number, tp.status, tp.move_in_date
            FROM tenant_pg tp
            JOIN pgs p ON tp.pg_id = p.id
            LEFT JOIN rooms r ON tp.room_id = r.id
            LEFT JOIN beds b ON tp.bed_id = b.id
            WHERE tp.tenant_id = %s AND tp.status IN ('approved', 'active')
            LIMIT 1
            """,
            (tenant_id,)
        )
        allocation = cursor.fetchone()
        if allocation and allocation.get("monthly_rent"):
            allocation["monthly_rent"] = float(allocation["monthly_rent"])

        # Payments history
        cursor.execute("SELECT id, transaction_id, amount, payment_for, payment_month, payment_method, status, paid_at FROM payments WHERE tenant_id = %s ORDER BY id DESC", (tenant_id,))
        payments = cursor.fetchall()
        for py in payments:
            py["amount"] = float(py["amount"])
            py["paid_at"] = str(py["paid_at"]) if py.get("paid_at") else ""

        # Complaints history
        cursor.execute("SELECT id, complaint_id, subject, description, status, created_at FROM complaints WHERE tenant_id = %s ORDER BY id DESC", (tenant_id,))
        complaints = cursor.fetchall()
        for c in complaints:
            c["created_at"] = str(c["created_at"])

        return {
            "status": "success",
            "tenant": tenant,
            "allocation": allocation,
            "payments": payments,
            "complaints": complaints
        }
    finally:
        cursor.close()
        conn.close()


# 6. BOOKINGS
@app.get("/api/owner/{owner_identifier}/bookings")
def get_owner_bookings_list(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                b.id,
                b.booking_id,
                b.status,
                b.booking_date,
                u.id as tenant_id,
                u.user_id as tenant_user_id,
                u.name as tenant_name,
                u.phone as tenant_phone,
                p.pg_name,
                p.pg_id as pg_code,
                p.monthly_rent as rent,
                p.security_deposit,
                r.room_number,
                bd.bed_number
            FROM bookings b
            JOIN users u ON b.tenant_id = u.id
            JOIN pgs p ON b.pg_id = p.id
            LEFT JOIN rooms r ON b.room_id = r.id
            LEFT JOIN beds bd ON b.bed_id = bd.id
            WHERE p.owner_id = %s
            ORDER BY b.booking_date DESC
            """,
            (owner["id"],)
        )
        bookings = cursor.fetchall()
        for bk in bookings:
            bk["rent"] = float(bk["rent"]) if bk.get("rent") else 0.0
            bk["security_deposit"] = float(bk["security_deposit"]) if bk.get("security_deposit") else 0.0
            bk["booking_date"] = str(bk["booking_date"])
        return {"status": "success", "bookings": bookings}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/bookings/{booking_id}/status")
def update_booking_status(booking_id: str, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        new_status = data.get("status", "approved")
        cursor.execute("UPDATE bookings SET status = %s WHERE booking_id = %s OR id = %s", (new_status, booking_id, booking_id if booking_id.isdigit() else 0))
        conn.commit()
        return {"status": "success", "message": f"Booking status updated to {new_status}"}
    finally:
        cursor.close()
        conn.close()


# 7. PAYMENTS
@app.get("/api/owner/{owner_identifier}/payments")
def get_owner_payments_list(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        owner_id = owner["id"]

        # Summary stats
        cursor.execute(
            """
            SELECT
                SUM(CASE WHEN py.status IN ('success', 'paid') THEN py.amount ELSE 0 END) as total_collected,
                SUM(CASE WHEN py.status = 'pending' THEN py.amount ELSE 0 END) as pending_amount,
                SUM(CASE WHEN py.status = 'overdue' THEN py.amount ELSE 0 END) as overdue_amount,
                SUM(CASE WHEN py.status IN ('success', 'paid') AND MONTH(py.paid_at) = MONTH(CURRENT_DATE()) AND YEAR(py.paid_at) = YEAR(CURRENT_DATE()) THEN py.amount ELSE 0 END) as current_month_collection
            FROM payments py
            JOIN pgs p ON py.pg_id = p.id
            WHERE p.owner_id = %s
            """,
            (owner_id,)
        )
        stats = cursor.fetchone()

        cursor.execute(
            """
            SELECT
                py.id,
                py.transaction_id,
                py.amount,
                py.payment_for,
                py.payment_month,
                py.payment_method,
                py.status,
                py.due_date,
                py.paid_at,
                u.name as tenant_name,
                u.user_id as tenant_user_id,
                p.pg_name,
                p.pg_id as pg_code
            FROM payments py
            JOIN users u ON py.tenant_id = u.id
            JOIN pgs p ON py.pg_id = p.id
            WHERE p.owner_id = %s
            ORDER BY py.id DESC
            """,
            (owner_id,)
        )
        payments = cursor.fetchall()
        for py in payments:
            py["amount"] = float(py["amount"])
            py["due_date"] = str(py["due_date"]) if py.get("due_date") else ""
            py["paid_at"] = str(py["paid_at"]) if py.get("paid_at") else ""

        return {
            "status": "success",
            "stats": {
                "total_collected": float(stats["total_collected"] or 0),
                "pending_amount": float(stats["pending_amount"] or 0),
                "overdue_amount": float(stats["overdue_amount"] or 0),
                "current_month_collection": float(stats["current_month_collection"] or 0)
            },
            "payments": payments
        }
    finally:
        cursor.close()
        conn.close()


@app.post("/api/owner/payments")
def record_owner_payment(data: dict):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        tenant_id = int(data.get("tenant_id"))
        pg_id = int(data.get("pg_id"))
        amount = float(data.get("amount", 7500.0))
        payment_for = data.get("payment_for", "Monthly Rent")
        payment_month = data.get("payment_month", datetime.now().strftime("%B %Y"))
        payment_method = data.get("payment_method", "Cash")
        status = data.get("status", "success")
        tx_id = f"TXN-{random.randint(100000, 999999)}"

        cursor.execute(
            """
            INSERT INTO payments (transaction_id, tenant_id, pg_id, amount, payment_for, payment_month, payment_method, status, paid_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """,
            (tx_id, tenant_id, pg_id, amount, payment_for, payment_month, payment_method, status)
        )
        py_id = cursor.lastrowid

        if status in ["success", "paid"]:
            receipt_code = f"REC-{random.randint(100000, 999999)}"
            cursor.execute(
                "INSERT INTO receipts (receipt_id, transaction_id, tenant_id, amount) VALUES (%s, %s, %s, %s)",
                (receipt_code, tx_id, tenant_id, amount)
            )

        conn.commit()
        return {"status": "success", "message": "Payment recorded successfully", "transaction_id": tx_id}
    finally:
        cursor.close()
        conn.close()


# 8. RECEIPTS
@app.get("/api/owner/{owner_identifier}/receipts")
def get_owner_receipts_list(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                r.id,
                r.receipt_id,
                r.transaction_id,
                r.amount,
                r.receipt_date,
                u.name as tenant_name,
                u.user_id as tenant_user_id,
                p.pg_name,
                p.pg_id as pg_code,
                rm.room_number,
                b.bed_number,
                py.payment_for,
                py.payment_method,
                py.status as payment_status
            FROM receipts r
            JOIN payments py ON r.transaction_id = py.transaction_id
            JOIN users u ON r.tenant_id = u.id
            JOIN pgs p ON py.pg_id = p.id
            LEFT JOIN tenant_pg tp ON tp.tenant_id = u.id AND tp.pg_id = p.id AND tp.status IN ('approved', 'active')
            LEFT JOIN rooms rm ON tp.room_id = rm.id
            LEFT JOIN beds b ON tp.bed_id = b.id
            WHERE p.owner_id = %s
            ORDER BY r.receipt_date DESC
            """,
            (owner["id"],)
        )
        receipts = cursor.fetchall()
        for rc in receipts:
            rc["amount"] = float(rc["amount"])
            rc["receipt_date"] = str(rc["receipt_date"])
        return {"status": "success", "receipts": receipts}
    finally:
        cursor.close()
        conn.close()


@app.get("/api/owner/receipts/{receipt_id}")
def get_owner_single_receipt(receipt_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                r.receipt_id,
                r.transaction_id,
                r.amount,
                r.receipt_date,
                u.name as tenant_name,
                u.user_id as tenant_user_id,
                u.phone as tenant_phone,
                u.email as tenant_email,
                p.pg_name,
                p.address as pg_address,
                rm.room_number,
                b.bed_number,
                py.payment_for,
                py.payment_month,
                py.payment_method,
                py.status as payment_status
            FROM receipts r
            JOIN payments py ON r.transaction_id = py.transaction_id
            JOIN users u ON r.tenant_id = u.id
            JOIN pgs p ON py.pg_id = p.id
            LEFT JOIN tenant_pg tp ON tp.tenant_id = u.id AND tp.pg_id = p.id AND tp.status IN ('approved', 'active')
            LEFT JOIN rooms rm ON tp.room_id = rm.id
            LEFT JOIN beds b ON tp.bed_id = b.id
            WHERE r.receipt_id = %s OR r.id = %s
            LIMIT 1
            """,
            (receipt_id, int(receipt_id) if receipt_id.isdigit() else 0)
        )
        rc = cursor.fetchone()
        if not rc:
            raise HTTPException(status_code=404, detail="Receipt not found")
        rc["amount"] = float(rc["amount"])
        rc["receipt_date"] = str(rc["receipt_date"])
        return {"status": "success", "receipt": rc}
    finally:
        cursor.close()
        conn.close()


# 9. NOTICES
@app.get("/api/owner/{owner_identifier}/notices")
def get_owner_notices_list(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT n.id, n.title, n.message, n.priority, n.created_at, p.id as pg_id, p.pg_name, p.pg_id as pg_code
            FROM notices n
            JOIN pgs p ON n.pg_id = p.id
            WHERE n.owner_id = %s
            ORDER BY n.created_at DESC
            """,
            (owner["id"],)
        )
        notices = cursor.fetchall()
        for n in notices:
            n["created_at"] = str(n["created_at"])
            n["priority"] = n.get("priority") or "Normal"
        return {"status": "success", "notices": notices}
    finally:
        cursor.close()
        conn.close()


@app.post("/api/owner/notices")
def create_owner_notice(data: dict):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        owner_id = int(data.get("owner_id"))
        pg_id = int(data.get("pg_id"))
        title = data.get("title", "").strip()
        message = data.get("message", "").strip()
        priority = data.get("priority", "Normal").strip()

        if not title or not message:
            raise HTTPException(status_code=400, detail="Title and Message are required")

        cursor.execute(
            "INSERT INTO notices (pg_id, owner_id, title, message, priority, created_at) VALUES (%s, %s, %s, %s, %s, NOW())",
            (pg_id, owner_id, title, message, priority)
        )
        conn.commit()
        return {"status": "success", "message": "Notice posted successfully! Tenants of this PG will now see it."}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/notices/{notice_id}")
def update_owner_notice(notice_id: int, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        title = data.get("title")
        message = data.get("message")
        priority = data.get("priority")
        pg_id = data.get("pg_id")

        cursor.execute(
            """
            UPDATE notices
            SET title = COALESCE(%s, title),
                message = COALESCE(%s, message),
                priority = COALESCE(%s, priority),
                pg_id = COALESCE(%s, pg_id)
            WHERE id = %s
            """,
            (title, message, priority, pg_id, notice_id)
        )
        conn.commit()
        return {"status": "success", "message": "Notice updated successfully"}
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/owner/notices/{notice_id}")
def delete_owner_notice(notice_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM notices WHERE id = %s", (notice_id,))
        conn.commit()
        return {"status": "success", "message": "Notice deleted"}
    finally:
        cursor.close()
        conn.close()


# 10. COMPLAINTS
@app.get("/api/owner/{owner_identifier}/complaints")
def get_owner_complaints_list(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                c.id,
                c.complaint_id,
                c.subject,
                c.description,
                c.status,
                c.created_at,
                u.id as tenant_id,
                u.user_id as tenant_user_id,
                u.name as tenant_name,
                u.phone as tenant_phone,
                p.pg_name,
                r.room_number
            FROM complaints c
            JOIN users u ON c.tenant_id = u.id
            JOIN pgs p ON c.pg_id = p.id
            LEFT JOIN tenant_pg tp ON tp.tenant_id = u.id AND tp.pg_id = p.id AND tp.status IN ('approved', 'active')
            LEFT JOIN rooms r ON tp.room_id = r.id
            WHERE p.owner_id = %s
            ORDER BY c.created_at DESC
            """,
            (owner["id"],)
        )
        complaints = cursor.fetchall()
        for c in complaints:
            c["created_at"] = str(c["created_at"])
        return {"status": "success", "complaints": complaints}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/complaints/{complaint_id}/status")
def update_owner_complaint_status(complaint_id: str, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        new_status = data.get("status", "in_progress")
        if new_status not in ["submitted", "pending", "in_progress", "resolved"]:
            raise HTTPException(status_code=400, detail="Invalid status value")

        cursor.execute(
            "UPDATE complaints SET status = %s WHERE complaint_id = %s OR id = %s",
            (new_status, complaint_id, int(complaint_id) if complaint_id.isdigit() else 0)
        )
        conn.commit()
        return {"status": "success", "message": f"Complaint status updated to {new_status}"}
    finally:
        cursor.close()
        conn.close()


# 11. REVIEWS
@app.get("/api/owner/{owner_identifier}/reviews")
def get_owner_reviews_list(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                rv.id,
                rv.rating,
                rv.review,
                rv.created_at,
                u.name as tenant_name,
                u.user_id as tenant_user_id,
                p.pg_name,
                p.pg_id as pg_code
            FROM reviews rv
            JOIN users u ON rv.tenant_id = u.id
            JOIN pgs p ON rv.pg_id = p.id
            WHERE p.owner_id = %s
            ORDER BY rv.created_at DESC
            """,
            (owner["id"],)
        )
        reviews = cursor.fetchall()

        total_rating = 0
        for r in reviews:
            r["created_at"] = str(r["created_at"])
            total_rating += (r.get("rating") or 0)

        avg_rating = round(total_rating / len(reviews), 1) if reviews else 0.0

        return {
            "status": "success",
            "total_reviews": len(reviews),
            "average_rating": avg_rating,
            "reviews": reviews
        }
    finally:
        cursor.close()
        conn.close()


# 12. PROFILE
@app.get("/api/owner/{owner_identifier}/profile")
def get_owner_profile(owner_identifier: str):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, user_id, name, email, phone, address, created_at, role FROM users WHERE id = %s",
            (owner["id"],)
        )
        user = cursor.fetchone()
        user["created_at"] = str(user["created_at"])
        return {"status": "success", "profile": user}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/{owner_identifier}/profile")
def update_owner_profile(owner_identifier: str, data: dict):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    cursor = conn.cursor()
    try:
        name = data.get("name")
        phone = data.get("phone")
        address = data.get("address")
        cursor.execute(
            "UPDATE users SET name = COALESCE(%s, name), phone = COALESCE(%s, phone), address = COALESCE(%s, address) WHERE id = %s",
            (name, phone, address, owner["id"])
        )
        conn.commit()
        return {"status": "success", "message": "Profile updated successfully"}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/owner/{owner_identifier}/change-password")
def change_owner_password(owner_identifier: str, data: dict):
    conn = get_db_connection()
    owner = resolve_owner_user(conn, owner_identifier)
    if not owner:
        conn.close()
        raise HTTPException(status_code=404, detail="Owner not found. Access denied.")

    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")

    if not new_password or len(new_password) < 6:
        conn.close()
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT password FROM users WHERE id = %s", (owner["id"],))
        pwd_row = cursor.fetchone()
        if not pwd_row or not verify_password(old_password, pwd_row["password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        hashed = hash_password(new_password)
        cursor.execute("UPDATE users SET password = %s, plain_password = %s WHERE id = %s", (hashed, new_password, owner["id"]))
        conn.commit()
        return {"status": "success", "message": "Password changed successfully"}
    finally:
        cursor.close()
        conn.close()




# =============================================================================
# ADMIN PANEL APIS (Platform-Wide Administration, Lists & Analytics Reports)
# =============================================================================

def resolve_admin_user(conn, identifier: str = None):
    cursor = conn.cursor(dictionary=True)
    if identifier:
        clean = str(identifier).strip()
        cursor.execute(
            "SELECT id, user_id, name, email, phone, address, created_at, role FROM users WHERE (id = %s OR user_id = %s OR email = %s) AND role = 'admin'",
            (int(clean) if clean.isdigit() else 0, clean, clean)
        )
        admin = cursor.fetchone()
        cursor.close()
        return admin
    else:
        cursor.execute("SELECT id, user_id, name, email, phone, address, created_at, role FROM users WHERE role = 'admin' LIMIT 1")
        admin = cursor.fetchone()
        cursor.close()
        return admin


# 1. ADMIN DASHBOARD STATS
@app.get("/api/admin/dashboard")
def get_admin_dashboard():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Total Tenants
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'tenant'")
        total_tenants = cursor.fetchone()["count"]

        # Total Owners
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'owner'")
        total_owners = cursor.fetchone()["count"]

        # Total PGs
        cursor.execute("SELECT COUNT(*) as count FROM pgs")
        total_pgs = cursor.fetchone()["count"]

        # Total Rooms
        cursor.execute("SELECT COUNT(*) as count FROM rooms")
        total_rooms = cursor.fetchone()["count"]

        # Bed statistics
        cursor.execute(
            """
            SELECT
                COUNT(id) as total_beds,
                SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_beds,
                SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_beds
            FROM beds
            """
        )
        b_stats = cursor.fetchone()
        total_beds = b_stats["total_beds"] or 0
        occupied_beds = int(b_stats["occupied_beds"] or 0)
        available_beds = int(b_stats["available_beds"] or 0)
        occupancy_rate = round((occupied_beds / total_beds) * 100, 1) if total_beds > 0 else 0.0

        # Total Revenue (Paid payments)
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status IN ('success', 'paid')")
        total_revenue = float(cursor.fetchone()["total"] or 0.0)

        # Active Bookings
        cursor.execute("SELECT COUNT(*) as count FROM bookings WHERE status IN ('approved', 'confirmed', 'active')")
        active_bookings = cursor.fetchone()["count"]

        # Open System Complaints (App Reports)
        cursor.execute("SELECT COUNT(*) as count FROM system_complaints WHERE status IN ('submitted', 'pending', 'in_progress')")
        open_complaints = cursor.fetchone()["count"]

        # Recent Tenants (Last 5)
        cursor.execute(
            """
            SELECT id, user_id, name, email, phone, created_at
            FROM users WHERE role = 'tenant'
            ORDER BY id DESC LIMIT 5
            """
        )
        recent_tenants = cursor.fetchall()
        for t in recent_tenants:
            t["created_at"] = str(t["created_at"])

        # Recent Owners (Last 5)
        cursor.execute(
            """
            SELECT u.id, u.user_id, u.name, u.email, u.phone, u.created_at,
                   (SELECT COUNT(*) FROM pgs WHERE owner_id = u.id) as pgs_count
            FROM users u WHERE u.role = 'owner'
            ORDER BY u.id DESC LIMIT 5
            """
        )
        recent_owners = cursor.fetchall()
        for o in recent_owners:
            o["created_at"] = str(o["created_at"])

        # Recent Platform Payments (Last 5)
        cursor.execute(
            """
            SELECT py.id, py.transaction_id, py.amount, py.payment_for, py.payment_month, py.payment_method, py.status, py.paid_at,
                   u.name as tenant_name, p.pg_name
            FROM payments py
            JOIN users u ON py.tenant_id = u.id
            JOIN pgs p ON py.pg_id = p.id
            ORDER BY py.id DESC LIMIT 5
            """
        )
        recent_payments = cursor.fetchall()
        for py in recent_payments:
            py["amount"] = float(py["amount"])
            py["paid_at"] = str(py["paid_at"]) if py.get("paid_at") else ""

        # Recent System Complaints / App Reports (Last 5)
        cursor.execute(
            """
            SELECT sc.id, sc.report_id as complaint_id, sc.subject, sc.category, sc.description, sc.status, sc.created_at,
                   sc.user_role as reporter_role, u.name as reporter_name, u.user_id as user_code
            FROM system_complaints sc
            JOIN users u ON sc.user_id = u.id
            ORDER BY sc.id DESC LIMIT 5
            """
        )
        recent_complaints = cursor.fetchall()
        for c in recent_complaints:
            c["created_at"] = str(c["created_at"])

        return {
            "status": "success",
            "stats": {
                "total_tenants": total_tenants,
                "total_owners": total_owners,
                "total_pgs": total_pgs,
                "total_rooms": total_rooms,
                "total_beds": total_beds,
                "occupied_beds": occupied_beds,
                "available_beds": available_beds,
                "occupancy_rate": occupancy_rate,
                "total_revenue": total_revenue,
                "active_bookings": active_bookings,
                "open_complaints": open_complaints
            },
            "recent_tenants": recent_tenants,
            "recent_owners": recent_owners,
            "recent_payments": recent_payments,
            "recent_complaints": recent_complaints
        }
    finally:
        cursor.close()
        conn.close()


# 2. ALL TENANTS LIST & DETAILS
@app.get("/api/admin/tenants")
def get_all_admin_tenants():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                u.id as tenant_id,
                u.user_id as tenant_code,
                COALESCE(u.plain_password, 'kafiha@123') as plain_password,
                u.name as tenant_name,
                u.email as tenant_email,
                u.phone as tenant_phone,
                u.gender,
                u.age,
                u.address,
                u.created_at as registered_at,
                p.id as pg_db_id,
                p.pg_name,
                p.pg_id as pg_code,
                p.address as pg_address,
                r.room_number,
                b.bed_number,
                tp.status as occupancy_status,
                tp.move_in_date,
                tp.created_at as joined_at,
                p.monthly_rent,
                (SELECT COUNT(*) FROM payments WHERE tenant_id = u.id) as total_payments_count,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE tenant_id = u.id AND status IN ('success', 'paid')) as total_paid_amount,
                (SELECT status FROM payments WHERE tenant_id = u.id ORDER BY id DESC LIMIT 1) as latest_payment_status,
                (SELECT COUNT(*) FROM complaints WHERE tenant_id = u.id) as complaints_count
            FROM users u
            LEFT JOIN tenant_pg tp ON tp.tenant_id = u.id AND tp.status IN ('approved', 'active')
            LEFT JOIN pgs p ON tp.pg_id = p.id
            LEFT JOIN rooms r ON tp.room_id = r.id
            LEFT JOIN beds b ON tp.bed_id = b.id
            WHERE u.role = 'tenant'
            ORDER BY u.id DESC
            """
        )
        tenants = cursor.fetchall()
        for t in tenants:
            t["registered_at"] = str(t["registered_at"])
            t["joined_at"] = str(t["joined_at"]) if t.get("joined_at") else ""
            t["monthly_rent"] = float(t["monthly_rent"]) if t.get("monthly_rent") else 0.0
            t["total_paid_amount"] = float(t["total_paid_amount"]) if t.get("total_paid_amount") else 0.0
            t["latest_payment_status"] = t.get("latest_payment_status") or "N/A"
            t["occupancy_status"] = t.get("occupancy_status") or "Registered"

        return {
            "status": "success",
            "total_tenants": len(tenants),
            "tenants": tenants
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/admin/tenants/{tenant_id}")
def get_admin_tenant_details(tenant_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT id, user_id, COALESCE(plain_password, 'kafiha@123') as plain_password, name, email, phone, age, gender, address, created_at, role FROM users WHERE id = %s AND role = 'tenant'", (tenant_id,))
        tenant = cursor.fetchone()
        if not tenant:
            raise HTTPException(status_code=404, detail="Tenant not found")

        tenant["created_at"] = str(tenant["created_at"])

        # Current PG allocation
        cursor.execute(
            """
            SELECT p.id as pg_db_id, p.pg_id as pg_code, p.pg_name, p.address as pg_address, p.monthly_rent,
                   r.room_number, r.room_type, b.bed_number, tp.status as occupancy_status, tp.created_at as joined_at,
                   ow.name as owner_name, ow.phone as owner_phone
            FROM tenant_pg tp
            JOIN pgs p ON tp.pg_id = p.id
            JOIN users ow ON p.owner_id = ow.id
            LEFT JOIN rooms r ON tp.room_id = r.id
            LEFT JOIN beds b ON tp.bed_id = b.id
            WHERE tp.tenant_id = %s AND tp.status IN ('approved', 'active')
            LIMIT 1
            """,
            (tenant_id,)
        )
        allocation = cursor.fetchone()
        if allocation:
            allocation["monthly_rent"] = float(allocation["monthly_rent"]) if allocation.get("monthly_rent") else 0.0
            allocation["joined_at"] = str(allocation["joined_at"]) if allocation.get("joined_at") else ""

        # Payment transactions
        cursor.execute(
            """
            SELECT py.id, py.transaction_id, py.amount, py.payment_for, py.payment_month, py.payment_method, py.status, py.paid_at,
                   p.pg_name
            FROM payments py
            JOIN pgs p ON py.pg_id = p.id
            WHERE py.tenant_id = %s
            ORDER BY py.id DESC
            """,
            (tenant_id,)
        )
        payments = cursor.fetchall()
        for py in payments:
            py["amount"] = float(py["amount"])
            py["paid_at"] = str(py["paid_at"]) if py.get("paid_at") else ""

        # Complaints
        cursor.execute(
            """
            SELECT c.id, c.complaint_id, c.subject, c.description, c.status, c.created_at, p.pg_name
            FROM complaints c
            JOIN pgs p ON c.pg_id = p.id
            WHERE c.tenant_id = %s
            ORDER BY c.id DESC
            """,
            (tenant_id,)
        )
        complaints = cursor.fetchall()
        for c in complaints:
            c["created_at"] = str(c["created_at"])

        # Bookings
        cursor.execute(
            """
            SELECT b.booking_id, b.status, b.booking_date, p.pg_name, r.room_number, bd.bed_number
            FROM bookings b
            JOIN pgs p ON b.pg_id = p.id
            LEFT JOIN rooms r ON b.room_id = r.id
            LEFT JOIN beds bd ON b.bed_id = bd.id
            WHERE b.tenant_id = %s
            ORDER BY b.id DESC
            """,
            (tenant_id,)
        )
        bookings = cursor.fetchall()
        for bk in bookings:
            bk["booking_date"] = str(bk["booking_date"])

        return {
            "status": "success",
            "tenant": tenant,
            "allocation": allocation,
            "payments": payments,
            "complaints": complaints,
            "bookings": bookings
        }
    finally:
        cursor.close()
        conn.close()


# 3. ALL OWNERS LIST & DETAILS
@app.get("/api/admin/owners")
def get_all_admin_owners():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                u.id as owner_id,
                u.user_id as owner_code,
                COALESCE(u.plain_password, 'kafiha@123') as plain_password,
                u.name as owner_name,
                u.email as owner_email,
                u.phone as owner_phone,
                u.address as owner_address,
                u.created_at as registered_at,
                (SELECT COUNT(*) FROM pgs WHERE owner_id = u.id) as total_pgs,
                (
                    SELECT COUNT(r.id)
                    FROM rooms r
                    JOIN pgs p ON r.pg_id = p.id
                    WHERE p.owner_id = u.id
                ) as total_rooms,
                (
                    SELECT COUNT(b.id)
                    FROM beds b
                    JOIN rooms r ON b.room_id = r.id
                    JOIN pgs p ON r.pg_id = p.id
                    WHERE p.owner_id = u.id
                ) as total_beds,
                (
                    SELECT COUNT(DISTINCT tp.tenant_id)
                    FROM tenant_pg tp
                    JOIN pgs p ON tp.pg_id = p.id
                    WHERE p.owner_id = u.id AND tp.status IN ('approved', 'active')
                ) as active_tenants,
                (
                    SELECT COALESCE(SUM(py.amount), 0)
                    FROM payments py
                    JOIN pgs p ON py.pg_id = p.id
                    WHERE p.owner_id = u.id AND py.status IN ('success', 'paid')
                ) as total_revenue
            FROM users u
            WHERE u.role = 'owner'
            ORDER BY u.id DESC
            """
        )
        owners = cursor.fetchall()

        for o in owners:
            o["registered_at"] = str(o["registered_at"])
            o["total_revenue"] = float(o["total_revenue"]) if o.get("total_revenue") else 0.0

            # Fetch list of PG names for this owner
            cursor.execute("SELECT pg_id, pg_name FROM pgs WHERE owner_id = %s", (o["owner_id"],))
            o_pgs = cursor.fetchall()
            o["pg_names"] = [p["pg_name"] for p in o_pgs]
            o["pg_codes"] = [p["pg_id"] for p in o_pgs]

        return {
            "status": "success",
            "total_owners": len(owners),
            "owners": owners
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/admin/owners/{owner_id}")
def get_admin_owner_details(owner_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT id, user_id, COALESCE(plain_password, 'kafiha@123') as plain_password, name, email, phone, address, created_at, role FROM users WHERE id = %s AND role = 'owner'", (owner_id,))
        owner = cursor.fetchone()
        if not owner:
            raise HTTPException(status_code=404, detail="Owner not found")

        owner["created_at"] = str(owner["created_at"])

        # PGs owned
        cursor.execute(
            """
            SELECT p.id, p.pg_id, p.pg_name, p.address, p.city, p.pg_type, p.gender_allowed,
                   p.monthly_rent, p.status, p.created_at,
                   (SELECT COUNT(*) FROM rooms WHERE pg_id = p.id) as rooms_count,
                   (SELECT COUNT(b.id) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.pg_id = p.id) as beds_count,
                   (SELECT COUNT(b.id) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.pg_id = p.id AND b.status = 'occupied') as occupied_beds,
                   (SELECT COUNT(DISTINCT tp.tenant_id) FROM tenant_pg tp WHERE tp.pg_id = p.id AND tp.status IN ('approved', 'active')) as tenants_count
            FROM pgs p
            WHERE p.owner_id = %s
            ORDER BY p.id DESC
            """,
            (owner_id,)
        )
        pgs = cursor.fetchall()
        for p in pgs:
            p["monthly_rent"] = float(p["monthly_rent"]) if p.get("monthly_rent") else 0.0
            p["created_at"] = str(p["created_at"]) if p.get("created_at") else ""

        # Active tenants across this owner's PGs
        cursor.execute(
            """
            SELECT u.id as tenant_id, u.user_id as tenant_code, u.name as tenant_name, u.phone as tenant_phone,
                   p.pg_name, r.room_number, b.bed_number, tp.created_at as joined_at
            FROM tenant_pg tp
            JOIN users u ON tp.tenant_id = u.id
            JOIN pgs p ON tp.pg_id = p.id
            LEFT JOIN rooms r ON tp.room_id = r.id
            LEFT JOIN beds b ON tp.bed_id = b.id
            WHERE p.owner_id = %s AND tp.status IN ('approved', 'active')
            ORDER BY tp.id DESC
            """,
            (owner_id,)
        )
        tenants = cursor.fetchall()
        for t in tenants:
            t["joined_at"] = str(t["joined_at"]) if t.get("joined_at") else ""

        # Revenue
        cursor.execute(
            """
            SELECT COALESCE(SUM(py.amount), 0) as total
            FROM payments py
            JOIN pgs p ON py.pg_id = p.id
            WHERE p.owner_id = %s AND py.status IN ('success', 'paid')
            """,
            (owner_id,)
        )
        revenue = float(cursor.fetchone()["total"] or 0.0)

        return {
            "status": "success",
            "owner": owner,
            "total_revenue": revenue,
            "pgs": pgs,
            "tenants": tenants
        }
    finally:
        cursor.close()
        conn.close()


# 4. ALL PGS (ADMIN OVERVIEW & STATUS CONTROL)
@app.get("/api/admin/pgs")
def get_all_admin_pgs():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                p.id,
                p.pg_id,
                p.pg_name,
                p.address,
                p.city,
                p.pincode,
                p.pg_type,
                p.gender_allowed,
                p.monthly_rent,
                p.security_deposit,
                p.status,
                p.created_at,
                u.name as owner_name,
                u.user_id as owner_code,
                u.phone as owner_phone,
                u.email as owner_email,
                (SELECT COUNT(*) FROM rooms WHERE pg_id = p.id) as total_rooms,
                (SELECT COUNT(b.id) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.pg_id = p.id) as total_beds,
                (SELECT COUNT(b.id) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.pg_id = p.id AND b.status = 'occupied') as occupied_beds,
                (SELECT COUNT(DISTINCT tp.tenant_id) FROM tenant_pg tp WHERE tp.pg_id = p.id AND tp.status IN ('approved', 'active')) as active_tenants
            FROM pgs p
            JOIN users u ON p.owner_id = u.id
            ORDER BY p.id DESC
            """
        )
        pgs = cursor.fetchall()
        for p in pgs:
            p["monthly_rent"] = float(p["monthly_rent"]) if p.get("monthly_rent") else 0.0
            p["security_deposit"] = float(p["security_deposit"]) if p.get("security_deposit") else 0.0
            p["created_at"] = str(p["created_at"]) if p.get("created_at") else ""
            p["available_beds"] = (p["total_beds"] or 0) - (p["occupied_beds"] or 0)
            p["occupancy_percent"] = round(((p["occupied_beds"] or 0) / (p["total_beds"] or 1)) * 100, 1) if p["total_beds"] else 0.0

        return {"status": "success", "total_pgs": len(pgs), "pgs": pgs}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/admin/pgs/{pg_id}/status")
def update_admin_pg_status(pg_id: str, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        new_status = data.get("status", "approved")
        if new_status not in ["approved", "pending", "rejected"]:
            raise HTTPException(status_code=400, detail="Invalid status")

        cursor.execute(
            "UPDATE pgs SET status = %s WHERE pg_id = %s OR id = %s",
            (new_status, pg_id, int(pg_id) if pg_id.isdigit() else 0)
        )
        conn.commit()
        return {"status": "success", "message": f"PG status updated to {new_status}"}
    finally:
        cursor.close()
        conn.close()


# 5. COMPREHENSIVE REPORTS & ANALYTICS
@app.get("/api/admin/reports")
def get_admin_reports():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # A. Financial Report
        cursor.execute("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status IN ('success', 'paid')")
        total_revenue = float(cursor.fetchone()["total"] or 0.0)

        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE status IN ('success', 'paid')
              AND MONTH(paid_at) = MONTH(CURRENT_DATE())
              AND YEAR(paid_at) = YEAR(CURRENT_DATE())
            """
        )
        this_month_revenue = float(cursor.fetchone()["total"] or 0.0)

        cursor.execute(
            """
            SELECT COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE status IN ('success', 'paid')
              AND MONTH(paid_at) = MONTH(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
              AND YEAR(paid_at) = YEAR(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH))
            """
        )
        last_month_revenue = float(cursor.fetchone()["total"] or 0.0)

        # Payment Methods breakdown
        cursor.execute(
            """
            SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE status IN ('success', 'paid')
            GROUP BY payment_method
            ORDER BY total DESC
            """
        )
        method_breakdown = cursor.fetchall()
        for m in method_breakdown:
            m["total"] = float(m["total"])

        # PG Revenue Ranking (Top 10)
        cursor.execute(
            """
            SELECT p.pg_name, p.pg_id as pg_code, u.name as owner_name, COALESCE(SUM(py.amount), 0) as total_collected, COUNT(py.id) as payment_count
            FROM pgs p
            JOIN users u ON p.owner_id = u.id
            LEFT JOIN payments py ON py.pg_id = p.id AND py.status IN ('success', 'paid')
            GROUP BY p.id, p.pg_name, p.pg_id, u.name
            ORDER BY total_collected DESC
            LIMIT 10
            """
        )
        pg_revenue_ranking = cursor.fetchall()
        for r in pg_revenue_ranking:
            r["total_collected"] = float(r["total_collected"])

        # B. Occupancy Report
        cursor.execute(
            """
            SELECT
                p.id, p.pg_id, p.pg_name, p.city, u.name as owner_name,
                (SELECT COUNT(*) FROM rooms WHERE pg_id = p.id) as total_rooms,
                (SELECT COUNT(b.id) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.pg_id = p.id) as total_beds,
                (SELECT COUNT(b.id) FROM beds b JOIN rooms r ON b.room_id = r.id WHERE r.pg_id = p.id AND b.status = 'occupied') as occupied_beds
            FROM pgs p
            JOIN users u ON p.owner_id = u.id
            ORDER BY p.id DESC
            """
        )
        occupancy_pgs = cursor.fetchall()
        total_sys_beds = 0
        total_sys_occupied = 0

        for op in occupancy_pgs:
            tot = op["total_beds"] or 0
            occ = op["occupied_beds"] or 0
            total_sys_beds += tot
            total_sys_occupied += occ
            op["available_beds"] = tot - occ
            op["occupancy_percent"] = round((occ / tot) * 100, 1) if tot > 0 else 0.0

        sys_occupancy_rate = round((total_sys_occupied / total_sys_beds) * 100, 1) if total_sys_beds > 0 else 0.0

        # C. Complaints Report
        cursor.execute("SELECT COUNT(*) as total FROM complaints")
        total_complaints = cursor.fetchone()["total"]

        cursor.execute(
            """
            SELECT
                SUM(CASE WHEN status IN ('submitted', 'pending') THEN 1 ELSE 0 END) as submitted_count,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count
            FROM complaints
            """
        )
        c_stats = cursor.fetchone()
        submitted_c = int(c_stats["submitted_count"] or 0)
        in_progress_c = int(c_stats["in_progress_count"] or 0)
        resolved_c = int(c_stats["resolved_count"] or 0)
        resolution_rate = round((resolved_c / total_complaints) * 100, 1) if total_complaints > 0 else 0.0

        # D. User Growth Counts
        cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'tenant'")
        total_tenants = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) as count FROM users WHERE role = 'owner'")
        total_owners = cursor.fetchone()["count"]

        return {
            "status": "success",
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "financial": {
                "total_revenue": total_revenue,
                "this_month_revenue": this_month_revenue,
                "last_month_revenue": last_month_revenue,
                "method_breakdown": method_breakdown,
                "pg_ranking": pg_revenue_ranking
            },
            "occupancy": {
                "total_beds": total_sys_beds,
                "total_occupied": total_sys_occupied,
                "total_available": total_sys_beds - total_sys_occupied,
                "occupancy_rate": sys_occupancy_rate,
                "pg_breakdown": occupancy_pgs
            },
            "complaints": {
                "total_complaints": total_complaints,
                "submitted_count": submitted_c,
                "in_progress_count": in_progress_c,
                "resolved_count": resolved_c,
                "resolution_rate": resolution_rate
            },
            "growth": {
                "total_tenants": total_tenants,
                "total_owners": total_owners,
                "total_pgs": len(occupancy_pgs)
            }
        }
    finally:
        cursor.close()
        conn.close()


# 6. ALL SYSTEM COMPLAINTS & APP REPORTS (ADMIN & USERS)
@app.post("/api/app-reports")
def create_app_report(data: AppReportRequest):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        user = None
        uid_str = str(data.user_id).strip()
        if uid_str.isdigit():
            cursor.execute("SELECT id, user_id, role, name, email FROM users WHERE id = %s", (int(uid_str),))
            user = cursor.fetchone()
        if not user:
            cursor.execute("SELECT id, user_id, role, name, email FROM users WHERE user_id = %s OR email = %s", (uid_str, uid_str))
            user = cursor.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        cursor.execute("SELECT MAX(id) as max_id FROM system_complaints")
        row = cursor.fetchone()
        next_id = (row["max_id"] or 0) + 1
        report_id = f"APP{1000 + next_id}"

        sub = (data.subject or data.title or "App Report").strip()
        cat = (data.category or "Bug Report").strip()
        role = user.get("role") or data.role or "tenant"

        cursor.execute(
            """
            INSERT INTO system_complaints (report_id, user_id, user_role, category, subject, description, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'pending')
            """,
            (report_id, user["id"], role, cat, sub, data.description.strip())
        )
        conn.commit()
        return {
            "status": "success",
            "message": "App report submitted successfully to the administrator",
            "report_id": report_id
        }
    finally:
        cursor.close()
        conn.close()


@app.get("/api/app-reports/user/{user_identifier}")
def get_user_app_reports(user_identifier: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        user = None
        uid_str = str(user_identifier).strip()
        if uid_str.isdigit():
            cursor.execute("SELECT id FROM users WHERE id = %s", (int(uid_str),))
            user = cursor.fetchone()
        if not user:
            cursor.execute("SELECT id FROM users WHERE user_id = %s OR email = %s", (uid_str, uid_str))
            user = cursor.fetchone()

        if not user:
            return {"status": "success", "reports": []}

        cursor.execute(
            """
            SELECT id, report_id, category, subject, description, status, admin_notes, created_at, updated_at
            FROM system_complaints
            WHERE user_id = %s
            ORDER BY id DESC
            """,
            (user["id"],)
        )
        reports = cursor.fetchall()
        for r in reports:
            r["created_at"] = str(r["created_at"])
            r["updated_at"] = str(r["updated_at"]) if r.get("updated_at") else ""

        return {"status": "success", "reports": reports}
    finally:
        cursor.close()
        conn.close()


@app.get("/api/admin/complaints")
def get_all_admin_complaints():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT
                sc.id,
                sc.report_id as complaint_id,
                sc.category,
                sc.subject,
                sc.description,
                sc.status,
                sc.admin_notes,
                sc.created_at,
                sc.updated_at,
                sc.user_role as reporter_role,
                u.id as user_id,
                u.user_id as user_code,
                u.name as reporter_name,
                u.email as reporter_email,
                u.phone as reporter_phone
            FROM system_complaints sc
            JOIN users u ON sc.user_id = u.id
            ORDER BY sc.id DESC
            """
        )
        complaints = cursor.fetchall()
        for c in complaints:
            c["created_at"] = str(c["created_at"])
            c["updated_at"] = str(c["updated_at"]) if c.get("updated_at") else ""
        return {"status": "success", "total_complaints": len(complaints), "complaints": complaints}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/admin/complaints/{complaint_id}/status")
def update_admin_complaint_status(complaint_id: str, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        new_status = data.get("status", "in_progress")
        admin_notes = data.get("admin_notes", None)
        if admin_notes is not None:
            cursor.execute(
                "UPDATE system_complaints SET status = %s, admin_notes = %s WHERE report_id = %s OR id = %s",
                (new_status, admin_notes, complaint_id, int(complaint_id) if complaint_id.isdigit() else 0)
            )
        else:
            cursor.execute(
                "UPDATE system_complaints SET status = %s WHERE report_id = %s OR id = %s",
                (new_status, complaint_id, int(complaint_id) if complaint_id.isdigit() else 0)
            )
        conn.commit()
        return {"status": "success", "message": f"System complaint status updated to {new_status}"}
    finally:
        cursor.close()
        conn.close()


@app.delete("/api/admin/complaints/{complaint_id}")
def delete_admin_complaint(complaint_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "DELETE FROM system_complaints WHERE report_id = %s OR id = %s",
            (complaint_id, int(complaint_id) if complaint_id.isdigit() else 0)
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Complaint not found")
        return {"status": "success", "message": "System complaint deleted successfully"}
    finally:
        cursor.close()
        conn.close()


# 7. ADMIN PROFILE & SECURITY
@app.get("/api/admin/profile")
def get_admin_profile(admin_identifier: str = None):
    conn = get_db_connection()
    admin = resolve_admin_user(conn, admin_identifier)
    conn.close()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin account not found")
    admin["created_at"] = str(admin["created_at"])
    return {"status": "success", "profile": admin}


@app.put("/api/admin/profile")
def update_admin_profile(data: dict):
    conn = get_db_connection()
    admin = resolve_admin_user(conn, data.get("admin_id"))
    if not admin:
        conn.close()
        raise HTTPException(status_code=404, detail="Admin account not found")

    cursor = conn.cursor()
    try:
        name = data.get("name")
        phone = data.get("phone")
        cursor.execute(
            "UPDATE users SET name = COALESCE(%s, name), phone = COALESCE(%s, phone) WHERE id = %s",
            (name, phone, admin["id"])
        )
        conn.commit()
        return {"status": "success", "message": "Admin profile updated successfully"}
    finally:
        cursor.close()
        conn.close()


@app.put("/api/admin/change-password")
def change_admin_password(data: dict):
    conn = get_db_connection()
    admin = resolve_admin_user(conn, data.get("admin_id"))
    if not admin:
        conn.close()
        raise HTTPException(status_code=404, detail="Admin account not found")

    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")

    if not new_password or len(new_password) < 6:
        conn.close()
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT password FROM users WHERE id = %s", (admin["id"],))
        pwd_row = cursor.fetchone()
        if not pwd_row or not verify_password(old_password, pwd_row["password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        hashed = hash_password(new_password)
        cursor.execute("UPDATE users SET password = %s, plain_password = %s WHERE id = %s", (hashed, new_password, admin["id"]))
        conn.commit()
        return {"status": "success", "message": "Admin password changed successfully"}
    finally:
        cursor.close()
        conn.close()


# =============================================================================
# NESTORA SMART AI ROBOT ASSISTANT (Role-Aware, Multi-Lingual NLP & Database AI)
# =============================================================================

class ChatMessageRequest(BaseModel):
    message: str
    role_hint: Optional[str] = None
    conversation_id: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = []

class ChatActionRequest(BaseModel):
    action_type: str  # e.g., 'approve_request', 'reject_request'
    request_id: int
    notes: Optional[str] = None

def get_current_user_from_auth(auth_header: Optional[str]) -> Optional[Dict[str, Any]]:
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1].strip()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            return None
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, user_id, name, email, phone, role FROM users WHERE user_id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        return user
    except Exception:
        return None

def detect_language(text: str) -> str:
    """Detect if query is primarily Hindi/Hinglish or English."""
    lower = text.lower()
    hinglish_keywords = [
        "kya", "mera", "meri", "mere", "hai", "hain", "kaise", "chahiye", "kitna", "kitne",
        "karo", "karna", "dikhao", "batao", "bataiye", "hoga", "mujhe", "apna", "apni",
        "andar", "ke", "mein", "ka", "ki", "shikayat", "shukriya", "dhanyawad", "namaste",
        "ladki", "ladka", "kamra", "paisa", "rupaye"
    ]
    matches = sum(1 for w in hinglish_keywords if re.search(r'\b' + re.escape(w) + r'\b', lower))
    return "hinglish" if matches >= 1 else "english"

@app.post("/api/chat")
def nestora_ai_chat(data: ChatMessageRequest, request: Request):
    """
    Role-aware Smart AI Chatbot Endpoint.
    Derives authentication strictly from verified JWT Bearer token.
    Provides verified database assistance for Tenants, PG Owners, and Visitors.
    """
    auth_header = request.headers.get("Authorization")
    user = get_current_user_from_auth(auth_header)
    
    role = user["role"] if user else (data.role_hint or "guest")
    user_name = user["name"] if user else "Friend"
    raw_query = data.message.strip()
    q = raw_query.lower()
    lang = detect_language(raw_query)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # -------------------------------------------------------------
        # TENANT CONVERSATIONAL ASSISTANT
        # -------------------------------------------------------------
        if role == "tenant" and user:
            # 1. Rent, Payments & Receipts
            if any(k in q for k in ["rent", "payment", "paisa", "due", "receipt", "paid", "transaction", "fee"]):
                cursor.execute(
                    """
                    SELECT p.id, p.transaction_id, p.amount, p.payment_for, p.payment_month, p.status, p.paid_at, pg.pg_name
                    FROM payments p
                    LEFT JOIN pgs pg ON p.pg_id = pg.id
                    WHERE p.tenant_id = %s
                    ORDER BY p.id DESC LIMIT 3
                    """,
                    (user["id"],)
                )
                payments = cursor.fetchall()
                if payments:
                    last_pay = payments[0]
                    date_str = str(last_pay['paid_at'])[:10] if last_pay.get('paid_at') else "Recent"
                    if lang == "hinglish":
                        reply = f"Aapka last verified payment record:\n\n"
                        reply += f"💳 **Amount:** ₹{last_pay['amount']:.2f}\n"
                        reply += f"📅 **Payment For:** {last_pay['payment_for']} ({last_pay.get('payment_month') or 'General'})\n"
                        reply += f"🧾 **Transaction ID:** `{last_pay['transaction_id']}`\n"
                        reply += f"✅ **Status:** {last_pay['status'].capitalize()} on {date_str}\n\n"
                        reply += "Aap **My PG / Payments** tab mein jakar full receipt dekh aur download kar sakte hain!"
                    else:
                        reply = f"Here is your latest verified payment record:\n\n"
                        reply += f"💳 **Amount:** ₹{last_pay['amount']:.2f}\n"
                        reply += f"📅 **Payment For:** {last_pay['payment_for']} ({last_pay.get('payment_month') or 'General'})\n"
                        reply += f"🧾 **Transaction ID:** `{last_pay['transaction_id']}`\n"
                        reply += f"✅ **Status:** {last_pay['status'].capitalize()} on {date_str}\n\n"
                        reply += "You can view and verify all receipts under your **Payments** tab."
                    return {
                        "status": "success",
                        "reply": reply,
                        "data_type": "payment_info",
                        "data": payments,
                        "suggestions": ["Mera request status kya hai?", "Complaint kaise karein?", "Rules & Timing"]
                    }
                else:
                    if lang == "hinglish":
                        reply = "Aapke account mein abhi tak koi online payment history record nahi hui hai. Jab aap rent ya advance pay karenge, verified receipt yahan dikhayi degi."
                    else:
                        reply = "No online payment records found for your account yet. Once you make an advance or rent payment, the receipt will appear here."
                    return {
                        "status": "success",
                        "reply": reply,
                        "suggestions": ["Find a PG", "My join request status", "Help"]
                    }

            # 2. Join Request Status
            if any(k in q for k in ["request", "approve", "pending", "join", "mera pg", "status"]):
                cursor.execute(
                    """
                    SELECT tp.id, tp.status, tp.created_at, p.pg_name, p.pg_id, p.monthly_rent, p.address
                    FROM tenant_pg tp
                    JOIN pgs p ON tp.pg_id = p.id
                    WHERE tp.tenant_id = %s
                    ORDER BY tp.id DESC LIMIT 1
                    """,
                    (user["id"],)
                )
                req_row = cursor.fetchone()
                if req_row:
                    status_val = req_row["status"].capitalize()
                    if lang == "hinglish":
                        reply = f"Aapka join request **{req_row['pg_name']}** ({req_row['pg_id']}) ke liye filhal **{status_val}** status mein hai.\n\n"
                        if req_row["status"] == "pending":
                            reply += "⏳ Owner abhi aapki request review kar rahe hain. Jaise hi approve hoga, PG aapke **My PG** dashboard mein show hone lagega!"
                        elif req_row["status"] == "approved":
                            reply += "🎉 Badhai ho! Aapka request approve ho chuka hai. Aap apne **My PG** section mein jakar room details check kar sakte hain."
                        else:
                            reply += "Aap chahein toh doosre verified PGs explore karke naya request bhej sakte hain."
                    else:
                        reply = f"Your join request for **{req_row['pg_name']}** ({req_row['pg_id']}) is currently **{status_val}**.\n\n"
                        if req_row["status"] == "pending":
                            reply += "⏳ The property owner is reviewing your application. You will see it in your **My PG** section once accepted."
                        elif req_row["status"] == "approved":
                            reply += "🎉 Great news! Your join request has been approved. You can view your room and stay details in the **My PG** section."
                        else:
                            reply += "Feel free to browse our verified PG listings to submit a new request."
                    return {
                        "status": "success",
                        "reply": reply,
                        "data_type": "request_status",
                        "data": req_row,
                        "suggestions": ["Mera rent kitna hai?", "My PG dashboard", "Search other PGs"]
                    }
                else:
                    if lang == "hinglish":
                        reply = f"Namaste {user_name}! Filhal aapne kisi PG ke liye join request nahi bheji hai. Aap **Find PG** section se apne pasand ke PG ke liye request bhej sakte hain!"
                    else:
                        reply = f"Hello {user_name}! You have not submitted any PG join requests yet. You can find and request verified PGs from the **Find PG** section."
                    return {
                        "status": "success",
                        "reply": reply,
                        "suggestions": ["Find a PG", "Sakchi mein PGs", "Bistupur PGs"]
                    }

            # 3. Complaints & Grievances
            if any(k in q for k in ["complaint", "shikayat", "problem", "issue", "kharab", "repair"]):
                cursor.execute(
                    """
                    SELECT id, complaint_id, subject, status, created_at
                    FROM complaints
                    WHERE tenant_id = %s
                    ORDER BY id DESC LIMIT 2
                    """,
                    (user["id"],)
                )
                user_complaints = cursor.fetchall()
                if user_complaints:
                    c_info = user_complaints[0]
                    if lang == "hinglish":
                        reply = f"Aapki haliya complaint **{c_info.get('complaint_id') or 'ID #' + str(c_info['id'])}**:\n"
                        reply += f"📌 **Subject:** {c_info.get('subject') or 'General Maintenance'}\n"
                        reply += f"⚡ **Status:** {c_info.get('status', 'Pending').capitalize()}\n\n"
                        reply += "Aap naya issue submit karne ke liye **Complaints** section use kar sakte hain."
                    else:
                        reply = f"Here is your recent maintenance complaint **{c_info.get('complaint_id') or '#' + str(c_info['id'])}**:\n"
                        reply += f"📌 **Subject:** {c_info.get('subject') or 'General'}\n"
                        reply += f"⚡ **Status:** {c_info.get('status', 'Pending').capitalize()}\n\n"
                        reply += "You can file a new complaint directly from the **Complaints** tab on your dashboard."
                else:
                    if lang == "hinglish":
                        reply = "Aapki koi active complaint nahi hai. Agar PG mein WiFi, electricity, ya cleaning ka koi issue hai, toh dashboard ke **Complaints** section se turant report kar sakte hain."
                    else:
                        reply = "You currently have no active complaints. If you face any issues with maintenance, electricity, or WiFi, you can submit one through the **Complaints** tab."
                return {
                    "status": "success",
                    "reply": reply,
                    "suggestions": ["File a complaint", "Check rent dues", "Find a PG"]
                }

        # -------------------------------------------------------------
        # OWNER CONVERSATIONAL ASSISTANT
        # -------------------------------------------------------------
        if role == "owner" and user:
            # 1. Pending Tenant Requests
            if any(k in q for k in ["request", "pending", "tenant request", "approve", "reject", "incoming"]):
                cursor.execute(
                    """
                    SELECT tp.id AS request_id, tp.status, tp.created_at, u.name AS tenant_name, u.phone AS tenant_phone, p.pg_name, p.pg_id AS pg_code
                    FROM tenant_pg tp
                    JOIN users u ON tp.tenant_id = u.id
                    JOIN pgs p ON tp.pg_id = p.id
                    WHERE p.owner_id = %s AND tp.status = 'pending'
                    ORDER BY tp.id DESC
                    """,
                    (user["id"],)
                )
                pending_reqs = cursor.fetchall()
                count = len(pending_reqs)
                if count > 0:
                    first = pending_reqs[0]
                    if lang == "hinglish":
                        reply = f"Aapke PGs ke liye **{count} pending tenant requests** hain! 📋\n\n"
                        reply += f"👤 **{first['tenant_name']}** ({first['tenant_phone']}) ne **{first['pg_name']}** ke liye apply kiya hai (Request #{first['request_id']}).\n\n"
                        reply += f"Aap niche button par click karke turant approve ya reject kar sakte hain, ya **Tenant Requests** section mein dekh sakte hain."
                    else:
                        reply = f"You have **{count} pending tenant request(s)** awaiting your action! 📋\n\n"
                        reply += f"👤 **{first['tenant_name']}** ({first['tenant_phone']}) applied for **{first['pg_name']}** (Request #{first['request_id']}).\n\n"
                        reply += f"You can approve/reject directly below or manage them in the **Tenant Requests** tab."
                    return {
                        "status": "success",
                        "reply": reply,
                        "data_type": "owner_pending_requests",
                        "action_required": {
                            "type": "confirm_join_request",
                            "request_id": first["request_id"],
                            "tenant_name": first["tenant_name"],
                            "pg_name": first["pg_name"]
                        },
                        "suggestions": ["Approve Request #" + str(first["request_id"]), "Reject Request #" + str(first["request_id"]), "Mere PGs dikhao", "Available beds"]
                    }
                else:
                    if lang == "hinglish":
                        reply = f"Shandar {user_name}! Filhal aapke PGs ke liye koi pending join request nahi hai. Sabhi requests up-to-date hain."
                    else:
                        reply = f"All caught up, {user_name}! You have no pending tenant join requests at the moment."
                    return {
                        "status": "success",
                        "reply": reply,
                        "suggestions": ["Mere kitne PG registered hain?", "Available beds count", "Add new PG"]
                    }

            # 2. Owner's Registered PGs
            if any(k in q for k in ["kitne pg", "my pg", "mera pg", "properties", "property", "registered", "pg list"]):
                cursor.execute(
                    """
                    SELECT id, pg_id, pg_name, address, city, monthly_rent, status
                    FROM pgs
                    WHERE owner_id = %s
                    ORDER BY id DESC
                    """,
                    (user["id"],)
                )
                owner_pgs = cursor.fetchall()
                if owner_pgs:
                    pg_lines = "\n".join([f"• **{p['pg_name']}** (`{p['pg_id']}`) - ₹{p['monthly_rent']}/mo ({p['status'].capitalize()})" for p in owner_pgs])
                    if lang == "hinglish":
                        reply = f"Aapke total **{len(owner_pgs)} PGs** registered hain:\n\n{pg_lines}\n\nAap rooms aur beds **Manage Rooms** section se handle kar sakte hain."
                    else:
                        reply = f"You have **{len(owner_pgs)} registered PG property(ies)**:\n\n{pg_lines}\n\nYou can manage rooms and bed configurations under **Manage Rooms**."
                    return {
                        "status": "success",
                        "reply": reply,
                        "data_type": "owner_pg_list",
                        "data": owner_pgs,
                        "suggestions": ["Kitne tenant requests pending hain?", "Available beds check karo", "Add new PG"]
                    }
                else:
                    if lang == "hinglish":
                        reply = "Aapne abhi tak koi PG register nahi kiya hai. Naya PG add karne ke liye **Add New PG** button use karein."
                    else:
                        reply = "You haven't registered any PG properties yet. Click **Add New PG** on your dashboard to list your first PG."
                    return {
                        "status": "success",
                        "reply": reply,
                        "suggestions": ["How to add a PG?", "Help"]
                    }

            # 3. Available Beds & Rooms
            if any(k in q for k in ["bed", "room", "occupancy", "khali", "available"]):
                cursor.execute(
                    """
                    SELECT 
                        COUNT(DISTINCT r.id) as total_rooms,
                        COUNT(DISTINCT b.id) as total_beds,
                        SUM(CASE WHEN b.status = 'available' THEN 1 ELSE 0 END) as available_beds,
                        SUM(CASE WHEN b.status = 'occupied' THEN 1 ELSE 0 END) as occupied_beds
                    FROM pgs p
                    JOIN rooms r ON r.pg_id = p.id
                    JOIN beds b ON b.room_id = r.id
                    WHERE p.owner_id = %s
                    """,
                    (user["id"],)
                )
                stats = cursor.fetchone() or {}
                avail = stats.get("available_beds") or 0
                occ = stats.get("occupied_beds") or 0
                total = stats.get("total_beds") or 0
                if lang == "hinglish":
                    reply = f"Aapke PGs ki live occupancy status:\n\n"
                    reply += f"🛏️ **Available Beds:** **{avail}**\n"
                    reply += f"👥 **Occupied Beds:** {occ}\n"
                    reply += f"🏢 **Total Beds:** {total}\n"
                    reply += f"🚪 **Total Rooms:** {stats.get('total_rooms') or 0}\n\n"
                    reply += "Detailed room allocation dekhne ke liye **Manage Rooms** par click karein."
                else:
                    reply = f"Here is the live occupancy status across your properties:\n\n"
                    reply += f"🛏️ **Available Beds:** **{avail}**\n"
                    reply += f"👥 **Occupied Beds:** {occ}\n"
                    reply += f"🏢 **Total Beds:** {total}\n"
                    reply += f"🚪 **Total Rooms:** {stats.get('total_rooms') or 0}\n\n"
                    reply += "To allocate or edit bed occupancy, visit the **Manage Rooms** tab."
                return {
                    "status": "success",
                    "reply": reply,
                    "suggestions": ["Pending tenant requests", "View my PGs", "Dashboard statistics"]
                }

        # -------------------------------------------------------------
        # NATURAL LANGUAGE SMART PG SEARCH (Tenants & Visitors)
        # -------------------------------------------------------------
        if any(k in q for k in ["pg", "hostel", "room", "stay", "find", "search", "dhundo", "chahiye", "sakchi", "bistupur", "kadma", "sonari", "budget", "boys", "girls"]):
            # Extract filters
            max_rent = 0
            rent_match = re.search(r'(?:under|below|budget|andar|tak|se kam)\s*₹?\s*(\d{4,6})', q)
            if not rent_match:
                rent_match = re.search(r'₹?\s*(\d{4,6})\s*(?:ke andar|budget|max)', q)
            if rent_match:
                try:
                    max_rent = float(rent_match.group(1))
                except Exception:
                    pass

            gender_target = ""
            if any(w in q for w in ["girls", "female", "mahila", "ladkiyo", "women"]):
                gender_target = "Girls"
            elif any(w in q for w in ["boys", "male", "purush", "ladko", "men"]):
                gender_target = "Boys"

            # Search location terms
            location_term = ""
            known_locs = ["sakchi", "bistupur", "kadma", "sonari", "telco", "gamharia", "golmuri", "mango", "jamshedpur"]
            for loc in known_locs:
                if loc in q:
                    location_term = loc
                    break

            sql = "SELECT id, pg_id, pg_name, address, city, pincode, pg_type, gender_allowed, monthly_rent, security_deposit FROM pgs WHERE status = 'approved'"
            params = []
            if max_rent > 0:
                sql += " AND monthly_rent <= %s"
                params.append(max_rent)
            if gender_target == "Girls":
                sql += " AND (gender_allowed LIKE '%Female%' OR gender_allowed LIKE '%Girls%' OR gender_allowed = 'All')"
            elif gender_target == "Boys":
                sql += " AND (gender_allowed LIKE '%Male%' OR gender_allowed LIKE '%Boys%' OR gender_allowed = 'All')"

            if "single" in q:
                sql += " AND (pg_type LIKE '%Single%' OR description LIKE '%Single%')"
            elif "double" in q:
                sql += " AND (pg_type LIKE '%Double%' OR description LIKE '%Double%')"

            if location_term:
                sql += " AND (address LIKE %s OR city LIKE %s OR pg_name LIKE %s)"
                params.extend([f"%{location_term}%", f"%{location_term}%", f"%{location_term}%"])

            sql += " ORDER BY monthly_rent ASC LIMIT 4"
            cursor.execute(sql, tuple(params))
            found_pgs = cursor.fetchall()

            if found_pgs:
                pg_cards = []
                for p in found_pgs:
                    pg_cards.append(f"🏠 **{p['pg_name']}** ({p['pg_id']})\n📍 {p['address']}, {p['city']}\n💰 Rent: ₹{p['monthly_rent']}/mo | Deposit: ₹{p['security_deposit']}\n👥 Allowed: {p['gender_allowed']} | Sharing: {p['pg_type']}")
                pg_summary = "\n\n".join(pg_cards)

                if lang == "hinglish":
                    reply = f"Aapke search ke anusaar mujhe **{len(found_pgs)} verified PGs** mile hain:\n\n{pg_summary}\n\nAap **Find PG** tab se in PGs ki photos dekh kar direct Request to Join bhej sakte hain!"
                else:
                    reply = f"I found **{len(found_pgs)} verified PG(s)** matching your criteria:\n\n{pg_summary}\n\nYou can view full photos and send a join request from the **Find PG** page!"
                return {
                    "status": "success",
                    "reply": reply,
                    "data_type": "pg_search_results",
                    "data": found_pgs,
                    "suggestions": ["Under ₹7,000 PGs", "Girls PGs in Sakchi", "Boys PGs in Bistupur"]
                }
            else:
                if lang == "hinglish":
                    reply = "Maaf kijiye, is specific budget ya location mein abhi koi approved PG nahi mila. Aap budget thoda adjust karke ya dusre location ke liye search kar sakte hain."
                else:
                    reply = "Sorry, no approved PGs matched your specific filter. Try broadening your budget or searching in nearby localities."
                return {
                    "status": "success",
                    "reply": reply,
                    "suggestions": ["All PGs in Jamshedpur", "Sakchi PGs", "Under ₹8000 PGs"]
                }

        # -------------------------------------------------------------
        # GENERAL FAQS & NAVIGATION
        # -------------------------------------------------------------
        if any(k in q for k in ["rule", "timing", "deposit", "gate", "food", "wifi", "kaise", "help", "how"]):
            if "deposit" in q:
                reply = "Security deposit typically 1 month ka rent hota hai jo move-out ke waqt room inspection ke baad refund ho jata hai. Aapki deposit amount contract mein clearly recorded rehti hai." if lang == "hinglish" else "Security deposits are typically 1 month's rent, fully refundable upon move-out after standard room inspection."
            elif "gate" in q or "timing" in q:
                reply = "Standard PG gate closing time 10:00 PM hota hai. Agar aapko late entry ya emergency permission chahiye, toh owner ko pehle se inform karein." if lang == "hinglish" else "Standard PG gate closing hours are 10:00 PM. Please notify your PG owner in advance if you require late entry for work or emergencies."
            elif "wifi" in q or "food" in q:
                reply = "Adhikansh Nestora PGs high-speed WiFi aur hygienic 3-time meals provide karte hain. Har PG ke card par facilities tag dekh kar confirm kar sakte hain." if lang == "hinglish" else "Most Nestora-verified PGs provide high-speed WiFi and 3 hygienic daily meals. Check the specific PG's facility badges on the details page."
            else:
                reply = f"Main Nestora AI Assistant hoon! Main aapko PG dhundhne, join request status janne, rent receipts dekhne, aur dashboard navigate karne mein help kar sakta hoon.\n\nAap mujhse English, Hindi ya Hinglish mein kuch bhi pooch sakte hain!" if lang == "hinglish" else f"I am your Nestora AI Assistant! I can help you find verified PGs, track join requests, review rent payments, check room occupancy, and navigate the platform.\n\nFeel free to ask me anything in English, Hindi, or Hinglish!"
            return {
                "status": "success",
                "reply": reply,
                "suggestions": ["Find a PG", "Check my requests", "Rent rules & deposit"]
            }

        # Default Fallback Greeting
        if lang == "hinglish":
            reply = f"Namaste {user_name}! Main Nestora AI Assistant hoon. Main aapki kya sahayata kar sakta hoon?\n\n• PG search karein\n• Join request status check karein\n• Rent aur receipts dekhein\n• Owner properties manage karein"
        else:
            reply = f"Hello {user_name}! I am your Nestora AI Smart Assistant. How can I help you today?\n\n• Search verified PGs by budget & area\n• Track join request status\n• Check payments & receipts\n• Manage properties & room occupancy"
        
        return {
            "status": "success",
            "reply": reply,
            "suggestions": ["Find a PG", "Check my requests", "Available beds", "Help"]
        }

    finally:
        cursor.close()
        conn.close()


@app.post("/api/chat/action")
def nestora_ai_execute_action(data: ChatActionRequest, request: Request):
    """
    Executes confirmed AI actions safely with verified owner authorization.
    """
    auth_header = request.headers.get("Authorization")
    user = get_current_user_from_auth(auth_header)
    if not user or user["role"] != "owner":
        raise HTTPException(status_code=403, detail="Unauthorized: Only authenticated PG owners can perform this action.")

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Verify join request belongs to a PG owned by this owner
        cursor.execute(
            """
            SELECT tp.id, tp.status, tp.pg_id, tp.tenant_id, p.owner_id, p.pg_name, u.name as tenant_name
            FROM tenant_pg tp
            JOIN pgs p ON tp.pg_id = p.id
            JOIN users u ON tp.tenant_id = u.id
            WHERE tp.id = %s
            """,
            (data.request_id,)
        )
        req = cursor.fetchone()
        if not req:
            raise HTTPException(status_code=404, detail="Request not found.")
        if req["owner_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden: You can only manage requests for your own properties.")

        if data.action_type in ["approve_request", "approved"]:
            cursor.close()
            conn.close()
            # Delegate to existing thoroughly-tested process_tenant_request endpoint
            return process_tenant_request(data.request_id, data={"status": "approved"})
        elif data.action_type in ["reject_request", "rejected"]:
            cursor.close()
            conn.close()
            return process_tenant_request(data.request_id, data={"status": "rejected"})
        else:
            raise HTTPException(status_code=400, detail="Invalid action type.")
    finally:
        try:
            cursor.close()
        except Exception:
            pass
        try:
            conn.close()
        except Exception:
            pass

