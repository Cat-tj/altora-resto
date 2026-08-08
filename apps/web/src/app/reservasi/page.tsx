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
  CalendarDays,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  StickyNote,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
type ReservasiStatus = "MENUNGGU" | "DIPASTIKAN" | "SELESAI" | "DIBATALKAN";

type Reservasi = {
  id: string;
  namaPelanggan: string;
  telepon: string;
  tanggal: string;
  jam: string;
  jumlahOrang: number;
  mejaNomor: string;
  catatan: string;
  status: ReservasiStatus;
};

type MejaOption = { id: string; nomor: string; kapasitas: number };

// ─── Mock data ─────────────────────────────────────────────────────────────
const mockMeja: MejaOption[] = [
  { id: "m1", nomor: "1", kapasitas: 4 },
  { id: "m2", nomor: "2", kapasitas: 4 },
  { id: "m3", nomor: "3", kapasitas: 6 },
  { id: "m4", nomor: "4", kapasitas: 8 },
  { id: "m5", nomor: "5", kapasitas: 2 },
  { id: "m6", nomor: "VIP-1", kapasitas: 10 },
];

const mockReservasi: Reservasi[] = [
  {
    id: "1",
    namaPelanggan: "Ahmad Fauzi",
    telepon: "08123456001",
    tanggal: "2026-08-08",
    jam: "18:00",
    jumlahOrang: 4,
    mejaNomor: "3",
    catatan: "Minta dekat jendela",
    status: "MENUNGGU",
  },
  {
    id: "2",
    namaPelanggan: "Dewi Lestari",
    telepon: "08123456002",
    tanggal: "2026-08-08",
    jam: "19:30",
    jumlahOrang: 6,
    mejaNomor: "4",
    catatan: "Acara ulang tahun, mohon siapkan kue",
    status: "DIPASTIKAN",
  },
  {
    id: "3",
    namaPelanggan: "Rizky Pratama",
    telepon: "08123456003",
    tanggal: "2026-08-07",
    jam: "12:00",
    jumlahOrang: 2,
    mejaNomor: "5",
    catatan: "",
    status: "SELESAI",
  },
  {
    id: "4",
    namaPelanggan: "Sari Indah",
    telepon: "08123456004",
    tanggal: "2026-08-09",
    jam: "18:30",
    jumlahOrang: 10,
    mejaNomor: "VIP-1",
    catatan: "Meeting klien, butuh proyektor",
    status: "DIPASTIKAN",
  },
  {
    id: "5",
    namaPelanggan: "Budi Hartono",
    telepon: "08123456005",
    tanggal: "2026-08-08",
    jam: "12:30",
    jumlahOrang: 3,
    mejaNomor: "1",
    catatan: "",
    status: "DIBATALKAN",
  },
  {
    id: "6",
    namaPelanggan: "Lina Mariana",
    telepon: "08123456006",
    tanggal: "2026-08-10",
    jam: "19:00",
    jumlahOrang: 4,
    mejaNomor: "2",
    catatan: "Vegetarian",
    status: "MENUNGGU",
  },
];

const statusConfig: Record<
  ReservasiStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }
> = {
  MENUNGGU: { label: "Menunggu", variant: "outline", color: "text-amber-600 border-amber-300" },
  DIPASTIKAN: { label: "Dipastikan", variant: "default", color: "bg-green-600 text-white" },
  SELESAI: { label: "Selesai", variant: "secondary", color: "" },
  DIBATALKAN: { label: "Dibatalkan", variant: "destructive", color: "" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatTanggal(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function ReservasiPage() {
  const [reservasiList, setReservasiList] = useState<Reservasi[]>(mockReservasi);
  const [showDialog, setShowDialog] = useState(false);
  const [filterDate, setFilterDate] = useState<string>("2026-08-08");

  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  // Form state
  const [form, setForm] = useState({
    namaPelanggan: "",
    telepon: "",
    tanggal: "2026-08-08",
    jam: "",
    jumlahOrang: "",
    mejaId: "",
    catatan: "",
  });

  const filteredList = useMemo(() => {
    return reservasiList.filter((r) => r.tanggal === filterDate);
  }, [reservasiList, filterDate]);

  const stats = useMemo(() => {
    const todayList = reservasiList.filter((r) => r.tanggal === filterDate);
    return {
      total: todayList.length,
      MENUNGGU: todayList.filter((r) => r.status === "MENUNGGU").length,
      DIPASTIKAN: todayList.filter((r) => r.status === "DIPASTIKAN").length,
      SELESAI: todayList.filter((r) => r.status === "SELESAI").length,
      DIBATALKAN: todayList.filter((r) => r.status === "DIBATALKAN").length,
    };
  }, [reservasiList, filterDate]);

  const reservationsOnDate = useMemo(() => {
    const counts: Record<string, number> = {};
    reservasiList.forEach((r) => {
      counts[r.tanggal] = (counts[r.tanggal] || 0) + 1;
    });
    return counts;
  }, [reservasiList]);

  // ─── Calendar ──────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const cells: { day: number | null; dateStr: string }[] = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateStr: "" });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(calMonth + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      cells.push({ day: d, dateStr: `${calYear}-${mm}-${dd}` });
    }
    return cells;
  }, [calYear, calMonth]);

  const monthLabel = new Date(calYear, calMonth).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const resetForm = () => {
    setForm({
      namaPelanggan: "",
      telepon: "",
      tanggal: filterDate,
      jam: "",
      jumlahOrang: "",
      mejaId: "",
      catatan: "",
    });
  };

  const handleSave = () => {
    if (!form.namaPelanggan.trim() || !form.tanggal || !form.jam) return;
    const selectedMeja = mockMeja.find((m) => m.id === form.mejaId);
    const newReservasi: Reservasi = {
      id: Date.now().toString(),
      namaPelanggan: form.namaPelanggan,
      telepon: form.telepon,
      tanggal: form.tanggal,
      jam: form.jam,
      jumlahOrang: Number(form.jumlahOrang) || 1,
      mejaNomor: selectedMeja?.nomor ?? "-",
      catatan: form.catatan,
      status: "MENUNGGU",
    };
    setReservasiList((prev) => [...prev, newReservasi]);
    setShowDialog(false);
    resetForm();
  };

  const updateStatus = (id: string, newStatus: ReservasiStatus) => {
    setReservasiList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Reservasi</h1>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="mr-1 h-4 w-4" />
          Reservasi Baru
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Calendar sidebar ─────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-sm font-medium">{monthLabel}</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                  <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>
              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((cell, idx) => {
                  if (!cell.day) return <div key={`empty-${idx}`} />;
                  const isSelected = cell.dateStr === filterDate;
                  const hasReservasi = reservationsOnDate[cell.dateStr];
                  return (
                    <button
                      key={cell.dateStr}
                      onClick={() => setFilterDate(cell.dateStr)}
                      className={`relative flex h-9 w-full items-center justify-center rounded-md text-sm transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold"
                          : "hover:bg-accent"
                      }`}
                    >
                      {cell.day}
                      {hasReservasi ? (
                        <span
                          className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${
                            isSelected ? "bg-primary-foreground" : "bg-primary"
                          }`}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Main content ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{stats.MENUNGGU}</p>
                <p className="text-xs text-muted-foreground">Menunggu</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-green-600">{stats.DIPASTIKAN}</p>
                <p className="text-xs text-muted-foreground">Dipastikan</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xl font-bold text-muted-foreground">{stats.SELESAI}</p>
                <p className="text-xs text-muted-foreground">Selesai</p>
              </CardContent>
            </Card>
          </div>

          {/* Date heading */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span className="font-medium text-foreground">{formatTanggal(filterDate)}</span>
          </div>

          {/* Reservation list */}
          {filteredList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <CalendarDays className="h-8 w-8" />
                <p className="font-medium">Tidak ada reservasi</p>
                <p className="text-xs">Untuk tanggal ini</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredList.map((res) => {
                const sc = statusConfig[res.status];
                return (
                  <Card key={res.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        {/* Left info */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium">{res.namaPelanggan}</h3>
                            <Badge
                              variant={sc.variant}
                              className={sc.color ? `text-xs ${sc.color}` : "text-xs"}
                            >
                              {sc.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {res.jam}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {res.jumlahOrang} orang
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-xs">Meja</span>
                              <Badge variant="outline" className="text-xs">
                                {res.mejaNomor}
                              </Badge>
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {res.telepon}
                            </span>
                          </div>
                          {res.catatan && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <StickyNote className="h-3 w-3" />
                              <span>{res.catatan}</span>
                            </div>
                          )}
                        </div>

                        {/* Right: action buttons */}
                        <div className="ml-3 flex flex-col gap-1">
                          {res.status === "MENUNGGU" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => updateStatus(res.id, "DIPASTIKAN")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Pastikan</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-destructive hover:bg-destructive/10"
                                onClick={() => updateStatus(res.id, "DIBATALKAN")}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Batal</span>
                              </Button>
                            </>
                          )}
                          {res.status === "DIPASTIKAN" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => updateStatus(res.id, "SELESAI")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Selesai</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 text-destructive hover:bg-destructive/10"
                                onClick={() => updateStatus(res.id, "DIBATALKAN")}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Batal</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Create Reservation Dialog ═══ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reservasi Baru</DialogTitle>
            <DialogDescription>Buat reservasi meja baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="res-nama">Nama Pelanggan *</Label>
              <Input
                id="res-nama"
                placeholder="Nama lengkap"
                value={form.namaPelanggan}
                onChange={(e) => setForm((f) => ({ ...f, namaPelanggan: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="res-telp">Nomor Telepon</Label>
              <Input
                id="res-telp"
                placeholder="08123456789"
                value={form.telepon}
                onChange={(e) => setForm((f) => ({ ...f, telepon: e.target.value }))}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="res-tgl">Tanggal *</Label>
                <Input
                  id="res-tgl"
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-jam">Jam *</Label>
                <Input
                  id="res-jam"
                  type="time"
                  value={form.jam}
                  onChange={(e) => setForm((f) => ({ ...f, jam: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="res-orang">Jumlah Orang</Label>
                <Input
                  id="res-orang"
                  type="number"
                  min="1"
                  placeholder="4"
                  value={form.jumlahOrang}
                  onChange={(e) => setForm((f) => ({ ...f, jumlahOrang: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="res-meja">Pilih Meja</Label>
                <select
                  id="res-meja"
                  value={form.mejaId}
                  onChange={(e) => setForm((f) => ({ ...f, mejaId: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Pilih meja</option>
                  {mockMeja.map((m) => (
                    <option key={m.id} value={m.id}>
                      Meja {m.nomor} (kap. {m.kapasitas})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="res-catatan">Catatan</Label>
              <Input
                id="res-catatan"
                placeholder="Permintaan khusus (opsional)"
                value={form.catatan}
                onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.namaPelanggan.trim() || !form.tanggal || !form.jam}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
