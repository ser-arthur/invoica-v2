import a from './auth.module.css';

/**
 * Wraps each sign-in page's form. Unlike the layout, a template remounts on every move between these pages, so the
 * form arriving eases in while the Night panel stays still (auth.module.css, "A form arriving").
 */
export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return <div className={a.enter}>{children}</div>;
}
