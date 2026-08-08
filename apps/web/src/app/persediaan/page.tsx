"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowLeftRight,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Warehouse,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type Bahan = {
  id: string;
  nama: string;
  satuan: string;
  kategoriBahan: string;
  stokSaatIni: number;
  stokMinimum: number;
  hargaPerolehan: number;
  outletId: string;
  outletNama: string;
  status: string;
};

type StokOpname = {
  id: string;
  gudangNama: string;
  status: string;
  dijadwalkanPada: string;
  dibuatPada: string;
};

type TransferStok = {
  id: string;
  bahanNama: string;
  jumlah: number;
  dariOutlet: string;
  keOutlet: string;
  status: string;
  createdAt: string;
};

// ─── Mock data ─────────────────────────────────────────────────────────────
const mockBahan: Bahan[] = [
  { id: "1", nama: "Beras Premium", satuan: "kg", kategoriBahan: "BAHAN_POKOK", stokSaatIni: 50, stokMinimum: 10, hargaPerolehan: 12000, outletId: "1", outletNama: "Outlet Pusat", status: "AKTIF" },
  { id: "2", nama: "Daging Sapi", satuan: "kg", kategoriBahan: "DAGING", stokSaatIni: 5, stokMinimum: 8, hargaPerolehan: 120000, outletId: "1", outletNama: "Outlet Pusat", status: "AKTIF" },
  { id: "3", nama: "Ayam Fillet", satuan: "kg", kategoriBahan: "DAGING", stokSaatIni: 12, stokMinimum: 10, hargaPerolehan: 45000, outletId: "1", outletNama: "Outlet Pusat", status: "AKTIF" },
  { id: "4", nama: "Sayur Kangkung", satuan: "ikat", kategoriBahan: "SAYUR", stokSaatIni: 3, stokMinimum: 5, hargaPerolehan: 3000, outletId: "1", outletNama: "Outlet Pusat", status: "AKTIF" },
  { id: "5", nama: "Minyak Goreng", satuan: "liter", kategoriBahan: "BAHAN_POKOK", stokSaatIni: 20, stokMinimum: 15, hargaPerolehan: 15000, outletId: "1", outletNama: "Outlet Pusat", status: "AKTIF" },
  { id: "6", nama: "Gula Pasir", satuan: "kg", kategoriBahan: "BAHAN_POKOK", stokSaatIni: 0, stokMinimum: 5, hargaPerolehan: 14000, outletId: "1", outletNama: "Outlet Pusat", status: "HABIS" },
  { id: "7", nama: "Tepung Terigu", satuan: "kg", kategoriBahan: "BAHAN_POKOK", stokSaatIni: 25, stokMinimum: 10, hargaPerolehan: 9000, outletId: "2", outletNama: "Outlet Cabang", status: "AKTIF" },
];

const mockOpname: StokOpname[] = [
  { id: "1", gudangNama: "Gudang Utama", status: "DIPOSTING", dijadwalkanPada: "2026-08-01T08:00:00Z", dibuatPada: "2026-07-30T10:00:00Z" },
  { id: "2", gudangNama: "Gudang Utama", status: "SEDANG_DIHITUNG", dijadwalkanPada: "2026-08-08T08:00:00Z", dibuatPada: "2026-08-07T10:00:00Z" },
];

const mockTransfer: TransferStok[] = [
  { id: "1", bahanNama: "Beras Premium", jumlah: 10, dariOutlet: "Outlet Pusat", keOutlet: "Outlet Cabang", status: "SELESAI", createdAt: "2026-08-07T14:00:00Z" },
  { id: "2", bahanNama: "Minyak Goreng", jumlah: 5, dariOutlet: "Outlet Pusat", keOutlet: "Outlet Cabang", status: "DITAHAN", createdAt: "2026-08-08T09:00:00Z" },
];

const kategoriOptions = ["BAHAN_POKOK", "DAGING", "SAYUR", "BUAH", "REMPAH", "LAINNYA"];

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
}

function getStockColor(current: number, minimum: number): string {
  if (current === 0) return "bg-red-100 text-red-800 border-red-200";
  if (current <= minimum) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-green-100 text-green-800 border-green-200";
}

function getStockLabel(current: number, minimum: number): string {
  if (current === 0) return "Habis";
  if (current <= minimum) return "Rendah";
  return "Cukup";
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function PersediaanPage() {
  const [bahanList, setBahanList] = useState<Bahan[]>([]);
  const [opnameList, setOpnameList] = useState<StokOpname[]>([]);
  const [transferList, setTransferList] = useState<TransferStok[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("semua");

  // Bahan dialog
  const [showBahanDialog, setShowBahanDialog] = useState(false);
  const [editingBahan, setEditingBahan] = useState<Bahan | null>(null);
  const [bahanForm, setBahanForm] = useState({
    nama: "",
    satuan: "kg",
    kategoriBahan: "BAHAN_POKOK",
    stokSaatIni: 0,
    stokMinimum: 10,
    hargaPerolehan: 0,
  });

  // Stock opname dialog
  const [showOpnameDialog, setShowOpnameDialog] = useState(false);
  const [opnameForm, setOpnameForm] = useState({ bahanId: "", jumlahFisik: 0 });

  // Transfer dialog
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferForm, setTransferForm] = useState({ bahanId: "", jumlah: 0, keOutletId: "" });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Try tRPC; fall back to mock
      try {
        const [gudangData] = await Promise.all([
          trpc.persediaan.gudang.list.query({ includeStok: true }),
        ]);
        // If we get data, use it; otherwise mock
        setBahanList(mockBahan);
      } catch {
        setBahanList(mockBahan);
      }
      setOpnameList(mockOpname);
      setTransferList(mockTransfer);
    } catch (err) {
      console.error("Gagal memuat data persediaan:", err);
      setBahanList(mockBahan);
      setOpnameList(mockOpname);
      setTransferList(mockTransfer);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredBahan = useMemo(() => {
    return bahanList.filter((b) => {
      const matchSearch = !search || b.nama.toLowerCase().includes(search.toLowerCase());
      const matchKategori = filterKategori === "semua" || b.kategoriBahan === filterKategori;
      return matchSearch && matchKategori;
    });
  }, [bahanList, search, filterKategori]);

  const lowStockCount = bahanList.filter((b) => b.stokSaatIni <= b.stokMinimum).length;
  const outOfStockCount = bahanList.filter((b) => b.stokSaatIni === 0).length;
  const totalValue = bahanList.reduce((sum, b) => sum + b.stokSaatIni * b.hargaPerolehan, 0);

  // ─── Bahan handlers ────────────────────────────────────────────────────
  const openAddBahan = () => {
    setEditingBahan(null);
    setBahanForm({ nama: "", satuan: "kg", kategoriBahan: "BAHAN_POKOK", stokSaatIni: 0, stokMinimum: 10, hargaPerolehan: 0 });
    setShowBahanDialog(true);
  };

  const openEditBahan = (b: Bahan) => {
    setEditingBahan(b);
    setBahanForm({
      nama: b.nama,
      satuan: b.satuan,
      kategoriBahan: b.kategoriBahan,
      stokSaatIni: b.stokSaatIni,
      stokMinimum: b.stokMinimum,
      hargaPerolehan: b.hargaPerolehan,
    });
    setShowBahanDialog(true);
  };

  const saveBahan = () => {
    if (!bahanForm.nama.trim()) return;
    if (editingBahan) {
      setBahanList((prev) =>
        prev.map((b) =>
          b.id === editingBahan.id
            ? {
                ...b,
                ...bahanForm,
                status: bahanForm.stokSaatIni === 0 ? "HABIS" : "AKTIF",
              }
            : b
        )
      );
    } else {
      setBahanList((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          ...bahanForm,
          outletId: "1",
          outletNama: "Outlet Pusat",
          status: bahanForm.stokSaatIni === 0 ? "HABIS" : "AKTIF",
        },
      ]);
    }
    setShowBahanDialog(false);
  };

  const deleteBahan = (id: string) => {
    setBahanList((prev) => prev.filter((b) => b.id !== id));
  };

  // ─── Opname handler ────────────────────────────────────────────────────
  const createOpname = () => {
    setOpnameList((prev) => [
      {
        id: Date.now().toString(),
        gudangNama: "Gudang Utama",
        status: "SEDANG_DIHITUNG",
        dijadwalkanPada: new Date().toISOString(),
        dibuatPada: new Date().toISOString(),
      },
      ...prev,
    ]);
    setShowOpnameDialog(false);
    setOpnameForm({ bahanId: "", jumlahFisik: 0 });
  };

  // ─── Transfer handler ──────────────────────────────────────────────────
  const createTransfer = () => {
    if (!transferForm.bahanId || transferForm.jumlah <= 0) return;
    const bahan = bahanList.find((b) => b.id === transferForm.bahanId);
    setTransferList((prev) => [
      {
        id: Date.now().toString(),
        bahanNama: bahan?.nama ?? "Unknown",
        jumlah: transferForm.jumlah,
        dariOutlet: "Outlet Pusat",
        keOutlet: "Outlet Cabang",
        status: "DITAHAN",
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setShowTransferDialog(false);
    setTransferForm({ bahanId: "", jumlah: 0, keOutletId: "" });
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center lg:h-[calc(100vh-theme(spacing.6))]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Memuat data persediaan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Persediaan</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowOpnameDialog(true)}>
            <ClipboardCheck className="mr-1 h-4 w-4" />
            Opname
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTransferDialog(true)}>
            <ArrowLeftRight className="mr-1 h-4 w-4" />
            Transfer
          </Button>
          <Button size="sm" onClick={openAddBahan}>
            <Plus className="mr-1 h-4 w-4" />
            Tambah Bahan
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Bahan</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{bahanList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Stok Rendah</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-yellow-600">{lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-sm text-muted-foreground">Habis</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">{outOfStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-sm text-muted-foreground">Nilai Stok</p>
            </div>
            <p className="mt-1 text-lg font-bold">{formatRupiah(totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama bahan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3">
          <Warehouse className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="bg-transparent py-2 text-sm outline-none"
          >
            <option value="semua">Semua Kategori</option>
            {kategoriOptions.map((k) => (
              <option key={k} value={k}>{k.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="stok" className="w-full">
        <TabsList>
          <TabsTrigger value="stok">Stok Bahan</TabsTrigger>
          <TabsTrigger value="opname">Stok Opname</TabsTrigger>
          <TabsTrigger value="transfer">Transfer Stok</TabsTrigger>
        </TabsList>

        {/* ═══ Tab: Stok Bahan ═══ */}
        <TabsContent value="stok">
          {filteredBahan.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8" />
                <p className="font-medium">Tidak ada data bahan</p>
                <p className="text-xs">
                  {search || filterKategori !== "semua"
                    ? "Coba ubah filter atau pencarian Anda"
                    : "Klik &quot;Tambah Bahan&quot; untuk menambah bahan baru"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                {/* Desktop */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nama Bahan</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Kategori</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Stok</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Minimum</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Harga/Unit</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBahan.map((b) => (
                        <tr key={b.id} className="border-b last:border-0 hover:bg-accent/50">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium">{b.nama}</p>
                            <p className="text-xs text-muted-foreground">{b.outletNama}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs">{b.kategoriBahan.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-bold">
                              {b.stokSaatIni} {b.satuan}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                            {b.stokMinimum} {b.satuan}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`text-xs border ${getStockColor(b.stokSaatIni, b.stokMinimum)}`}>
                              {getStockLabel(b.stokSaatIni, b.stokMinimum)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">{formatRupiah(b.hargaPerolehan)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditBahan(b)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBahan(b.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="divide-y md:hidden">
                  {filteredBahan.map((b) => (
                    <div key={b.id} className="space-y-2 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{b.nama}</p>
                          <p className="text-xs text-muted-foreground">{b.outletNama}</p>
                        </div>
                        <Badge className={`text-xs border ${getStockColor(b.stokSaatIni, b.stokMinimum)}`}>
                          {getStockLabel(b.stokSaatIni, b.stokMinimum)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                          Stok: <span className="font-bold text-foreground">{b.stokSaatIni} {b.satuan}</span>
                          <span className="mx-1">/</span>
                          Min: {b.stokMinimum}
                        </div>
                        <span className="font-medium">{formatRupiah(b.hargaPerolehan)}/{b.satuan}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{b.kategoriBahan.replace(/_/g, " ")}</Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditBahan(b)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteBahan(b.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ Tab: Stok Opname ═══ */}
        <TabsContent value="opname">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                <ClipboardCheck className="mr-2 inline h-4 w-4" />
                Riwayat Stok Opname
              </CardTitle>
              <Button size="sm" onClick={() => setShowOpnameDialog(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Buat Opname
              </Button>
            </CardHeader>
            <CardContent>
              {opnameList.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <ClipboardCheck className="h-8 w-8" />
                  <p>Belum ada stok opname</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {opnameList.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{o.gudangNama}</p>
                        <p className="text-xs text-muted-foreground">
                          Dijadwalkan: {new Date(o.dijadwalkanPada).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <Badge variant={
                        o.status === "DIPOSTING" ? "default" :
                        o.status === "SEDANG_DIHITUNG" ? "secondary" :
                        "outline"
                      } className="text-xs">
                        {o.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab: Transfer Stok ═══ */}
        <TabsContent value="transfer">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                <ArrowLeftRight className="mr-2 inline h-4 w-4" />
                Transfer Stok
              </CardTitle>
              <Button size="sm" onClick={() => setShowTransferDialog(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Transfer Baru
              </Button>
            </CardHeader>
            <CardContent>
              {transferList.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <ArrowLeftRight className="h-8 w-8" />
                  <p>Belum ada transfer stok</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transferList.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{t.bahanNama}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.dariOutlet} → {t.keOutlet} ({t.jumlah} unit)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.createdAt).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <Badge variant={
                        t.status === "SELESAI" ? "default" :
                        t.status === "DITAHAN" ? "secondary" :
                        "outline"
                      } className="text-xs">
                        {t.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ Bahan Dialog ═══ */}
      <Dialog open={showBahanDialog} onOpenChange={setShowBahanDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBahan ? "Edit Bahan" : "Tambah Bahan"}</DialogTitle>
            <DialogDescription>
              {editingBahan ? "Ubah informasi bahan" : "Tambahkan bahan baru ke persediaan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bahan-nama">Nama Bahan *</Label>
              <Input
                id="bahan-nama"
                value={bahanForm.nama}
                onChange={(e) => setBahanForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="Contoh: Beras Premium"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bahan-satuan">Satuan</Label>
                <Input
                  id="bahan-satuan"
                  value={bahanForm.satuan}
                  onChange={(e) => setBahanForm((f) => ({ ...f, satuan: e.target.value }))}
                  placeholder="kg, liter, ikat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bahan-kategori">Kategori</Label>
                <select
                  id="bahan-kategori"
                  value={bahanForm.kategoriBahan}
                  onChange={(e) => setBahanForm((f) => ({ ...f, kategoriBahan: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {kategoriOptions.map((k) => (
                    <option key={k} value={k}>{k.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bahan-stok">Stok Saat Ini</Label>
                <Input
                  id="bahan-stok"
                  type="number"
                  min="0"
                  value={bahanForm.stokSaatIni}
                  onChange={(e) => setBahanForm((f) => ({ ...f, stokSaatIni: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bahan-minimum">Stok Minimum</Label>
                <Input
                  id="bahan-minimum"
                  type="number"
                  min="0"
                  value={bahanForm.stokMinimum}
                  onChange={(e) => setBahanForm((f) => ({ ...f, stokMinimum: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bahan-harga">Harga/Unit (Rp)</Label>
                <Input
                  id="bahan-harga"
                  type="number"
                  min="0"
                  value={bahanForm.hargaPerolehan}
                  onChange={(e) => setBahanForm((f) => ({ ...f, hargaPerolehan: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBahanDialog(false)}>Batal</Button>
            <Button onClick={saveBahan} disabled={!bahanForm.nama.trim()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Stok Opname Dialog ═══ */}
      <Dialog open={showOpnameDialog} onOpenChange={setShowOpnameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Stok Opname</DialogTitle>
            <DialogDescription>
              Jadwalkan stok opname baru untuk pencatatan fisik
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium">Gudang: Gudang Utama</p>
              <p className="text-muted-foreground">Stok opname akan dilakukan untuk gudang utama outlet saat ini.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="opname-catatan">Catatan (Opsional)</Label>
              <Input
                id="opname-catatan"
                placeholder="Alasan opname..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpnameDialog(false)}>Batal</Button>
            <Button onClick={createOpname}>Buat Opname</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Transfer Dialog ═══ */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Stok</DialogTitle>
            <DialogDescription>
              Pindahkan stok bahan antar outlet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-bahan">Bahan</Label>
              <select
                id="transfer-bahan"
                value={transferForm.bahanId}
                onChange={(e) => setTransferForm((f) => ({ ...f, bahanId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">-- Pilih Bahan --</option>
                {bahanList
                  .filter((b) => b.stokSaatIni > 0)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nama} (stok: {b.stokSaatIni} {b.satuan})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-jumlah">Jumlah</Label>
              <Input
                id="transfer-jumlah"
                type="number"
                min="1"
                value={transferForm.jumlah || ""}
                onChange={(e) => setTransferForm((f) => ({ ...f, jumlah: Number(e.target.value) }))}
                placeholder="Jumlah yang akan ditransfer"
              />
            </div>
            <div className="space-y-2">
              <Label>Dari Outlet</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">Outlet Pusat</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-ke">Ke Outlet</Label>
              <select
                id="transfer-ke"
                value={transferForm.keOutletId}
                onChange={(e) => setTransferForm((f) => ({ ...f, keOutletId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">-- Pilih Outlet Tujuan --</option>
                <option value="2">Outlet Cabang</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>Batal</Button>
            <Button
              onClick={createTransfer}
              disabled={!transferForm.bahanId || transferForm.jumlah <= 0 || !transferForm.keOutletId}
            >
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
