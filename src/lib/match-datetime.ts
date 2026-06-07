export function formatMatchKickoff(isoUtc: string, locale = "ro-RO"): string {
  try {
    const d = new Date(isoUtc);
    return new Intl.DateTimeFormat(locale, {
      timeZone: "Europe/Bucharest",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return isoUtc;
  }
}
