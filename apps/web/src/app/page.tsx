import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { renderDocumentHtml, sampleSnapshot } from '@invoica/documents';
import { Logo } from '@/components/logo';
import { Paper } from '@/components/paper';
import { Crease } from '@/components/site/crease';
import { Itemised } from '@/components/site/itemised';
import { MoneyIn } from '@/components/site/money-in';
import { Steps } from '@/components/site/steps';
import phoneDark from '@/components/site/images/phone-dark.webp';
import phoneLight from '@/components/site/images/phone-light.webp';
import sheetDashboard from '@/components/site/images/sheet-dashboard.webp';
import sheetEditor from '@/components/site/images/sheet-editor.webp';
import sheetInvoice from '@/components/site/images/sheet-invoice.webp';
import s from '@/components/site/site.module.css';
import { getUser } from '@/lib/session';

const fontUrl = (f: string) => `/doc-fonts/${f}`;

/** Invoice numbers running up the hero's left edge, like the margin of a ledger. */
const LEDGER = Array.from({ length: 15 }, (_, i) => `INV-00${31 + i}`).join('  ');

export default async function HomePage() {
  if (await getUser()) redirect('/dashboard');

  const studio = renderDocumentHtml(
    sampleSnapshot({ template: 'studio', seller: { name: 'Northlight Studio', brandColour: '#d9480f' } }),
    { fontUrl },
  );
  const counsel = renderDocumentHtml(
    sampleSnapshot({
      template: 'counsel',
      seller: {
        name: 'Harrow & Vale',
        brandColour: '#1d3c5a',
        taxRegistered: true,
        taxNumber: 'GB 000 0000 00',
      },
    }),
    { fontUrl },
  );
  const letter = renderDocumentHtml(
    sampleSnapshot({ template: 'letter', seller: { name: 'Ama Owusu Photography', brandColour: '#5b2a4e' } }),
    { fontUrl },
  );

  return (
    <div className={s.site}>
      <header className={`${s.wrap} ${s.header}`}>
        <Link href="/" className={s.brand}>
          <Logo shaded />
        </Link>
        <nav className={s.nav} aria-label="Site">
          <a href="#how">How it works</a>
          <a href="#templates">Templates</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className={s.account}>
          <Link href="/sign-in" className={s.signIn}>
            Sign in
          </Link>
          <Link href="/sign-up" className={`${s.button} ${s.headerButton}`}>
            Create free account
          </Link>
        </div>
      </header>

      <main>
        <section className={s.hero}>
          <div className={s.ledger} aria-hidden="true">
            <span>{LEDGER}</span>
          </div>
          <div className={s.wrap}>
            <div className={`${s.grid} ${s.notes}`}>
              <p className={`${s.note} ${s.noteOne}`}>
                <strong>For businesses in their first years.</strong> Freelancers, studios and small firms who
                want to look established from the very first invoice.
              </p>
              <p className={`${s.note} ${s.noteTwo}`}>
                <strong>Free for 30 days.</strong> No card needed. After that, up to three clients stay free.
              </p>
            </div>
            <div className={`${s.grid} ${s.heroMain}`}>
              <div className={s.heroHeadline}>
                <Crease
                  lines={['Every invoice,', 'all the way', 'to paid.']}
                  typeClass={s.heroType}
                  pastClass={s.green}
                  xTop={121}
                  xBottom={-18}
                  extend={14}
                />
              </div>
              <div className={s.heroSide}>
                <p className={s.statement}>
                  Invoica keeps the business side of your business in order: invoices that look the part from
                  day one, every client in one place, and a clear view of who owes you what.
                </p>
                <div className={s.actions}>
                  <Link href="/sign-up" className={s.button}>
                    Create your free account
                  </Link>
                  <a href="#how" className={s.textLink}>
                    How it works
                  </a>
                </div>
              </div>
            </div>
            <MoneyIn />
          </div>
        </section>

        <section aria-label="The app">
          <div
            className={s.stage3d}
            role="img"
            aria-label="Three screens of Invoica standing in order on a large tilted sheet: writing an invoice, the invoice once issued and sent, and the dashboard once it is paid."
          >
            <div className={s.plane}>
              <span className={s.planeFlap} />
              <svg className={s.planeArt} viewBox="0 0 2000 1150" width="2000" height="1150">
                <defs>
                  <linearGradient
                    id="plane-route"
                    gradientUnits="userSpaceOnUse"
                    x1="120"
                    x2="1880"
                    y1="0"
                    y2="0"
                  >
                    <stop offset="0" stopColor="#CFF26A" />
                    <stop offset="0.45" stopColor="#37C66B" />
                    <stop offset="0.75" stopColor="#6CE4A2" />
                    <stop offset="1" stopColor="#138C86" />
                  </linearGradient>
                </defs>
                <path
                  d="M100 900 H1900"
                  stroke="url(#plane-route)"
                  strokeWidth="14"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M440 900 V780 M1030 900 V680 M1620 900 V580"
                  stroke="#09191C"
                  strokeOpacity="0.25"
                  strokeWidth="3"
                  strokeDasharray="2 12"
                  strokeLinecap="round"
                />
                <circle cx="440" cy="900" r="26" fill="#FFFFFF" stroke="#09191C" strokeWidth="9" />
                <circle cx="1030" cy="900" r="26" fill="#09191C" />
                <circle cx="1620" cy="900" r="36" fill="#CFF26A" stroke="#09191C" strokeWidth="9" />
                <path
                  d="M1604 900 l12 12 l20 -24"
                  fill="none"
                  stroke="#09191C"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <g
                  fontFamily="Sora Variable, sans-serif"
                  fontWeight="800"
                  fontSize="46"
                  fill="#09191C"
                  textAnchor="middle"
                >
                  <text x="440" y="985">
                    Write
                  </text>
                  <text x="1030" y="985">
                    Send
                  </text>
                  <text x="1620" y="1000">
                    Get paid
                  </text>
                </g>
              </svg>
              <div className={s.screenShade} style={{ left: 184, top: 470 }} />
              <Image
                src={sheetEditor}
                alt=""
                unoptimized
                className={s.screen}
                style={{ left: 160, top: 440, transform: 'translateZ(60px)' }}
              />
              <div className={s.screenShade} style={{ left: 774, top: 350 }} />
              <Image
                src={sheetInvoice}
                alt=""
                unoptimized
                className={s.screen}
                style={{ left: 750, top: 320, transform: 'translateZ(90px)' }}
              />
              <div className={s.screenShade} style={{ left: 1364, top: 230 }} />
              <Image
                src={sheetDashboard}
                alt=""
                unoptimized
                className={s.screen}
                style={{ left: 1340, top: 200, transform: 'translateZ(120px)' }}
              />
            </div>
          </div>
        </section>

        <Steps />

        <section id="templates" className={s.templates} aria-labelledby="templates-heading">
          <div className={`${s.wrap} ${s.grid} ${s.band} ${s.templatesGrid}`}>
            <div className={s.templatesText}>
              <h2 id="templates-heading" className={`${s.display} ${s.h2}`}>
                <span className={s.keep}>Seven layouts.</span>{' '}
                <span className={s.keep}>Your logo, your colour.</span>
              </h2>
              <p className={s.lead}>
                Pick the layout that suits your work and see it with your own details before you choose. Every
                invoice after that carries the same look, so your clients come to know it as yours.
              </p>
            </div>
            <div
              className={s.fan}
              role="img"
              aria-label="Three example invoices in different layouts: Studio, Counsel and Letter"
            >
              <div className={s.fanInner}>
                <Paper html={studio} width={240} title="Studio layout" className={s.fanLeft} />
                <Paper html={counsel} width={240} title="Counsel layout" className={s.fanMiddle} />
                <Paper html={letter} width={240} title="Letter layout" className={s.fanRight} />
              </div>
            </div>
          </div>
        </section>

        <section className={s.phones} aria-labelledby="phones-heading">
          <div className={s.phonesPanel}>
            <div className={`${s.wrap} ${s.grid} ${s.band} ${s.phonesGrid}`}>
              <div className={s.phonesText}>
                <h2 id="phones-heading" className={`${s.display} ${s.h2}`}>
                  <span className={s.keep}>Your business,</span>{' '}
                  <span className={s.keep}>wherever you are.</span>
                </h2>
                <p className={s.lead}>
                  Check what you are owed between meetings, or send an invoice from the train. If the page
                  closes while you are typing, your work is still there when you come back.
                </p>
                <p className={s.lead} style={{ marginTop: 12 }}>
                  Light or dark, it is the same Invoica on your phone as on your desk.
                </p>
              </div>
              <div className={s.phonePair} aria-hidden="true">
                <div className={`${s.phone} ${s.phoneLight}`}>
                  <Image src={phoneLight} alt="" unoptimized />
                </div>
                <div className={`${s.phone} ${s.phoneDark}`}>
                  <Image src={phoneDark} alt="" unoptimized />
                </div>
              </div>
            </div>
          </div>
        </section>

        <Itemised />
      </main>

      <footer className={`${s.wrap} ${s.footer}`}>
        <span className={s.footerLogo}>
          <Logo />
        </span>
        <p>Invoices, clients and getting paid, for freelancers, studios and small firms.</p>
        <nav className={s.footerLinks} aria-label="Account">
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Create free account</Link>
        </nav>
        <p>&copy; 2026 Invoica</p>
      </footer>
    </div>
  );
}
