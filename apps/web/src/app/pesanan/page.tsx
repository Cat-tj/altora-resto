"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  CreditCard,
  Loader2,
  RefreshCw,
  Eye,
} from "lucide-react";

type PesananStatus =
  | "BARU"
  | "DIPROSES"
  | "SIAP"
  | "DIBAYAR"
  | "DIBATALKAN";

const STATUS_CONFIG: Record<
  PesananStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  BARU: {
    label: "Baru",
    variant: "default",
    icon: <Plus className="h-3 w-3" />,
  },
  DIPROSES: {
    label: "Diproses",
    variant: "secondary",
    icon: <ChefHat className="h-3 w-3" />,
  },
  SIAP: {
    label: "Siap",
    variant: "outline",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  DIBAYAR: {
    label: "Dibayar",
    variant: "default",
    icon: <CreditCard className="h-3 w-3" />,
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

interface Pesanan {
  id: string;
  nomorInvoice: string;
  status: PesananStatus;
  total: number;
  metodeBayar: string | null;
  namaPelanggan: string | null;
  namaMeja: string | null;
  namaKasir: string;
  jumlahItem: number;
  createdAt: string;
}

export default function PesananPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("semua");
  const [selectedPesanan, setSelectedPesanan] = useState<Pesanan | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pesanan, setPesanan] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for now — replace with tRPC when router is ready
  useEffect(() => {
    const mockPesanan: Pesanan[] = [
      {
        id: "1",
        nomorInvoice: "INV-20260808-001",
        status: "BARU",
        total: 85000,
        metodeBayar: null,
        namaPelanggan: "Budi",
        namaMeja: "Meja 3",
        namaKasir: "Andi",
        jumlahItem: 3,
        createdAt: new Date().toISOString(),
      },
      {
        id: "2",
        nomorInvoice: "INV-20260808-002",
        status: "DIPROSES",
        total: 125000,
        metodeBayar: null,
        namaPelanggan: "Siti",
        namaMeja: "Meja 5",
        namaKasir: "Andi",
        jumlahItem: 4,
        createdAt: new Date(Date.now() - 300000).toISOString(),
      },
      {
        id: "3",
        nomorInvoice: "INV-20260808-003",
        status: "SIAP",
        total: 67000,
        metodeBayar: null,
        namaPelanggan: null,
        namaMeja: null,
        namaKasir: "Rina",
        jumlahItem: 2,
        createdAt: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: "4",
        nomorInvoice: "INV-20260808-004",
        status: "DIBAYAR",
        total: 156000,
        metodeBayar: "TUNAI",
        namaPelanggan: "Andi",
        namaMeja: "Meja 1",
        namaKasir: "Andi",
        jumlahItem: 5,
        createdAt: new Date(Date.now() - 900000).toISOString(),
      },
      {
        id: "5",
        nomorInvoice: "INV-20260808-005",
        status: "DIBATALKAN",
        total: 45000,
        metodeBayar: null,
        namaPelanggan: null,
        namaMeja: "Meja 7",
        namaKasir: "Rina",
        jumlahItem: 1,
        createdAt: new Date(Date.now() - 1200000).toISOString(),
      },
    ];
    setPesanan(mockPesanan);
    setLoading(false);
  }, []);

  const filtered = pesanan.filter((p) => {
    const matchSearch =
      !search ||
      p.nomorInvoice.toLowerCase().includes(search.toLowerCase()) ||
      p.namaPelanggan?.toLowerCase().includes(search.toLowerCase()) ||
      p.namaMeja?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "semua" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: pesanan.length,
    baru: pesanan.filter((p) => p.status === "BARU").length,
    diproses: pesanan.filter((p) => p.status === "DIPROSES").length,
    siap: pesanan.filter((p) => p.status === "SIAP").length,
    dibayar: pesanan.filter((p) => p.status === "DIBAYAR").length,
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    return `${Math.floor(mins / 60)} jam lalu`;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pesanan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola pesanan masuk dan status pemrosesan
          </p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Hari Ini</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-xs text-orange-600">Baru</p>
            <p className="text-2xl font-bold text-orange-700">{stats.baru}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600">Diproses</p>
            <p className="text-2xl font-bold text-blue-700">{stats.diproses}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs text-green-600">Siap</p>
            <p className="text-2xl font-bold text-green-700">{stats.siap}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600">Dibayar</p>
            <p className="text-2xl font-bold text-gray-700">{stats.dibayar}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nomor invoice, pelanggan, meja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium">Tidak ada pesanan</p>
            <p className="text-sm text-muted-foreground">
              {search
                ? "Coba kata kunci pencarian lain"
                : "Pesanan baru akan muncul di sini"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const config = STATUS_CONFIG[p.status];
            return (
              <Card
                key={p.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => {
                  setSelectedPesanan(p);
                  setDetailOpen(true);
                }}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-sm font-bold">
                      {p.nomorInvoice.slice(-3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{p.nomorInvoice}</p>
                        <Badge variant={config.variant} className="gap-1">
                          {config.icon}
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {p.namaPelanggan ?? "Walk-in"}
                        {p.namaMeja ? ` • ${p.namaMeja}` : ""} •{" "}
                        {p.jumlahItem} item • {p.namaKasir}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatRupiah(p.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {timeAgo(p.createdAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Pesanan</DialogTitle>
          </DialogHeader>
          {selectedPesanan && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Invoice</span>
                <span className="font-mono font-medium">
                  {selectedPesanan.nomorInvoice}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={STATUS_CONFIG[selectedPesanan.status].variant}>
                  {STATUS_CONFIG[selectedPesanan.status].label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pelanggan</span>
                <span>{selectedPesanan.namaPelanggan ?? "Walk-in"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Meja</span>
                <span>{selectedPesanan.namaMeja ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Kasir</span>
                <span>{selectedPesanan.namaKasir}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jumlah Item</span>
                <span>{selectedPesanan.jumlahItem} item</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold">
                    {formatRupiah(selectedPesanan.total)}
                  </span>
                </div>
              </div>
              {selectedPesanan.metodeBayar && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Pembayaran
                  </span>
                  <Badge>{selectedPesanan.metodeBayar}</Badge>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
