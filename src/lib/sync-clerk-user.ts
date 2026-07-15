import { currentUser, type User as ClerkUser } from "@clerk/nextjs/server";
import type { User as DbUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type ClerkProfile = Pick<
  ClerkUser,
  "id" | "firstName" | "lastName" | "imageUrl" | "emailAddresses" | "primaryEmailAddressId"
>;

function resolveEmail(clerkUser: ClerkProfile): string {
  const primary =
    clerkUser.primaryEmailAddressId ?
      clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
    : null;

  return (
    primary?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUser.id.replace(/^user_/, "")}@import.ligaprono.ro`
  );
}

function profileFromClerk(clerkUser: ClerkProfile) {
  return {
    email: resolveEmail(clerkUser),
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/** Keeps Prisma User in sync with Clerk (email/password, Google SSO, account changes). */
export async function syncClerkUser(clerkUser: ClerkProfile): Promise<string> {
  const data = profileFromClerk(clerkUser);

  const existingByClerk = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });
  if (existingByClerk) {
    await prisma.user.update({ where: { clerkId: clerkUser.id }, data });
    return data.email;
  }

  if (data.email) {
    const existingByEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingByEmail) {
      await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { clerkId: clerkUser.id, ...data },
      });
      return data.email;
    }
  }

  try {
    await prisma.user.create({ data: { clerkId: clerkUser.id, ...data } });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const raced =
      (await prisma.user.findUnique({ where: { clerkId: clerkUser.id } })) ??
      (data.email ? await prisma.user.findUnique({ where: { email: data.email } }) : null);

    if (!raced) throw error;

    await prisma.user.update({
      where: { id: raced.id },
      data: { clerkId: clerkUser.id, ...data },
    });
  }

  return data.email;
}

/** Sync fără să blocheze layout-ul dacă DB e temporar indisponibil. */
export async function syncClerkUserSafe(clerkUser: ClerkProfile): Promise<string | null> {
  try {
    return await syncClerkUser(clerkUser);
  } catch (error) {
    console.error("[syncClerkUser]", clerkUser.id, error);
    return null;
  }
}

/** Ensures the Clerk session has a matching Prisma user (links by email when clerkId changed). */
export async function getOrSyncDbUser(): Promise<DbUser | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  await syncClerkUserSafe(clerkUser);

  const byClerk = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (byClerk) return byClerk;

  const email = resolveEmail(clerkUser);
  return prisma.user.findUnique({ where: { email } });
}
