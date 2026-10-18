"""Shows how the stored invoice date depends on the database session time zone."""
import os, sys, json, re
APPDIR, DB_URL = sys.argv[1:3]
os.environ["DATABASE_URL"] = DB_URL; os.environ["SECRET_KEY"] = "audit-only-value"
sys.path.insert(0, APPDIR); os.chdir(APPDIR)
import app as m
from models import db, Invoice
m.app.config["WTF_CSRF_ENABLED"] = False
with m.app.app_context():
    db.drop_all(); db.create_all()
    tz = db.session.execute(db.text("show timezone")).scalar()
c = m.app.test_client()
c.post("/register", data={"username": "t", "email": "t@example.test", "password": "abcdef"})
c.post("/business/settings", data={"company_name": "T", "base_currency": "GBP"})
form = {"client_id": "", "client_name": "C", "invoice_number": "INV-001", "invoice_date": "2026-10-01",
        "due_date": "2026-10-15", "status": "Pending", "currency_code": "GBP",
        "items_json": json.dumps([{"description": "x", "quantity": 1, "unitPrice": 10}]),
        "client_custom_fields_json": "[]", "action": "list", "subtotal": "10.00",
        "discount_amount": "0.00", "shipping_charge": "0.00", "vat_rate_value": "0.0000"}
c.post("/invoice/create", data=form)
with m.app.app_context():
    inv = Invoice.query.first()
    stored = str(inv.invoice_date)
html = c.get(f"/invoice/{inv.id}").get_data(as_text=True)
shown = re.findall(r"\d{2} (?:Sep|Oct) 2026", re.sub(r"<[^>]+>", " ", html))[:2]
print(json.dumps({"session_timezone": tz, "form_date": "2026-10-01", "stored": stored, "preview_dates": shown}))
