import { getToken } from "@/lib/auth";
import { CaixaPage } from "@/components/dashboard/caixa-page";

export default async function Caixa() {
  const token = await getToken();

  return <CaixaPage token={token!} />;
}
