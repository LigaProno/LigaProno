import { PrismaClient } from "@prisma/client";

function assertDatabaseUrl() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL lipsește din variabilele de mediu.");
  }

  // mongodb+srv://user:pass@host/DATABASE_NAME — numele bazei e obligatoriu
  const hasDbName = /mongodb(\+srv)?:\/\/[^/]+\/[^/?]+/.test(url);
  if (!hasDbName) {
    throw new Error(
      "DATABASE_URL trebuie să includă numele bazei de date, ex.: mongodb+srv://...@cluster.mongodb.net/LigaProno?retryWrites=true&w=majority",
    );
  }
}

assertDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
