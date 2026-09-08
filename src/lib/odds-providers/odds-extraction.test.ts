import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hasCompleteMatchOdds,
  hasUsableMatchOdds,
  impliedMargin,
  isEstimatedCorrectScore,
  isPlausible1x2,
  isPlausibleCorrectScore,
  sanitizeBettingPayload,
  type BettingOddsPayload,
} from "../betting-odds";
import {
  parseListingFt1x2FromHtml,
  parseListingOddsMapFromHtml,
} from "./oddsportal/parse-listing";
import { mapFixturesToFootballDataMatches } from "./team-matcher";
import { buildMatchEventPath } from "./oddsportal/markets";
import { parseCorrectScoreFromFeed } from "./oddsportal/parse-odds";
import { lockedOddsMatchIds } from "../odds-horizon";
import { mergeBettingPayloads } from "../betting-odds";
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

describe("parseListingOddsMapFromHtml", () => {
  /** Forma reală a payload-ului Next.js: cheia e encodeEventId, ordinea 1|X|2. */
  const html = `<script>self.__next_f.push([1,"...\\"initialOddsMap\\":{
    \\"KWAKPPdt\\":{\\"event\\":10933121,\\"odds\\":[],\\"cnt\\":0},
    \\"YkekHDBT\\":{\\"event\\":10933197,\\"odds\\":[
      {\\"active\\":true,\\"maxOdds\\":2.42,\\"avgOdds\\":2.33,\\"bettingTypeId\\":1,\\"scopeId\\":2,\\"outcomeId\\":\\"adkudxv464x0xsf5ej\\"},
      {\\"active\\":true,\\"maxOdds\\":3.3,\\"avgOdds\\":3.21,\\"bettingTypeId\\":1,\\"scopeId\\":2,\\"outcomeId\\":\\"adkudxv498x0x0\\"},
      {\\"active\\":true,\\"maxOdds\\":3.25,\\"avgOdds\\":3.08,\\"bettingTypeId\\":1,\\"scopeId\\":2,\\"outcomeId\\":\\"adkudxv464x0xsf5el\\"}
    ]},
    \\"ULtLBiZj\\":{\\"event\\":10933199,\\"odds\\":[
      {\\"active\\":true,\\"maxOdds\\":2.1,\\"avgOdds\\":2.05,\\"bettingTypeId\\":2,\\"scopeId\\":2,\\"outcomeId\\":\\"other464x\\"},
      {\\"active\\":true,\\"maxOdds\\":1.8,\\"avgOdds\\":1.75,\\"bettingTypeId\\":2,\\"scopeId\\":2,\\"outcomeId\\":\\"other498x\\"}
    ]}
  },\\"rest\\":1"])</script>`;

  it("reads average 1X2 odds keyed by encodeEventId", () => {
    const map = parseListingOddsMapFromHtml(html);
    assert.deepEqual(map.get("YkekHDBT"), { HOME: 2.33, DRAW: 3.21, AWAY: 3.08 });
  });

  it("skips events without odds and markets that are not full-time 1X2", () => {
    const map = parseListingOddsMapFromHtml(html);
    assert.equal(map.has("KWAKPPdt"), false);
    assert.equal(map.has("ULtLBiZj"), false);
  });

  it("returns an empty map when the page ships no odds payload", () => {
    assert.equal(parseListingOddsMapFromHtml("<html><body>nimic</body></html>").size, 0);
  });
});

describe("buildMatchEventPath", () => {
  it("targets the backend proxy and falls back to the built-in hash", () => {
    const path = buildMatchEventPath("YkekHDBT", 8, 2);
    assert.equal(
      path,
      "/proxy/match-event/1-1-YkekHDBT-8-2-yj0e1.dat?geo=en&lang=en",
    );
  });

  it("uses the page hash when one is available, url-decoded", () => {
    const path = buildMatchEventPath("YkekHDBT", 1, 3, "%79%6a%66%62%30");
    assert.ok(path.includes("-1-3-yjfb0.dat"));
  });
});

describe("parseCorrectScoreFromFeed", () => {
  /** Forma reală a feed-ului: cote per casă, ca array-uri. */
  const feed = {
    d: {
      oddsdata: {
        back: {
          "E-8-2-0-0-32": {
            mixedParameterName: "3:2",
            odds: { "27": [23], "438": [28], "516": [27], "623": [23], "817": [26] },
          },
          "E-8-2-0-0-10": {
            mixedParameterName: "1:0",
            odds: { "27": [7], "438": [7.2], "516": [6.8] },
          },
          "E-8-2-0-0-21": {
            mixedParameterName: "2:1",
            odds: { "27": [9], "438": [9.5], "516": [10] },
          },
          "E-8-2-0-0-04": {
            mixedParameterName: "0:4",
            odds: { "27": [160], "438": [170], "516": [165] },
          },
          "E-8-2-0-0-70": { mixedParameterName: "7:0", odds: { "27": [151] } },
          "E-8-2-0-0-100": { mixedParameterName: "10:0", odds: { "27": [176] } },
        },
      },
    },
  };

  it("takes the median across bookmakers for each line", () => {
    const cs = parseCorrectScoreFromFeed(feed);
    assert.equal(cs["3-2"], 26);
    assert.equal(cs["1-0"], 7);
  });

  it("keeps lines outside the 0-4 grid, including two-digit scores", () => {
    const cs = parseCorrectScoreFromFeed(feed);
    assert.equal(cs["7-0"], 151);
    assert.equal(cs["10-0"], 176);
  });

  it("is not mistaken for one of our old estimates", () => {
    const cs = parseCorrectScoreFromFeed(feed);
    assert.ok(isPlausibleCorrectScore(cs));
    assert.equal(isEstimatedCorrectScore(cs), false);
  });
});

/** Rând moștenit din vechiul model Poisson: grilă 0-4 plină, marjă sub 1. */
function legacyEstimatedCorrectScore(): Record<string, number> {
  const table: Record<string, number> = {};
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) table[`${h}-${a}`] = 25 + (h + a) * 12;
  }
  return table;
}

describe("isEstimatedCorrectScore", () => {
  it("flags a stored table whose margin is impossibly low", () => {
    const table = legacyEstimatedCorrectScore();
    assert.ok(impliedMargin(table) < 1);
    assert.equal(isEstimatedCorrectScore(table), true);
  });

  it("keeps such a match on the list of those needing real odds", () => {
    const row = {
      ft1x2: { HOME: 1.65, DRAW: 3.63, AWAY: 5.09 },
      ht1x2: { HOME: 2.73, DRAW: 2.44, AWAY: 6.71 },
      correctScore: legacyEstimatedCorrectScore(),
    };
    assert.equal(hasCompleteMatchOdds(row), false);
  });
});

describe("înghețarea cotelor la kick-off", () => {
  const oddsRow = {
    ft1x2: { HOME: 1.65, DRAW: 3.63, AWAY: 5.09 },
    ht1x2: { HOME: 2.73, DRAW: 2.44, AWAY: 6.71 },
    correctScore: { "1-0": 7.67, "2-1": 13.02, "3-2": 66.32 },
  };
  const stored: BettingOddsPayload = {
    schemaVersion: 1,
    matches: { "1": oddsRow, "2": oddsRow },
    teams: {},
  };
  const matches = [
    { id: 1, utcDate: "2026-09-05T16:00:00Z", status: "FINISHED" },
    { id: 2, utcDate: "2026-09-20T16:00:00Z", status: "TIMED" },
  ] as FootballDataMatch[];
  const now = Date.parse("2026-09-08T10:00:00Z");

  it("locks matches that already kicked off, leaves upcoming ones open", () => {
    const locked = lockedOddsMatchIds(matches, stored, now);
    assert.deepEqual([...locked], ["1"]);
  });

  it("keeps stored odds for locked matches even when a refresh brings new ones", () => {
    const incoming: BettingOddsPayload = {
      schemaVersion: 1,
      matches: {
        "1": { ...oddsRow, ft1x2: { HOME: 1.9, DRAW: 3.4, AWAY: 4.1 } },
        "2": { ...oddsRow, ft1x2: { HOME: 1.9, DRAW: 3.4, AWAY: 4.1 } },
      },
      teams: {},
    };
    const merged = mergeBettingPayloads(incoming, stored, {
      lockedMatchIds: lockedOddsMatchIds(matches, stored, now),
    });
    assert.deepEqual(merged.matches["1"]?.ft1x2, oddsRow.ft1x2);
    assert.deepEqual(merged.matches["2"]?.ft1x2, { HOME: 1.9, DRAW: 3.4, AWAY: 4.1 });
  });

  it("does not lock a postponed match, since it will be replayed", () => {
    const postponed = [
      { id: 1, utcDate: "2026-09-05T16:00:00Z", status: "POSTPONED" },
    ] as FootballDataMatch[];
    assert.equal(lockedOddsMatchIds(postponed, stored, now).size, 0);
  });

  it("still fills a market the locked match was missing", () => {
    const withoutCs: BettingOddsPayload = {
      schemaVersion: 1,
      matches: { "1": { ...oddsRow, correctScore: {} } },
      teams: {},
    };
    const incoming: BettingOddsPayload = {
      schemaVersion: 1,
      matches: {
        "1": { ...oddsRow, ft1x2: { HOME: 1.9, DRAW: 3.4, AWAY: 4.1 } },
      },
      teams: {},
    };
    const merged = mergeBettingPayloads(incoming, withoutCs, {
      lockedMatchIds: lockedOddsMatchIds(matches, withoutCs, now),
    });
    assert.deepEqual(merged.matches["1"]?.ft1x2, oddsRow.ft1x2);
    assert.deepEqual(merged.matches["1"]?.correctScore, oddsRow.correctScore);
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

  it("maps Superliga fixtures when Football-Data is a day off at 17:00Z", () => {
    const fixtures = [
      {
        matchId: "pet-rap",
        home: "Petrolul",
        away: "Rapid",
        startDateIso: "2026-08-21T17:30:00.000Z",
        stadium: "Stadionul Ilie Oana",
        city: "Ploiesti",
        country: "Romania",
      },
    ];
    const fd = [
      {
        id: 566734,
        utcDate: "2026-08-22T17:00:00Z",
        status: "SCHEDULED",
        homeTeam: { id: 1, name: "FC Petrolul Ploiești", shortName: "Petrolul" },
        awayTeam: { id: 2, name: "FC Rapid Bucureşti", shortName: "Rapid" },
      },
    ] as FootballDataMatch[];
    const tooTight = mapFixturesToFootballDataMatches(fixtures, fd, {
      maxDiffHours: 18,
    });
    assert.equal(tooTight.get(566734), undefined);
    const wide = mapFixturesToFootballDataMatches(fixtures, fd, {
      maxDiffHours: 14 * 24,
    });
    assert.equal(wide.get(566734)?.matchId, "pet-rap");
  });
});
