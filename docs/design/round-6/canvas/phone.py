"""The recommended options on a phone: line B (the travelling invoice) and the slab as tabs (C)."""
from common import write, esc
from lines import STEPS, TOKENS

# ---------------------------------------------------------------- Line B on a phone: the token beside each numeral
items = []
for i, (name, num, tint, head, lead, img) in enumerate(STEPS[:4]):
    label, bg, fg, svg = TOKENS[i]
    items.append(f'''<div class="pstep">
  <div class="prow"><span class="pnum" style="color:{num}">{i + 1}</span><span class="pname">{esc(name)}</span>
    <span class="ptok t{i}">{svg}</span></div>
  <h3 class="phd">{esc(head[0])} {esc(head[1])}</h3>
  <p class="pld">{esc(lead)}</p>
</div>''')
css = '''
.ph{width:390px;background:#ecefed;font-family:'Onest',sans-serif;color:#09191c;padding:28px 20px 40px;box-sizing:border-box}
.pstep{position:relative;padding:26px 0 30px 0;border-top:1px solid #d6dddb}
.pstep:first-child{border-top:0}
.prow{display:flex;align-items:flex-end;gap:12px}
.pnum{font-family:'Sora';font-weight:800;font-size:56px;line-height:.78;letter-spacing:-.05em}
.pname{font-weight:700;font-size:15px;line-height:1}
.ptok{margin-left:auto;display:block}
.ptok svg{display:block;width:44px;height:55px;filter:drop-shadow(0 8px 12px rgb(9 25 28 / .16))}
.phd{font-family:'Sora';font-weight:800;font-size:28px;line-height:1.08;letter-spacing:-.035em;margin:16px 0 0}
.pld{font-size:16px;line-height:1.55;color:#2f403d;margin:12px 0 0}
@media (prefers-reduced-motion: no-preference){
.ptok{animation:pop 1.6s cubic-bezier(.3,1.5,.5,1) infinite alternate}
.t1{animation-delay:.2s}.t2{animation-delay:.4s}.t3{animation-delay:.6s}
@keyframes pop{0%,40%{transform:scale(.6) rotate(-8deg);opacity:0}70%,100%{transform:none;opacity:1}}
}
'''
write('LinePhoneB', 'Line B on a phone', 390, 1170, f'<div class="ph">{"".join(items)}</div>', css, ('Sora', 'Onest'))

# ---------------------------------------------------------------- Slab C on a phone: tabs over one readable piece
body = '''<div class="ps">
  <div class="ptabs"><span class="pt a">Write</span><span class="pt b">Send</span><span class="pt c">Get paid</span></div>
  <div class="pcards">
    <div class="pc c1"><div class="wp"><span class="wl">Line 2</span><div class="wf">Wayfinding concepts</div><div class="wr"><div class="wf n">1</div><div class="wf n on">950.00</div><span class="wa">£950.00</span></div><span class="wpill">Standard rate, 20%</span><div class="ws"><div><span>Subtotal</span><span>£1,900.00</span></div><div><span>VAT at 20%</span><span>£380.00</span></div><div class="wt"><span>Total</span><span>£2,280.00</span></div></div></div></div>
    <div class="pc c2"><div class="mail"><div class="mh"><b>Linden &amp; Rowe Studio</b><span>09:41</span></div><div class="ms">Invoice INV-0044 from Linden &amp; Rowe Studio</div><div class="mb">Hello Meridian team, please find invoice INV-0044 for £2,280.00 attached, due on 3 November.</div><div class="mpdf"><span class="pdf">PDF</span>INV-0044.pdf</div></div><img src="{{IMG:c-send-pay}}" alt="" style="margin-top:14px;border-radius:16px"></div>
    <div class="pc c3"><img class="phone" src="{{IMG:phone-light}}" alt=""></div>
  </div>
  <div class="dots"><i class="da"></i><i class="db"></i><i class="dc"></i></div>
</div>'''
css = '''
.ps{position:relative;width:390px;height:844px;overflow:hidden;background:#ecefed;font-family:'Onest',sans-serif;color:#09191c}
.ptabs{position:absolute;left:20px;right:20px;top:28px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;background:#dde4e2;border-radius:14px;padding:4px}
.pt{height:44px;border-radius:10px;display:grid;place-items:center;font:700 15px 'Onest';color:#56676a}
.a{animation:ta 12s linear infinite}.b{animation:tb 12s linear infinite}.c{animation:tc 12s linear infinite}
@keyframes ta{0%,33%{background:#fff;color:#09191c}33.4%,100%{background:transparent;color:#56676a}}
@keyframes tb{0%,33%{background:transparent;color:#56676a}33.4%,66.6%{background:#fff;color:#09191c}67%,100%{background:transparent;color:#56676a}}
@keyframes tc{0%,66.6%{background:transparent;color:#56676a}67%,100%{background:#fff;color:#09191c}}
.pcards{position:absolute;left:16px;right:16px;top:112px;height:640px}
.pc{position:absolute;inset:0;opacity:0}
.pc img{display:block;width:100%;border-radius:18px;box-shadow:0 1px 2px rgb(9 25 28 / .1),0 24px 48px -24px rgb(9 25 28 / .4)}
.c1{animation:ia 12s ease infinite}.c2{animation:ib 12s ease infinite}.c3{animation:ic 12s ease infinite}
@keyframes ia{0%,31%{opacity:1;transform:none}35%,97%{opacity:0;transform:translateX(-24px)}100%{opacity:1}}
@keyframes ib{0%,31%{opacity:0;transform:translateX(24px)}35%,64%{opacity:1;transform:none}68%,100%{opacity:0;transform:translateX(-24px)}}
@keyframes ic{0%,64%{opacity:0;transform:translateX(24px)}68%,97%{opacity:1;transform:none}100%{opacity:0}}
.mail{background:#fff;border-radius:18px;padding:18px 20px;font-size:14px;line-height:1.5;box-shadow:0 1px 2px rgb(9 25 28 / .1),0 24px 48px -24px rgb(9 25 28 / .4)}
.mh{display:flex;justify-content:space-between}.mh span{color:#56676a}
.ms{font-weight:600;margin-top:4px}.mb{color:#2f403d;margin-top:8px}
.mpdf{margin-top:12px;display:inline-flex;align-items:center;gap:8px;border:1px solid #d6dddb;border-radius:10px;padding:7px 11px;font-weight:600}
.pdf{background:#09191c;color:#fff;font-size:10px;font-weight:700;border-radius:4px;padding:2px 5px}
.wp{background:#fff;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgb(9 25 28 / .1),0 24px 48px -24px rgb(9 25 28 / .4);font-size:15px}
.wl{display:block;font-size:13px;color:#56676a;margin-bottom:6px}
.wf{border:1px solid #d6dddb;border-radius:10px;padding:10px 12px;font-weight:500}
.wr{display:grid;grid-template-columns:56px 1fr auto;gap:8px;align-items:center;margin-top:8px}
.wf.n{text-align:right;font-variant-numeric:tabular-nums}.wf.on{border-color:#09191c;box-shadow:0 0 0 3px #CFF26A}
.wa{font-weight:700;font-variant-numeric:tabular-nums}
.wpill{display:inline-block;margin-top:12px;background:#dcf5e6;color:#0e6b3a;border-radius:999px;padding:5px 11px;font-size:13px;font-weight:600}
.ws{margin-top:16px;border-top:1px solid #e3e8e6;padding-top:10px;font-variant-numeric:tabular-nums}
.ws div{display:flex;justify-content:space-between;padding:4px 0;color:#2f403d}
.ws .wt{color:#09191c;font-weight:800;font-size:17px;border-top:1px solid #09191c;margin-top:6px;padding-top:9px}
.pc img.phone{width:262px;margin:0 auto;border-radius:0;box-shadow:none;filter:drop-shadow(0 24px 30px rgb(9 25 28 / .25))}
.dots{position:absolute;left:0;right:0;bottom:40px;display:flex;justify-content:center;gap:8px}
.dots i{width:8px;height:8px;border-radius:4px;background:#c3cdca}
.da{animation:dx 12s linear infinite}.db{animation:dy 12s linear infinite}.dc{animation:dz 12s linear infinite}
@keyframes dx{0%,33%{width:24px;background:#09191c}33.4%,100%{width:8px;background:#c3cdca}}
@keyframes dy{0%,33%{width:8px;background:#c3cdca}33.4%,66.6%{width:24px;background:#09191c}67%,100%{width:8px;background:#c3cdca}}
@keyframes dz{0%,66.6%{width:8px;background:#c3cdca}67%,100%{width:24px;background:#09191c}}
'''
write('SlabPhoneC', 'Slab C on a phone', 390, 844, body, css, ('Sora', 'Onest'))
print('ok')
