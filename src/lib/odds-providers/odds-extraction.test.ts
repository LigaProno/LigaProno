import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasUsableMatchOdds,
  isPlausible1x2,
  isPlausibleCorrectScore,
  sanitizeBettingPayload,
  type BettingOddsPayload,
} from "../betting-odds";
import { estimateDerivedMarketsFromFt1x2 } from "./estimate-from-1x2";
import { parseListingFt1x2FromHtml } from "./oddsportal/parse-listing";
import { mapFixturesToFootballDataMatches } from "./team-matcher";
import type { FootballDataMatch } from "../football-data-types";

describe("parseListingFt1x2FromHtml", () => {
  it("extracts matchId, teams and 1X2 from OddsPortal game-row HTML", () => {
    const html = `
      <div data-testid="game-row">
        <a href="/football/h2h/marseille-SblU3Hee/strasbourg-nP6UzIU1/#6i9H6E5l">
          <div data-testid="game-host"><p data-testid="participant-name">Marseille</p></div>
          <div data-testid="game-guest"><p data-testid="participant-name">Strasbourg</p></div>
        </a>
        <p data-testid="odd-container-default">1.70</p>
        <p data-testid="odd-container-default">4.00</p>
        <p data-testid="odd-container-default">4.20</p>
      </div>
      <div data-testid="game-row">
        <a href="/football/h2h/inter-Iw7eKK25/monza-4YSMlwj7/#8Mn7Y8Zh">
          <div data-testid="game-host"><p data-testid="participant-name">Inter</p></div>
          <div data-testid="game-guest"><p data-testid="participant-name">Monza</p></div>
        </a>
        <p data-testid="odd-container-default">1.22</p>
        <p data-testid="odd-container-default">6.07</p>
        <p data-testid="odd-container-default">12.93</p>
      </div>`;
    const rows = parseListingFt1x2FromHtml(html);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.matchId, "6i9H6E5l");
    assert.equal(rows[0]?.home, "Marseille");
    assert.equal(rows[0]?.away, "Strasbourg");
    assert.deepEqual(rows[0]?.ft1x2, { HOME: 1.7, DRAW: 4, AWAY: 4.2 });
    assert.equal(rows[1]?.matchId, "8Mn7Y8Zh");
    assert.equal(rows[1]?.ft1x2?.HOME, 1.22);
  });
});

describe("estimateDerivedMarketsFromFt1x2", () => {
  it("builds a realistic CS table from 1X2, never 1.01", () => {
    const derived = estimateDerivedMarketsFromFt1x2({
      HOME: 1.7,
      DRAW: 4.0,
      AWAY: 4.2,
    });
    assert.ok(derived);
    assert.ok(isPlausibleCorrectScore(derived!.correctScore));
    const vals = Object.values(derived!.correctScore);
    assert.ok(vals.length >= 25);
    assert.ok(vals.every((v) => v >= 1.4));
    assert.ok(derived!.correctScore["1-0"]! < derived!.correctScore["0-3"]!);
    assert.ok(isPlausible1x2(derived!.ht1x2));
    assert.ok(Object.keys(derived!.htFt ?? {}).length === 9);
  });
});

describe("junk 1.01 odds", () => {
  it("rejects Gemini-style 1.01 correct score tables", () => {
    const junk: Record<string, number> = {};
    for (let h = 0; h <= 4; h++) {
      for (let a = 0; a <= 4; a++) junk[`${h}-${a}`] = 1.01;
    }
    assert.equal(isPlausibleCorrectScore(junk), false);
    assert.equal(
      hasUsableMatchOdds({
        ft1x2: { HOME: 1.01, DRAW: 1.01, AWAY: 1.01 },
        ht1x2: { HOME: 1, DRAW: 1, AWAY: 1 },
        correctScore: junk,
      }),
      false,
    );
  });

  it("strips junk CS in sanitizeBettingPayload", () => {
    const junk: Record<string, number> = { "0-0": 1.01, "1-0": 1.01, "0-1": 1.01 };
    const payload: BettingOddsPayload = {
      schemaVersion: 1,
      matches: {
        "1": {
          ft1x2: { HOME: 1.7, DRAW: 3.8, AWAY: 4.5 },
          ht1x2: { HOME: 1, DRAW: 1, AWAY: 1 },
          correctScore: junk,
        },
      },
      teams: {},
    };
    const clean = sanitizeBettingPayload(payload);
    assert.deepEqual(clean.matches["1"]?.correctScore, {});
    assert.equal(isPlausible1x2(clean.matches["1"]!.ft1x2), true);
  });
});

describe("team matching PSG / Inter", () => {
  it("maps OddsPortal short names onto Football-Data names", () => {
    const fixtures = [
      {
        matchId: "psg1",
        home: "PSG",
        away: "Rennes",
        startDateIso: "2026-08-23T18:45:00.000Z",
        stadium: null,
        city: null,
        country: null,
      },
      {
        matchId: "int1",
        home: "Inter",
        away: "Monza",
        startDateIso: "2026-08-22T16:30:00.000Z",
        stadium: null,
        city: null,
        country: null,
      },
    ];
    const fd = [
      {
        id: 101,
        utcDate: "2026-08-23T18:45:00Z",
        status: "TIMED",
        homeTeam: { id: 1, name: "Paris Saint-Germain", shortName: "PSG" },
        awayTeam: { id: 2, name: "Stade Rennais FC 1901", shortName: "Rennes" },
      },
      {
        id: 202,
        utcDate: "2026-08-22T16:30:00Z",
        status: "TIMED",
        homeTeam: { id: 3, name: "FC Internazionale Milano", shortName: "Inter" },
        awayTeam: { id: 4, name: "AC Monza", shortName: "Monza" },
      },
    ] as FootballDataMatch[];
    const map = mapFixturesToFootballDataMatches(fixtures, fd, { maxDiffHours: 24 });
    assert.equal(map.get(101)?.matchId, "psg1");
    assert.equal(map.get(202)?.matchId, "int1");
  });

  it("maps Rennes from Football-Data long name without relying on shortName", () => {
    const fixtures = [
      {
        matchId: "psg1",
        home: "PSG",
        away: "Rennes",
        startDateIso: "2026-08-23T18:45:00.000Z",
        stadium: null,
        city: null,
        country: null,
      },
    ];
    const fd = [
      {
        id: 101,
        utcDate: "2026-08-23T18:45:00Z",
        status: "TIMED",
        homeTeam: { id: 1, name: "Paris Saint-Germain FC", shortName: "PSG" },
        awayTeam: { id: 2, name: "Stade Rennais FC 1901", shortName: "Stade Rennais" },
      },
    ] as FootballDataMatch[];
    const map = mapFixturesToFootballDataMatches(fixtures, fd, { maxDiffHours: 24 });
    assert.equal(map.get(101)?.matchId, "psg1");
  });
});
