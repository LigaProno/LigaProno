import DashboardHome from "@/components/dashboard/dashboard-home";
import { getTodayDashboardNews } from "@/lib/wc-dashboard-news";
import { pageTitle } from "@/lib/site-metadata";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = pageTitle("Acasă");

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const { userId } = await auth();
  if (userId) {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user && user.favoriteTeamId == null) {
      redirect("/profil?onboarding=1");
    }
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
