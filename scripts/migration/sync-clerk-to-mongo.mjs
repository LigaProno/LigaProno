import { config } from "dotenv";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: path.join(process.cwd(), ".env") });

const CLERK_SECRET = process.env.CLERK_SECRET_KEY_PROD ?? process.env.CLERK_SECRET_KEY;
const prisma = new PrismaClient();

function primaryEmail(user) {
  const primaryId = user.primary_email_address_id;
  const match = user.email_addresses?.find((e) => e.id === primaryId);
  return match?.email_address ?? user.email_addresses?.[0]?.email_address ?? null;
}

async function fetchAllClerkUsers() {
  const users = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const url = new URL("https://api.clerk.com/v1/users");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${CLERK_SECRET}` },
    });
    if (!res.ok) throw new Error(`Clerk API ${res.status}: ${await res.text()}`);

    const batch = await res.json();
    users.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }

  return users;
}

async function upsertUser(clerkUser) {
  const email = primaryEmail(clerkUser);
  if (!email) {
    return { status: "skipped", reason: "no-email", clerkId: clerkUser.id };
  }

  const data = {
    email,
    firstName: clerkUser.first_name ?? null,
    lastName: clerkUser.last_name ?? null,
    imageUrl: clerkUser.image_url ?? null,
    clerkId: clerkUser.id,
  };

  const byClerk = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (byClerk) {
    await prisma.user.update({ where: { id: byClerk.id }, data });
    return { status: "updated-clerk", email };
  }

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    await prisma.user.update({ where: { id: byEmail.id }, data });
    return { status: "linked-email", email };
  }

  await prisma.user.create({ data });
  return { status: "created", email };
}

async function main() {
  if (!CLERK_SECRET?.includes("_live_")) {
    console.error("Folosește CLERK_SECRET_KEY_PROD (sk_live_...) în .env");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL?.includes(".mongodb.net/")) {
    console.error("DATABASE_URL invalid — trebuie să conțină numele bazei, ex. ...mongodb.net/LigaProno");
    process.exit(1);
  }

  console.log("Import useri Clerk Production → MongoDB...");
  const clerkUsers = await fetchAllClerkUsers();
  console.log(`Găsiți ${clerkUsers.length} useri în Clerk.`);

  const summary = { created: 0, "updated-clerk": 0, "linked-email": 0, skipped: 0, errors: 0 };

  for (const clerkUser of clerkUsers) {
    try {
      const result = await upsertUser(clerkUser);
      summary[result.status] = (summary[result.status] ?? 0) + 1;
      console.log(`${result.status}: ${result.email ?? clerkUser.id}`);
    } catch (error) {
      summary.errors++;
      console.error(`ERR ${primaryEmail(clerkUser) ?? clerkUser.id}:`, error.message ?? error);
    }
  }

  console.log("\n--- Rezumat ---");
  console.log(summary);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
