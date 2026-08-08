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
  LogOut,
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
  { href: "/", label: "Beranda", icon: Home },
  { href: "/kasir", label: "Kasir", icon: MonitorCheck },
  { href: "/pesanan", label: "Pesanan", icon: ClipboardList },
  { href: "/dapur", label: "Dapur", icon: ChefHat },
  { href: "/meja", label: "Meja", icon: LayoutGrid },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="altora-ambient min-h-screen">
      {/* ═══ Floating glass sidebar (desktop) ═══ */}
      <aside className="altora-glass fixed inset-y-4 left-4 z-20 hidden w-56 flex-col overflow-hidden rounded-[18px] lg:flex">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3">
          <div
            className="grid h-8 w-8 flex-none place-items-center rounded-[9px] text-white"
            style={{
              background:
                "linear-gradient(135deg, #7c5ce8 0%, #c05bc8 100%)",
            }}
          >
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-[0.82rem] font-bold text-[hsl(var(--ink))]">
              Altora Resto
            </strong>
            <small className="text-[0.62rem] text-muted-foreground">
              Operasional Restoran
            </small>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {navSections.map((section) => (
            <div key={section.title} className="mb-3">
              <h2 className="mx-2 mb-1 text-[0.6rem] font-extrabold uppercase tracking-[0.09em] text-muted-foreground/70">
                {section.title}
              </h2>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex min-h-8 items-center gap-2 rounded-lg px-2 text-[0.78rem] font-medium no-underline transition-colors",
                        active
                          ? "bg-[hsl(var(--accent-soft))] font-bold text-[hsl(var(--accent))]"
                          : "text-[hsl(var(--ink-2))] hover:bg-[hsl(var(--paper))] hover:text-[hsl(var(--ink))]"
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-none" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t px-3.5 py-2.5">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[hsl(var(--accent-soft))] text-[0.72rem] font-extrabold text-[hsl(var(--accent))]">
            AD
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-[0.72rem] font-bold text-[hsl(var(--ink))]">
              Admin
            </strong>
            <small className="text-[0.62rem] text-muted-foreground">
              Owner
            </small>
          </div>
          <button className="flex-none cursor-pointer rounded-md border px-2 py-0.5 text-[0.68rem] font-semibold text-muted-foreground transition-colors hover:border-red-500 hover:text-red-500">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </aside>

      {/* ═══ Main column ═══ */}
      <div className="flex min-h-screen flex-col lg:pl-60">
        {/* Mobile header */}
        <header className="altora-glass sticky top-0 z-10 flex h-14 items-center gap-2 border-b px-4 lg:hidden">
          <div
            className="grid h-7 w-7 place-items-center rounded-lg text-white"
            style={{
              background: "linear-gradient(135deg, #7c5ce8 0%, #c05bc8 100%)",
            }}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-bold text-[hsl(var(--ink))]">
            Altora Resto
          </span>
        </header>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-white/90 backdrop-blur-xl lg:hidden">
          {mobileNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.62rem] font-medium transition-colors",
                  active ? "text-[hsl(var(--accent))]" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 pb-20 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
