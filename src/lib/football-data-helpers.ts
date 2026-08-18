/** Helpers sigure în browser — fără Prisma / env de server. */

export function venueLabel(m: {
  venue?: string | { name?: string; city?: string | null } | null;
}): string | null {
  const v = m.venue;
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  const parts = [v.name, v.city].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function stageDisplayName(stage: string): string {
  const map: Record<string, string> = {
    REGULAR_SEASON: "Regular season",
    PRELIMINARY_ROUND: "Preliminary round",
    QUALIFICATION: "Qualification",
    QUALIFICATION_ROUND_1: "Qualification R1",
    QUALIFICATION_ROUND_2: "Qualification R2",
    QUALIFICATION_ROUND_3: "Qualification R3",
    PLAYOFF_ROUND_1: "Play-off R1",
    PLAYOFF_ROUND_2: "Play-off R2",
    PLAYOFFS: "Play-offs",
    GROUP_STAGE: "Group stage",
    LAST_64: "Round of 64",
    LAST_32: "Round of 32",
    LAST_16: "Round of 16",
    QUARTER_FINALS: "Quarter-finals",
    SEMI_FINALS: "Semi-finals",
    THIRD_PLACE: "Third place",
    FINAL: "Final",
  };
  return map[stage] ?? stage;
}

export function matchGroupToGroupKey(
  groupRaw: string | null | undefined,
): string | null {
  if (!groupRaw?.trim()) return null;
  const gu = groupRaw.trim().toUpperCase();
  let m = gu.match(/^GROUP_([A-Z])$/);
  if (m) return `Group ${m[1]}`;
  m = gu.match(/^([A-Z])$/);
  if (m) return `Group ${m[1]}`;
  return null;
}
