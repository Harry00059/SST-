# Iteration 2: Wedding totals never multiplied by quantity; actual cost/profit math; negative & advance>total validation
import os
import pytest
import requests
from datetime import date

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
TODAY = date.today().isoformat()
CREATED = []


def wed(**kw):
    p = {"category": "wedding", "customer_name": "TEST_WedTotals", "contact_number": "9876543210", "date": TODAY,
         "quantity": 500, "card_cost": 5000, "printing_cost": 2000, "discount": 500, "advance": 3000}
    p.update(kw)
    return p


def create(p):
    r = requests.post(f"{API}/jobs", json=p)
    if r.status_code == 201:
        CREATED.append(r.json()["id"])
    return r


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    for i in CREATED:
        requests.delete(f"{API}/jobs/{i}")
    try:
        from pymongo import MongoClient
        from dotenv import dotenv_values
        env = dotenv_values("/app/backend/.env")
        MongoClient(env["MONGO_URL"])[env["DB_NAME"]].jobs.delete_many({"id": {"$in": CREATED}})
    except Exception as e:
        print("cleanup failed", e)


class TestWeddingTotals:
    @pytest.mark.parametrize("qty", [1, 500, 1000])
    def test_total_independent_of_quantity(self, qty):
        r = create(wed(quantity=qty))
        assert r.status_code == 201, r.text
        d = r.json()
        assert d["total_amount"] == 6500 and d["balance"] == 3500
        g = requests.get(f"{API}/jobs/{d['id']}").json()
        assert g["total_amount"] == 6500 and g["balance"] == 3500 and g["quantity"] == qty
        assert "_id" not in g

    def test_quantity_edit_keeps_total(self):
        d = create(wed()).json()
        u = requests.put(f"{API}/jobs/{d['id']}", json={"quantity": 2000})
        assert u.status_code == 200
        assert u.json()["total_amount"] == 6500 and u.json()["balance"] == 3500 and u.json()["quantity"] == 2000

    def test_actual_costs_profit(self):
        d = create(wed()).json()
        u = requests.put(f"{API}/jobs/{d['id']}", json={"actual_card_cost": 3000, "actual_printing_cost": 1500})
        assert u.status_code == 200, u.text
        g = requests.get(f"{API}/jobs/{d['id']}").json()
        assert g["total_production_cost"] == 4500
        assert g["actual_profit"] == 2000
        assert g["profit_margin"] == 30.77
        assert g["card_cost"] == 5000 and g["printing_cost"] == 2000 and g["total_amount"] == 6500
        assert g["costs_recorded"] is True

    def test_selling_edit_recomputes_profit(self):
        d = create(wed()).json()
        requests.put(f"{API}/jobs/{d['id']}", json={"actual_card_cost": 3000, "actual_printing_cost": 1500})
        u = requests.put(f"{API}/jobs/{d['id']}", json={"card_cost": 6000}).json()
        assert u["total_amount"] == 7500 and u["balance"] == 4500 and u["actual_profit"] == 3000
        assert u["profit_margin"] == 40.0

    @pytest.mark.parametrize("field", ["card_cost", "printing_cost", "discount", "advance"])
    def test_negative_create_rejected(self, field):
        r = create(wed(**{field: -1}))
        assert r.status_code in (400, 422)

    def test_negative_other_amount_rejected(self):
        r = create({"category": "other", "customer_name": "TEST_O", "contact_number": "9876543210", "date": TODAY,
                    "job_type": "Flex", "quantity": 1, "amount": -5, "advance": 0})
        assert r.status_code in (400, 422)

    def test_advance_gt_total_rejected(self):
        assert create(wed(advance=6501)).status_code == 400

    @pytest.mark.parametrize("field", ["actual_card_cost", "actual_printing_cost", "card_cost", "advance"])
    def test_negative_update_rejected(self, field):
        d = create(wed()).json()
        r = requests.put(f"{API}/jobs/{d['id']}", json={field: -10})
        assert r.status_code in (400, 422)

    def test_update_advance_gt_total_rejected(self):
        d = create(wed()).json()
        assert requests.put(f"{API}/jobs/{d['id']}", json={"advance": 7000}).status_code == 400

    def test_other_balance(self):
        r = create({"category": "other", "customer_name": "TEST_O", "contact_number": "9876543210", "date": TODAY,
                    "job_type": "Flex", "quantity": 3, "amount": 1500, "advance": 500})
        assert r.status_code == 201 and r.json()["total_amount"] == 1500 and r.json()["balance"] == 1000
