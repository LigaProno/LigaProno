import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FootballDataMatch } from "./football-data-types";
import { isTournamentComplete } from "./tournament-wins";
import { computeMatchPoints } from "./wc-scoring";

function match(
  partial: Partial<FootballDataMatch> & Pick<FootballDataMatch, "id" | "status">,
): FootballDataMatch {
  return {
    utcDate: "2026-08-16T16:00:00Z",
    matchday: 5,
    homeTeam: { id: 1, name: "Home" },
    awayTeam: { id: 2, name: "Away" },
    score: {
      winner: "HOME_TEAM",
      duration: "REGULAR",
      fullTime: { home: 2, away: 1 },
      halfTime: { home: 1, away: 0 },
    },
    ...partial,
  } as FootballDataMatch;
}

describe("isTournamentComplete", () => {
  it("is false when the window is empty", () => {
    assert.equal(
      isTournamentComplete([], { startMatchday: 1, endMatchday: 1 }),
      false,
    );
  });

  it("is true when every window match is finished or cancelled", () => {
    const matches = [
      match({ id: 1, status: "FINISHED", matchday: 4 }),
      match({ id: 2, status: "CANCELLED", matchday: 4 }),
      match({ id: 3, status: "SCHEDULED", matchday: 5 }),
    ];
    assert.equal(
      isTournamentComplete(matches, { startMatchday: 4, endMatchday: 4 }),
      true,
    );
  });

  it("stays open if a match in the window is postponed", () => {
    const matches = [
      match({ id: 1, status: "FINISHED", matchday: 4 }),
      match({ id: 2, status: "POSTPONED", matchday: 4 }),
    ];
    assert.equal(
      isTournamentComplete(matches, { startMatchday: 4, endMatchday: 4 }),
      false,
    );
  });
});

describe("computeMatchPoints", () => {
  const pred = {
    htOutcome: "HOME" as const,
    ftOutcome: "HOME" as const,
    predHomeGoals: 2,
    predAwayGoals: 1,
  };

  it("scores AWARDED matches the same as FINISHED", () => {
    const awarded = computeMatchPoints(pred, match({ id: 1, status: "AWARDED" }));
    const finished = computeMatchPoints(pred, match({ id: 1, status: "FINISHED" }));
    assert.ok(awarded.total > 0);
    assert.equal(awarded.total, finished.total);
  });

  it("does not score live matches", () => {
    const live = computeMatchPoints(pred, match({ id: 1, status: "IN_PLAY" }));
    assert.equal(live.total, 0);
  });
});
