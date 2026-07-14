import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: path.join(process.cwd(), ".env") });

const MAP_FILE = path.join(process.cwd(), "scripts", "migration", "clerk-id-map.json");
const prisma = new PrismaClient();

async function main() {
  const map = JSON.parse(await readFile(MAP_FILE, "utf8"));
  let updated = 0;
  let notFound = 0;

  for (const row of map) {
    const byDev = await prisma.user.findUnique({ where: { clerkId: row.devClerkId } });
    const byEmail = await prisma.user.findUnique({ where: { email: row.email } });
    const target = byDev ?? byEmail;

    if (!target) {
      notFound++;
      console.log(`Nu există în MongoDB: ${row.email}`);
      continue;
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        clerkId: row.prodClerkId,
        email: row.email,
      },
    });
    updated++;
    console.log(`Actualizat: ${row.email}`);
  }

  console.log(`\nActualizați: ${updated}, negăsiți: ${notFound}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
