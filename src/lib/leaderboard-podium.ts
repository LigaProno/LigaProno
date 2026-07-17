export type PodiumStyle = {
  /** Fundalul rândului — tentă metalică peste tema închisă. */
  backgroundColor: string;
  /** Culoarea cifrei de pe coloana de rank. */
  rankColor: string;
};

/** Aur / argint / bronz pentru primele trei locuri. */
const PODIUM: Record<number, PodiumStyle> = {
  1: { backgroundColor: "rgba(212,175,55,0.15)", rankColor: "#E8C878" },
  2: { backgroundColor: "rgba(200,208,220,0.13)", rankColor: "#DCE3EC" },
  3: { backgroundColor: "rgba(205,127,50,0.15)", rankColor: "#E39B62" },
};

export function getPodiumStyle(rank: number): PodiumStyle | null {
  return PODIUM[rank] ?? null;
}

/** Tenta discretă pentru propriul rând, în afara podiumului. */
export const CURRENT_USER_BG = "rgba(59,130,246,0.06)";
/** Accent pe muchia stângă — ține „eu” vizibil chiar și pe un rând de podium. */
export const CURRENT_USER_ACCENT = "inset 3px 0 0 0 #60A5FA";

/** Stilul complet de rând: podiumul câștigă fundalul, accentul marchează „eu”. */
export function getLeaderboardRowStyle(rank: number, isCurrentUser: boolean) {
  const podium = getPodiumStyle(rank);

  return {
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    backgroundColor: podium?.backgroundColor ?? (isCurrentUser ? CURRENT_USER_BG : undefined),
    boxShadow: isCurrentUser ? CURRENT_USER_ACCENT : undefined,
  };
}
