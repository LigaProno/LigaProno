const BUCHAREST_TZ = "Europe/Bucharest";

export function dateKeyInBucharest(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUCHAREST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayDateKeyBucharest(): string {
  return dateKeyInBucharest(new Date());
}

/** Următorul reset (miezul nopții Europe/Bucharest). */
export function nextResetAtBucharest(now: Date = new Date()): Date {
  const dayKey = dateKeyInBucharest(now);
  const [y, m, d] = dayKey.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d + 1, 0, 0, 0);
  const probe = new Date(utcMidnight);
  const targetDayKey = dateKeyInBucharest(new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0)));

  if (dateKeyInBucharest(probe) === targetDayKey) return probe;

  for (let offsetHours = -4; offsetHours <= 4; offsetHours++) {
    const candidate = new Date(utcMidnight + offsetHours * 60 * 60 * 1000);
    if (dateKeyInBucharest(candidate) === targetDayKey) return candidate;
  }

  return new Date(Date.UTC(y, m - 1, d + 1, 22, 0, 0));
}

export function msUntilNextReset(now: Date = new Date()): number {
  return Math.max(0, nextResetAtBucharest(now).getTime() - now.getTime());
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Luni–duminică a săptămânii care conține `dateKey` (fus București). */
export function weekDateKeysContaining(dateKey: string): string[] {
  const d = parseDateKey(dateKey);
  const weekday = d.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + mondayOffset);

  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + i);
    const y = day.getUTCFullYear();
    const m = String(day.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(day.getUTCDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${dd}`);
  }
  return keys;
}
