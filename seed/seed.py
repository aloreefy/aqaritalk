"""
Seed the AqariTalk `properties` table with realistic Jordan-focused listings.

- Structured fields are generated deterministically so every row satisfies the
  DB enums / constraints.
- The Arabic `description` is written by a local Gemma GGUF via llama-cpp-python
  (offline, no API).
  

Usage (from the project root, with the Postgres container running):
    python seed/seed.py                 # 200 listings (default)
    python seed/seed.py --count 50      # custom count
    python seed/seed.py --no-llm        # skip the model, use template descriptions
    python seed/seed.py --wipe          # delete previous seeded rows first
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import datetime, timedelta, timezone

import psycopg

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://aqaritalk:aqaritalk_dev@localhost:5432/aqaritalk",
)

GEMMA_PATH = os.environ.get(
    "GEMMA_PATH",
    r"C:\Users\DELL\Desktop\DialectSentEval\models\gemma-4-E2B-it-Q4_K_M.gguf",
)

# A tag we stamp into seeded users' names so --wipe can find them again.
SEED_TAG = "[seed]"

# ---------------------------------------------------------------------------
# Reference data (Jordan-focused). Districts are real neighbourhoods.
# ---------------------------------------------------------------------------

# city (Arabic) -> (lat, lng center, [districts in Arabic])
CITIES = {
    "عمّان": (31.9539, 35.9106, [
        "عبدون", "الصويفية", "دير غبار", "خلدا", "تلاع العلي", "الجبيهة",
        "الرابية", "الدوار السابع", "الشميساني", "مرج الحمام", "أم أذينة",
        "جبل عمان", "الدوار الخامس", "أبو نصير", "ضاحية الرشيد",
    ]),
    "إربد": (32.5556, 35.8500, ["الحي الجنوبي", "إيدون", "النزهة", "مجمع عمان"]),
    "الزرقاء": (32.0728, 36.0880, ["الزرقاء الجديدة", "الجبل الأبيض", "حي معصوم"]),
    "العقبة": (29.5321, 35.0063, ["الشاطئ الجنوبي", "المنطقة العاشرة", "الحي الدبلوماسي"]),
    "مادبا": (31.7167, 35.7950, ["وسط البلد", "حنينا"]),
    "السلط": (32.0392, 35.7272, ["وسط البلد", "الجدعة"]),
    "جرش": (32.2808, 35.8990, ["وسط البلد", "صاكب"]),
}
CITY_WEIGHTS = [55, 13, 12, 8, 4, 4, 4]  # heavily weighted to Amman

# property_type enum -> weight (residential-heavy)
PROPERTY_TYPES = {
    "apartment": 38, "villa": 12, "house": 8, "studio": 7, "roof": 3,
    "floor": 4, "land_residential": 8, "land_commercial": 3,
    "land_agricultural": 2, "office": 6, "shop": 5, "warehouse": 2,
    "building": 2, "farm": 1, "chalet": 2, "showroom": 1, "other": 1,
}

LAND_TYPES = {"land_residential", "land_commercial", "land_agricultural", "farm"}
COMMERCIAL_TYPES = {"office", "shop", "warehouse", "showroom", "building"}

FURNISHED = ["furnished", "semi_furnished", "unfurnished"]
CONDITIONS = ["new", "excellent", "good", "needs_renovation"]
VIEWS = ["إطلالة على المدينة", "إطلالة جبلية", "إطلالة مفتوحة", "بدون إطلالة مميزة", "إطلالة على حديقة"]
CONTACT_PREFS = ["whatsapp", "phone", "in_app_only"]

AR_TYPE = {
    "apartment": "شقة", "villa": "فيلا", "house": "منزل", "studio": "استوديو",
    "roof": "روف", "floor": "طابق", "land_residential": "أرض سكنية",
    "land_commercial": "أرض تجارية", "land_agricultural": "أرض زراعية",
    "office": "مكتب", "shop": "محل تجاري", "warehouse": "مستودع",
    "building": "عمارة", "farm": "مزرعة", "chalet": "شاليه",
    "showroom": "صالة عرض", "other": "عقار",
}
AR_MODE = {"sale": "للبيع", "rent": "للإيجار", "lease": "للضمان"}

FIRST_NAMES = ["محمد", "أحمد", "خالد", "سامي", "ليث", "عمر", "يوسف", "رامي",
               "هبة", "رنا", "دانا", "سارة", "نور", "ياسمين", "لينا", "مها"]
LAST_NAMES = ["العمري", "الزعبي", "النسور", "الخطيب", "الشريدة", "أبو زيد",
              "الحديد", "القيسي", "الرواشدة", "بني هاني", "السعدي", "الطراونة"]


def weighted_choice(d: dict):
    return random.choices(list(d.keys()), weights=list(d.values()), k=1)[0]


def gen_price(ptype: str, mode: str) -> tuple[int, str, str | None]:
    """Return (price, price_per, rental_period)."""
    if mode == "rent":
        period = random.choice(["monthly", "monthly", "annual"])
        if ptype in ("villa", "house", "building"):
            monthly = random.randint(700, 2500)
        elif ptype in COMMERCIAL_TYPES:
            monthly = random.randint(300, 2000)
        elif ptype == "studio":
            monthly = random.randint(180, 400)
        else:  # apartment / roof / floor
            monthly = random.randint(250, 850)
        monthly = round(monthly / 10) * 10
        if period == "annual":
            return monthly * 12, "total", "annual"
        return monthly, "per_month", "monthly"

    # sale
    if ptype in ("villa", "palace"):
        price = random.randint(150_000, 900_000)
    elif ptype in ("house", "building", "floor", "roof"):
        price = random.randint(90_000, 400_000)
    elif ptype == "studio":
        price = random.randint(28_000, 60_000)
    elif ptype in LAND_TYPES:
        price = random.randint(40_000, 500_000)
    elif ptype in COMMERCIAL_TYPES:
        price = random.randint(60_000, 600_000)
    else:  # apartment
        price = random.randint(45_000, 260_000)
    price = round(price / 500) * 500
    return price, "total", None


def gen_listing(user_ids: list[str]) -> dict:
    city = random.choices(list(CITIES), weights=CITY_WEIGHTS, k=1)[0]
    lat_c, lng_c, districts = CITIES[city]
    district = random.choice(districts)
    ptype = weighted_choice(PROPERTY_TYPES)
    mode = random.choices(["sale", "rent", "lease"], weights=[58, 38, 4], k=1)[0]
    price, price_per, rental_period = gen_price(ptype, mode)

    is_land = ptype in LAND_TYPES
    is_comm = ptype in COMMERCIAL_TYPES

    if is_land:
        rooms = bathrooms = living_rooms = floor_number = floors = None
        area = None
        land_area = round(random.randint(300, 2000) / 10) * 10
        furnished = None
    elif is_comm:
        rooms = None
        bathrooms = random.randint(1, 2)
        living_rooms = None
        area = random.randint(40, 300)
        land_area = None
        floor_number = random.randint(0, 5)
        floors = random.randint(2, 10)
        furnished = random.choice(FURNISHED)
    elif ptype == "studio":
        rooms = 1
        bathrooms = 1
        living_rooms = 0
        area = random.randint(35, 70)
        land_area = None
        floor_number = random.randint(0, 8)
        floors = random.randint(3, 10)
        furnished = random.choice(FURNISHED)
    elif ptype in ("villa", "house", "palace"):
        rooms = random.randint(4, 7)
        bathrooms = random.randint(3, 6)
        living_rooms = random.randint(1, 3)
        area = random.randint(200, 700)
        land_area = random.randint(300, 1000)
        floor_number = None
        floors = random.randint(2, 3)
        furnished = random.choice(FURNISHED)
    else:  # apartment / floor / roof
        rooms = random.randint(2, 4)
        bathrooms = random.randint(1, 3)
        living_rooms = random.randint(1, 2)
        area = random.randint(90, 230)
        land_area = None
        floor_number = random.randint(0, 10)
        floors = random.randint(3, 12)
        furnished = random.choice(FURNISHED)

    status = random.choices(
        ["active", "pending_review", "draft", "sold", "rented"],
        weights=[84, 7, 5, 2, 2], k=1,
    )[0]

    listing_name = f"{AR_TYPE[ptype]} {AR_MODE[mode]} في {district}"

    return {
        "created_by": random.choice(user_ids),
        "listing_name": listing_name,
        "listing_direction": "offering",
        "property_type": ptype,
        "transaction_mode": mode,
        "rental_period": rental_period,
        "price": price,
        "price_currency": "JOD",
        "price_negotiable": random.random() < 0.7,
        "price_per": price_per,
        "country": "JO",
        "city": city,
        "district": district,
        "latitude": round(lat_c + random.uniform(-0.04, 0.04), 7),
        "longitude": round(lng_c + random.uniform(-0.04, 0.04), 7),
        "location_accuracy": random.choice(["approximate", "district_level", "exact"]),
        "area_sqm": area,
        "land_area_sqm": land_area,
        "rooms": rooms,
        "bathrooms": bathrooms,
        "living_rooms": living_rooms,
        "floor_number": floor_number,
        "floors_in_building": floors,
        "furnished_status": furnished,
        "parking": None if is_land else random.random() < 0.7,
        "parking_count": None if is_land else random.randint(0, 2),
        "has_elevator": None if (is_land or ptype == "studio") else random.random() < 0.5,
        "has_garden": None if is_land else random.random() < 0.3,
        "has_pool": None if is_land else random.random() < 0.1,
        "building_age_years": None if is_land else random.randint(0, 25),
        "condition": None if is_land else random.choice(CONDITIONS),
        "view_type": random.choice(VIEWS),
        "status": status,
        "verified": status == "active" and random.random() < 0.6,
        "contact_preference": random.choice(CONTACT_PREFS),
        "broker_listing": random.random() < 0.4,
        "listing_expires_at": (datetime.now(timezone.utc) + timedelta(days=random.randint(30, 90)))
        if status == "active" else None,
    }


# ---------------------------------------------------------------------------
# Descriptions
# ---------------------------------------------------------------------------

def facts_ar(p: dict) -> str:
    bits = [f"{AR_TYPE[p['property_type']]} {AR_MODE[p['transaction_mode']]}",
            f"في {p['district']}، {p['city']}"]
    if p["area_sqm"]:
        bits.append(f"المساحة {p['area_sqm']} م²")
    if p["land_area_sqm"]:
        bits.append(f"مساحة الأرض {p['land_area_sqm']} م²")
    if p["rooms"]:
        bits.append(f"{p['rooms']} غرف نوم")
    if p["bathrooms"]:
        bits.append(f"{p['bathrooms']} حمام")
    if p["furnished_status"] == "furnished":
        bits.append("مفروشة")
    elif p["furnished_status"] == "unfurnished":
        bits.append("غير مفروشة")
    if p.get("parking"):
        bits.append("يوجد موقف سيارات")
    if p.get("has_elevator"):
        bits.append("مصعد")
    if p.get("has_garden"):
        bits.append("حديقة")
    if p.get("has_pool"):
        bits.append("مسبح")
    if p["view_type"] and "بدون" not in p["view_type"]:
        bits.append(p["view_type"])
    unit = "دينار/شهر" if p["price_per"] == "per_month" else "دينار"
    bits.append(f"السعر {p['price']:,} {unit}")
    return "، ".join(bits) + "."


def template_description(p: dict) -> str:
    return facts_ar(p)


class GemmaWriter:
    def __init__(self, path: str):
        from llama_cpp import Llama
        print(f"Loading model: {path} ...", flush=True)
        self.llm = Llama(model_path=path, n_ctx=2048, n_threads=os.cpu_count(),
                         verbose=False)

    def describe(self, p: dict) -> str:
        prompt = (
            "اكتب وصفاً تسويقياً قصيراً وجذاباً لإعلان عقاري باللهجة العربية الفصحى "
            "المبسطة، من جملتين إلى ثلاث جمل فقط، دون مقدمات ودون تكرار السعر بالأرقام، "
            "بناءً على المعطيات التالية:\n"
            f"{facts_ar(p)}\n\nالوصف:"
        )
        try:
            out = self.llm.create_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=160, temperature=0.8, top_p=0.95,
            )
            text = out["choices"][0]["message"]["content"].strip()
            return text or template_description(p)
        except Exception as e:  # noqa: BLE001
            print(f"  (llm fallback: {e})", flush=True)
            return template_description(p)


# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------

PROPERTY_COLS = [
    "created_by", "listing_name", "listing_direction", "property_type",
    "transaction_mode", "rental_period", "price", "price_currency",
    "price_negotiable", "price_per", "country", "city", "district",
    "latitude", "longitude", "location_accuracy", "area_sqm", "land_area_sqm",
    "rooms", "bathrooms", "living_rooms", "floor_number", "floors_in_building",
    "furnished_status", "parking", "parking_count", "has_elevator",
    "has_garden", "has_pool", "building_age_years", "condition", "view_type",
    "description", "status", "verified", "contact_preference",
    "broker_listing", "listing_expires_at",
]


def create_users(cur, n: int) -> list[str]:
    ids = []
    used_phones = set()
    for _ in range(n):
        while True:
            phone = "+9627" + str(random.randint(70000000, 99999999))
            if phone not in used_phones:
                used_phones.add(phone)
                break
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} {SEED_TAG}"
        role = random.choices(["seller", "broker"], weights=[6, 4], k=1)[0]
        cur.execute(
            "INSERT INTO users (phone, name, role, market, language, "
            "verification_status, status) VALUES (%s,%s,%s,'JO','ar','verified','active') "
            "RETURNING id",
            (phone, name, role),
        )
        ids.append(cur.fetchone()[0])
    return ids


def wipe(cur):
    cur.execute(
        "DELETE FROM properties WHERE created_by IN "
        "(SELECT id FROM users WHERE name LIKE %s)", (f"%{SEED_TAG}",))
    deleted_props = cur.rowcount
    cur.execute("DELETE FROM users WHERE name LIKE %s", (f"%{SEED_TAG}",))
    print(f"Wiped {deleted_props} seeded properties and {cur.rowcount} seeded users.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=200)
    ap.add_argument("--users", type=int, default=25)
    ap.add_argument("--no-llm", action="store_true")
    ap.add_argument("--wipe", action="store_true")
    args = ap.parse_args()

    writer = None if args.no_llm else GemmaWriter(GEMMA_PATH)

    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            if args.wipe:
                wipe(cur)
                conn.commit()

            print(f"Creating {args.users} owner users ...", flush=True)
            user_ids = create_users(cur, args.users)

            print(f"Generating {args.count} listings ...", flush=True)
            placeholders = ",".join(["%s"] * len(PROPERTY_COLS))
            insert_sql = (
                f"INSERT INTO properties ({','.join(PROPERTY_COLS)}) "
                f"VALUES ({placeholders})"
            )
            for i in range(1, args.count + 1):
                p = gen_listing(user_ids)
                p["description"] = (writer.describe(p) if writer
                                    else template_description(p))
                cur.execute(insert_sql, [p[c] for c in PROPERTY_COLS])
                if i % 10 == 0:
                    conn.commit()
                    print(f"  {i}/{args.count}", flush=True)
            conn.commit()

    print("Done. Seeded the properties table.")


if __name__ == "__main__":
    sys.exit(main())
