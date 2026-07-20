/** Helpers pentru calendarul Europe/Bucharest (email cron). */

const TZ = "Europe/Bucharest";

export function formatDateKeyBucharest(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDaysToDateKey(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

export function getBucharestHour(date: Date = new Date()): number {
  const hourPart = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "numeric",
    hour12: false,
  })
    .formatToParts(date)
    .find((p) => p.type === "hour")?.value;
  // en-GB may return "24" for midnight in some environments
  const n = Number(hourPart ?? 0);
  return n === 24 ? 0 : n;
}

/** Guard pentru cron: rulează doar în ora locală așteptată (Bucharest). */
export function isBucharestHour(expectedHour: number, date: Date = new Date()): boolean {
  return getBucharestHour(date) === expectedHour;
}

export function matchDateKeyBucharest(utcDate: string): string {
  return formatDateKeyBucharest(new Date(utcDate));
}

export function formatBucharestDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt);
}

export function formatKickoffBucharest(utcDate: string): string {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(utcDate));
}

export function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "https://ligaprono.ro";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw.replace(/\/$/, "");
  return `https://${raw.replace(/\/$/, "")}`;
}
