import { auth, currentUser, type User as ClerkUser } from "@clerk/nextjs/server";
import type { User as DbUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { I18nError } from "@/lib/i18n/errors";

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

type ProfileFields = ReturnType<typeof profileFromClerk>;

function profileUnchanged(
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  },
  data: ProfileFields,
): boolean {
  return (
    user.email === data.email &&
    user.firstName === data.firstName &&
    user.lastName === data.lastName &&
    user.imageUrl === data.imageUrl
  );
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Conturile noi intră automat în turneele publice în desfășurare (nu și cele
 * încheiate). Best-effort: nu blocăm crearea contului dacă înscrierea eșuează.
 * Filtrăm `closedAt` în JS — pe MongoDB filtrul de query `closedAt: null` nu
 * prinde documentele unde câmpul lipsește (turneele deschise).
 */
async function enrollInOngoingPublicTournaments(userId: string): Promise<void> {
  try {
    const publicTournaments = await prisma.tournament.findMany({
      where: { isPublic: true },
      select: { id: true, closedAt: true },
    });
    const ongoing = publicTournaments.filter((t) => t.closedAt == null);
    if (ongoing.length === 0) return;

    await prisma.tournamentMember.createMany({
      data: ongoing.map((t) => ({ tournamentId: t.id, userId, prizePreference: [] })),
    });
  } catch (error) {
    console.error("[enrollInOngoingPublicTournaments]", userId, error);
  }
}

/** Keeps Prisma User in sync with Clerk (email/password, Google SSO, account changes). */
export async function syncClerkUser(clerkUser: ClerkProfile): Promise<string> {
  const data = profileFromClerk(clerkUser);

  const existingByClerk = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });
  if (existingByClerk) {
    // Evită UPDATE pe fiecare navigare când profilul e deja la zi.
    if (!profileUnchanged(existingByClerk, data)) {
      await prisma.user.update({ where: { clerkId: clerkUser.id }, data });
    }
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
    const created = await prisma.user.create({ data: { clerkId: clerkUser.id, ...data } });
    // Cont nou → înscriere automată în turneele publice în desfășurare.
    await enrollInOngoingPublicTournaments(created.id);
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    // Race: userul a fost creat de o cerere concurentă (care se ocupă de înscriere).
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

  const byClerk = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (byClerk) {
    const data = profileFromClerk(clerkUser);
    if (profileUnchanged(byClerk, data)) return byClerk;
    return prisma.user.update({ where: { id: byClerk.id }, data });
  }

  await syncClerkUserSafe(clerkUser);

  const linked = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (linked) return linked;

  const email = resolveEmail(clerkUser);
  return prisma.user.findUnique({ where: { email } });
}

/**
 * User DB garantat pentru server actions — sincronizează la cerere dacă rândul
 * încă nu există (user nou sau migrat al cărui clerkId s-a schimbat). Aruncă
 * erori i18n în loc să presupună că sync-ul din layout a rulat deja.
 */
export async function requireDbUser(): Promise<DbUser> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new I18nError("errors.notAuthenticated");

  const user = await getOrSyncDbUser();
  if (!user) throw new I18nError("errors.userNotFound");

  return user;
}
