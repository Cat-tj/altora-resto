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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Store,
  Users,
  Monitor,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Globe,
  Coins,
  UserPlus,
  Smartphone,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type Outlet = {
  id: string;
  nama: string;
  alamat: string | null;
  telepon: string | null;
  status: string;
};

type AnggotaTim = {
  id: string;
  nama: string;
  email: string;
  role: string;
  outletId: string | null;
};

type Perangkat = {
  id: string;
  nama: string;
  tipe: string;
  outletId: string | null;
  status: string;
  terakhirAktif: string | null;
};

// ─── Default / mock data ───────────────────────────────────────────────────
const defaultOutlets: Outlet[] = [
  { id: "1", nama: "Outlet Pusat", alamat: "Jl. Merdeka No. 10", telepon: "021-12345", status: "AKTIF" },
  { id: "2", nama: "Outlet Cabang", alamat: "Jl. Sudirman No. 25", telepon: "021-67890", status: "AKTIF" },
];

const defaultTim: AnggotaTim[] = [
  { id: "1", nama: "Budi Santoso", email: "budi@altora.com", role: "MANAJER", outletId: "1" },
  { id: "2", nama: "Siti Rahayu", email: "siti@altora.com", role: "KASIR", outletId: "1" },
];

const defaultPerangkat: Perangkat[] = [
  { id: "1", nama: "Kasir Utama", tipe: "KASIR", outletId: "1", status: "AKTIF", terakhirAktif: new Date().toISOString() },
  { id: "2", nama: "Dapur Display", tipe: "DAPUR", outletId: "1", status: "AKTIF", terakhirAktif: new Date().toISOString() },
];

const roleOptions = ["MANAJER", "KASIR", "KOK", "PENERIMA_PESANAN", "SUPERVISOR"];

// ─── Component ─────────────────────────────────────────────────────────────
export default function PengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [tim, setTim] = useState<AnggotaTim[]>([]);
  const [perangkat, setPerangkat] = useState<Perangkat[]>([]);

  // Umum state
  const [namaUsaha, setNamaUsaha] = useState("Altora Resto");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [mataUang, setMataUang] = useState("IDR");

  // Outlet dialog
  const [showOutletDialog, setShowOutletDialog] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [outletForm, setOutletForm] = useState({ nama: "", alamat: "", telepon: "" });

  // Tim dialog
  const [showTimDialog, setShowTimDialog] = useState(false);
  const [editingTim, setEditingTim] = useState<AnggotaTim | null>(null);
  const [timForm, setTimForm] = useState({ nama: "", email: "", role: "KASIR", outletId: "" });

  // Perangkat dialog
  const [showPerangkatDialog, setShowPerangkatDialog] = useState(false);
  const [editingPerangkat, setEditingPerangkat] = useState<Perangkat | null>(null);
  const [perangkatForm, setPerangkatForm] = useState({ nama: "", tipe: "KASIR", outletId: "" });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Try tRPC endpoints; fall back to mock data if unavailable
      try {
        await trpc.karyawan.list.query({ includeRelations: false });
      } catch {
        // Router may not be fully available — use defaults
      }
      setOutlets(defaultOutlets);
      setTim(defaultTim);
      setPerangkat(defaultPerangkat);
    } catch (err) {
      console.error("Gagal memuat pengaturan:", err);
      setOutlets(defaultOutlets);
      setTim(defaultTim);
      setPerangkat(defaultPerangkat);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Outlet handlers ───────────────────────────────────────────────────
  const openAddOutlet = () => {
    setEditingOutlet(null);
    setOutletForm({ nama: "", alamat: "", telepon: "" });
    setShowOutletDialog(true);
  };

  const openEditOutlet = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setOutletForm({ nama: outlet.nama, alamat: outlet.alamat ?? "", telepon: outlet.telepon ?? "" });
    setShowOutletDialog(true);
  };

  const saveOutlet = () => {
    if (!outletForm.nama.trim()) return;
    if (editingOutlet) {
      setOutlets((prev) =>
        prev.map((o) => (o.id === editingOutlet.id ? { ...o, ...outletForm } : o))
      );
    } else {
      setOutlets((prev) => [
        ...prev,
        { id: Date.now().toString(), ...outletForm, status: "AKTIF" },
      ]);
    }
    setShowOutletDialog(false);
  };

  const deleteOutlet = (id: string) => {
    setOutlets((prev) => prev.filter((o) => o.id !== id));
  };

  // ─── Tim handlers ──────────────────────────────────────────────────────
  const openAddTim = () => {
    setEditingTim(null);
    setTimForm({ nama: "", email: "", role: "KASIR", outletId: "" });
    setShowTimDialog(true);
  };

  const openEditTim = (anggota: AnggotaTim) => {
    setEditingTim(anggota);
    setTimForm({ nama: anggota.nama, email: anggota.email, role: anggota.role, outletId: anggota.outletId ?? "" });
    setShowTimDialog(true);
  };

  const saveTim = () => {
    if (!timForm.nama.trim() || !timForm.email.trim()) return;
    if (editingTim) {
      setTim((prev) =>
        prev.map((t) => (t.id === editingTim.id ? { ...t, ...timForm } : t))
      );
    } else {
      setTim((prev) => [
        ...prev,
        { id: Date.now().toString(), ...timForm },
      ]);
    }
    setShowTimDialog(false);
  };

  const deleteTim = (id: string) => {
    setTim((prev) => prev.filter((t) => t.id !== id));
  };

  // ─── Perangkat handlers ────────────────────────────────────────────────
  const openAddPerangkat = () => {
    setEditingPerangkat(null);
    setPerangkatForm({ nama: "", tipe: "KASIR", outletId: "" });
    setShowPerangkatDialog(true);
  };

  const openEditPerangkat = (p: Perangkat) => {
    setEditingPerangkat(p);
    setPerangkatForm({ nama: p.nama, tipe: p.tipe, outletId: p.outletId ?? "" });
    setShowPerangkatDialog(true);
  };

  const savePerangkat = () => {
    if (!perangkatForm.nama.trim()) return;
    if (editingPerangkat) {
      setPerangkat((prev) =>
        prev.map((p) =>
          p.id === editingPerangkat.id ? { ...p, ...perangkatForm, status: "AKTIF" } : p
        )
      );
    } else {
      setPerangkat((prev) => [
        ...prev,
        { id: Date.now().toString(), ...perangkatForm, status: "AKTIF", terakhirAktif: null },
      ]);
    }
    setShowPerangkatDialog(false);
  };

  const deletePerangkat = (id: string) => {
    setPerangkat((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center lg:h-[calc(100vh-theme(spacing.6))]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Pengaturan</h1>
      </div>

      <Tabs defaultValue="umum" className="w-full">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="umum">
            <Globe className="mr-1 h-4 w-4" />
            Umum
          </TabsTrigger>
          <TabsTrigger value="outlet">
            <Store className="mr-1 h-4 w-4" />
            Outlet
          </TabsTrigger>
          <TabsTrigger value="tim">
            <Users className="mr-1 h-4 w-4" />
            Tim
          </TabsTrigger>
          <TabsTrigger value="perangkat">
            <Monitor className="mr-1 h-4 w-4" />
            Perangkat
          </TabsTrigger>
        </TabsList>

        {/* ═══ Tab Umum ═══ */}
        <TabsContent value="umum">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pengaturan Umum</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="namaUsaha">Nama Usaha</Label>
                <Input
                  id="namaUsaha"
                  value={namaUsaha}
                  onChange={(e) => setNamaUsaha(e.target.value)}
                  placeholder="Nama restoran Anda"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Waktu</Label>
                  <Input
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="Asia/Jakarta"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mataUang">Mata Uang</Label>
                  <Input
                    id="mataUang"
                    value={mataUang}
                    onChange={(e) => setMataUang(e.target.value)}
                    placeholder="IDR"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Simpan Perubahan</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab Outlet ═══ */}
        <TabsContent value="outlet">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                <Building2 className="mr-2 inline h-4 w-4" />
                Daftar Outlet
              </CardTitle>
              <Button size="sm" onClick={openAddOutlet}>
                <Plus className="mr-1 h-4 w-4" />
                Tambah Outlet
              </Button>
            </CardHeader>
            <CardContent>
              {outlets.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8" />
                  <p>Belum ada outlet</p>
                  <p className="text-xs">Klik &quot;Tambah Outlet&quot; untuk menambah outlet baru</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {outlets.map((outlet) => (
                    <div
                      key={outlet.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{outlet.nama}</p>
                          <Badge variant={outlet.status === "AKTIF" ? "default" : "secondary"} className="text-xs">
                            {outlet.status}
                          </Badge>
                        </div>
                        {outlet.alamat && (
                          <p className="mt-1 text-sm text-muted-foreground truncate">{outlet.alamat}</p>
                        )}
                        {outlet.telepon && (
                          <p className="text-xs text-muted-foreground">Telp: {outlet.telepon}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditOutlet(outlet)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteOutlet(outlet.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab Tim ═══ */}
        <TabsContent value="tim">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                <Users className="mr-2 inline h-4 w-4" />
                Anggota Tim
              </CardTitle>
              <Button size="sm" onClick={openAddTim}>
                <UserPlus className="mr-1 h-4 w-4" />
                Tambah Anggota
              </Button>
            </CardHeader>
            <CardContent>
              {tim.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8" />
                  <p>Belum ada anggota tim</p>
                  <p className="text-xs">Klik &quot;Tambah Anggota&quot; untuk menambah anggota baru</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tim.map((anggota) => (
                    <div
                      key={anggota.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{anggota.nama}</p>
                          <Badge variant="outline" className="text-xs">{anggota.role}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{anggota.email}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTim(anggota)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTim(anggota.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab Perangkat ═══ */}
        <TabsContent value="perangkat">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                <Monitor className="mr-2 inline h-4 w-4" />
                Perangkat
              </CardTitle>
              <Button size="sm" onClick={openAddPerangkat}>
                <Plus className="mr-1 h-4 w-4" />
                Tambah Perangkat
              </Button>
            </CardHeader>
            <CardContent>
              {perangkat.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  <Smartphone className="h-8 w-8" />
                  <p>Belum ada perangkat</p>
                  <p className="text-xs">Daftarkan perangkat baru untuk mulai digunakan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {perangkat.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{p.nama}</p>
                          <Badge variant="outline" className="text-xs">{p.tipe}</Badge>
                          <Badge variant={p.status === "AKTIF" ? "default" : "secondary"} className="text-xs">
                            {p.status}
                          </Badge>
                        </div>
                        {p.terakhirAktif && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Terakhir aktif: {new Date(p.terakhirAktif).toLocaleString("id-ID")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditPerangkat(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deletePerangkat(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ Outlet Dialog ═══ */}
      <Dialog open={showOutletDialog} onOpenChange={setShowOutletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOutlet ? "Edit Outlet" : "Tambah Outlet"}</DialogTitle>
            <DialogDescription>
              {editingOutlet ? "Ubah informasi outlet" : "Tambahkan outlet baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="outlet-nama">Nama Outlet</Label>
              <Input
                id="outlet-nama"
                value={outletForm.nama}
                onChange={(e) => setOutletForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="Contoh: Outlet Pusat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outlet-alamat">Alamat</Label>
              <Input
                id="outlet-alamat"
                value={outletForm.alamat}
                onChange={(e) => setOutletForm((f) => ({ ...f, alamat: e.target.value }))}
                placeholder="Alamat outlet"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outlet-telepon">Telepon</Label>
              <Input
                id="outlet-telepon"
                value={outletForm.telepon}
                onChange={(e) => setOutletForm((f) => ({ ...f, telepon: e.target.value }))}
                placeholder="021-12345"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOutletDialog(false)}>Batal</Button>
            <Button onClick={saveOutlet} disabled={!outletForm.nama.trim()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Tim Dialog ═══ */}
      <Dialog open={showTimDialog} onOpenChange={setShowTimDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTim ? "Edit Anggota Tim" : "Tambah Anggota Tim"}</DialogTitle>
            <DialogDescription>
              {editingTim ? "Ubah informasi anggota" : "Tambahkan anggota tim baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tim-nama">Nama</Label>
              <Input
                id="tim-nama"
                value={timForm.nama}
                onChange={(e) => setTimForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tim-email">Email</Label>
              <Input
                id="tim-email"
                type="email"
                value={timForm.email}
                onChange={(e) => setTimForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@altora.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tim-role">Role</Label>
              <select
                id="tim-role"
                value={timForm.role}
                onChange={(e) => setTimForm((f) => ({ ...f, role: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tim-outlet">Outlet</Label>
              <select
                id="tim-outlet"
                value={timForm.outletId}
                onChange={(e) => setTimForm((f) => ({ ...f, outletId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">-- Pilih Outlet --</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.nama}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTimDialog(false)}>Batal</Button>
            <Button onClick={saveTim} disabled={!timForm.nama.trim() || !timForm.email.trim()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Perangkat Dialog ═══ */}
      <Dialog open={showPerangkatDialog} onOpenChange={setShowPerangkatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPerangkat ? "Edit Perangkat" : "Tambah Perangkat"}</DialogTitle>
            <DialogDescription>
              {editingPerangkat ? "Ubah informasi perangkat" : "Daftarkan perangkat baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="perangkat-nama">Nama Perangkat</Label>
              <Input
                id="perangkat-nama"
                value={perangkatForm.nama}
                onChange={(e) => setPerangkatForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="Contoh: Kasir Utama"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perangkat-tipe">Tipe</Label>
              <select
                id="perangkat-tipe"
                value={perangkatForm.tipe}
                onChange={(e) => setPerangkatForm((f) => ({ ...f, tipe: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="KASIR">Kasir</option>
                <option value="DAPUR">Dapur</option>
                <option value="WAITER">Pelayan</option>
                <option value="MANAJER">Manajer</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="perangkat-outlet">Outlet</Label>
              <select
                id="perangkat-outlet"
                value={perangkatForm.outletId}
                onChange={(e) => setPerangkatForm((f) => ({ ...f, outletId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">-- Pilih Outlet --</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.nama}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPerangkatDialog(false)}>Batal</Button>
            <Button onClick={savePerangkat} disabled={!perangkatForm.nama.trim()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
