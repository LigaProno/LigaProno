import DashboardHome from "@/components/dashboard/dashboard-home";
import { getTodayWcNews } from "@/lib/wc-dashboard-news";
import { pageTitle } from "@/lib/site-metadata";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata = pageTitle("Acasă");

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (userId) {
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (user && user.favoriteTeamId == null) {
      redirect("/profil?onboarding=1");
    }
  }

  const { items, fetchedAt, dateKey } = await getTodayWcNews();

  return (
    <DashboardHome
      news={items}
      newsFetchedAt={fetchedAt}
      newsDateKey={dateKey}
    />
  );
}
