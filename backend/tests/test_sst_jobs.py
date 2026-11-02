# SST Job Management API regression tests (jobs CRUD, validation, numbering, costs, history, recycle, dashboard, reports, settings)
import os
import re
import concurrent.futures
from datetime import date, timedelta
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
TODAY = date.today().isoformat()
CREATED = []


def mk_wedding(**kw):
    p = {"category": "wedding", "customer_name": "TEST_Wed", "contact_number": "9876543210", "date": TODAY,
         "quantity": 500, "card_cost": 10000, "printing_cost": 2500, "discount": 500, "advance": 4000}
    p.update(kw)
    return p


def mk_other(**kw):
    p = {"category": "other", "customer_name": "TEST_Other", "contact_number": "+91 98765-43210", "date": TODAY,
         "job_type": "Flex Banner", "quantity": 3, "amount": 2000, "advance": 500}
    p.update(kw)
    return p


def create(p):
    r = requests.post(f"{API}/jobs", json=p)
    if r.status_code == 201:
        CREATED.append(r.json()["id"])
    return r


@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    try:
        from pymongo import MongoClient
        from dotenv import dotenv_values
        env = dotenv_values("/app/backend/.env")
        MongoClient(env["MONGO_URL"])[env["DB_NAME"]].jobs.delete_many({"id": {"$in": CREATED}})
    except Exception as e:
        print("cleanup failed", e)


# --- Create & read
class TestCreate:
    def test_wedding_create(self):
        r = create(mk_wedding())
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["total_amount"] == 12000 and d["balance"] == 8000
        assert d["status"] == "Pending" and d["costs_recorded"] is False
        assert d["actual_profit"] is None and d["profit_margin"] is None
        assert re.match(rf"^SST-{date.today().year}-\d{{3,}}$", d["job_number"])
        assert "_id" not in d
        g = requests.get(f"{API}/jobs/{d['id']}")
        assert g.status_code == 200 and g.json()["job_number"] == d["job_number"]

    def test_other_create(self):
        r = create(mk_other())
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["total_amount"] == 2000 and d["balance"] == 1500 and d["job_type"] == "Flex Banner"
        assert "card_cost" not in d

    def test_discount_optional(self):
        p = mk_wedding(); p.pop("discount")
        r = create(p)
        assert r.status_code == 201 and r.json()["total_amount"] == 12500

    @pytest.mark.parametrize("bad", [
        {"discount": 13000}, {"advance": 12001}, {"card_cost": -1}, {"quantity": 0}, {"quantity": -5},
        {"contact_number": "12ab"}, {"contact_number": "123"}, {"contact_number": "1234567890123456"},
        {"customer_name": "   "}, {"advance": -1},
    ])
    def test_wedding_validation(self, bad):
        r = create(mk_wedding(**bad))
        assert r.status_code in (400, 422), f"{bad} -> {r.status_code} {r.text}"

    @pytest.mark.parametrize("bad", [{"amount": -5}, {"advance": 3000}, {"job_type": ""}, {"amount": None}])
    def test_other_validation(self, bad):
        r = create(mk_other(**bad))
        assert r.status_code in (400, 422), f"{bad} -> {r.status_code}"

    def test_get_404(self):
        assert requests.get(f"{API}/jobs/nonexistent").status_code == 404


# --- Job numbering
class TestNumbering:
    def test_sequential_and_concurrent_unique(self):
        a = create(mk_other(customer_name="TEST_Seq1")).json()["job_number"]
        b = create(mk_other(customer_name="TEST_Seq2")).json()["job_number"]
        assert int(b.split("-")[-1]) == int(a.split("-")[-1]) + 1
        with concurrent.futures.ThreadPoolExecutor(10) as ex:
            rs = list(ex.map(lambda i: create(mk_other(customer_name=f"TEST_Conc{i}")), range(10)))
        assert all(r.status_code == 201 for r in rs)
        nums = [r.json()["job_number"] for r in rs]
        assert len(set(nums)) == 10


# --- Update, costs, history
class TestUpdate:
    def test_update_history_and_costs(self):
        j = create(mk_wedding(customer_name="TEST_Upd")).json()
        r = requests.put(f"{API}/jobs/{j['id']}", json={"card_cost": 11000, "status": "In Progress"})
        assert r.status_code == 200
        d = r.json()
        assert d["total_amount"] == 13000 and d["balance"] == 9000 and d["status"] == "In Progress"
        fields = {h["field"] for h in d["history"]}
        assert {"card_cost", "total_amount", "balance", "status"} <= fields
        cc = [h for h in d["history"] if h["field"] == "card_cost"][0]
        assert cc["old_value"] == 10000 and cc["new_value"] == 11000 and cc["changed_at"]
        # costs
        r = requests.put(f"{API}/jobs/{j['id']}", json={"actual_card_cost": 7000, "actual_printing_cost": 1500})
        d = r.json()
        assert d["costs_recorded"] is True and d["total_production_cost"] == 8500
        assert d["actual_profit"] == 4500 and d["profit_margin"] == round(4500 / 13000 * 100, 2)
        # invalid update
        r = requests.put(f"{API}/jobs/{j['id']}", json={"advance": 99999})
        assert r.status_code == 400
        g = requests.get(f"{API}/jobs/{j['id']}").json()
        assert g["advance"] == 4000

    def test_other_costs(self):
        j = create(mk_other(customer_name="TEST_OC")).json()
        d = requests.put(f"{API}/jobs/{j['id']}", json={"actual_production_cost": 1200}).json()
        assert d["costs_recorded"] and d["actual_profit"] == 800 and d["profit_margin"] == 40.0

    def test_zero_costs_recorded(self):
        # Edge: entering actual cost 0 should still mark costs as recorded
        j = create(mk_other(customer_name="TEST_Zero")).json()
        d = requests.put(f"{API}/jobs/{j['id']}", json={"actual_production_cost": 0}).json()
        assert d["costs_recorded"] is True, "Saving actual cost 0 did not mark costs_recorded"


# --- Recycle bin
class TestRecycle:
    def test_delete_restore(self):
        j = create(mk_other(customer_name="TEST_Del")).json()
        requests.put(f"{API}/jobs/{j['id']}", json={"status": "On Hold"})
        assert requests.delete(f"{API}/jobs/{j['id']}").status_code == 200
        assert requests.delete(f"{API}/jobs/{j['id']}").status_code == 400
        active = [x["id"] for x in requests.get(f"{API}/jobs").json()]
        deleted = [x["id"] for x in requests.get(f"{API}/jobs", params={"deleted": "true"}).json()]
        assert j["id"] not in active and j["id"] in deleted
        assert requests.put(f"{API}/jobs/{j['id']}", json={"status": "Pending"}).status_code == 400
        assert requests.post(f"{API}/jobs/{j['id']}/restore").status_code == 200
        g = requests.get(f"{API}/jobs/{j['id']}").json()
        assert g["job_number"] == j["job_number"] and not g["is_deleted"]
        recs = [h for h in g["history"] if h["field"] == "record"]
        assert [h["new_value"] for h in recs] == ["Deleted", "Restored"]
        assert any(h["field"] == "status" for h in g["history"])


# --- Filters
class TestFilters:
    def test_filters(self):
        j = create(mk_other(customer_name="TEST_FilterUniqueXYZ")).json()
        r = requests.get(f"{API}/jobs", params={"search": "filteruniquexyz"}).json()
        assert len(r) == 1 and r[0]["id"] == j["id"] and "history" not in r[0]
        r = requests.get(f"{API}/jobs", params={"search": j["job_number"]}).json()
        assert any(x["id"] == j["id"] for x in r)
        assert all(x["category"] == "wedding" for x in requests.get(f"{API}/jobs", params={"category": "wedding"}).json())
        assert all(x["status"] == "Pending" for x in requests.get(f"{API}/jobs", params={"status": "Pending"}).json())


# --- Dashboard & overdue
class TestDashboard:
    def test_overdue_and_dashboard(self):
        od = requests.get(f"{API}/settings").json()["overdue_days"]
        old = (date.today() - timedelta(days=od + 1)).isoformat()
        edge = (date.today() - timedelta(days=od)).isoformat()
        a = create(mk_other(customer_name="TEST_Old", date=old)).json()
        b = create(mk_other(customer_name="TEST_Edge", date=edge)).json()
        assert a["overdue"] is True and b["overdue"] is False
        d = requests.put(f"{API}/jobs/{a['id']}", json={"status": "Delivered"}).json()
        assert d["overdue"] is False
        import time
        for _ in range(10):  # retry: other xdist worker may be creating/deleting jobs concurrently
            dash = requests.get(f"{API}/dashboard").json()
            jobs = requests.get(f"{API}/jobs").json()
            if dash["total_jobs"] == len(jobs):
                break
            time.sleep(1)
        assert dash["total_jobs"] == len(jobs)
        assert dash["sales"] == round(sum(j["total_amount"] for j in jobs), 2)
        assert dash["balance"] == round(sum(j["balance"] for j in jobs), 2)
        assert dash["profit"] == round(sum(j["actual_profit"] for j in jobs if j["costs_recorded"]), 2)
        assert dash["overdue_jobs"] == sum(1 for j in jobs if j["overdue"])
        assert sum(dash["status_counts"].values()) == len(jobs)


# --- Reports
class TestReports:
    def test_reports(self):
        d0 = "2019-03-10"
        a = create(mk_other(customer_name="TEST_R1", date=d0, amount=1000, advance=1000)).json()
        b = create(mk_wedding(customer_name="TEST_R2", date=d0, advance=0)).json()
        c = create(mk_other(customer_name="TEST_R3", date="2019-03-11", amount=1000, advance=200)).json()
        x = create(mk_other(customer_name="TEST_R4", date=d0)).json()
        requests.delete(f"{API}/jobs/{x['id']}")
        requests.put(f"{API}/jobs/{a['id']}", json={"actual_production_cost": 600})
        r = requests.get(f"{API}/reports", params={"start": "2019-03-01", "end": "2019-03-31"})
        assert r.status_code == 200
        d = r.json()
        ids = {j["id"] for j in d["jobs"]}
        assert x["id"] not in ids and {a["id"], b["id"], c["id"]} <= ids
        s = d["summary"]
        assert s["jobs"] == 3 and s["sales"] == 14000 and s["profit"] == 400 and s["costed_jobs"] == 1
        assert len(d["daily"]) == 2 and d["monthly"][0]["key"] == "2019-03"
        assert {c_["key"] for c_ in d["categories"]} == {"wedding", "other"}
        p = d["payments"]
        assert p["paid"]["count"] == 1 and p["partial"]["count"] == 1 and p["unpaid"]["count"] == 1
        assert requests.get(f"{API}/reports", params={"start": "2019-03-31", "end": "2019-03-01"}).status_code == 400


# --- Settings
class TestSettings:
    def test_settings_roundtrip(self):
        orig = requests.get(f"{API}/settings").json()
        assert orig["shop_name"]
        new = {**orig, "address": "TEST address"}
        assert requests.put(f"{API}/settings", json=new).status_code == 200
        assert requests.get(f"{API}/settings").json()["address"] == "TEST address"
        assert requests.put(f"{API}/settings", json={**orig, "overdue_days": 0}).status_code == 422
        requests.put(f"{API}/settings", json=orig)
