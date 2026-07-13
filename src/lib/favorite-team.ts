/** Competiția folosită pentru selecția echipei favorite (CM 2026). */
export const FAVORITE_TEAM_COMPETITION = {
  code: "WC",
  season: "2026",
} as const;

export type FavoriteTeamSelection = {
  teamId: number;
  teamName: string;
  teamCrest?: string | null;
};
