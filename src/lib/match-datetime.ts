/** Kick-off display: English locale, Europe/Bucharest (tournament host-friendly). */
export function formatMatchKickoff(isoUtc: string): string {
  try {
    const d = new Date(isoUtc);
    return new Intl.DateTimeFormat("en-GB", {
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
