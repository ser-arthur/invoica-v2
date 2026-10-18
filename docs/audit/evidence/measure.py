"""Phase 0 audit evidence: runs the current Invoica code on example inputs and
records what it does. Read-only with respect to the app: it imports the app
from a clean copy (no .env), points it at a throwaway database, and drives it
through Flask's test client. The editor's JavaScript money code is run in Node
from the same template file (editor_js.js).

Usage:
  python measure.py flows <appdir> <database_url> <out.json>
  python measure.py seed  <appdir> <database_url> <out.json>
"""
import io
import json
import os
import re
import subprocess
import sys
from html.parser import HTMLParser

MODE, APPDIR, DB_URL, OUT = sys.argv[1:5]
HERE = os.path.dirname(os.path.abspath(__file__))
BASE_HTML = os.path.join(APPDIR, "templates", "base.html")

os.environ["DATABASE_URL"] = DB_URL
os.environ["SECRET_KEY"] = "audit-only-value"
for k in ("PDF_API_KEY", "EXCHANGE_RATE_API_KEY", "MAIL_SERVER"):
    os.environ.pop(k, None)
sys.path.insert(0, APPDIR)
os.chdir(APPDIR)

import app as appmod  # noqa: E402
from models import db, Invoice, LineItem, Client, CompanyDetails, User  # noqa: E402
from utils.filters import format_currency_for_jinja as py_fmt  # noqa: E402

app = appmod.app
app.config["WTF_CSRF_ENABLED"] = False
app.config["PROPAGATE_EXCEPTIONS"] = False

RESULTS = {}


def record(key, **data):
    RESULTS[key] = data
    print(f"\n== {key}")
    for k, v in data.items():
        print(f"   {k}: {v}")


# ---------- helpers ----------

def js(state):
    out = subprocess.run(
        ["node", os.path.join(HERE, "editor_js.js"), BASE_HTML, json.dumps(state)],
        capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)


def visible_text(html):
    html = re.sub(r"<script.*?</script>", " ", html, flags=re.S)
    html = re.sub(r"<style.*?</style>", " ", html, flags=re.S)
    html = re.sub(r"<[^>]+>", " ", html)
    import html as h
    return re.sub(r"\s+", " ", h.unescape(html))


def totals_from_preview(html):
    t = visible_text(html)
    sub = re.search(r"Subtotal:\s*(\S+)", t)
    vat = re.search(r"VAT \((-?\d+)%\):\s*(\S+)", t)
    tot = re.search(r"TOTAL:\s*(\S+)", t)
    disc = re.search(r"Discount:\s*-\s*(\S+)", t)
    ship = re.search(r"Shipping:\s*(\S+)", t)
    return {
        "subtotal": sub and sub.group(1),
        "vat_label": vat and f"VAT ({vat.group(1)}%)",
        "vat": vat and vat.group(2),
        "discount": disc and disc.group(1),
        "shipping": ship and ship.group(1),
        "total": tot and tot.group(1),
    }


def line_rows_from_preview(html):
    # modern template desktop table: description, qty, unit price, line total
    t = visible_text(html)
    return re.findall(r"(\S+) (£[\d,.\-]+) (£[\d,.\-]+)", t)[:6]


class AttrGrab(HTMLParser):
    def __init__(self, name):
        super().__init__()
        self.name, self.found = name, []

    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if k == self.name:
                self.found.append((tag, v, [a for a, _ in attrs]))


def attrs_of(html, name):
    p = AttrGrab(name)
    p.feed(html)
    return p.found


def register(c, username, email, pw="audit-pass-1"):
    return c.post("/register", data={"username": username, "email": email, "password": pw})


def company(c, **kw):
    data = {"company_name": "Audit Co", "base_currency": "GBP"}
    data.update(kw)
    return c.post("/business/settings", data=data)


def submit_invoice(c, state, *, number, date, due="", status="Pending", client_id=None,
                   client_name="Audit Client", path="/invoice/create"):
    """Builds the POST the editor sends: hidden fields come from the editor JS."""
    r = js(state)
    form = {
        "client_id": "" if client_id is None else str(client_id),
        "client_name": "" if client_id else client_name,
        "invoice_number": number,
        "invoice_date": date,
        "due_date": due,
        "status": status,
        "currency_code": state.get("currencyCode", "GBP"),
        "items_json": json.dumps([dict(it, errors={}) for it in state["items"]]),
        "client_custom_fields_json": "[]",
        "action": "list",
        **r["submitted"],
    }
    resp = c.post(path, data=form)
    return r, form, resp


def latest_invoice():
    with app.app_context():
        inv = Invoice.query.order_by(Invoice.id.desc()).first()
        return inv_row(inv)


def inv_row(inv):
    return {
        "id": inv.id, "number": inv.invoice_number, "status": inv.status,
        "vat_rate": inv.vat_rate, "vat_amount": inv.vat_amount,
        "shipping": inv.shipping_charge, "discount": inv.discount_amount,
        "subtotal": inv.subtotal, "total_incl_vat": inv.total_incl_vat,
        "currency": inv.currency_code, "paid_date": str(inv.paid_date),
        "lines": [(li.description, li.quantity, li.unit_price) for li in inv.line_items],
    }


def get_invoice(inv_id):
    with app.app_context():
        return inv_row(db.session.get(Invoice, inv_id))


# ---------- flows ----------

def flows():
    with app.app_context():
        db.drop_all()
        db.create_all()

    a = app.test_client()
    register(a, "alice", "alice@example.test")
    company(a, company_name="Alice Studio", base_currency="GBP")

    # T1: basic totals, 20%
    st = {"items": [{"description": "Design", "quantity": 3, "unitPrice": 33.33},
                    {"description": "Hosting", "quantity": 1, "unitPrice": 10}],
          "shippingCharge": 0, "discountAmount": 0, "vatRate": 20, "currencyCode": "GBP"}
    r, form, resp = submit_invoice(a, st, number="INV-001", date="2026-10-01", due="2026-10-15")
    row = latest_invoice()
    prev = totals_from_preview(a.get(f"/invoice/{row['id']}").get_data(as_text=True))
    record("T1_basic_20pct", editor=r["shown"], submitted=r["submitted"], stored=row, preview=prev)

    # T2: tie rounding, 5% on 12.50
    st = {"items": [{"description": "Item", "quantity": 1, "unitPrice": 12.5}],
          "shippingCharge": 0, "discountAmount": 0, "vatRate": 5, "currencyCode": "GBP"}
    r, form, resp = submit_invoice(a, st, number="INV-002", date="2026-10-01")
    row = latest_invoice()
    prev = totals_from_preview(a.get(f"/invoice/{row['id']}").get_data(as_text=True))
    record("T2_tie_5pct_12_50", editor=r["shown"], stored=row, preview=prev)

    # T3: non-tie float drift, 17.5% on 13.00
    st = {"items": [{"description": "Item", "quantity": 1, "unitPrice": 13}],
          "shippingCharge": 0, "discountAmount": 0, "vatRate": 17.5, "currencyCode": "GBP"}
    r, form, resp = submit_invoice(a, st, number="INV-003", date="2026-10-01")
    row = latest_invoice()
    prev = totals_from_preview(a.get(f"/invoice/{row['id']}").get_data(as_text=True))
    record("T3_17_5pct_on_13", editor=r["shown"], stored=row, preview=prev)

    # T4: discount larger than subtotal plus shipping
    st = {"items": [{"description": "Item", "quantity": 1, "unitPrice": 100}],
          "shippingCharge": 0, "discountAmount": 150, "vatRate": 20, "currencyCode": "GBP"}
    r, form, resp = submit_invoice(a, st, number="INV-004", date="2026-10-01")
    row = latest_invoice()
    prev = totals_from_preview(a.get(f"/invoice/{row['id']}").get_data(as_text=True))
    record("T4_discount_exceeds", editor=r["shown"], editor_total_raw=r["totalWithVat"], stored=row, preview=prev)

    # T5: shipping and discount, VAT base
    st = {"items": [{"description": "Item", "quantity": 2, "unitPrice": 50}],
          "shippingCharge": 10, "discountAmount": 20, "vatRate": 20, "currencyCode": "GBP"}
    r, form, resp = submit_invoice(a, st, number="INV-005", date="2026-10-01")
    row = latest_invoice()
    prev = totals_from_preview(a.get(f"/invoice/{row['id']}").get_data(as_text=True))
    record("T5_shipping_discount", editor=r["shown"], stored=row, preview=prev)

    # T6: fractional quantity
    st = {"items": [{"description": "Consulting hours", "quantity": 1.5, "unitPrice": 40},
                    {"description": "Half day", "quantity": 0.4, "unitPrice": 100}],
          "shippingCharge": 0, "discountAmount": 0, "vatRate": 0, "currencyCode": "GBP"}
    r, form, resp = submit_invoice(a, st, number="INV-006", date="2026-10-01")
    row = latest_invoice()
    html6 = a.get(f"/invoice/{row['id']}").get_data(as_text=True)
    prev = totals_from_preview(html6)
    edit_html = a.get(f"/invoice/edit/{row['id']}").get_data(as_text=True)
    m = re.search(r'invoiceApp\((\{.*?\}), \[', edit_html, flags=re.S)
    init = json.loads(__import__("html").unescape(m.group(1))) if m else {}
    reopened = js({"items": init.get("items", []), "shippingCharge": init.get("shippingCharge", 0),
                   "discountAmount": init.get("discountAmount", 0), "vatRate": init.get("vatRate", 0),
                   "currencyCode": "GBP"})
    record("T6_fractional_quantity", editor=r["shown"], stored=row, preview=prev,
           preview_line_rows=line_rows_from_preview(html6),
           editor_after_reopen=reopened["shown"])

    # T7: edit round trip on the 20% invoice (INV-001, id 1)
    edit_html = a.get("/invoice/edit/1").get_data(as_text=True)
    m = re.search(r'invoiceApp\((\{.*?\}), \[', edit_html, flags=re.S)
    init = json.loads(__import__("html").unescape(m.group(1)))
    st = {"items": init["items"], "shippingCharge": init["shippingCharge"],
          "discountAmount": init["discountAmount"], "vatRate": init["vatRate"], "currencyCode": "GBP"}
    before = get_invoice(1)
    r, form, resp = submit_invoice(a, st, number=init["invoiceNumber"], date=init["invoiceDate"],
                                   due=init["dueDate"], client_id=init["client_id"], path="/invoice/edit/1")
    after = get_invoice(1)
    prev = totals_from_preview(a.get("/invoice/1").get_data(as_text=True))
    record("T7_edit_round_trip", vatRate_loaded_into_editor=init["vatRate"], editor_after_load=r["shown"],
           submitted_vat_rate_value=r["submitted"]["vat_rate_value"],
           before={k: before[k] for k in ("vat_rate", "vat_amount", "total_incl_vat")},
           after={k: after[k] for k in ("vat_rate", "vat_amount", "total_incl_vat")}, preview_after=prev)

    # T8: VAT label truncation
    labels = {}
    for pct in (17.5, 12.5, 29, 21.9, 15):
        st = {"items": [{"description": "Item", "quantity": 1, "unitPrice": 100}],
              "shippingCharge": 0, "discountAmount": 0, "vatRate": pct, "currencyCode": "GBP"}
        n = f"LBL-{str(pct).replace('.', '_')}"
        submit_invoice(a, st, number=n, date="2026-10-01")
        row = latest_invoice()
        prev = totals_from_preview(a.get(f"/invoice/{row['id']}").get_data(as_text=True))
        labels[str(pct)] = {"stored_rate": row["vat_rate"], "label": prev["vat_label"], "vat": prev["vat"]}
    record("T8_vat_label", labels=labels)

    # N1: numbering suggestions shown on a new invoice
    def suggested(c):
        h = c.get("/invoice/create").get_data(as_text=True)
        m = re.search(r'invoiceApp\((\{.*?\}), \[', h, flags=re.S)
        return json.loads(__import__("html").unescape(m.group(1)))["invoiceNumber"]

    b = app.test_client()
    register(b, "bob", "bob@example.test")
    company(b, company_name="Bob Ltd")
    s0 = suggested(b)
    base = {"items": [{"description": "x", "quantity": 1, "unitPrice": 1}], "shippingCharge": 0,
            "discountAmount": 0, "vatRate": 0, "currencyCode": "GBP"}
    submit_invoice(b, base, number="INV-2024-005", date="2026-10-01")
    s1 = suggested(b)
    submit_invoice(b, base, number="PH-010", date="2026-10-01")
    s2 = suggested(b)
    # fallback rule used only when the number field arrives empty
    submit_invoice(b, base, number="", date="2026-10-01")
    fallback = latest_invoice()["number"]
    # duplicate number
    _, _, dup = submit_invoice(b, base, number="PH-010", date="2026-10-01")
    with app.app_context():
        count_ph010 = Invoice.query.filter_by(invoice_number="PH-010").count()
    with app.app_context():
        bob_clients = Client.query.filter_by(user_id=2).count()
    record("N1_numbering", bob_invoices_created_via_new_client_name=bob_clients, first_suggestion=s0, after_INV_2024_005=s1, after_PH_010=s2,
           empty_number_fallback=fallback, duplicate_status=dup.status_code,
           duplicate_redirect=dup.headers.get("Location"), rows_with_PH_010=count_ph010)

    # S1: statuses through the UI
    c = app.test_client()
    register(c, "carol", "carol@example.test")
    company(c, company_name="Carol & Co")
    st = {"items": [{"description": "Work", "quantity": 1, "unitPrice": 500}], "shippingCharge": 0,
          "discountAmount": 0, "vatRate": 0, "currencyCode": "GBP"}
    submit_invoice(c, st, number="INV-001", date="2026-08-01", due="2026-08-31", status="Pending")
    pending_past_due = latest_invoice()
    with app.app_context():
        cs = db.session.get(Invoice, pending_past_due["id"]).computed_status
    dash = visible_text(c.get("/dashboard").get_data(as_text=True))
    owed = re.search(r"Total Owed To You (\S+)", dash).group(1)
    overdue = re.search(r"Overdue Invoices (\d+)", dash).group(1)
    clients_html = c.get("/clients").get_data(as_text=True)
    m = re.search(r"clientListPage\((\[.*?\]), (\{.*?\})", clients_html, flags=re.S)
    client_outstanding = json.loads(m.group(2)) if m else None
    # mark paid through the list page endpoint, then edit and save
    mp = c.post(f"/api/invoice/{pending_past_due['id']}/mark-paid")
    after_paid = get_invoice(pending_past_due["id"])
    edit_html = c.get(f"/invoice/edit/{pending_past_due['id']}").get_data(as_text=True)
    m = re.search(r'invoiceApp\((\{.*?\}), \[', edit_html, flags=re.S)
    init = json.loads(__import__("html").unescape(m.group(1)))
    st2 = {"items": init["items"], "shippingCharge": init["shippingCharge"], "discountAmount": init["discountAmount"],
           "vatRate": init["vatRate"], "currencyCode": "GBP"}
    submit_invoice(c, st2, number=init["invoiceNumber"], date=init["invoiceDate"], due=init["dueDate"],
                   client_id=init["client_id"], status="Pending", path=f"/invoice/edit/{pending_past_due['id']}")
    after_edit = get_invoice(pending_past_due["id"])
    # status typed straight into the form
    submit_invoice(c, st, number="INV-002", date="2026-10-01", status="Paid")
    direct_paid = latest_invoice()
    submit_invoice(c, st, number="INV-003", date="2026-10-01", status="Banana")
    banana = latest_invoice()
    # unused route
    old_route = c.post(f"/invoice/{banana['id']}/mark_paid")
    banana_after = get_invoice(banana["id"])
    record("S1_statuses", saved_status=pending_past_due["status"], computed_status_past_due=cs,
           dashboard_total_owed=owed, dashboard_overdue_count=overdue,
           clients_page_outstanding_map=client_outstanding,
           after_mark_paid={"status": after_paid["status"], "paid_date_set": after_paid["paid_date"] != "None"},
           after_editing_paid_invoice={"status": after_edit["status"], "paid_date": after_edit["paid_date"]},
           status_Paid_from_form={"status": direct_paid["status"], "paid_date": direct_paid["paid_date"]},
           arbitrary_status_accepted=banana["status"], old_mark_paid_route_status=old_route.status_code,
           old_route_result={"status": banana_after["status"], "paid_date": banana_after["paid_date"]})

    # X1: cross-account access
    alice_client_id = 1  # first client created by alice
    with app.app_context():
        ac = db.session.get(Client, alice_client_id)
        ac.email, ac.notes, ac.phone = "private@alice-client.test", "Private note about this client", "+44 7000 000000"
        db.session.commit()
        alice_inv = Invoice.query.filter_by(user_id=1).first().id
    leak = b.get(f"/invoice/create?client_id={alice_client_id}").get_data(as_text=True)
    probes = {
        "GET /invoice/create?client_id=<other>": ("private@alice-client.test" in leak, "Private note about this client" in leak),
    }
    statuses = {}
    for method, path in [("get", f"/invoice/{alice_inv}"), ("get", f"/invoice/edit/{alice_inv}"),
                         ("get", f"/invoice/{alice_inv}/download"), ("post", f"/api/invoice/{alice_inv}/mark-paid"),
                         ("post", f"/invoice/{alice_inv}/mark_paid"), ("get", f"/client/{alice_client_id}"),
                         ("get", f"/clients/edit/{alice_client_id}"), ("post", f"/clients/delete/{alice_client_id}")]:
        resp = getattr(b, method)(path)
        statuses[f"{method.upper()} {path}"] = resp.status_code
    with app.app_context():
        still_unpaid = db.session.get(Invoice, alice_inv).status
    record("X1_cross_account", leak_contains_email_and_note=probes, other_routes_status=statuses,
           alice_invoice_status_after_probes=still_unpaid)

    # X2: logo upload collisions and file types
    up_dir = os.path.join(APPDIR, "static", "uploads", "logos")
    a.post("/business/settings", data={"company_name": "Alice Studio", "base_currency": "GBP",
                                        "company_logo": (io.BytesIO(b"alice-logo-bytes"), "logo.png")},
           content_type="multipart/form-data")
    b.post("/business/settings", data={"company_name": "Bob Ltd", "base_currency": "GBP",
                                        "company_logo": (io.BytesIO(b"bob-logo-bytes"), "logo.png")},
           content_type="multipart/form-data")
    with open(os.path.join(up_dir, "logo.png"), "rb") as f:
        on_disk = f.read()
    with app.app_context():
        logos = [cd.company_logo for cd in CompanyDetails.query.filter(CompanyDetails.user_id.in_([1, 2])).all()]
    r_html = b.post("/business/settings", data={"company_name": "Bob Ltd", "base_currency": "GBP",
                                                 "company_logo": (io.BytesIO(b"<p>audit marker</p>"), "page.html")},
                    content_type="multipart/form-data")
    served = app.test_client().get("/static/uploads/logos/page.html")
    record("X2_logo_upload", alice_and_bob_logo_paths=logos, bytes_on_disk_for_logo_png=on_disk.decode(),
           html_upload_status=r_html.status_code, html_served_status=served.status_code,
           html_served_type=served.headers.get("Content-Type"))

    # X3: apostrophe in a client name
    d = app.test_client()
    register(d, "dee", "dee@example.test")
    company(d, company_name="Dee Ltd")
    submit_invoice(d, base, number="INV-001", date="2026-10-01", client_name="O'Brien Plumbing")
    lst = d.get("/invoices").get_data(as_text=True)
    xd = attrs_of(lst, "x-data")
    target = [v for tag, v, names in xd if v and v.startswith("invoicesPage(")]
    with app.app_context():
        dee_client = Client.query.filter_by(name="O'Brien Plumbing").first().id
    det = d.get(f"/client/{dee_client}").get_data(as_text=True)
    xd2 = [v for tag, v, names in attrs_of(det, "x-data") if v and v.startswith("clientDetailPage(")]
    record("X3_apostrophe", invoices_page_x_data=target[0][:120] if target else None,
           attribute_complete=bool(target and target[0].rstrip().endswith(")")),
           client_detail_x_data=xd2[0][:120] if xd2 else None)

    # A1: authentication behaviour
    e = app.test_client()
    r1 = register(e, "erin", "Erin@Example.test")
    e.get("/logout")
    l1 = e.post("/login", data={"email": "erin@example.test", "password": "audit-pass-1"})
    l1_ok = "Invalid email or password" not in l1.get_data(as_text=True)
    f2 = app.test_client()
    r2 = register(f2, "erin2", "erin@example.test")
    with app.app_context():
        erins = User.query.filter(User.email.ilike("erin@example.test")).count()
    g = app.test_client()
    dup = register(g, "erin", "another@example.test")
    h = app.test_client()
    codes = [h.post("/login", data={"email": "alice@example.test", "password": f"wrong{i}"}).status_code for i in range(30)]
    final = h.post("/login", data={"email": "alice@example.test", "password": "audit-pass-1"})
    send = a.post("/invoices/1/send_email")
    short = app.test_client()
    sp = register(short, "shorty", "short@example.test", pw="123456")
    record("A1_auth", login_with_different_case_succeeds=l1_ok, accounts_for_same_address=erins,
           duplicate_username_status=dup.status_code, thirty_wrong_passwords_statuses=sorted(set(codes)),
           correct_password_after_30_failures=final.status_code, six_char_password_accepted=sp.status_code == 302,
           send_email_status=send.status_code, logout_method="GET")

    # C1: currency conversion on dashboard and lists
    k = app.test_client()
    register(k, "kofi", "kofi@example.test")
    company(k, company_name="Kofi Trading", base_currency="GBP")
    usd = {"items": [{"description": "x", "quantity": 1, "unitPrice": 125}], "shippingCharge": 0,
           "discountAmount": 0, "vatRate": 0, "currencyCode": "USD"}
    ghs = {"items": [{"description": "x", "quantity": 1, "unitPrice": 1000}], "shippingCharge": 0,
           "discountAmount": 0, "vatRate": 0, "currencyCode": "GHS"}
    gbp = {"items": [{"description": "x", "quantity": 1, "unitPrice": 100}], "shippingCharge": 0,
           "discountAmount": 0, "vatRate": 0, "currencyCode": "GBP"}
    k.post("/clients/new", data={"name": "Same Client", "custom_fields_json": "[]"})
    with app.app_context():
        kc = Client.query.filter_by(name="Same Client", user_id=User.query.filter_by(username="kofi").first().id).first().id
    for st_, n in ((usd, "INV-001"), (ghs, "INV-002"), (gbp, "INV-003")):
        submit_invoice(k, st_, number=n, date="2026-10-01", due="2026-12-31", status="Pending", client_id=kc)
    results = {}
    for label, rates in (("rates_unavailable", None), ("hypothetical_rates_USD_1.25_GHS_15", {"USD": 1.25, "GHS": 15.0, "GBP": 1.0})):
        appmod.exchange_rate_cache.clear()
        appmod.get_exchange_rates = (lambda rr: (lambda base: rr))(rates)
        dash = visible_text(k.get("/dashboard").get_data(as_text=True))
        inv_page = visible_text(k.get("/invoices").get_data(as_text=True))
        cl = k.get("/clients").get_data(as_text=True)
        m = re.search(r"clientListPage\((\[.*?\]), (\{.*?\})", cl, flags=re.S)
        det = visible_text(k.get(f"/client/{kc}").get_data(as_text=True))
        results[label] = {
            "dashboard_total_owed": re.search(r"Total Owed To You (\S+)", dash).group(1),
            "invoices_total_billed": re.search(r"Total Billed (\S+)", inv_page).group(1),
            "clients_outstanding_map_raw": json.loads(m.group(2)) if m else None,
            "client_detail_outstanding": re.search(r"Outstanding (\S+)", det).group(1),
        }
    record("C1_currency", **results)

    # D1: dates
    with app.app_context():
        inv = Invoice.query.filter_by(invoice_number="INV-001", user_id=1).first()
        d1 = {"invoice_date_type": type(inv.invoice_date).__name__, "invoice_date_value": str(inv.invoice_date),
              "due_date_type": type(inv.due_date).__name__, "to_dict_invoice_date": inv.to_dict()["invoice_date"]}
    record("D1_dates", **d1)


def seed():
    from seed import seed_data
    with app.app_context():
        db.drop_all()
        db.create_all()
        seed_data()
    out = {}
    for email in ("demo@invoica.com", "global@invoica.com"):
        for label, rates in (("rates_unavailable", None),
                             ("hypothetical_rates", {"EUR": 1.0, "GBP": 0.87, "USD": 1.16, "GHS": 17.0})):
            appmod.get_exchange_rates = (lambda rr: (lambda base: rr))(rates)
            c = app.test_client()
            c.post("/login", data={"email": email, "password": "password123"})
            dash = visible_text(c.get("/dashboard").get_data(as_text=True))
            invp = visible_text(c.get("/invoices").get_data(as_text=True))
            cl = c.get("/clients").get_data(as_text=True)
            m = re.search(r"clientListPage\((\[.*?\]), (\{.*?\}), (\{.*?\}), (\{.*?\}|null)", cl, flags=re.S)
            dh = c.get("/dashboard").get_data(as_text=True)
            chart = re.search(r"dashboardData\((\[.*?\]), (\[.*?\])", dh, flags=re.S)
            out[f"{email} | {label}"] = {
                "dashboard_total_owed": re.search(r"Total Owed To You (\S+)", dash).group(1),
                "dashboard_paid_30d": re.search(r"Paid \(Last 30d\) (\S+)", dash).group(1),
                "dashboard_overdue": re.search(r"Overdue Invoices (\d+)", dash).group(1),
                "invoices_total_billed": re.search(r"Total Billed (\S+)", invp).group(1),
                "invoices_outstanding": re.search(r"Outstanding (\S+)", invp).group(1),
                "clients_outstanding_map": json.loads(m.group(2)) if m else None,
                "clients_top_client": json.loads(m.group(4)) if m else None,
                "chart": (chart.group(1), chart.group(2)) if chart else None,
            }
    with app.app_context():
        u = User.query.filter_by(email="demo@invoica.com").first()
        rows = [inv_row(i) for i in Invoice.query.filter_by(user_id=u.id).order_by(Invoice.id).all()]
        statuses = [(r["number"], r["status"], r["vat_rate"], r["subtotal"], r["vat_amount"], r["total_incl_vat"]) for r in rows]
        first_id = rows[0]["id"]
    c = app.test_client()
    c.post("/login", data={"email": "demo@invoica.com", "password": "password123"})
    prev = totals_from_preview(c.get(f"/invoice/{first_id}").get_data(as_text=True))
    edit_html = c.get(f"/invoice/edit/{first_id}").get_data(as_text=True)
    m = re.search(r'invoiceApp\((\{.*?\}), \[', edit_html, flags=re.S)
    init = json.loads(__import__("html").unescape(m.group(1)))
    reopened = js({"items": init["items"], "shippingCharge": init["shippingCharge"],
                   "discountAmount": init["discountAmount"], "vatRate": init["vatRate"], "currencyCode": "GBP"})
    out["demo invoices"] = statuses
    out["demo first invoice preview"] = prev
    out["demo first invoice reopened in editor"] = reopened["shown"]
    for k, v in out.items():
        print(f"\n== {k}\n   {v}")
    RESULTS.update(out)


if __name__ == "__main__":
    {"flows": flows, "seed": seed}[MODE]()
    with open(OUT, "w") as f:
        json.dump(RESULTS, f, indent=2, default=str)
