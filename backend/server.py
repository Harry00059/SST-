from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
import os
import re
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime, timezone, timedelta, date as date_cls
from zoneinfo import ZoneInfo

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
TZ = ZoneInfo(os.environ.get('APP_TIMEZONE', 'Asia/Kolkata'))

app = FastAPI(title="SST Job Management")
api = APIRouter(prefix="/api")

STATUSES = ["Pending", "In Progress", "On Hold", "Completed", "Delivered"]
DONE_STATUSES = ["Completed", "Delivered"]
CONTACT_RE = re.compile(r"^[0-9+\-\s]{7,15}$")

FIELD_LABELS = {
    "customer_name": "Customer Name",
    "contact_number": "Contact Number",
    "date": "Date",
    "job_type": "Type of Job",
    "quantity": "Quantity",
    "card_cost": "Card Cost",
    "printing_cost": "Printing Cost",
    "discount": "Discount",
    "amount": "Amount",
    "total_amount": "Total Amount",
    "advance": "Advance",
    "balance": "Balance",
    "status": "Status",
    "actual_card_cost": "Actual Card Cost",
    "actual_printing_cost": "Actual Printing Cost",
    "actual_production_cost": "Actual Production Cost",
}

DEFAULT_SETTINGS = {
    "shop_name": "SST CARDS AND PRINTERS",
    "address": "",
    "phone": "",
    "email": "",
    "print_footer": "Thank you for your business.",
    "overdue_days": 7,
}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def today_local() -> date_cls:
    return datetime.now(TZ).date()


def r2(v) -> float:
    return round(float(v or 0) + 0.0, 2)


def opt2(v):
    return None if v is None else r2(v)


class JobCreate(BaseModel):
    category: Literal["wedding", "other"]
    customer_name: str = Field(min_length=1, max_length=120)
    contact_number: str
    date: date_cls
    quantity: int = Field(gt=0)
    card_cost: Optional[float] = Field(default=None, ge=0)
    printing_cost: Optional[float] = Field(default=None, ge=0)
    discount: Optional[float] = Field(default=0, ge=0)
    job_type: Optional[str] = Field(default=None, max_length=120)
    amount: Optional[float] = Field(default=None, ge=0)
    advance: float = Field(default=0, ge=0)


class JobUpdate(BaseModel):
    customer_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    contact_number: Optional[str] = None
    date: Optional[date_cls] = None
    quantity: Optional[int] = Field(default=None, gt=0)
    card_cost: Optional[float] = Field(default=None, ge=0)
    printing_cost: Optional[float] = Field(default=None, ge=0)
    discount: Optional[float] = Field(default=None, ge=0)
    job_type: Optional[str] = Field(default=None, max_length=120)
    amount: Optional[float] = Field(default=None, ge=0)
    advance: Optional[float] = Field(default=None, ge=0)
    status: Optional[Literal["Pending", "In Progress", "On Hold", "Completed", "Delivered"]] = None
    actual_card_cost: Optional[float] = Field(default=None, ge=0)
    actual_printing_cost: Optional[float] = Field(default=None, ge=0)
    actual_production_cost: Optional[float] = Field(default=None, ge=0)


class SettingsModel(BaseModel):
    shop_name: str = Field(min_length=1, max_length=120)
    address: str = ""
    phone: str = ""
    email: str = ""
    print_footer: str = ""
    overdue_days: int = Field(default=7, ge=1, le=365)


def compute(doc: dict) -> dict:
    """Validate inputs and recompute all derived financial fields in place."""
    if not doc.get("customer_name", "").strip():
        raise HTTPException(400, "Customer name is required")
    doc["customer_name"] = doc["customer_name"].strip()
    contact = doc.get("contact_number", "") or ""
    if not CONTACT_RE.match(contact) or not 7 <= sum(c.isdigit() for c in contact) <= 15:
        raise HTTPException(400, "Contact number must be 7-15 digits")
    if doc["category"] == "wedding":
        if doc.get("card_cost") is None or doc.get("printing_cost") is None:
            raise HTTPException(400, "Card cost and printing cost are required")
        doc["card_cost"] = r2(doc["card_cost"])
        doc["printing_cost"] = r2(doc["printing_cost"])
        doc["discount"] = r2(doc.get("discount") or 0)
        gross = doc["card_cost"] + doc["printing_cost"]
        if doc["discount"] > gross:
            raise HTTPException(400, "Discount cannot exceed card cost + printing cost")
        doc["total_amount"] = r2(gross - doc["discount"])
        doc["actual_card_cost"] = opt2(doc.get("actual_card_cost"))
        doc["actual_printing_cost"] = opt2(doc.get("actual_printing_cost"))
        doc["total_production_cost"] = r2((doc["actual_card_cost"] or 0) + (doc["actual_printing_cost"] or 0))
    else:
        if not (doc.get("job_type") or "").strip():
            raise HTTPException(400, "Type of job is required")
        if doc.get("amount") is None:
            raise HTTPException(400, "Amount is required")
        doc["job_type"] = doc["job_type"].strip()
        doc["amount"] = r2(doc["amount"])
        doc["total_amount"] = doc["amount"]
        doc["actual_production_cost"] = opt2(doc.get("actual_production_cost"))
        doc["total_production_cost"] = r2(doc["actual_production_cost"])
    doc["advance"] = r2(doc.get("advance"))
    if doc["advance"] > doc["total_amount"]:
        raise HTTPException(400, "Advance cannot exceed total amount")
    doc["balance"] = r2(doc["total_amount"] - doc["advance"])
    if doc.get("costs_recorded"):
        doc["actual_profit"] = r2(doc["total_amount"] - doc["total_production_cost"])
        doc["profit_margin"] = r2(doc["actual_profit"] / doc["total_amount"] * 100) if doc["total_amount"] else 0.0
    else:
        doc["actual_profit"] = None
        doc["profit_margin"] = None
    return doc


async def get_settings() -> dict:
    s = await db.settings.find_one({"_id": "app"}, {"_id": 0})
    return {**DEFAULT_SETTINGS, **(s or {})}


def is_overdue(job: dict, overdue_days: int) -> bool:
    if job["status"] in DONE_STATUSES:
        return False
    return date_cls.fromisoformat(job["date"]) < today_local() - timedelta(days=overdue_days)


async def next_job_number() -> str:
    year = today_local().year
    c = await db.counters.find_one_and_update(
        {"_id": f"job-{year}"}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
    )
    return f"SST-{year}-{c['seq']:03d}"


async def fetch_job(job_id: str) -> dict:
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    return job


def with_flags(job: dict, overdue_days: int) -> dict:
    job["overdue"] = (not job.get("is_deleted")) and is_overdue(job, overdue_days)
    return job


@api.get("/")
async def root():
    return {"message": "SST Job Management API"}


@api.post("/jobs", status_code=201)
async def create_job(payload: JobCreate):
    data = payload.model_dump()
    data["date"] = data["date"].isoformat()
    if data["category"] == "wedding":
        data.pop("job_type"); data.pop("amount")
    else:
        for k in ("card_cost", "printing_cost", "discount"):
            data.pop(k)
    data["costs_recorded"] = False
    compute(data)
    ts = now_iso()
    data.update({
        "id": str(uuid.uuid4()), "status": "Pending", "history": [],
        "is_deleted": False, "deleted_at": None, "created_at": ts, "updated_at": ts,
    })
    for _ in range(5):
        data["job_number"] = await next_job_number()
        try:
            await db.jobs.insert_one(data)
            break
        except DuplicateKeyError:
            continue
    else:
        raise HTTPException(500, "Could not allocate a unique job number")
    data.pop("_id", None)
    return with_flags(data, (await get_settings())["overdue_days"])


@api.get("/jobs")
async def list_jobs(
    deleted: bool = False,
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
):
    q = {"is_deleted": deleted}
    if status and status in STATUSES:
        q["status"] = status
    if category in ("wedding", "other"):
        q["category"] = category
    if search:
        rx = {"$regex": re.escape(search.strip()), "$options": "i"}
        q["$or"] = [{"customer_name": rx}, {"job_number": rx}, {"contact_number": rx}, {"job_type": rx}]
    sort_key = "deleted_at" if deleted else "created_at"
    jobs = await db.jobs.find(q, {"_id": 0, "history": 0}).sort(sort_key, -1).to_list(5000)
    od = (await get_settings())["overdue_days"]
    return [with_flags(j, od) for j in jobs]


@api.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = await fetch_job(job_id)
    return with_flags(job, (await get_settings())["overdue_days"])


@api.put("/jobs/{job_id}")
async def update_job(job_id: str, payload: JobUpdate):
    job = await fetch_job(job_id)
    if job.get("is_deleted"):
        raise HTTPException(400, "Restore the job from the Recycle Bin before editing")
    changes = payload.model_dump(exclude_unset=True)
    if "date" in changes and changes["date"] is not None:
        changes["date"] = changes["date"].isoformat()
    allowed = ({"card_cost", "printing_cost", "discount", "actual_card_cost", "actual_printing_cost"}
               if job["category"] == "wedding" else {"job_type", "amount", "actual_production_cost"})
    common = {"customer_name", "contact_number", "date", "quantity", "advance", "status"}
    changes = {k: v for k, v in changes.items() if v is not None and k in (allowed | common)}
    if not changes:
        return with_flags(job, (await get_settings())["overdue_days"])
    new = {**job, **changes}
    if any(k.startswith("actual_") for k in changes):
        new["costs_recorded"] = True
    compute(new)
    ts = now_iso()
    entries = []
    for field, label in FIELD_LABELS.items():
        old_v, new_v = job.get(field), new.get(field)
        if field in job or field in changes:
            if old_v != new_v:
                entries.append({"id": str(uuid.uuid4()), "field": field, "field_label": label,
                                "old_value": old_v, "new_value": new_v, "changed_at": ts})
    if not entries and new.get("costs_recorded") == job.get("costs_recorded"):
        return with_flags(job, (await get_settings())["overdue_days"])
    new["updated_at"] = ts
    new["history"] = job.get("history", []) + entries
    await db.jobs.replace_one({"id": job_id}, new)
    return with_flags(new, (await get_settings())["overdue_days"])


async def _set_deleted(job_id: str, deleted: bool):
    job = await fetch_job(job_id)
    if job.get("is_deleted") == deleted:
        raise HTTPException(400, "Job is already deleted" if deleted else "Job is not in the Recycle Bin")
    ts = now_iso()
    entry = {"id": str(uuid.uuid4()), "field": "record", "field_label": "Record",
             "old_value": "Active" if deleted else "Deleted", "new_value": "Deleted" if deleted else "Restored",
             "changed_at": ts}
    await db.jobs.update_one({"id": job_id}, {
        "$set": {"is_deleted": deleted, "deleted_at": ts if deleted else None, "updated_at": ts},
        "$push": {"history": entry},
    })
    return {"ok": True, "job_number": job["job_number"]}


@api.delete("/jobs/{job_id}")
async def soft_delete_job(job_id: str):
    return await _set_deleted(job_id, True)


@api.post("/jobs/{job_id}/restore")
async def restore_job(job_id: str):
    return await _set_deleted(job_id, False)


def aggregate(jobs: List[dict]) -> dict:
    sales = sum(j["total_amount"] for j in jobs)
    costed = [j for j in jobs if j.get("costs_recorded")]
    cost = sum(j["total_production_cost"] for j in costed)
    costed_sales = sum(j["total_amount"] for j in costed)
    profit = sum(j["actual_profit"] for j in costed)
    return {
        "jobs": len(jobs),
        "sales": r2(sales),
        "advance": r2(sum(j["advance"] for j in jobs)),
        "balance": r2(sum(j["balance"] for j in jobs)),
        "production_cost": r2(cost),
        "profit": r2(profit),
        "costed_jobs": len(costed),
        "costed_sales": r2(costed_sales),
        "margin": r2(profit / costed_sales * 100) if costed_sales else 0.0,
    }


@api.get("/dashboard")
async def dashboard():
    jobs = await db.jobs.find({"is_deleted": False}, {"_id": 0, "history": 0}).to_list(10000)
    od = (await get_settings())["overdue_days"]
    counts = {s: sum(1 for j in jobs if j["status"] == s) for s in STATUSES}
    overdue = [with_flags(j, od) for j in jobs if is_overdue(j, od)]
    recent = sorted(jobs, key=lambda j: j["created_at"], reverse=True)[:6]
    return {
        "total_jobs": len(jobs),
        "status_counts": counts,
        "overdue_jobs": len(overdue),
        "overdue_list": sorted(overdue, key=lambda j: j["date"])[:6],
        "recent": [with_flags(j, od) for j in recent],
        "overdue_days": od,
        **{k: v for k, v in aggregate(jobs).items() if k != "jobs"},
    }


@api.get("/reports")
async def reports(start: date_cls = Query(...), end: date_cls = Query(...)):
    if end < start:
        raise HTTPException(400, "End date must be on or after start date")
    jobs = await db.jobs.find(
        {"is_deleted": False, "date": {"$gte": start.isoformat(), "$lte": end.isoformat()}},
        {"_id": 0, "history": 0},
    ).sort("date", 1).to_list(10000)
    od = (await get_settings())["overdue_days"]

    def group(keyfn):
        buckets = {}
        for j in jobs:
            buckets.setdefault(keyfn(j), []).append(j)
        return [{"key": k, **aggregate(v)} for k, v in sorted(buckets.items())]

    paid = [j for j in jobs if j["balance"] == 0]
    partial = [j for j in jobs if j["balance"] > 0 and j["advance"] > 0]
    unpaid = [j for j in jobs if j["advance"] == 0 and j["balance"] > 0]
    return {
        "start": start.isoformat(),
        "end": end.isoformat(),
        "summary": aggregate(jobs),
        "daily": group(lambda j: j["date"]),
        "monthly": group(lambda j: j["date"][:7]),
        "categories": group(lambda j: j["category"]),
        "payments": {
            "paid": {"count": len(paid), "amount": r2(sum(j["total_amount"] for j in paid))},
            "partial": {"count": len(partial), "advance": r2(sum(j["advance"] for j in partial)),
                        "balance": r2(sum(j["balance"] for j in partial))},
            "unpaid": {"count": len(unpaid), "balance": r2(sum(j["balance"] for j in unpaid))},
        },
        "jobs": [with_flags(j, od) for j in jobs],
    }


@api.get("/settings")
async def read_settings():
    return await get_settings()


@api.put("/settings")
async def save_settings(payload: SettingsModel):
    data = payload.model_dump()
    await db.settings.update_one({"_id": "app"}, {"$set": data}, upsert=True)
    return data


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("startup")
async def startup():
    await db.jobs.create_index("job_number", unique=True)
    await db.jobs.create_index("id", unique=True)
    await db.jobs.create_index([("is_deleted", 1), ("date", 1)])


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
