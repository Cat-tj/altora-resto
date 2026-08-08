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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Search,
  Plus,
  Star,
  Gift,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  History,
  TrendingUp,
  Award,
  Filter,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type MemberTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

type Member = {
  id: string;
  nama: string;
  telepon: string;
  email: string;
  tier: MemberTier;
  poin: number;
  totalBelanja: number;
  jumlahKunjungan: number;
  bergabungSejak: string;
};

type RiwayatPoin = {
  id: string;
  memberId: string;
  namaMember: string;
  jenis: "PENAMBAHAN" | "PENEbusan";
  jumlah: number;
  deskripsi: string;
  tanggal: string;
};

type Reward = {
  id: string;
  nama: string;
  deskripsi: string;
  poinDiperlukan: number;
  stok: number;
};

// ─── Mock data ─────────────────────────────────────────────────────────────
const tierConfig: Record<MemberTier, { label: string; color: string; bg: string }> = {
  BRONZE: { label: "Bronze", color: "text-amber-700", bg: "bg-amber-100 border-amber-200" },
  SILVER: { label: "Silver", color: "text-gray-600", bg: "bg-gray-100 border-gray-300" },
  GOLD: { label: "Gold", color: "text-yellow-600", bg: "bg-yellow-100 border-yellow-300" },
  PLATINUM: { label: "Platinum", color: "text-purple-700", bg: "bg-purple-100 border-purple-200" },
};

const mockMembers: Member[] = [
  { id: "1", nama: "Andi Pratama", telepon: "081234567890", email: "andi@gmail.com", tier: "GOLD", poin: 4500, totalBelanja: 12500000, jumlahKunjungan: 48, bergabungSejak: "2024-01-15" },
  { id: "2", nama: "Siti Nurhaliza", telepon: "081298765432", email: "siti@yahoo.com", tier: "PLATINUM", poin: 12000, totalBelanja: 35000000, jumlahKunjungan: 120, bergabungSejak: "2023-06-10" },
  { id: "3", nama: "Budi Setiawan", telepon: "081345678901", email: "budi@gmail.com", tier: "SILVER", poin: 2100, totalBelanja: 6800000, jumlahKunjungan: 22, bergabungSejak: "2024-08-20" },
  { id: "4", nama: "Dewi Lestari", telepon: "081234567891", email: "dewi@outlook.com", tier: "BRONZE", poin: 800, totalBelanja: 2100000, jumlahKunjungan: 8, bergabungSejak: "2025-11-01" },
  { id: "5", nama: "Rizky Ahmad", telepon: "081567890123", email: "rizky@gmail.com", tier: "GOLD", poin: 5200, totalBelanja: 14000000, jumlahKunjungan: 55, bergabungSejak: "2024-03-05" },
  { id: "6", nama: "Maya Sari", telepon: "081234000111", email: "maya@gmail.com", tier: "SILVER", poin: 1500, totalBelanja: 5200000, jumlahKunjungan: 18, bergabungSejak: "2025-01-10" },
  { id: "7", nama: "Fajar Nugroho", telepon: "081987654321", email: "fajar@yahoo.com", tier: "BRONZE", poin: 300, totalBelanja: 900000, jumlahKunjungan: 4, bergabungSejak: "2026-01-20" },
];

const mockRiwayat: RiwayatPoin[] = [
  { id: "1", memberId: "1", namaMember: "Andi Pratama", jenis: "PENAMBAHAN", jumlah: 1250, deskripsi: "Pembelian Nasi Goreng Spesial", tanggal: "2026-08-05" },
  { id: "2", memberId: "2", namaMember: "Siti Nurhaliza", jenis: "PENEbusan", jumlah: -2000, deskripsi: "Tukar reward Diskon 20%", tanggal: "2026-08-04" },
  { id: "3", memberId: "1", namaMember: "Andi Pratama", jenis: "PENAMBAHAN", jumlah: 850, deskripsi: "Pembelian Es Teh Manis x2", tanggal: "2026-08-03" },
  { id: "4", memberId: "3", namaMember: "Budi Setiawan", jenis: "PENAMBAHAN", jumlah: 600, deskripsi: "Pembelian Ayam Bakar", tanggal: "2026-08-02" },
  { id: "5", memberId: "2", namaMember: "Siti Nurhaliza", jenis: "PENAMBAHAN", jumlah: 2100, deskripsi: "Pembelian Paket Keluarga", tanggal: "2026-08-01" },
  { id: "6", memberId: "5", namaMember: "Rizky Ahmad", jenis: "PENEbusan", jumlah: -1000, deskripsi: "Tukar reward Minuman Gratis", tanggal: "2026-07-30" },
];

const mockRewards: Reward[] = [
  { id: "1", nama: "Diskon 10%", deskripsi: "Diskon 10% untuk transaksi berikutnya", poinDiperlukan: 500, stok: 99 },
  { id: "2", nama: "Diskon 20%", deskripsi: "Diskon 20% untuk transaksi berikutnya", poinDiperlukan: 2000, stok: 50 },
  { id: "3", nama: "Minuman Gratis", deskripsi: "Es Teh Manis / Es Jeruk gratis", poinDiperlukan: 1000, stok: 30 },
  { id: "4", nama: "Free Appetizer", deskripsi: "Pilih 1 appetizer gratis", poinDiperlukan: 3000, stok: 20 },
  { id: "5", nama: "Voucher Rp50.000", deskripsi: "Voucher belanja Rp50.000", poinDiperlukan: 5000, stok: 10 },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);
}

function formatPoin(poin: number) {
  return new Intl.NumberFormat("id-ID").format(poin);
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function KeanggotaanPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [riwayat, setRiwayat] = useState<RiwayatPoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("semua");

  // Add member dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ nama: "", telepon: "", email: "" });

  // Point history dialog
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Redeem dialog
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [redeemMember, setRedeemMember] = useState<Member | null>(null);
  const [selectedReward, setSelectedReward] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      try {
      } catch {
        // Use mock data
      }
      setMembers(mockMembers);
      setRiwayat(mockRiwayat);
    } catch (err) {
      console.error("Gagal memuat data keanggotaan:", err);
      setMembers(mockMembers);
      setRiwayat(mockRiwayat);
    } finally {
      setLoading(false);
    }
  }, []);

  useState(() => { fetchData(); });

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch = !search || m.nama.toLowerCase().includes(search.toLowerCase()) || m.telepon.includes(search);
      const matchTier = filterTier === "semua" || m.tier === filterTier;
      return matchSearch && matchTier;
    });
  }, [members, search, filterTier]);

  const totalMembers = members.length;
  const totalPoin = members.reduce((s, m) => s + m.poin, 0);
  const totalBelanja = members.reduce((s, m) => s + m.totalBelanja, 0);
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 };
    members.forEach((m) => { counts[m.tier] = (counts[m.tier] || 0) + 1; });
    return counts;
  }, [members]);

  const addMember = () => {
    if (!addForm.nama.trim() || !addForm.telepon.trim()) return;
    setMembers((prev) => [
      ...prev,
      { id: Date.now().toString(), ...addForm, tier: "BRONZE", poin: 0, totalBelanja: 0, jumlahKunjungan: 0, bergabungSejak: new Date().toISOString().slice(0, 10) },
    ]);
    setAddForm({ nama: "", telepon: "", email: "" });
    setShowAddDialog(false);
  };

  const openHistory = (m: Member) => {
    setSelectedMember(m);
    setShowHistoryDialog(true);
  };

  const openRedeem = (m: Member) => {
    setRedeemMember(m);
    setSelectedReward("");
    setShowRedeemDialog(true);
  };

  const confirmRedeem = () => {
    if (!redeemMember || !selectedReward) return;
    const reward = mockRewards.find((r) => r.id === selectedReward);
    if (!reward) return;
    // Deduct points
    setMembers((prev) =>
      prev.map((m) => (m.id === redeemMember.id ? { ...m, poin: m.poin - reward.poinDiperlukan } : m))
    );
    // Add history
    setRiwayat((prev) => [
      { id: Date.now().toString(), memberId: redeemMember.id, namaMember: redeemMember.nama, jenis: "PENEbusan", jumlah: -reward.poinDiperlukan, deskripsi: `Tukar reward ${reward.nama}`, tanggal: new Date().toISOString().slice(0, 10) },
      ...prev,
    ]);
    setShowRedeemDialog(false);
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center lg:h-[calc(100vh-theme(spacing.6))]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Memuat data keanggotaan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Keanggotaan</h1>
        </div>
        <Button onClick={() => { setAddForm({ nama: "", telepon: "", email: "" }); setShowAddDialog(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          Tambah Member
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Member</p>
            <p className="mt-1 text-2xl font-bold">{totalMembers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <p className="text-sm text-muted-foreground">Total Poin</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{formatPoin(totalPoin)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-sm text-muted-foreground">Total Belanja</p>
            </div>
            <p className="mt-1 text-lg font-bold">{formatRupiah(totalBelanja)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1">
              <Award className="h-4 w-4 text-purple-500" />
              <p className="text-sm text-muted-foreground">Platinum</p>
            </div>
            <p className="mt-1 text-2xl font-bold">{tierCounts.PLATINUM}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nama atau nomor telepon..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} className="bg-transparent py-2 text-sm outline-none">
            <option value="semua">Semua Tier</option>
            <option value="BRONZE">Bronze</option>
            <option value="SILVER">Silver</option>
            <option value="GOLD">Gold</option>
            <option value="PLATINUM">Platinum</option>
          </select>
        </div>
      </div>

      {/* Member List */}
      <Tabs defaultValue="anggota">
        <TabsList>
          <TabsTrigger value="anggota">Daftar Anggota</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Poin</TabsTrigger>
          <TabsTrigger value="reward">Reward</TabsTrigger>
        </TabsList>

        {/* ═══ Tab: Daftar Anggota ═══ */}
        <TabsContent value="anggota">
          {filteredMembers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8" />
                <p className="font-medium">Tidak ada data member</p>
                <p className="text-xs">{search || filterTier !== "semua" ? "Coba ubah filter atau pencarian Anda" : 'Klik "Tambah Member" untuk menambah member baru'}</p>
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
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nama</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Telepon</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Tier</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Poin</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Total Belanja</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Kunjungan</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((m) => {
                        const tc = tierConfig[m.tier];
                        return (
                          <tr key={m.id} className="border-b last:border-0 hover:bg-accent/50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium">{m.nama}</p>
                              <p className="text-xs text-muted-foreground">{m.email}</p>
                            </td>
                            <td className="px-4 py-3 text-sm">{m.telepon}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={`text-xs border ${tc.bg} ${tc.color}`}>{tc.label}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold">{formatPoin(m.poin)}</td>
                            <td className="px-4 py-3 text-right text-sm">{formatRupiah(m.totalBelanja)}</td>
                            <td className="px-4 py-3 text-right text-sm">{m.jumlahKunjungan}x</td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(m)}>
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRedeem(m)} disabled={m.poin < 500}>
                                  <Gift className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="divide-y md:hidden">
                  {filteredMembers.map((m) => {
                    const tc = tierConfig[m.tier];
                    return (
                      <div key={m.id} className="space-y-2 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{m.nama}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />{m.telepon}
                            </div>
                          </div>
                          <Badge className={`text-xs border ${tc.bg} ${tc.color}`}>{tc.label}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Poin: <span className="font-bold">{formatPoin(m.poin)}</span></span>
                          <span className="text-muted-foreground">{m.jumlahKunjungan}x kunjungan</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{formatRupiah(m.totalBelanja)}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openHistory(m)}>
                              <History className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRedeem(m)} disabled={m.poin < 500}>
                              <Gift className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══ Tab: Riwayat Poin ═══ */}
        <TabsContent value="riwayat">
          <Card>
            <CardHeader>
              <CardTitle className="text-base"><History className="mr-2 inline h-4 w-4" />Riwayat Poin</CardTitle>
            </CardHeader>
            <CardContent>
              {riwayat.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Belum ada riwayat poin</p>
              ) : (
                <div className="space-y-2">
                  {riwayat.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{r.namaMember}</p>
                        <p className="text-xs text-muted-foreground">{r.deskripsi}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${r.jenis === "PENAMBAHAN" ? "text-green-600" : "text-red-600"}`}>
                          {r.jenis === "PENAMBAHAN" ? "+" : ""}{formatPoin(r.jumlah)}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.tanggal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Tab: Reward ═══ */}
        <TabsContent value="reward">
          <Card>
            <CardHeader>
              <CardTitle className="text-base"><Gift className="mr-2 inline h-4 w-4" />Tersedia untuk Ditukar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {mockRewards.map((r) => (
                  <div key={r.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{r.nama}</p>
                        <p className="text-xs text-muted-foreground">{r.deskripsi}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Star className="mr-1 h-3 w-3" />{formatPoin(r.poinDiperlukan)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Stok: {r.stok}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ Add Member Dialog ═══ */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Member</DialogTitle>
            <DialogDescription>Daftarkan pelanggan baru ke program keanggotaan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap *</Label>
              <Input id="nama" value={addForm.nama} onChange={(e) => setAddForm((f) => ({ ...f, nama: e.target.value }))} placeholder="Nama pelanggan" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telepon">Nomor Telepon *</Label>
              <Input id="telepon" value={addForm.telepon} onChange={(e) => setAddForm((f) => ({ ...f, telepon: e.target.value }))} placeholder="08123456789" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={addForm.email} onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@contoh.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={addMember} disabled={!addForm.nama.trim() || !addForm.telepon.trim()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Point History Dialog ═══ */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Riwayat Poin — {selectedMember?.nama}</DialogTitle>
            <DialogDescription>Saldo saat ini: {formatPoin(selectedMember?.poin ?? 0)} poin</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {riwayat
              .filter((r) => r.memberId === selectedMember?.id)
              .length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Belum ada riwayat</p>
            ) : (
              riwayat
                .filter((r) => r.memberId === selectedMember?.id)
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <p className="text-sm font-medium">{r.deskripsi}</p>
                      <p className="text-xs text-muted-foreground">{r.tanggal}</p>
                    </div>
                    <span className={`text-sm font-bold ${r.jenis === "PENAMBAHAN" ? "text-green-600" : "text-red-600"}`}>
                      {r.jenis === "PENAMBAHAN" ? "+" : ""}{formatPoin(r.jumlah)}
                    </span>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Redeem Reward Dialog ═══ */}
      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tukar Reward</DialogTitle>
            <DialogDescription>
              Poin {redeemMember?.nama}: {formatPoin(redeemMember?.poin ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {mockRewards.map((r) => (
              <label
                key={r.id}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${(redeemMember?.poin ?? 0) < r.poinDiperlukan ? "opacity-50" : "hover:bg-accent/50"} ${selectedReward === r.id ? "border-primary bg-accent" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="reward"
                    value={r.id}
                    checked={selectedReward === r.id}
                    onChange={() => setSelectedReward(r.id)}
                    disabled={(redeemMember?.poin ?? 0) < r.poinDiperlukan}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">{r.nama}</p>
                    <p className="text-xs text-muted-foreground">{r.deskripsi}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">{formatPoin(r.poinDiperlukan)} poin</Badge>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedeemDialog(false)}>Batal</Button>
            <Button onClick={confirmRedeem} disabled={!selectedReward}>Tukar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
