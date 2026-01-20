import { getToken } from "@/lib/auth";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";

export default async function AnalyticsPage() {
  const token = await getToken();

  return <DashboardAnalytics token={token!} />;
}
