/**
 * Admin access is controlled via the ADMIN_EMAILS env var (comma-separated).
 * No DB column needed — add emails at deploy time.
 *
 * Example .env:
 *   ADMIN_EMAILS=cristea.radu23@gmail.com,other@example.com
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS ?? "";
  if (!raw.trim()) return false;
  const admins = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}
