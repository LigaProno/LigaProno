import { CHAMPION_ROSTER } from "./roster";
import { CHAMPION_ROSTER_EXTRA } from "./roster-extra";
import { applyVerifiedBingoTags } from "./verified-bingo-tags";
import { BINGO_CRITERIA } from "@/data/mini-games/bingo-criteria";
import type { ChampionPlayer } from "@/lib/mini-games/types";

const byId = new Map<string, ChampionPlayer>();

function finalizePlayer(player: ChampionPlayer): ChampionPlayer {
  return {
    ...player,
    tags: applyVerifiedBingoTags(player.id, player.tags),
  };
}

for (const player of [...CHAMPION_ROSTER, ...CHAMPION_ROSTER_EXTRA]) {
  if (byId.has(player.id)) {
    throw new Error(`Duplicate champion player id: ${player.id}`);
  }
  byId.set(player.id, finalizePlayer(player));
}

export const CHAMPION_PLAYERS: ChampionPlayer[] = [...byId.values()];

/** La build: fiecare criteriu bingo are suficienți jucători valizi. */
function validateBingoCoverage(players: ChampionPlayer[]): void {
  const minPerCriterion = 3;
  for (const criterion of BINGO_CRITERIA) {
    const count = players.filter((p) => p.tags.includes(criterion.tag)).length;
    if (count < minPerCriterion) {
      throw new Error(
        `Bingo criterion "${criterion.id}" (${criterion.tag}) has only ${count} players (need ${minPerCriterion})`,
      );
    }
  }
}

validateBingoCoverage(CHAMPION_PLAYERS);

export function getChampionById(id: string): ChampionPlayer | undefined {
  return byId.get(id);
}
