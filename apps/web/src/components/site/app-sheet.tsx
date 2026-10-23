import Image from 'next/image';
import sheetDashboard from './images/sheet-dashboard.webp';
import sheetEditor from './images/sheet-editor.webp';
import sheetInvoice from './images/sheet-invoice.webp';
import s from './site.module.css';

/** Three screens of the app standing in order on a large tilted sheet with its corner turned. */
export function AppSheet() {
  return (
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
  );
}
