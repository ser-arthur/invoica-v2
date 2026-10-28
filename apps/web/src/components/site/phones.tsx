import Image, { type StaticImageData } from 'next/image';
import phoneDark from './images/phone-dark.webp';
import phoneLight from './images/phone-light.webp';
import s from './site.module.css';
import { Tilt } from './tilt';

/**
 * The app on a phone, on a band of lime whose edges run parallel to the hero's fold. One phone shows both: its screen
 * is the app in light, and past a crease like the hero's, the same screen in Night. As the band scrolls into view the
 * crease sweeps up across the screen to its middle; on phones the phone also rises out of the band's foot.
 */
export function Phones() {
  return (
    <section className={s.phonesGround} aria-labelledby="phones-heading">
      <div className={s.phonesBand}>
        <div className={`${s.wrap} ${s.grid} ${s.phonesGrid}`}>
          <div className={s.phonesText}>
            <span className={s.label}>On your phone</span>
            <h2 id="phones-heading" className={`${s.display} ${s.h2}`}>
              <span className={s.keep}>Your business,</span> <span className={s.keep}>wherever you are.</span>
            </h2>
            <p className={s.lead}>
              Check what you are owed between meetings, or send an invoice from the train. If the page closes
              while you are typing, your work is still there when you come back.
            </p>
            <p className={s.lead}>Light or dark, it is the same Invoica on your phone as on your desk.</p>
          </div>
          <Tilt className={s.phonePair} max={6} aria-hidden="true">
            <Device light={phoneLight} night={phoneDark} />
          </Tilt>
        </div>
      </div>
    </section>
  );
}

/**
 * A modern phone drawn in code: a metal edge, a thin black bezel, the camera cut-out and the side keys. Its screen is
 * the app in light with the same screen in Night past the crease (`--fold` in site.module.css).
 */
function Device({ light, night }: { light: StaticImageData; night: StaticImageData }) {
  return (
    <div className={s.device} data-testid="phone">
      <span className={`${s.deviceKey} ${s.keyAction}`} />
      <span className={`${s.deviceKey} ${s.keyUp}`} />
      <span className={`${s.deviceKey} ${s.keyDown}`} />
      <span className={`${s.deviceKey} ${s.keyPower}`} />
      <div className={s.deviceBezel}>
        <div className={s.deviceScreen}>
          <Image src={light} alt="" unoptimized />
          <Image src={night} alt="" unoptimized className={s.screenNight} data-testid="phone-night" />
          <span className={s.screenCrease} />
          <span className={s.deviceIsland} />
        </div>
      </div>
    </div>
  );
}
