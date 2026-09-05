import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCrestOverridesToMatches,
  DINAMO_BUCURESTI_CREST,
  isDinamoBucuresti,
  resolveTeamCrest,
} from "./crest-overrides";
import type { FootballDataMatch } from "./football-data-types";

describe("isDinamoBucuresti", () => {
  it("matches Romanian name variants", () => {
    assert.equal(
      isDinamoBucuresti({ name: "FC Dinamo București" }),
      true,
    );
    assert.equal(
      isDinamoBucuresti({ name: "Dinamo Bucuresti", shortName: "Dinamo" }),
      true,
    );
    assert.equal(
      isDinamoBucuresti({ name: "Dinamo Bucharest" }),
      true,
    );
  });

  it("does not match other Dynamo clubs", () => {
    assert.equal(isDinamoBucuresti({ name: "Dinamo Zagreb" }), false);
    assert.equal(isDinamoBucuresti({ name: "Dynamo Kyiv" }), false);
    assert.equal(isDinamoBucuresti({ name: "CFR Cluj" }), false);
  });
});

describe("resolveTeamCrest", () => {
  it("replaces the Football-Data crest for Dinamo București", () => {
    assert.equal(
      resolveTeamCrest({
        name: "FC Dinamo București",
        crest: "https://crests.football-data.org/1910.png",
      }),
      DINAMO_BUCURESTI_CREST,
    );
  });

  it("leaves other teams unchanged", () => {
    const crest = "https://crests.football-data.org/1901.png";
    assert.equal(resolveTeamCrest({ name: "FCSB", crest }), crest);
  });
});

describe("applyCrestOverridesToMatches", () => {
  it("overrides only the Dinamo side", () => {
    const match: FootballDataMatch = {
      id: 1,
      utcDate: "2026-09-05T16:00:00Z",
      homeTeam: {
        id: 10,
        name: "FC Dinamo București",
        crest: "https://crests.football-data.org/old.png",
      },
      awayTeam: {
        id: 11,
        name: "CFR Cluj",
        crest: "https://crests.football-data.org/cfr.png",
      },
    };

    const [out] = applyCrestOverridesToMatches([match]);
    assert.equal(out.homeTeam.crest, DINAMO_BUCURESTI_CREST);
    assert.equal(out.awayTeam.crest, "https://crests.football-data.org/cfr.png");
  });
});
