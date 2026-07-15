import DashboardHome from "@/components/dashboard/dashboard-home";
import { getTodayDashboardNews } from "@/lib/wc-dashboard-news";
import { pageTitle } from "@/lib/site-metadata";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getOrSyncDbUser } from "@/lib/sync-clerk-user";

export const metadata = pageTitle("Acasă");

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const user = await getOrSyncDbUser();
  if (user && user.favoriteTeamId == null) {
    redirect("/profil?onboarding=1");
  }

  const { league } = await searchParams;
  const { items, fetchedAt, dateKey, leagueId } = await getTodayDashboardNews(league);

  return (
    <Suspense fallback={null}>
      <DashboardHome
        news={items}
        newsFetchedAt={fetchedAt}
        newsDateKey={dateKey}
        leagueId={leagueId}
      />
    </Suspense>
  );
}
