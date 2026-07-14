import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";

config({ path: path.join(process.cwd(), ".env") });

const SECRET = process.env.CLERK_SECRET_KEY_PROD ?? process.env.CLERK_LIVE_SECRET_KEY;
const INPUT = path.join(process.cwd(), "scripts", "migration", "clerk-import-ready.json");
const LOG_DIR = path.join(process.cwd(), "scripts", "migration", "logs");
const MAP_OUT = path.join(process.cwd(), "scripts", "migration", "clerk-id-map.json");

const DELAY_MS = 150;

if (!SECRET) {
  console.error(
    "Adaugă în .env cheia de PRODUCTION:\n  CLERK_SECRET_KEY_PROD=sk_live_...\nApoi rulează din nou.",
  );
  process.exit(1);
}

if (!SECRET.includes("_live_")) {
  console.error("CLERK_SECRET_KEY_PROD trebuie să fie sk_live_... (instanță Production).");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createUser(user) {
  const res = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_id: user.externalId,
      email_address: [user.email],
      first_name: user.firstName || undefined,
      last_name: user.lastName || undefined,
      skip_password_requirement: true,
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (res.status === 429) {
    return { retry: true, body };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, body, user };
  }

  return { ok: true, prodId: body.id, devId: user.externalId, email: user.email, body };
}

async function main() {
  const users = JSON.parse(await readFile(INPUT, "utf8"));
  await mkdir(LOG_DIR, { recursive: true });

  const idMap = [];
  const errors = [];
  let created = 0;
  let skipped = 0;

  console.log(`Import ${users.length} useri în Clerk Production...`);

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    let attempt = 0;

    while (attempt < 5) {
      const result = await createUser(user);

      if (result.retry) {
        attempt++;
        console.log(`Rate limit — aștept 10s (${user.email})`);
        await sleep(10_000);
        continue;
      }

      if (result.ok) {
        created++;
        idMap.push({
          email: result.email,
          devClerkId: result.devId,
          prodClerkId: result.prodId,
        });
        console.log(`[${i + 1}/${users.length}] OK ${user.email}`);
      } else if (result.status === 422 || result.status === 409) {
        skipped++;
        errors.push({ user, status: result.status, body: result.body });
        console.log(`[${i + 1}/${users.length}] SKIP ${user.email} (${result.status})`);
      } else {
        errors.push({ user, status: result.status, body: result.body });
        console.log(`[${i + 1}/${users.length}] ERR ${user.email} (${result.status})`);
      }

      break;
    }

    await sleep(DELAY_MS);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await writeFile(path.join(LOG_DIR, `import-errors-${stamp}.json`), JSON.stringify(errors, null, 2));
  await writeFile(MAP_OUT, JSON.stringify(idMap, null, 2));

  console.log("\n--- Rezumat ---");
  console.log(`Create: ${created}`);
  console.log(`Skip/Erori: ${skipped + errors.filter((e) => e.status !== 422 && e.status !== 409).length}`);
  console.log(`Mapare ID-uri: ${MAP_OUT}`);
  console.log(`Log erori: ${LOG_DIR}`);
  console.log("\nPas următor: node scripts/migration/sync-mongo-clerk-ids.mjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
