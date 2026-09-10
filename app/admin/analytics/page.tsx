import { getAnalytics } from "@/lib/admin-analytics";
import { AnalyticsView } from "@/components/admin/analytics-view";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Analytics — owner",
  robots: { index: false, follow: false },
};

export default async function AnalyticsPage() {
  return <AnalyticsView a={await getAnalytics()} />;
}
