import DashboardHome from "@/components/dashboard/dashboard-home";
import { getTodayWcNews } from "@/lib/wc-dashboard-news";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("Acasă");

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
