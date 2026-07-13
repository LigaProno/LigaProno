import { Suspense } from "react";
import { ProfilePageContent } from "@/components/profile/profile-page-content";
import { getFavoriteTeamOptions, getProfileData } from "@/app/actions/profile";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("Profil");

export default async function ProfilPage() {
  const [profile, teams] = await Promise.all([getProfileData(), getFavoriteTeamOptions()]);

  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <div className="auth-skeleton h-64 rounded-2xl" />
        </div>
      }
    >
      <ProfilePageContent initialProfile={profile} teams={teams} />
    </Suspense>
  );
}
