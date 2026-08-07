"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  UtensilsCrossed,
  MonitorCheck,
  ChefHat,
  LayoutGrid,
} from "lucide-react";

const modules = [
  {
    href: "/menu",
    title: "Manajemen Menu",
    description: "Kelola kategori, item, varian, dan harga menu",
    icon: UtensilsCrossed,
  },
  {
    href: "/kasir",
    title: "Kasir (POS)",
    description: "Layar point-of-sale untuk pemesanan dan pembayaran",
    icon: MonitorCheck,
  },
  {
    href: "/dapur",
    title: "Display Dapur (KDS)",
    description: "Tampilan tiket masak per stasiun dapur",
    icon: ChefHat,
  },
  {
    href: "/meja",
    title: "Manajemen Meja",
    description: "Denah lantai, status meja, dan reservasi",
    icon: LayoutGrid,
  },
];

export default function BerandaPage() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h1 className="mb-2 text-3xl font-bold">Altora Resto</h1>
      <p className="mb-8 max-w-md text-center text-muted-foreground">
        Sistem operasional restoran multi-tenant/multi-outlet
      </p>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {modules.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="transition-all hover:border-primary hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <mod.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{mod.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mod.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
