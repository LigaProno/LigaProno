"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { fetchCompetitionTeams } from "@/lib/football-data";
import {
  DEFAULT_FAVORITE_TEAM_COMPETITION,
  FAVORITE_TEAM_COMPETITION_OPTIONS,
  isFavoriteTeamCompetition,
} from "@/lib/favorite-team";
import { I18nError } from "@/lib/i18n/errors";
import { prisma } from "@/lib/prisma";
import { getOrSyncDbUser } from "@/lib/sync-clerk-user";

export type ProfileTeamOption = {
  id: number;
  name: string;
  crest: string | null;
};

export type ProfileCompetitionOption = {
  storageKey: string;
  label: string;
};

export type ProfileData = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  favoriteTeamId: number | null;
  favoriteTeamName: string | null;
  favoriteTeamCrest: string | null;
  favoriteTeamCompetition: string | null;
  createdAt: string;
};

async function requireDbUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new I18nError("errors.notAuthenticated");

  const user = await getOrSyncDbUser();
  if (!user) throw new I18nError("errors.userNotFound");

  return user;
}

export async function getFavoriteTeamCompetitionOptions(): Promise<ProfileCompetitionOption[]> {
  return FAVORITE_TEAM_COMPETITION_OPTIONS.map((o) => ({
    storageKey: o.storageKey,
    label: o.label,
  }));
}

export async function getFavoriteTeamOptions(
  competitionStorageKey: string = DEFAULT_FAVORITE_TEAM_COMPETITION,
): Promise<ProfileTeamOption[]> {
  if (!isFavoriteTeamCompetition(competitionStorageKey)) return [];

  const competition = FAVORITE_TEAM_COMPETITION_OPTIONS.find(
    (o) => o.storageKey === competitionStorageKey,
  );
  if (!competition) return [];

  try {
    const teams = await fetchCompetitionTeams(competition.code, competition.season);
    return teams
      .filter((t) => t.id != null && t.name?.trim())
      .map((t) => ({
        id: t.id!,
        name: t.name!.trim(),
        crest: t.crest ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ro"));
  } catch {
    return [];
  }
}

export async function getProfileData(): Promise<ProfileData> {
  const user = await requireDbUser();
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    favoriteTeamId: user.favoriteTeamId,
    favoriteTeamName: user.favoriteTeamName,
    favoriteTeamCrest: user.favoriteTeamCrest,
    favoriteTeamCompetition: user.favoriteTeamCompetition,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function updateFavoriteTeam(
  competitionStorageKey: string,
  teamId: number,
): Promise<void> {
  const user = await requireDbUser();

  if (!isFavoriteTeamCompetition(competitionStorageKey)) {
    throw new I18nError("errors.invalidFavoriteTeam");
  }

  const options = await getFavoriteTeamOptions(competitionStorageKey);
  const team = options.find((t) => t.id === teamId);
  if (!team) throw new I18nError("errors.invalidFavoriteTeam");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      favoriteTeamId: team.id,
      favoriteTeamName: team.name,
      favoriteTeamCrest: team.crest,
      favoriteTeamCompetition: competitionStorageKey,
    },
  });

  revalidatePath("/profil");
  revalidatePath("/dashboard");
}

export async function syncProfileFields(data: {
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}): Promise<void> {
  const user = await requireDbUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
    },
  });
  revalidatePath("/profil");
}

export async function deleteUserAccountData(): Promise<void> {
  const user = await requireDbUser();

  await prisma.$transaction([
    prisma.miniGamePlay.deleteMany({ where: { userId: user.id } }),
    prisma.wcMatchPrediction.deleteMany({ where: { userId: user.id } }),
    prisma.wcExtraPrediction.deleteMany({ where: { userId: user.id } }),
    prisma.tournamentMember.deleteMany({ where: { userId: user.id } }),
    prisma.tournament.deleteMany({ where: { creatorId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
}
