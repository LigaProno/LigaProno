import type { Metadata } from "next";
import DashboardHome from "@/components/dashboard/dashboard-home";
import { getTodayWcNews } from "@/lib/wc-dashboard-news";

export const metadata: Metadata = {
  title: "Dashboard | PronoHub",
  description: "Evenimente, Cupa Mondială 2026 și știri zilnice de fotbal.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { items, fetchedAt, dateKey } = await getTodayWcNews();

  return (
    <DashboardHome
      news={items}
      newsFetchedAt={fetchedAt}
      newsDateKey={dateKey}
    />
  );
}
