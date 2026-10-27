'use client';

import { useEffect, useLayoutEffect } from 'react';
import { rememberAccountThemeAction } from '@/lib/actions/preferences';

/**
 * Shows the account's theme on the app's pages. The page's root is kept when moving between pages (from signing in to
 * the dashboard, say), so it can still hold the device's earlier theme; this sets it before the page is drawn. When
 * the device's copy is behind the account's, it is brought up to date (docs/specs/theme-on-the-account.md).
 */
export function ThemeSync({ theme, remember }: { theme: 'light' | 'dark' | 'system'; remember: boolean }) {
  useLayoutEffect(() => {
    const dark =
      theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const root = document.documentElement;
    const shown = dark ? 'dark' : 'light';
    if (root.dataset.theme !== shown) root.dataset.theme = shown;
  }, [theme]);

  useEffect(() => {
    if (remember) void rememberAccountThemeAction().catch(() => undefined);
  }, [remember]);

  return null;
}
