const BUCHAREST_TZ = "Europe/Bucharest";

function calendarDayKeyInBucharest(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUCHAREST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function isSameCalendarDayInBucharest(a: Date, b: Date): boolean {
  return calendarDayKeyInBucharest(a) === calendarDayKeyInBucharest(b);
}

export function canManualRefreshOddsToday(
  lastManualOddsRefreshAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastManualOddsRefreshAt) return true;
  return !isSameCalendarDayInBucharest(lastManualOddsRefreshAt, now);
}

/** Start of next calendar day in Europe/Bucharest (approx. midnight local). */
export function nextManualRefreshAvailableAt(
  lastManualOddsRefreshAt: Date | null | undefined,
  now: Date = new Date(),
): Date {
  if (!lastManualOddsRefreshAt || canManualRefreshOddsToday(lastManualOddsRefreshAt, now)) {
    return now;
  }

  const dayKey = calendarDayKeyInBucharest(now);
  const [y, m, d] = dayKey.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d + 1, 0, 0, 0);
  const probe = new Date(utcMidnight);
  const probeKey = calendarDayKeyInBucharest(probe);
  const targetDayKey = calendarDayKeyInBucharest(
    new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0)),
  );

  if (probeKey === targetDayKey) return probe;

  for (let offsetHours = -4; offsetHours <= 4; offsetHours++) {
    const candidate = new Date(utcMidnight + offsetHours * 60 * 60 * 1000);
    if (calendarDayKeyInBucharest(candidate) === targetDayKey) {
      return candidate;
    }
  }

  return new Date(Date.UTC(y, m - 1, d + 1, 22, 0, 0));
}
