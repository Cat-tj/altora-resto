"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  MonitorCheck,
  UtensilsCrossed,
  ChefHat,
  LayoutGrid,
  ClipboardList,
  CalendarClock,
  Tags,
  Users,
  UserCog,
  Package,
  BookOpen,
  BarChart3,
  Settings,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Operasional",
    items: [
      { href: "/kasir", label: "Kasir", icon: MonitorCheck },
      { href: "/menu", label: "Menu", icon: UtensilsCrossed },
      { href: "/dapur", label: "Dapur", icon: ChefHat },
      { href: "/meja", label: "Meja", icon: LayoutGrid },
      { href: "/pesanan", label: "Pesanan", icon: ClipboardList },
    ],
  },
  {
    title: "Bisnis",
    items: [
      { href: "/reservasi", label: "Reservasi", icon: CalendarClock },
      { href: "/promo", label: "Promo", icon: Tags },
      { href: "/keanggotaan", label: "Keanggotaan", icon: Users },
    ],
  },
  {
    title: "Manajemen",
    items: [
      { href: "/pegawai", label: "Pegawai", icon: UserCog },
      { href: "/persediaan", label: "Persediaan", icon: Package },
      { href: "/resep", label: "Resep", icon: BookOpen },
      { href: "/laporan", label: "Laporan", icon: BarChart3 },
      { href: "/pengaturan", label: "Pengaturan", icon: Settings },
    ],
  },
];

const mobileNavItems: NavItem[] = [
  { href: "/kasir", label: "Kasir", icon: MonitorCheck },
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/dapur", label: "Dapur", icon: ChefHat },
  { href: "/meja", label: "Meja", icon: LayoutGrid },
  { href: "/pesanan", label: "Pesanan", icon: ClipboardList },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex h-14 items-center border-b px-6">
          <UtensilsCrossed className="mr-2 h-6 w-6 text-primary" />
          <span className="text-lg font-bold">Altora Resto</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          {/* Beranda */}
          <Link
            href="/"
            className={cn(
              "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive("/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Home className="mr-2 h-4 w-4" />
            Beranda
          </Link>

          {/* Section groups */}
          {navSections.map((section) => (
            <div key={section.title} className="mt-4">
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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

        {/* Mobile bottom nav */}
        <nav className="flex border-b lg:hidden">
          {mobileNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
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
