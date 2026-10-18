"""Shows what a user sees when saving an invoice with a number already in use."""
import os, sys, json, re, html
APPDIR, DB_URL = sys.argv[1:3]
os.environ["DATABASE_URL"] = DB_URL; os.environ["SECRET_KEY"] = "audit-only-value"
sys.path.insert(0, APPDIR); os.chdir(APPDIR)
import app as m
from models import db
m.app.config["WTF_CSRF_ENABLED"] = False
with m.app.app_context():
    db.drop_all(); db.create_all()
c = m.app.test_client()
c.post("/register", data={"username": "t", "email": "t@example.test", "password": "abcdef"})
c.post("/business/settings", data={"company_name": "T", "base_currency": "GBP"})
form = {"client_id": "", "client_name": "C", "invoice_number": "INV-001", "invoice_date": "2026-10-01",
        "due_date": "", "status": "Pending", "currency_code": "GBP",
        "items_json": json.dumps([{"description": "x", "quantity": 1, "unitPrice": 10}]),
        "client_custom_fields_json": "[]", "action": "list", "subtotal": "10.00",
        "discount_amount": "0.00", "shipping_charge": "0.00", "vat_rate_value": "0.0000"}
c.post("/invoice/create", data=form)
c.post("/invoice/create", data=form)
with c.session_transaction() as s:
    msgs = s.get("_flashes", [])
for cat, msg in msgs:
    print(cat, "|", msg[:400].replace("\n", " "))
