"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Download,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Utensils,
  Receipt,
  CreditCard,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type DailySales = {
  tanggal: string;
  totalPendapatan: number;
  jumlahTransaksi: number;
  rataRataPerTransaksi: number;
};

type PopularItem = {
  id: string;
  nama: string;
  jumlahTerjual: number;
  totalPendapatan: number;
};

type ExpenseItem = {
  kategori: string;
  jumlah: number;
  persentase: number;
};

type MetricCard = {
  label: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

// ─── Mock data ─────────────────────────────────────────────────────────────
const mockDailySales: DailySales[] = [
  { tanggal: "2026-08-08", totalPendapatan: 12500000, jumlahTransaksi: 87, rataRataPerTransaksi: 143678 },
  { tanggal: "2026-08-07", totalPendapatan: 11200000, jumlahTransaksi: 79, rataRataPerTransaksi: 141772 },
  { tanggal: "2026-08-06", totalPendapatan: 13800000, jumlahTransaksi: 92, rataRataPerTransaksi: 150000 },
  { tanggal: "2026-08-05", totalPendapatan: 9500000, jumlahTransaksi: 65, rataRataPerTransaksi: 146154 },
  { tanggal: "2026-08-04", totalPendapatan: 14200000, jumlahTransaksi: 98, rataRataPerTransaksi: 144898 },
  { tanggal: "2026-08-03", totalPendapatan: 10800000, jumlahTransaksi: 74, rataRataPerTransaksi: 145946 },
  { tanggal: "2026-08-02", totalPendapatan: 15500000, jumlahTransaksi: 105, rataRataPerTransaksi: 147619 },
];

const mockPopularItems: PopularItem[] = [
  { id: "1", nama: "Nasi Goreng Spesial", jumlahTerjual: 156, totalPendapatan: 3120000 },
  { id: "2", nama: "Ayam Bakar Madu", jumlahTerjual: 98, totalPendapatan: 2940000 },
  { id: "3", nama: "Es Teh Manis", jumlahTerjual: 234, totalPendapatan: 1170000 },
  { id: "4", nama: "Soto Ayam", jumlahTerjual: 87, totalPendapatan: 1305000 },
  { id: "5", nama: "Gado-Gado", jumlahTerjual: 65, totalPendapatan: 975000 },
];

const mockExpenses: ExpenseItem[] = [
  { kategori: "Bahan Baku", jumlah: 4200000, persentase: 35 },
  { kategori: "Gaji Karyawan", jumlah: 3600000, persentase: 30 },
  { kategori: "Listrik & Air", jumlah: 1200000, persentase: 10 },
  { kategori: "Sewa Tempat", jumlah: 2400000, persentase: 20 },
  { kategori: "Lainnya", jumlah: 600000, persentase: 5 },
];

// ─── Component ─────────────────────────────────────────────────────────────
export default function LaporanPage() {
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("2026-08-02");
  const [dateTo, setDateTo] = useState("2026-08-08");
  const [dailySales] = useState<DailySales[]>(mockDailySales);
  const [popularItems] = useState<PopularItem[]>(mockPopularItems);
  const [expenses] = useState<ExpenseItem[]>(mockExpenses);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // In real app, this would fetch from tRPC
      // await trpc.order.list.query({ ... })
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error("Gagal memuat laporan:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate metrics from dailySales
  const totalPendapatanMingguIni = dailySales.reduce((sum, d) => sum + d.totalPendapatan, 0);
  const totalTransaksiMingguIni = dailySales.reduce((sum, d) => sum + d.jumlahTransaksi, 0);
  const rataRataHarian = dailySales.length > 0 ? totalPendapatanMingguIni / dailySales.length : 0;
  const totalPengeluaran = expenses.reduce((sum, e) => sum + e.jumlah, 0);
  const labaBersih = totalPendapatanMingguIni - totalPengeluaran;

  // Simulate previous period for comparison
  const prevTotalPendapatan = totalPendapatanMingguIni * 0.92;
  const pendapatanChange = prevTotalPendapatan > 0
    ? ((totalPendapatanMingguIni - prevTotalPendapatan) / prevTotalPendapatan) * 100
    : 0;

  const prevTransaksi = totalTransaksiMingguIni * 0.95;
  const transaksiChange = prevTransaksi > 0
    ? ((totalTransaksiMingguIni - prevTransaksi) / prevTransaksi) * 100
    : 0;

  const metrics: MetricCard[] = [
    {
      label: "Total Pendapatan",
      value: formatRupiah(totalPendapatanMingguIni),
      change: pendapatanChange,
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: "Total Transaksi",
      value: formatNumber(totalTransaksiMingguIni),
      change: transaksiChange,
      icon: ShoppingCart,
      color: "text-blue-600",
    },
    {
      label: "Rata-rata/Hari",
      value: formatRupiah(rataRataHarian),
      change: 5.2,
      icon: TrendingUp,
      color: "text-purple-600",
    },
    {
      label: "Laba Bersih",
      value: formatRupiah(labaBersih),
      change: labaBersih > 0 ? 8.5 : -3.2,
      icon: Receipt,
      color: labaBersih > 0 ? "text-green-600" : "text-red-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center lg:h-[calc(100vh-theme(spacing.6))]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Memuat laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Laporan</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border px-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-1 h-4 w-4" />
            Ekspor
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{m.label}</p>
                  <p className="mt-1 text-xl font-bold sm:text-2xl">{m.value}</p>
                </div>
                <div className={`rounded-full bg-muted p-2 ${m.color}`}>
                  <m.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                {m.change >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                    <span className="text-green-600 font-medium">+{m.change.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                    <span className="text-red-600 font-medium">{m.change.toFixed(1)}%</span>
                  </>
                )}
                <span className="text-muted-foreground">dari periode lalu</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="penjualan" className="w-full">
        <TabsList>
          <TabsTrigger value="penjualan">
            <BarChart3 className="mr-1 h-4 w-4" />
            Penjualan
          </TabsTrigger>
          <TabsTrigger value="populer">
            <Utensils className="mr-1 h-4 w-4" />
            Menu Populer
          </TabsTrigger>
          <TabsTrigger value="pengeluaran">
            <CreditCard className="mr-1 h-4 w-4" />
            Pengeluaran
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab: Penjualan Harian ═══ */}
        <TabsContent value="penjualan">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Chart placeholder */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Grafik Pendapatan Harian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-64 items-end gap-2 rounded-lg border bg-muted/30 p-4">
                  {dailySales.map((d, i) => {
                    const maxVal = Math.max(...dailySales.map((ds) => ds.totalPendapatan));
                    const height = maxVal > 0 ? (d.totalPendapatan / maxVal) * 100 : 0;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          {(d.totalPendapatan / 1000000).toFixed(1)}jt
                        </span>
                        <div
                          className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                          style={{ height: `${height}%`, minHeight: "4px" }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(d.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Daily breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rincian Harian</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dailySales.map((d) => (
                  <div key={d.tanggal} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(d.tanggal).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                      <p className="text-xs text-muted-foreground">{d.jumlahTransaksi} transaksi</p>
                    </div>
                    <p className="text-sm font-bold">{formatRupiah(d.totalPendapatan)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ Tab: Menu Populer ═══ */}
        <TabsContent value="populer">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                <Utensils className="mr-2 inline h-4 w-4" />
                Menu Terlaris
              </CardTitle>
              <Button variant="outline" size="sm">
                <FileText className="mr-1 h-4 w-4" />
                Ekspor CSV
              </Button>
            </CardHeader>
            <CardContent>
              {popularItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <AlertCircle className="h-8 w-8" />
                  <p>Belum ada data penjualan</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {popularItems.map((item, index) => {
                    const maxQty = Math.max(...popularItems.map((i) => i.jumlahTerjual));
                    const barWidth = maxQty > 0 ? (item.jumlahTerjual / maxQty) * 100 : 0;
                    return (
                      <div key={item.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={index < 3 ? "default" : "secondary"} className="w-7 justify-center">
                              {index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium">{item.nama}</p>
                              <p className="text-xs text-muted-foreground">{item.jumlahTerjual} terjual</p>
                            </div>
                          </div>
                          <p className="font-bold">{formatRupiah(item.totalPendapatan)}</p>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/70 transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab: Pengeluaran ═══ */}
        <TabsContent value="pengeluaran">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  <CreditCard className="mr-2 inline h-4 w-4" />
                  Rincian Pengeluaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 rounded-lg bg-muted p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
                  <p className="text-2xl font-bold text-red-600">{formatRupiah(totalPengeluaran)}</p>
                </div>
                <div className="space-y-3">
                  {expenses.map((e) => (
                    <div key={e.kategori} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-primary" style={{ opacity: e.persentase / 100 + 0.3 }} />
                        <span className="text-sm font-medium">{e.kategori}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{e.persentase}%</span>
                        <span className="text-sm font-bold">{formatRupiah(e.jumlah)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Expense breakdown chart placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Komposisi Pengeluaran</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-end gap-3 rounded-lg border bg-muted/30 p-4">
                  {expenses.map((e) => (
                    <div key={e.kategori} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{e.persentase}%</span>
                      <div
                        className="w-full rounded-t bg-primary/60 transition-all hover:bg-primary"
                        style={{ height: `${e.persentase * 2}%`, minHeight: "8px" }}
                      />
                      <span className="text-center text-[10px] leading-tight text-muted-foreground">
                        {e.kategori.split(" ")[0]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rasio Laba</span>
                    <span className={`font-bold ${labaBersih > 0 ? "text-green-600" : "text-red-600"}`}>
                      {totalPendapatanMingguIni > 0
                        ? ((labaBersih / totalPendapatanMingguIni) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Export section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Ekspor Laporan</p>
              <p className="text-sm text-muted-foreground">Unduh laporan dalam format CSV atau PDF</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-1 h-4 w-4" />
                Ekspor CSV
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="mr-1 h-4 w-4" />
                Ekspor PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
