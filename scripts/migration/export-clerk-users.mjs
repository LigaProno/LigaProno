import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });

const SECRET = process.env.CLERK_SECRET_KEY;
if (!SECRET) {
  console.error("Lipsește CLERK_SECRET_KEY în .env");
  process.exit(1);
}

async function fetchAllUsers() {
  const users = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const url = new URL("https://api.clerk.com/v1/users");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${SECRET}` },
    });

    if (!res.ok) {
      throw new Error(`Clerk API ${res.status}: ${await res.text()}`);
    }

    const batch = await res.json();
    users.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return users;
}

function primaryEmail(user) {
  const primaryId = user.primary_email_address_id;
  const match = user.email_addresses?.find((e) => e.id === primaryId);
  return match?.email_address ?? user.email_addresses?.[0]?.email_address ?? null;
}

async function main() {
  console.log("Export useri Clerk (Development)...");
  const raw = await fetchAllUsers();

  const exported = raw
    .map((user) => ({
      externalId: user.id,
      email: primaryEmail(user),
      firstName: user.first_name ?? "",
      lastName: user.last_name ?? "",
      imageUrl: user.image_url ?? "",
    }))
    .filter((user) => user.email);

  const outDir = path.join(process.cwd(), "scripts", "migration");
  await mkdir(outDir, { recursive: true });

  const outPath = path.join(outDir, "clerk-dev-users.json");
  const importPath = path.join(outDir, "clerk-import-ready.json");

  const forImport = exported.map(({ externalId, email, firstName, lastName }) => ({
    externalId,
    email,
    firstName,
    lastName,
  }));

  await writeFile(outPath, JSON.stringify(exported, null, 2));
  await writeFile(importPath, JSON.stringify(forImport, null, 2));

  console.log(`Găsiți ${raw.length} useri în Clerk Dev.`);
  console.log(`Exportați ${exported.length} useri cu email valid.`);
  console.log(`Fișier complet: ${outPath}`);
  console.log(`Fișier pentru import: ${importPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
