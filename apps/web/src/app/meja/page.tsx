"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  LayoutGrid,
  Plus,
  Users,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

type AreaMeja = {
  id: string;
  nama: string;
  meja?: Meja[];
};

type Meja = {
  id: string;
  nomor: string;
  kapasitas: number;
  status: string;
  areaMejaId: string;
};

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  TERSEDIA: {
    label: "Tersedia",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200 hover:bg-green-100",
  },
  TERPAKAI: {
    label: "Terpakai",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  DIPESAN: {
    label: "Dipesan",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  PERLU_DIBERSIHKAN: {
    label: "Perlu Dibersihkan",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  NONAKTIF: {
    label: "Nonaktif",
    color: "text-gray-500",
    bg: "bg-gray-50 border-gray-200 opacity-50",
  },
};

export default function MejaPage() {
  const [areaList, setAreaList] = useState<AreaMeja[]>([]);
  const [mejaList, setMejaList] = useState<Meja[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [showMejaDialog, setShowMejaDialog] = useState(false);
  const [showAreaDialog, setShowAreaDialog] = useState(false);
  const [editingMeja, setEditingMeja] = useState<Meja | null>(null);

  // Form state
  const [mejaNomor, setMejaNomor] = useState("");
  const [mejaKapasitas, setMejaKapasitas] = useState("4");
  const [mejaAreaId, setMejaAreaId] = useState("");
  const [areaNama, setAreaNama] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [areas, meja] = await Promise.all([
        trpc.meja.area.list.query({ includeMeja: true }),
        trpc.meja.list.query({ includeArea: true }),
      ]);
      setAreaList(areas as AreaMeja[]);
      setMejaList(meja as Meja[]);
    } catch (err) {
      console.error("Gagal memuat data meja:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 15_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredMeja = mejaList.filter((m) => {
    if (selectedArea === "all") return true;
    return m.areaMejaId === selectedArea;
  });

  const handleSaveMeja = async () => {
    if (!mejaNomor.trim() || !mejaAreaId) return;
    try {
      if (editingMeja) {
        await trpc.meja.update.mutate({
          id: editingMeja.id,
          nomor: mejaNomor,
          kapasitas: Number(mejaKapasitas),
          areaMejaId: mejaAreaId,
        });
      } else {
        // Find outletId from area
        const area = areaList.find((a) => a.id === mejaAreaId);
        if (!area) return;
        // We need outletId - for now use a placeholder
        await trpc.meja.create.mutate({
          outletId: "current-outlet",
          areaMejaId: mejaAreaId,
          nomor: mejaNomor,
          kapasitas: Number(mejaKapasitas),
        });
      }
      setShowMejaDialog(false);
      setEditingMeja(null);
      setMejaNomor("");
      setMejaKapasitas("4");
      fetchData();
    } catch (err) {
      console.error("Gagal menyimpan meja:", err);
    }
  };

  const handleSaveArea = async () => {
    if (!areaNama.trim()) return;
    try {
      await trpc.meja.area.create.mutate({
        outletId: "current-outlet",
        nama: areaNama,
      });
      setShowAreaDialog(false);
      setAreaNama("");
      fetchData();
    } catch (err) {
      console.error("Gagal menyimpan area:", err);
    }
  };

  const handleReleaseMeja = async (mejaId: string) => {
    try {
      await trpc.meja.release.mutate({ mejaId });
      fetchData();
    } catch (err) {
      console.error("Gagal melepaskan meja:", err);
    }
  };

  const stats = {
    total: mejaList.length,
    tersedia: mejaList.filter((m) => m.status === "TERSEDIA").length,
    terpakai: mejaList.filter((m) => m.status === "TERPAKAI").length,
    dipesan: mejaList.filter((m) => m.status === "DIPESAN").length,
    perluDibersihkan: mejaList.filter((m) => m.status === "PERLU_DIBERSIHKAN").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Meja</h1>
          <p className="text-muted-foreground">Denah dan status meja restoran</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAreaDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Area
          </Button>
          <Button onClick={() => {
            setEditingMeja(null);
            setMejaNomor("");
            setMejaKapasitas("4");
            setMejaAreaId(areaList[0]?.id ?? "");
            setShowMejaDialog(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Meja Baru
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Meja</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.tersedia}</p>
            <p className="text-xs text-muted-foreground">Tersedia</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.terpakai}</p>
            <p className="text-xs text-muted-foreground">Terpakai</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.dipesan}</p>
            <p className="text-xs text-muted-foreground">Dipesan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.perluDibersihkan}</p>
            <p className="text-xs text-muted-foreground">Perlu Dibersihkan</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.entries(statusConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-sm border ${config.bg}`} />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Area tabs */}
      <Tabs value={selectedArea} onValueChange={setSelectedArea}>
        <TabsList>
          <TabsTrigger value="all">Semua Area</TabsTrigger>
          {areaList.map((a) => (
            <TabsTrigger key={a.id} value={a.id}>
              {a.nama}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedArea} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <LayoutGrid className="mr-2 h-5 w-5 animate-pulse" />
              Memuat denah meja...
            </div>
          ) : filteredMeja.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <LayoutGrid className="mb-4 h-16 w-16 opacity-20" />
              <p className="text-lg">Belum ada meja</p>
              <p className="text-sm">Tambahkan meja untuk memulai</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {filteredMeja.map((meja) => {
                const config = (statusConfig[meja.status] ?? statusConfig.NONAKTIF)!;
                return (
                  <div
                    key={meja.id}
                    className={`group relative flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all ${config.bg}`}
                  >
                    {/* Actions (on hover) */}
                    <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setEditingMeja(meja);
                          setMejaNomor(meja.nomor);
                          setMejaKapasitas(String(meja.kapasitas));
                          setMejaAreaId(meja.areaMejaId);
                          setShowMejaDialog(true);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {meja.status === "TERPAKAI" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-green-600"
                          onClick={() => handleReleaseMeja(meja.id)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Table number */}
                    <div className={`text-2xl font-bold ${config.color}`}>
                      {meja.nomor}
                    </div>

                    {/* Capacity */}
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {meja.kapasitas}
                    </div>

                    {/* Status */}
                    <Badge variant="outline" className={`mt-2 text-xs ${config.color}`}>
                      {config.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Meja */}
      <Dialog open={showMejaDialog} onOpenChange={setShowMejaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMeja ? "Edit Meja" : "Meja Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingMeja ? "Ubah detail meja" : "Tambahkan meja baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meja-nomor">Nomor Meja</Label>
              <Input
                id="meja-nomor"
                placeholder="Contoh: 1, A1, VIP-1"
                value={mejaNomor}
                onChange={(e) => setMejaNomor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meja-kapasitas">Kapasitas (orang)</Label>
              <Input
                id="meja-kapasitas"
                type="number"
                min="1"
                value={mejaKapasitas}
                onChange={(e) => setMejaKapasitas(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meja-area">Area</Label>
              <select
                id="meja-area"
                value={mejaAreaId}
                onChange={(e) => setMejaAreaId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Pilih area</option>
                {areaList.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMejaDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveMeja}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Area */}
      <Dialog open={showAreaDialog} onOpenChange={setShowAreaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Area Baru</DialogTitle>
            <DialogDescription>Tambahkan area meja baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="area-nama">Nama Area</Label>
              <Input
                id="area-nama"
                placeholder="Contoh: Indoor, Outdoor, VIP"
                value={areaNama}
                onChange={(e) => setAreaNama(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAreaDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveArea}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
