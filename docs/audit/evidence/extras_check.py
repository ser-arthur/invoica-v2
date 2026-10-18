"""Further audit evidence, one check per mode. Each mode prints one JSON line.

Usage: python extras_check.py <mode> <appdir> <database_url>
Modes: formats, seed_paths, custom_fields, paid_date, migrated_schema, no_secret_key, duplicate_message
"""
import json
import os
import re
import subprocess
import sys

MODE, APPDIR, DB_URL = sys.argv[1:4]
HERE = os.path.dirname(os.path.abspath(__file__))
os.environ["DATABASE_URL"] = DB_URL
if MODE == "no_secret_key":
    os.environ.pop("SECRET_KEY", None)
else:
    os.environ["SECRET_KEY"] = "audit-only-value"
for k in ("PDF_API_KEY", "EXCHANGE_RATE_API_KEY"):
    os.environ.pop(k, None)
sys.path.insert(0, APPDIR)
os.chdir(APPDIR)

import app as m  # noqa: E402
from models import db, Invoice, Client, ClientCustomField  # noqa: E402
from utils.filters import format_currency_for_jinja as fmt  # noqa: E402

m.app.config["WTF_CSRF_ENABLED"] = False
m.app.config["PROPAGATE_EXCEPTIONS"] = False


def out(**kw):
    print(json.dumps({"mode": MODE, **kw}, default=str))


def form(number, items, rate="0.0000", client_id=None, status="Pending", fields="[]", date="2026-10-01", due=""):
    return {"client_id": "" if client_id is None else str(client_id), "client_name": "" if client_id else "C",
            "invoice_number": number, "invoice_date": date, "due_date": due, "status": status,
            "currency_code": "GBP", "items_json": json.dumps(items), "client_custom_fields_json": fields,
            "action": "list", "subtotal": "0", "discount_amount": "0.00", "shipping_charge": "0.00",
            "vat_rate_value": rate}


def editor_init(c, inv_id):
    h = c.get(f"/invoice/edit/{inv_id}").get_data(as_text=True)
    mm = re.search(r'invoiceApp\((\{.*?\}), (\[.*?\]), \[', h, flags=re.S)
    import html as hh
    return json.loads(hh.unescape(mm.group(1))), json.loads(hh.unescape(mm.group(2)))


def js(state):
    r = subprocess.run(["node", os.path.join(HERE, "editor_js.js"), os.path.join(APPDIR, "templates", "base.html"),
                        json.dumps(state)], capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def fresh_user(c):
    c.post("/register", data={"username": "x", "email": "x@example.test", "password": "abcdef"})
    c.post("/business/settings", data={"company_name": "X", "base_currency": "GBP"})


if MODE == "formats":
    node = subprocess.run(["node", "-e", """
const f=(v,c)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:c}).format(v);
const d=(s,tz)=>new Date(s).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:tz});
console.log(JSON.stringify({
  browser_15_275:f(15.275,'GBP'), browser_sum_3x15_275:f(15.275*3,'GBP'), browser_0_625:f(0.625,'GBP'),
  browser_2_275:f(2.275,'GBP'), browser_GHS_1000:f(1000,'GHS'), browser_XOF_1000:f(1000,'XOF'), browser_minus_50:f(-50,'GBP'),
  due_2026_10_18_London:d('2026-10-18','Europe/London'), due_2026_10_18_NewYork:d('2026-10-18','America/New_York'),
  issued_2026_10_01T00Z_London:d('2026-10-01T00:00:00+00:00','Europe/London'),
  issued_2026_10_01T00Z_NewYork:d('2026-10-01T00:00:00+00:00','America/New_York')}));"""],
        capture_output=True, text=True, check=True)
    s = 15.275 * 3
    out(server_15_275=fmt(15.275), server_sum_3x15_275=fmt(s), server_0_625=fmt(0.625), server_2_275=fmt(2.275),
        server_GHS_1000=fmt(1000, "GHS"), server_XOF_1000=fmt(1000, "XOF"), server_minus_50=fmt(-50),
        **json.loads(node.stdout))

elif MODE == "seed_paths":
    from seed import seed_data
    with m.app.app_context():
        db.drop_all(); db.create_all(); seed_data()
    c = m.app.test_client()
    c.post("/login", data={"email": "demo@invoica.com", "password": "password123"})
    h = c.get("/invoice/create").get_data(as_text=True)
    import html as hh
    suggested = json.loads(hh.unescape(re.search(r'invoiceApp\((\{.*?\}), \[', h, flags=re.S).group(1)))["invoiceNumber"]
    with m.app.app_context():
        first = Invoice.query.filter_by(invoice_number="INV-1001").first().id
    rates = []
    for _ in range(2):
        init, _clients = editor_init(c, first)
        r = js({"items": init["items"], "shippingCharge": init["shippingCharge"], "discountAmount": init["discountAmount"],
                "vatRate": init["vatRate"], "currencyCode": "GBP"})
        f = form(init["invoiceNumber"], init["items"], rate=r["submitted"]["vat_rate_value"], client_id=init["client_id"],
                 date=init["invoiceDate"], due=init["dueDate"])
        c.post(f"/invoice/edit/{first}", data=f)
        with m.app.app_context():
            inv = db.session.get(Invoice, first)
            rates.append({"editor_label": r["shown"]["vatLabel"], "sent": r["submitted"]["vat_rate_value"],
                          "stored_rate": inv.vat_rate, "stored_total": inv.total_incl_vat})
    out(seed_suggested_next_number=suggested, seeded_invoice_two_edits=rates)

elif MODE == "custom_fields":
    with m.app.app_context():
        db.drop_all(); db.create_all()
    c = m.app.test_client(); fresh_user(c)
    c.post("/clients/new", data={"name": "Acme", "custom_fields_json": json.dumps([{"label": "VAT number", "value": "GB123"}])})
    with m.app.app_context():
        cid = Client.query.filter_by(name="Acme").first().id
        before = ClientCustomField.query.filter_by(client_id=cid).count()
    c.post("/invoice/create", data=form("INV-001", [{"description": "x", "quantity": 1, "unitPrice": 10}], client_id=cid))
    with m.app.app_context():
        inv_id = Invoice.query.first().id
    init, clients = editor_init(c, inv_id)
    # the editor's selectClient copies client.custom_fields from this list
    keys = sorted(clients[0].keys()) if clients else []
    c.post(f"/invoice/edit/{inv_id}", data=form("INV-001", init["items"], client_id=cid, fields="[]"))
    with m.app.app_context():
        after = ClientCustomField.query.filter_by(client_id=cid).count()
    out(fields_before=before, edit_page_initial_custom_fields=init["clientCustomFields"],
        client_list_keys_sent_to_editor=keys, has_custom_fields_key="custom_fields" in keys,
        fields_after_saving_invoice_with_editor_value="[]", fields_after=after)

elif MODE == "paid_date":
    from datetime import datetime, timezone
    with m.app.app_context():
        db.drop_all(); db.create_all()
        tz = db.session.execute(db.text("show timezone")).scalar()
    c = m.app.test_client(); fresh_user(c)
    c.post("/invoice/create", data=form("INV-001", [{"description": "x", "quantity": 1, "unitPrice": 10}]))
    with m.app.app_context():
        inv_id = Invoice.query.first().id
    clicked = datetime.now(timezone.utc)
    c.post(f"/api/invoice/{inv_id}/mark-paid")
    with m.app.app_context():
        stored = db.session.get(Invoice, inv_id).paid_date
    out(session_timezone=tz, clicked_utc=clicked.strftime("%Y-%m-%d %H:%M"), stored=stored.strftime("%Y-%m-%d %H:%M"))

elif MODE == "migrated_schema":
    # expects a database already built with `flask db upgrade`
    with m.app.app_context():
        db.session.execute(db.text("delete from \"user\" where email='x@example.test'")); db.session.commit()
    c = m.app.test_client()
    reg = c.post("/register", data={"username": "x", "email": "x@example.test", "password": "abcdef"})
    codes = {p: c.get(p).status_code for p in ("/", "/pricing", "/help", "/dashboard", "/invoices", "/clients")}
    with m.app.app_context():
        db.session.execute(db.text("delete from \"user\" where email='x@example.test'")); db.session.commit()
    out(register_status=reg.status_code, signed_in_status=codes)

elif MODE == "no_secret_key":
    c = m.app.test_client()
    out(anonymous_status={p: c.get(p).status_code for p in ("/", "/login", "/register", "/pricing", "/help")})

elif MODE == "duplicate_message":
    with m.app.app_context():
        db.drop_all(); db.create_all()
    c = m.app.test_client(); fresh_user(c)
    f = form("INV-001", [{"description": "x", "quantity": 1, "unitPrice": 10}])
    c.post("/invoice/create", data=f); c.post("/invoice/create", data=f)
    with c.session_transaction() as s:
        msg = [mm for cat, mm in s.get("_flashes", []) if cat == "error"][0]
    out(length=len(msg), contains_sql="INSERT INTO invoice" in msg, contains_parameters="[parameters:" in msg,
        start=msg[:90])

elif MODE == "w6_reopen_save":
    with m.app.app_context():
        db.drop_all(); db.create_all()
    c = m.app.test_client(); fresh_user(c)
    items = [{"description": "Consulting hours", "quantity": 1.5, "unitPrice": 40},
             {"description": "Half day", "quantity": 0.4, "unitPrice": 100}]
    c.post("/invoice/create", data=form("INV-006", items))
    with m.app.app_context():
        inv_id = Invoice.query.first().id
    init, _ = editor_init(c, inv_id)
    resp = c.post(f"/invoice/edit/{inv_id}", data=form("INV-006", init["items"], client_id=init["client_id"]))
    import html as hh
    errs = re.findall(r"Error: [^<\n]+", hh.unescape(resp.get_data(as_text=True)))[:1]
    with m.app.app_context():
        inv = db.session.get(Invoice, inv_id)
        after = {"total": inv.total_incl_vat, "quantities": [li.quantity for li in inv.line_items]}
    out(reopened_quantities=[i["quantity"] for i in init["items"]], save_errors=errs, after=after)
