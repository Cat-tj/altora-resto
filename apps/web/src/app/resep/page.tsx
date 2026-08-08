"use client";

import { useState, useCallback, useMemo } from "react";
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
  ChefHat,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Calculator,
  Filter,
  X,
  Utensils,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type BahanResep = {
  id: string;
  nama: string;
  jumlah: number;
  satuan: string;
  hargaPerSatuan: number;
};

type Resep = {
  id: string;
  menuNama: string;
  kategori: string;
  porsi: number;
  bahan: BahanResep[];
};

type KategoriOption = "MAKANAN" | "MINUMAN" | "DESSERT" | "SNACK" | "SEMUA";

// ─── Mock data ─────────────────────────────────────────────────────────────
const kategoriOptions: KategoriOption[] = ["MAKANAN", "MINUMAN", "DESSERT", "SNACK"];

const mockResep: Resep[] = [
  {
    id: "1",
    menuNama: "Nasi Goreng Spesial",
    kategori: "MAKANAN",
    porsi: 1,
    bahan: [
      { id: "b1", nama: "Beras", jumlah: 0.3, satuan: "kg", hargaPerSatuan: 12000 },
      { id: "b2", nama: "Telur", jumlah: 2, satuan: "butir", hargaPerSatuan: 2500 },
      { id: "b3", nama: "Minyak Goreng", jumlah: 0.05, satuan: "liter", hargaPerSatuan: 15000 },
      { id: "b4", nama: "Kecap Manis", jumlah: 30, satuan: "ml", hargaPerSatuan: 80000 },
      { id: "b5", nama: "Bawang Putih", jumlah: 3, satuan: "siung", hargaPerSatuan: 500 },
      { id: "b6", nama: "Ayam Fillet", jumlah: 0.15, satuan: "kg", hargaPerSatuan: 45000 },
    ],
  },
  {
    id: "2",
    menuNama: "Es Teh Manis",
    kategori: "MINUMAN",
    porsi: 1,
    bahan: [
      { id: "b7", nama: "Teh Celup", jumlah: 1, satuan: "kantong", hargaPerSatuan: 500 },
      { id: "b8", nama: "Gula Pasir", jumlah: 30, satuan: "gram", hargaPerSatuan: 14000 },
      { id: "b9", nama: "Es Batu", jumlah: 200, satuan: "gram", hargaPerSatuan: 3000 },
    ],
  },
  {
    id: "3",
    menuNama: "Ayam Bakar Madu",
    kategori: "MAKANAN",
    porsi: 1,
    bahan: [
      { id: "b10", nama: "Ayam Utuh", jumlah: 0.5, satuan: "kg", hargaPerSatuan: 38000 },
      { id: "b11", nama: "Madu", jumlah: 30, satuan: "ml", hargaPerSatuan: 120000 },
      { id: "b12", nama: "Kecap Manis", jumlah: 20, satuan: "ml", hargaPerSatuan: 80000 },
      { id: "b13", nama: "Bawang Merah", jumlah: 4, satuan: "siung", hargaPerSatuan: 800 },
      { id: "b14", nama: "Bawang Putih", jumlah: 3, satuan: "siung", hargaPerSatuan: 500 },
    ],
  },
  {
    id: "4",
    menuNama: "Pisang Goreng",
    kategori: "SNACK",
    porsi: 4,
    bahan: [
      { id: "b15", nama: "Pisang", jumlah: 4, satuan: "buah", hargaPerSatuan: 2000 },
      { id: "b16", nama: "Tepung Terigu", jumlah: 100, satuan: "gram", hargaPerSatuan: 9000 },
      { id: "b17", nama: "Gula Pasir", jumlah: 20, satuan: "gram", hargaPerSatuan: 14000 },
      { id: "b18", nama: "Minyak Goreng", jumlah: 0.2, satuan: "liter", hargaPerSatuan: 15000 },
    ],
  },
  {
    id: "5",
    menuNama: "Klepon",
    kategori: "DESSERT",
    porsi: 10,
    bahan: [
      { id: "b19", nama: "Tepung Ketan", jumlah: 200, satuan: "gram", hargaPerSatuan: 18000 },
      { id: "b20", nama: "Gula Merah", jumlah: 100, satuan: "gram", hargaPerSatuan: 20000 },
      { id: "b21", nama: "Kelapa Parut", jumlah: 100, satuan: "gram", hargaPerSatuan: 15000 },
      { id: "b22", nama: "Pandan", jumlah: 3, satuan: "lembar", hargaPerSatuan: 500 },
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
}

function hitungHPP(bahan: BahanResep[], porsi: number): number {
  const totalBahan = bahan.reduce((sum, b) => sum + b.jumlah * b.hargaPerSatuan, 0);
  return porsi > 0 ? Math.round(totalBahan / porsi) : 0;
}

const kategoriBadgeColor: Record<string, string> = {
  MAKANAN: "bg-orange-100 text-orange-800 border-orange-200",
  MINUMAN: "bg-blue-100 text-blue-800 border-blue-200",
  DESSERT: "bg-pink-100 text-pink-800 border-pink-200",
  SNACK: "bg-green-100 text-green-800 border-green-200",
};

// ─── Component ─────────────────────────────────────────────────────────────
export default function ResepPage() {
  const [resepList, setResepList] = useState<Resep[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState<KategoriOption>("SEMUA");

  // Edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingResep, setEditingResep] = useState<Resep | null>(null);
  const [editForm, setEditForm] = useState<{ menuNama: string; kategori: string; porsi: number; bahan: BahanResep[] }>({
    menuNama: "",
    kategori: "MAKANAN",
    porsi: 1,
    bahan: [],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      try {
      } catch {
        // Use mock data
      }
      setResepList(mockResep);
    } catch (err) {
      console.error("Gagal memuat data resep:", err);
      setResepList(mockResep);
    } finally {
      setLoading(false);
    }
  }, []);

  useState(() => { fetchData(); });

  const filteredResep = useMemo(() => {
    return resepList.filter((r) => {
      const matchSearch = !search || r.menuNama.toLowerCase().includes(search.toLowerCase());
      const matchKategori = filterKategori === "SEMUA" || r.kategori === filterKategori;
      return matchSearch && matchKategori;
    });
  }, [resepList, search, filterKategori]);

  const openEdit = (resep: Resep) => {
    setEditingResep(resep);
    setEditForm({ menuNama: resep.menuNama, kategori: resep.kategori, porsi: resep.porsi, bahan: [...resep.bahan.map((b) => ({ ...b }))].slice() });
    setShowEditDialog(true);
  };

  const saveResep = () => {
    if (!editForm.menuNama.trim()) return;
    if (editingResep) {
      setResepList((prev) =>
        prev.map((r) => (r.id === editingResep.id ? { ...r, ...editForm } : r))
      );
    } else {
      setResepList((prev) => [
        ...prev,
        { id: Date.now().toString(), ...editForm },
      ]);
    }
    setShowEditDialog(false);
  };

  const addBahanToEdit = () => {
    setEditForm((f) => ({
      ...f,
      bahan: [...f.bahan, { id: Date.now().toString(), nama: "", jumlah: 0, satuan: "gram", hargaPerSatuan: 0 }],
    }));
  };

  const updateBahan = (idx: number, field: keyof BahanResep, value: string | number) => {
    setEditForm((f) => ({
      ...f,
      bahan: f.bahan.map((b, i) => (i === idx ? { ...b, [field]: value } : b)),
    }));
  };

  const removeBahan = (idx: number) => {
    setEditForm((f) => ({
      ...f,
      bahan: f.bahan.filter((_, i) => i !== idx),
    }));
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center lg:h-[calc(100vh-theme(spacing.6))]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Memuat data resep...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Resep</h1>
        </div>
        <Button onClick={() => {
          setEditingResep(null);
          setEditForm({ menuNama: "", kategori: "MAKANAN", porsi: 1, bahan: [] });
          setShowEditDialog(true);
        }}>
          <Plus className="mr-1 h-4 w-4" />
          Tambah Resep
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Resep</p>
            <p className="mt-1 text-2xl font-bold">{resepList.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <Utensils className="h-4 w-4 text-orange-500" />
              <p className="text-sm text-muted-foreground">Makanan</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{resepList.filter((r) => r.kategori === "MAKANAN").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <Utensils className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">Minuman</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{resepList.filter((r) => r.kategori === "MINUMAN").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <Utensils className="h-4 w-4 text-pink-500" />
              <p className="text-sm text-muted-foreground">Dessert & Snack</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{resepList.filter((r) => r.kategori === "DESSERT" || r.kategori === "SNACK").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama menu..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value as KategoriOption)}
            className="bg-transparent py-2 text-sm outline-none"
          >
            <option value="SEMUA">Semua Kategori</option>
            {kategoriOptions.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Recipe List */}
      {filteredResep.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <p className="font-medium">Tidak ada data resep</p>
            <p className="text-xs">{search || filterKategori !== "SEMUA" ? "Coba ubah filter atau pencarian Anda" : 'Klik "Tambah Resep" untuk menambah resep baru'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredResep.map((resep) => {
            const hpp = hitungHPP(resep.bahan, resep.porsi);
            const totalBiaya = resep.bahan.reduce((s, b) => s + b.jumlah * b.hargaPerSatuan, 0);
            const kc = kategoriBadgeColor[resep.kategori] ?? "";
            return (
              <Card key={resep.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{resep.menuNama}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={`text-xs border ${kc}`}>{resep.kategori}</Badge>
                      <span className="text-xs text-muted-foreground">{resep.porsi} porsi</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(resep)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Ingredients */}
                  <div className="space-y-1">
                    {resep.bahan.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{b.nama}</span>
                        <span className="font-medium">{b.jumlah} {b.satuan}</span>
                      </div>
                    ))}
                  </div>
                  <hr className="border-border" />
                  {/* HPP */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calculator className="h-3 w-3" />
                      HPP per Porsi
                    </div>
                    <span className="text-sm font-bold text-green-700">{formatRupiah(hpp)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total Biaya Resep</span>
                    <span>{formatRupiah(totalBiaya)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ Edit Recipe Dialog ═══ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingResep ? "Edit Resep" : "Tambah Resep"}</DialogTitle>
            <DialogDescription>{editingResep ? "Ubah data resep dan bahan" : "Buat resep baru untuk menu"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="menuNama">Nama Menu *</Label>
                <Input id="menuNama" value={editForm.menuNama} onChange={(e) => setEditForm((f) => ({ ...f, menuNama: e.target.value }))} placeholder="Nama menu" />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="kategori">Kategori</Label>
                  <select id="kategori" value={editForm.kategori} onChange={(e) => setEditForm((f) => ({ ...f, kategori: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                    {kategoriOptions.map((k) => (<option key={k} value={k}>{k}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="porsi">Porsi</Label>
                  <Input id="porsi" type="number" min={1} value={editForm.porsi} onChange={(e) => setEditForm((f) => ({ ...f, porsi: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Bahan ({editForm.bahan.length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={addBahanToEdit}>
                  <Plus className="mr-1 h-3 w-3" />
                  Tambah Bahan
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {editForm.bahan.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Belum ada bahan. Klik &quot;Tambah Bahan&quot;</p>
                )}
                {editForm.bahan.map((b, idx) => (
                  <div key={b.id} className="grid grid-cols-[1fr_80px_80px_80px_32px] items-center gap-2 rounded border p-2">
                    <Input placeholder="Nama bahan" value={b.nama} onChange={(e) => updateBahan(idx, "nama", e.target.value)} />
                    <Input type="number" min={0} step={0.01} value={b.jumlah} onChange={(e) => updateBahan(idx, "jumlah", parseFloat(e.target.value) || 0)} placeholder="Jml" />
                    <select value={b.satuan} onChange={(e) => updateBahan(idx, "satuan", e.target.value)} className="h-10 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring">
                      <option value="gram">gram</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="liter">liter</option>
                      <option value="butir">butir</option>
                      <option value="siung">siung</option>
                      <option value="buah">buah</option>
                      <option value="lembar">lembar</option>
                      <option value="kantong">kantong</option>
                    </select>
                    <Input type="number" min={0} value={b.hargaPerSatuan} onChange={(e) => updateBahan(idx, "hargaPerSatuan", parseInt(e.target.value) || 0)} placeholder="Rp/unit" />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeBahan(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* HPP Preview */}
            {editForm.bahan.length > 0 && (
              <div className="rounded-lg bg-muted p-3">
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <Calculator className="h-3 w-3" />
                  Estimasi HPP per Porsi
                </div>
                <p className="text-lg font-bold text-green-700">
                  {formatRupiah(hitungHPP(editForm.bahan, editForm.porsi))}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total biaya: {formatRupiah(editForm.bahan.reduce((s, b) => s + b.jumlah * b.hargaPerSatuan, 0))} / {editForm.porsi} porsi
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
            <Button onClick={saveResep} disabled={!editForm.menuNama.trim()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
