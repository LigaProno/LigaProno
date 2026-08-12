/**
 * Admin / moderator access is controlled via env vars (comma-separated emails).
 * No DB column needed — add emails at deploy time.
 *
 * Example .env:
 *   ADMIN_EMAILS=cristea.radu23@gmail.com,other@example.com
 *   MODERATOR_EMAILS=mod@example.com
 */

function emailListFromEnv(envKey: string): string[] {
  const raw = process.env[envKey] ?? "";
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return emailListFromEnv("ADMIN_EMAILS").includes(email.trim().toLowerCase());
}

export function isModeratorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return emailListFromEnv("MODERATOR_EMAILS").includes(email.trim().toLowerCase());
}

/** Creare / ștergere / listă turnee publice. */
export function canManagePublicTournaments(email: string | null | undefined): boolean {
  return isAdminEmail(email) || isModeratorEmail(email);
}

/** Acces la pagina turneului fără membership (monitorizare). */
export function canMonitorTournaments(email: string | null | undefined): boolean {
  return canManagePublicTournaments(email);
}
