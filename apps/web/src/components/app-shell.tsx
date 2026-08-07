"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  UtensilsCrossed,
  MonitorCheck,
  ChefHat,
  LayoutGrid,
  Home,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/kasir", label: "Kasir", icon: MonitorCheck },
  { href: "/dapur", label: "Dapur", icon: ChefHat },
  { href: "/meja", label: "Meja", icon: LayoutGrid },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-14 items-center border-b px-6">
          <UtensilsCrossed className="mr-2 h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Altora Resto</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-4 text-xs text-muted-foreground">
          v0.1.0 &middot; Altora Resto
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b px-4 lg:hidden">
          <UtensilsCrossed className="mr-2 h-5 w-5 text-primary" />
          <span className="font-bold">Altora Resto</span>
        </header>

        {/* Mobile nav */}
        <nav className="flex border-b lg:hidden">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
