import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tournaments = await prisma.tournament.findMany({
    where: { name: { contains: "Betivilor", mode: "insensitive" } },
    include: {
      members: { include: { user: true } },
    },
  });

  for (const t of tournaments) {
    console.log("Tournament:", t.id, t.name);
    for (const m of t.members) {
      const name = `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim();
      console.log(
        " -",
        name,
        "| changes:",
        m.midCompetitionPredictionChangeCount,
        "| cached penalty:",
        m.cachedChangePenalty,
        "| total:",
        m.cachedTotal,
      );
    }

    const rizon = t.members.find((m) => {
      const fn = (m.user.firstName ?? "").toLowerCase();
      const ln = (m.user.lastName ?? "").toLowerCase();
      return (
        (fn.includes("teodor") && ln.includes("rizon")) ||
        (fn.includes("rizon") && ln.includes("teodor"))
      );
    });

    if (!rizon) {
      console.log("Rizon Teodor not found in this tournament.");
      continue;
    }

    if (rizon.midCompetitionPredictionChangeCount === 0) {
      console.log("Already zero change count.");
      continue;
    }

    await prisma.tournamentMember.update({
      where: {
        tournamentId_userId: {
          tournamentId: t.id,
          userId: rizon.userId,
        },
      },
      data: { midCompetitionPredictionChangeCount: 0 },
    });
    console.log("Reset midCompetitionPredictionChangeCount to 0 for Rizon Teodor.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
