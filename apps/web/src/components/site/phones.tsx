import Image, { type StaticImageData } from 'next/image';
import phoneDark from './images/phone-dark.webp';
import phoneLight from './images/phone-light.webp';
import s from './site.module.css';

/**
 * The app on two phones, light and dark, on a band of lime whose edges run parallel to the hero's fold. The dark one
 * stands in front, offset so both screens show. As the band scrolls by they part a little; on phones they rise out of
 * the band's foot as it comes into view. Nothing changes under the pointer.
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
          <div className={s.phonePair} aria-hidden="true">
            <Device src={phoneLight} className={s.phoneLight} testId="phone-light" />
            <Device src={phoneDark} className={s.phoneDark} testId="phone-dark" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A modern phone drawn in code: a metal edge, a thin black bezel, the camera cut-out and the side keys. */
function Device({
  src,
  className,
  testId,
}: {
  src: StaticImageData;
  className: string | undefined;
  testId: string;
}) {
  return (
    <div className={`${s.device} ${className}`} data-testid={testId}>
      <span className={`${s.deviceKey} ${s.keyAction}`} />
      <span className={`${s.deviceKey} ${s.keyUp}`} />
      <span className={`${s.deviceKey} ${s.keyDown}`} />
      <span className={`${s.deviceKey} ${s.keyPower}`} />
      <div className={s.deviceBezel}>
        <div className={s.deviceScreen}>
          <Image src={src} alt="" unoptimized />
          <span className={s.deviceIsland} />
        </div>
      </div>
    </div>
  );
}
