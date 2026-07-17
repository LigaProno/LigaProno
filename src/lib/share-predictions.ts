export type MyPredRow = {
  fixture: string; // ex. "VOL–BOT"
  pred: { ht: string; ft: string; score: string };
};

export type MyMatchdayShareInput = {
  title: string; // ex. "Pronosticurile mele"
  matchdayLabel: string; // ex. "Etapa 1"
  tournamentName: string;
  rows: MyPredRow[];
  labels: {
    ht: string; // ex. "RP"
    ft: string; // ex. "RF"
    score: string; // ex. "SC"
    fixture: string; // ex. "Meci"
    noPreds: string;
    via: string;
  };
};

/** Padează la dreapta până la `width`. */
function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

/** Aduce valoarea exact la `width`: taie cu „…” dacă e prea lungă, altfel padează. */
function fit(value: string, width: number): string {
  if (value.length <= width) return pad(value, width);
  return value.slice(0, Math.max(1, width - 1)) + "…";
}

/**
 * Text pentru WhatsApp cu pronosticurile PROPRII pe toată etapa.
 * Blocul e învelit în ``` ca WhatsApp să-l afișeze monospace și coloanele să se alinieze.
 */
export function buildMyMatchdayShareText(input: MyMatchdayShareInput): string {
  const { title, matchdayLabel, tournamentName, labels } = input;

  const header = [`🔮 ${title} — ${matchdayLabel}`, `🏆 ${tournamentName}`].join("\n");

  // Arătăm toate meciurile etapei; cele nepronosticate apar cu „—”.
  if (input.rows.length === 0) {
    return `${header}\n\n${labels.noPreds}\n\n${labels.via}`;
  }

  // Lățimea coloanei de meci = cel mai lung „VOL–BOT”, plafonată ca să nu spargă ecranul.
  const fixtureWidth = Math.min(
    14,
    Math.max(labels.fixture.length, ...input.rows.map((r) => r.fixture.length)),
  );

  const head = `${fit(labels.fixture, fixtureWidth)}  ${labels.ht}  ${labels.ft}  ${labels.score}`;
  const body = input.rows
    .map((r) => {
      const fixture = fit(r.fixture, fixtureWidth);
      const ht = pad(r.pred.ht, labels.ht.length);
      const ft = pad(r.pred.ft, labels.ft.length);
      return `${fixture}  ${ht}  ${ft}  ${r.pred.score}`;
    })
    .join("\n");

  return `${header}\n\n\`\`\`\n${head}\n${body}\n\`\`\`\n${labels.via}`;
}
