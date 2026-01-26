import { getToken, requiredAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requiredAdmin();
  const token = await getToken();

  return (
    <div className="flex min-h-dvh overflow-hidden text-black">
      {/* Sidebar DESKTOP */}
      <Sidebar userName={user.name} token={token} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* HEADER MOBILE */}
        <MobileSidebar />

        <main className="flex-1 overflow-y-auto bg-app-background">
          <div className="mx-auto w-full max-w-none px-3 sm:px-4 lg:px-6 2xl:px-8 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
