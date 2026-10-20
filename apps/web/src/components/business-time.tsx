'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { todayIn } from '@invoica/core';

const BusinessTimeZone = createContext<string | null>(null);

/** The business's time zone, for dates worked out in the browser while a page stays open. */
export function BusinessTimeZoneProvider({ timeZone, children }: { timeZone: string; children: ReactNode }) {
  return <BusinessTimeZone.Provider value={timeZone}>{children}</BusinessTimeZone.Provider>;
}

/**
 * The business date at the moment it is asked for: the page's own date, or a later one when the page has stayed
 * open past midnight in the business's time zone. A browser clock behind the server's never moves it back.
 */
export function useBusinessToday(): (pageToday: string) => string {
  const timeZone = useContext(BusinessTimeZone);
  return (pageToday) => {
    if (!timeZone) return pageToday;
    try {
      const now = todayIn(timeZone);
      return now > pageToday ? now : pageToday;
    } catch {
      return pageToday;
    }
  };
}
