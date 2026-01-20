import { Kitchen } from "@/components/dashboard/kitchen";
import { getToken } from "@/lib/auth";

export default async function KitchenPage() {
  const token = await getToken();

  return <Kitchen token={token!} />;
}
