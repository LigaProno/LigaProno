/**
 * Script pentru actualizarea cotelor pentru toate competițiile active.
 * Rulare: npx tsx scripts/refresh-odds.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function resolveTournamentCompetitionKeys(tournament: {
  competition: string | null;
  competitions?: string[];
}): string[] {
  const fromList = (tournament.competitions ?? [])
    .map((c) => c.trim())
    .filter(Boolean);
  if (fromList.length > 0) {
    return [...new Set(fromList)];
  }
  const single = tournament.competition?.trim();
  return single ? [single] : [];
}

async function main() {
  console.log("=== Refresh Odds Script ===\n");

  const tournaments = await prisma.tournament.findMany({
    select: { id: true, name: true, competition: true, competitions: true },
  });

  console.log(`Turnee găsite: ${tournaments.length}`);

  const competitions = [
    ...new Set(tournaments.flatMap((t) => resolveTournamentCompetitionKeys(t))),
  ];

  console.log(`Competiții unice: ${competitions.join(", ") || "(niciuna)"}\n`);

  if (competitions.length === 0) {
    console.log("Nu există competiții active de actualizat.");
    return;
  }

  // Importăm funcția de refresh
  const { refreshOddsForCompetition } = await import(
    "../src/lib/refresh-competition-odds"
  );

  for (const competition of competitions) {
    console.log(`\n📊 Procesez: ${competition}`);
    try {
      const result = await refreshOddsForCompetition(competition);
      if (result.ok) {
        console.log(`   ✅ Succes: ${result.matchCount} meciuri, sursa: ${result.oddsSource}`);
        if (result.usedFallback) {
          console.log(`   ⚠️  A folosit fallback Gemini`);
        }
      } else {
        console.log(`   ❌ Eroare: ${result.error}`);
      }
    } catch (err) {
      console.log(`   ❌ Excepție: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("\n=== Terminat ===");
}

main()
  .catch((e) => {
    console.error("Eroare fatală:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
