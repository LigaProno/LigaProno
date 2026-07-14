export const DASHBOARD_NEWS_LEAGUE_IDS = [
  "RO",
  "PL",
  "ES",
  "DE",
  "IT",
  "FR",
  "CL",
] as const;

export type DashboardNewsLeagueId = (typeof DASHBOARD_NEWS_LEAGUE_IDS)[number];

export type DashboardNewsLeague = {
  id: DashboardNewsLeagueId;
  topicRe: RegExp;
  topicExcludeRe: RegExp;
  preferRomanianSources: boolean;
};

const EXCLUDE_OTHER_SPORTS =
  /\b(canotaj|v[âa]sle|tenis|zverev|roland garros|super rally|piranha|prim[aă]rie|tribunal|mercato var[aă]|r[âa]zboi mondial|formula\s*1|nba|nfl)\b/i;

export const DASHBOARD_NEWS_LEAGUES: Record<DashboardNewsLeagueId, DashboardNewsLeague> = {
  RO: {
    id: "RO",
    topicRe:
      /\b(superliga|super\s*liga|liga\s*[12]|fotbal\s*rom[aâ]nesc|rom[aâ]nia|fcsb|steaua|cfr\s*cluj|rapid|universitatea|uta|petrolul|farul|sepsi|dinamo\s*bucure[sș]ti|liga\s*na[țt]ional[aă])\b/i,
    topicExcludeRe: EXCLUDE_OTHER_SPORTS,
    preferRomanianSources: true,
  },
  PL: {
    id: "PL",
    topicRe:
      /\b(premier\s*league|\bepl\b|manchester|liverpool|arsenal|chelsea|tottenham|newcastle|aston\s*villa|brighton|west\s*ham|crystal\s*palace|wolverhampton|nottingham|bournemouth|fulham|brentford|everton|leicester|ipswich|southampton)\b/i,
    topicExcludeRe: EXCLUDE_OTHER_SPORTS,
    preferRomanianSources: false,
  },
  ES: {
    id: "ES",
    topicRe:
      /\b(la\s*liga|laliga|real\s*madrid|barcelona|bar[çc]a|atletico|atl[eé]tico|sevilla|real\s*sociedad|villarreal|athletic|betis|valencia|girona|osasuna)\b/i,
    topicExcludeRe: EXCLUDE_OTHER_SPORTS,
    preferRomanianSources: false,
  },
  DE: {
    id: "DE",
    topicRe:
      /\b(bundesliga|bayern|borussia|dortmund|leverkusen|rb\s*leipzig|stuttgart|frankfurt|wolfsburg|freiburg|hoffenheim|werder|union\s*berlin|gladbach|m[öo]nchengladbach)\b/i,
    topicExcludeRe: EXCLUDE_OTHER_SPORTS,
    preferRomanianSources: false,
  },
  IT: {
    id: "IT",
    topicRe:
      /\b(serie\s*a|juventus|inter\s*milan|ac\s*milan|napoli|atalanta|roma|lazio|fiorentina|torino|bologna|genoa|udinese)\b/i,
    topicExcludeRe: EXCLUDE_OTHER_SPORTS,
    preferRomanianSources: false,
  },
  FR: {
    id: "FR",
    topicRe:
      /\b(ligue\s*1|ligue\s*un|psg|paris\s*saint|marseille|olympique\s*lyon|lyon|monaco|lille|nice|rennes|lens|strasbourg)\b/i,
    topicExcludeRe: EXCLUDE_OTHER_SPORTS,
    preferRomanianSources: false,
  },
  CL: {
    id: "CL",
    topicRe:
      /\b(champions\s*league|liga\s*campionilor|uefa\s*champions|ucl\b|champions\s*league\s*202)\b/i,
    topicExcludeRe: EXCLUDE_OTHER_SPORTS,
    preferRomanianSources: false,
  },
};

export function parseDashboardNewsLeague(
  raw: string | undefined | null,
): DashboardNewsLeagueId {
  const id = raw?.trim().toUpperCase();
  if (id && id in DASHBOARD_NEWS_LEAGUES) {
    return id as DashboardNewsLeagueId;
  }
  return "RO";
}

export function dashboardNewsSnapshotKey(
  leagueId: DashboardNewsLeagueId,
  dateKey: string,
): string {
  return `${leagueId}:${dateKey}`;
}
