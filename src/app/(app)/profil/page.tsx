import { Suspense } from "react";
import { ProfilePageContent } from "@/components/profile/profile-page-content";
import {
  getFavoriteTeamCompetitionOptions,
  getFavoriteTeamOptions,
  getProfileData,
} from "@/app/actions/profile";
import { DEFAULT_FAVORITE_TEAM_COMPETITION } from "@/lib/favorite-team";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("Profil");

export default async function ProfilPage() {
  const profile = await getProfileData();
  const competitionKey = profile.favoriteTeamCompetition ?? DEFAULT_FAVORITE_TEAM_COMPETITION;
  const [competitions, teams] = await Promise.all([
    getFavoriteTeamCompetitionOptions(),
    getFavoriteTeamOptions(competitionKey),
  ]);

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <div className="auth-skeleton h-64 rounded-2xl" />
        </div>
      }
    >
      <ProfilePageContent
        initialProfile={profile}
        initialTeams={teams}
        competitions={competitions}
      />
    </Suspense>
  );
}
