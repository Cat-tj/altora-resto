"use client";

import { useState, useMemo } from "react";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Tag,
  ToggleLeft,
  ToggleRight,
  Users,
  Percent,
  DollarSign,
  Gift,
  CalendarDays,
  BarChart3,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type PromoStatus = "AKTIF" | "NONAKTIF" | "SELESAI";
type DiscountType = "PERSENTASE" | "TETAP" | "BOGO";
type PromoScope = "SEMUA" | "MENU_TERTENTU";

type Promo = {
  id: string;
  nama: string;
  tipeDiskon: DiscountType;
  nilaiDiskon: number;
  minTransaksi: number;
  tanggalMulai: string;
  tanggalSelesai: string;
  scope: PromoScope;
  status: PromoStatus;
  jumlahPenggunaan: number;
};

// ─── Mock data ─────────────────────────────────────────────────────────────
const mockPromos: Promo[] = [
  {
    id: "1",
    nama: "Diskon Akhir Pekan",
    tipeDiskon: "PERSENTASE",
    nilaiDiskon: 20,
    minTransaksi: 100000,
    tanggalMulai: "2026-08-01",
    tanggalSelesai: "2026-08-31",
    scope: "SEMUA",
    status: "AKTIF",
    jumlahPenggunaan: 145,
  },
  {
    id: "2",
    nama: "Happy Hour Beverages",
    tipeDiskon: "BOGO",
    nilaiDiskon: 0,
    minTransaksi: 50000,
    tanggalMulai: "2026-08-01",
    tanggalSelesai: "2026-08-15",
    scope: "MENU_TERTENTU",
    status: "AKTIF",
    jumlahPenggunaan: 82,
  },
  {
    id: "3",
    nama: "Promo Pelanggan Baru",
    tipeDiskon: "TETAP",
    nilaiDiskon: 25000,
    minTransaksi: 75000,
    tanggalMulai: "2026-07-01",
    tanggalSelesai: "2026-07-31",
    scope: "SEMUA",
    status: "SELESAI",
    jumlahPenggunaan: 312,
  },
  {
    id: "4",
    nama: "Diskon Menu Favorit",
    tipeDiskon: "PERSENTASE",
    nilaiDiskon: 15,
    minTransaksi: 80000,
    tanggalMulai: "2026-09-01",
    tanggalSelesai: "2026-09-30",
    scope: "MENU_TERTENTU",
    status: "NONAKTIF",
    jumlahPenggunaan: 0,
  },
  {
    id: "5",
    nama: "Lunch Combo Deal",
    tipeDiskon: "TETAP",
    nilaiDiskon: 15000,
    minTransaksi: 60000,
    tanggalMulai: "2026-08-10",
    tanggalSelesai: "2026-08-20",
    scope: "MENU_TERTENTU",
    status: "AKTIF",
    jumlahPenggunaan: 57,
  },
];

const tipeDiskonOptions: { value: DiscountType; label: string }[] = [
  { value: "PERSENTASE", label: "Persentase (%)" },
  { value: "TETAP", label: "Tetap (Rp)" },
  { value: "BOGO", label: "Beli 1 Gratis 1 (BOGO)" },
];

const scopeOptions: { value: PromoScope; label: string }[] = [
  { value: "SEMUA", label: "Semua Menu" },
  { value: "MENU_TERTENTU", label: "Menu Tertentu" },
];

const statusConfig: Record<
  PromoStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }
> = {
  AKTIF: { label: "Aktif", variant: "default", color: "bg-green-600" },
  NONAKTIF: { label: "Nonaktif", variant: "secondary", color: "" },
  SELESAI: { label: "Selesai", variant: "destructive", color: "" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function diskonDisplay(promo: Promo): string {
  if (promo.tipeDiskon === "PERSENTASE") return `${promo.nilaiDiskon}%`;
  if (promo.tipeDiskon === "TETAP") return formatRupiah(promo.nilaiDiskon);
  return "BOGO";
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function PromoPage() {
  const [promoList, setPromoList] = useState<Promo[]>(mockPromos);
  const [filterStatus, setFilterStatus] = useState<string>("SEMUA");
  const [showDialog, setShowDialog] = useState(false);

  const [form, setForm] = useState({
    nama: "",
    tipeDiskon: "PERSENTASE" as DiscountType,
    nilaiDiskon: "",
    minTransaksi: "",
    tanggalMulai: "",
    tanggalSelesai: "",
    scope: "SEMUA" as PromoScope,
  });

  const filteredList = useMemo(() => {
    if (filterStatus === "SEMUA") return promoList;
    return promoList.filter((p) => p.status === filterStatus);
  }, [promoList, filterStatus]);

  const stats = useMemo(() => {
    const result = { AKTIF: 0, NONAKTIF: 0, SELESAI: 0, total: promoList.length, totalPenggunaan: 0 };
    promoList.forEach((p) => {
      if (p.status === "AKTIF") result.AKTIF++;
      else if (p.status === "NONAKTIF") result.NONAKTIF++;
      else if (p.status === "SELESAI") result.SELESAI++;
      result.totalPenggunaan += p.jumlahPenggunaan;
    });
    return result;
  }, [promoList]);

  const resetForm = () => {
    setForm({
      nama: "",
      tipeDiskon: "PERSENTASE",
      nilaiDiskon: "",
      minTransaksi: "",
      tanggalMulai: "",
      tanggalSelesai: "",
      scope: "SEMUA",
    });
  };

  const handleSave = () => {
    if (!form.nama.trim() || !form.tanggalMulai || !form.tanggalSelesai) return;
    const newPromo: Promo = {
      id: Date.now().toString(),
      nama: form.nama,
      tipeDiskon: form.tipeDiskon,
      nilaiDiskon: Number(form.nilaiDiskon) || 0,
      minTransaksi: Number(form.minTransaksi) || 0,
      tanggalMulai: form.tanggalMulai,
      tanggalSelesai: form.tanggalSelesai,
      scope: form.scope,
      status: "AKTIF",
      jumlahPenggunaan: 0,
    };
    setPromoList((prev) => [...prev, newPromo]);
    setShowDialog(false);
    resetForm();
  };

  const toggleStatus = (id: string) => {
    setPromoList((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: (p.status === "AKTIF" ? "NONAKTIF" : "AKTIF") as PromoStatus }
          : p
      )
    );
  };

  const getDiscountIcon = (type: DiscountType) => {
    switch (type) {
      case "PERSENTASE":
        return <Percent className="h-4 w-4" />;
      case "TETAP":
        return <DollarSign className="h-4 w-4" />;
      case "BOGO":
        return <Gift className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Promosi</h1>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Promo Baru
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Promo</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Aktif</p>
            <p className="text-2xl font-bold text-green-600">{stats.AKTIF}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Nonaktif</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats.NONAKTIF}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Penggunaan</p>
            <p className="text-2xl font-bold text-primary">{stats.totalPenggunaan}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["SEMUA", "AKTIF", "NONAKTIF", "SELESAI"] as const).map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {status === "SEMUA" ? "Semua" : statusConfig[status].label}
            {status !== "SEMUA" && (
              <Badge variant="outline" className="ml-2 text-xs">
                {promoList.filter((p) => p.status === status).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Promo List */}
      {filteredList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Tag className="h-8 w-8" />
            <p className="font-medium">Tidak ada promo</p>
            <p className="text-xs">Klik &quot;Promo Baru&quot; untuk membuat promosi</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredList.map((promo) => {
            const sc = statusConfig[promo.status];
            return (
              <Card key={promo.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {getDiscountIcon(promo.tipeDiskon)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{promo.nama}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {tipeDiskonOptions.find((t) => t.value === promo.tipeDiskon)?.label}
                        </p>
                      </div>
                    </div>
                    <Badge variant={sc.variant} className={sc.color ? `text-white ${sc.color}` : ""}>
                      {sc.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Discount display */}
                  <div className="rounded-md bg-primary/5 p-3 text-center">
                    <p className="text-2xl font-bold text-primary">{diskonDisplay(promo)}</p>
                    {promo.minTransaksi > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Min. transaksi {formatRupiah(promo.minTransaksi)}
                      </p>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>
                        {promo.tanggalMulai} — {promo.tanggalSelesai}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Digunakan {promo.jumlahPenggunaan} kali</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      <span>{promo.scope === "SEMUA" ? "Semua menu" : "Menu tertentu"}</span>
                    </div>
                  </div>

                  {/* Toggle */}
                  {promo.status !== "SELESAI" && (
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground">
                        {promo.status === "AKTIF" ? "Promo aktif" : "Promo nonaktif"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => toggleStatus(promo.id)}
                      >
                        {promo.status === "AKTIF" ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-xs">
                          {promo.status === "AKTIF" ? "Aktif" : "Nonaktif"}
                        </span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ Create Promo Dialog ═══ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Promo Baru</DialogTitle>
            <DialogDescription>Buat promosi baru untuk restoran</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="promo-nama">Nama Promo *</Label>
              <Input
                id="promo-nama"
                placeholder="Contoh: Diskon Akhir Pekan"
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="promo-tipe">Tipe Diskon *</Label>
                <select
                  id="promo-tipe"
                  value={form.tipeDiskon}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tipeDiskon: e.target.value as DiscountType }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {tipeDiskonOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-nilai">
                  {form.tipeDiskon === "BOGO" ? "Nilai (otomatis 0)" : `Nilai Diskon ${form.tipeDiskon === "PERSENTASE" ? "(%)" : "(Rp)"}`}
                </Label>
                <Input
                  id="promo-nilai"
                  type="number"
                  min="0"
                  placeholder={form.tipeDiskon === "PERSENTASE" ? "20" : "25000"}
                  value={form.nilaiDiskon}
                  onChange={(e) => setForm((f) => ({ ...f, nilaiDiskon: e.target.value }))}
                  disabled={form.tipeDiskon === "BOGO"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-min">Minimum Transaksi (Rp)</Label>
              <Input
                id="promo-min"
                type="number"
                min="0"
                placeholder="100000"
                value={form.minTransaksi}
                onChange={(e) => setForm((f) => ({ ...f, minTransaksi: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="promo-mulai">Tanggal Mulai *</Label>
                <Input
                  id="promo-mulai"
                  type="date"
                  value={form.tanggalMulai}
                  onChange={(e) => setForm((f) => ({ ...f, tanggalMulai: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo-selesai">Tanggal Selesai *</Label>
                <Input
                  id="promo-selesai"
                  type="date"
                  value={form.tanggalSelesai}
                  onChange={(e) => setForm((f) => ({ ...f, tanggalSelesai: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="promo-scope">Cakupan</Label>
              <select
                id="promo-scope"
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as PromoScope }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {scopeOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.nama.trim() || !form.tanggalMulai || !form.tanggalSelesai}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
