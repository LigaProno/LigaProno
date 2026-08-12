import DashboardHome from "@/components/dashboard/dashboard-home";
import { getTodayDashboardNews } from "@/lib/wc-dashboard-news";
import {
  parseDashboardNewsLeague,
  type DashboardNewsLeagueId,
} from "@/lib/dashboard-news-leagues";
import { pageTitle } from "@/lib/site-metadata";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getOrSyncDbUser } from "@/lib/sync-clerk-user";

export const metadata = pageTitle("Acasă");

async function DashboardNewsBody({ league }: { league?: string }) {
  const { items, fetchedAt, dateKey, leagueId } = await getTodayDashboardNews(league);
  return (
    <DashboardHome
      news={items}
      newsFetchedAt={fetchedAt}
      newsDateKey={dateKey}
      leagueId={leagueId}
    />
  );
}

function DashboardShellFallback({ leagueId }: { leagueId: DashboardNewsLeagueId }) {
  return (
    <DashboardHome
      news={[]}
      newsFetchedAt={null}
      newsDateKey=""
      leagueId={leagueId}
    />
  );
}

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
  const leagueId = parseDashboardNewsLeague(league);

  return (
    <Suspense fallback={<DashboardShellFallback leagueId={leagueId} />}>
      <DashboardNewsBody league={league} />
    </Suspense>
  );
}
