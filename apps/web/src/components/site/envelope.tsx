import n from './not-found.module.css';
import { Tilt } from './tilt';

/**
 * The not-found page's drawing: an airmail envelope edged in lime and teal, addressed in grey lines, with Invoica's
 * stamp in the corner and a rubber stamp across it. It carries no information of its own, so it is hidden from
 * assistive technology; the page's heading says what happened.
 */
export function Envelope({ kind }: { kind: 'unknown' | 'planned' }) {
  const [big, small] =
    kind === 'planned' ? ['Coming soon', 'Being written'] : ['Return to sender', 'Address not known'];
  return (
    <Tilt className={n.letter} max={4} aria-hidden="true">
      <div className={n.envelope}>
        <div className={n.face}>
          <span className={n.from}>
            <i />
            <i />
          </span>
          <span className={n.postage}>
            <span />
          </span>
          <svg className={n.postmark} viewBox="0 0 176 80">
            <circle cx="40" cy="40" r="33" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <circle cx="40" cy="40" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M28 40h24M34 33h12M34 47h12"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {[18, 31, 44, 57].map((y) => (
              <path
                key={y}
                d={`M82 ${y}q11 -8 22 0t22 0t22 0t22 0`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            ))}
          </svg>
          <span className={n.to}>
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className={`${n.stamp} ${kind === 'planned' ? n.soon : ''}`}>
            <span className={n.stampBig}>{big}</span>
            <span className={n.stampSmall}>{small}</span>
          </span>
        </div>
      </div>
    </Tilt>
  );
}
