"use client";

import { cn } from "@/lib/utils";
import { ShoppingCart, Package, LogOut, BarChart3, Wallet, ChefHat } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";
import { Logo } from "@/components/logo";

interface SidebarProps {
  userName: string;
}

const menuItems = [
  {
    title: "Pedidos",
    href: "/dashboard",
    icon: ShoppingCart,
  },
  {
    title: "Cozinha",
    href: "/dashboard/kitchen",
    icon: ChefHat,
  },
  {
    title: "Dashboard",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Caixa",
    href: "/dashboard/caixa",
    icon: Wallet,
  },
  {
    title: "Produtos",
    href: "/dashboard/products",
    icon: Package,
  },
];

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col h-screen w-64 border-r border-app-border bg-app-sidebar">
      {/*  HEADER */}
      <div className="border-b border-app-border p-6">
        <Logo width={100} height={32} className="h-8 w-auto" />
        <p className="text-sm text-gray-700 mt-1">Olá, {userName}</p>
      </div>

      {/* MENU */}
      <nav className="flex-1 p-4 space-y-4">
        {menuItems.map((menu) => {
          const Icon = menu.icon;
          const isActive = pathname === menu.href;

          return (
            <Link
              href={menu.href}
              key={menu.title}
              className={cn(
                "flex items-center gap-3  px-3 py-2 text-sm rounded-md font-normal transition-colors duration-300",
                isActive ? "bg-brand-primary text-black" : "text-black hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5 text-green-500" />
              {menu.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-app-border p-4">
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 text-black hover:text-black hover:bg-transparent"
          >
            <LogOut className="w-5 h-5 text-green-500" />
            Sair
          </Button>
        </form>
      </div>
    </aside>
  );
}
