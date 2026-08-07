import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Altora Resto",
  description:
    "Sistem operasional restoran multi-tenant/multi-outlet.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
