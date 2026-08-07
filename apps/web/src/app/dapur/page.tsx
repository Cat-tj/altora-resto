"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertCircle,
  Timer,
} from "lucide-react";

type Stasiun = {
  id: string;
  nama: string;
};

type TiketBaris = {
  id: string;
  itemPesananId: string;
  statusMasak: string;
  itemPesanan?: {
    namaItemSnapshot: string;
    kuantitas: number;
    catatan: string | null;
  };
};

type TiketDapur = {
  id: string;
  stasiunDapurId: string | null;
  status: string;
  nomorGelombang: number;
  masukPada: string;
  mulaiDiprosesPada: string | null;
  siapPada: string | null;
  baris: TiketBaris[];
  pesanan?: {
    nomorPesanan: string;
    mejaId: string | null;
  };
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  BARU: { label: "Baru", color: "bg-blue-100 text-blue-800 border-blue-200", icon: AlertCircle },
  DITERIMA: { label: "Diterima", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  DITAHAN: { label: "Ditahan", color: "bg-orange-100 text-orange-800 border-orange-200", icon: AlertCircle },
  SEDANG_DISIAPKAN: { label: "Sedang Disiapkan", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Timer },
  SELESAI_SEBAGIAN: { label: "Sebagian Siap", color: "bg-amber-100 text-amber-800 border-amber-200", icon: CheckCircle2 },
  SIAP: { label: "Siap", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  DISAJIKAN: { label: "Disajikan", color: "bg-gray-100 text-gray-800 border-gray-200", icon: CheckCircle2 },
  DIBATALKAN: { label: "Dibatalkan", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
};

const masakStatusConfig: Record<string, { label: string; color: string }> = {
  MENUNGGU: { label: "Menunggu", color: "bg-slate-100 text-slate-700" },
  DIMASAK: { label: "Sedang Dimasak", color: "bg-orange-100 text-orange-700" },
  SIAP: { label: "Siap", color: "bg-green-100 text-green-700" },
};

export default function DapurPage() {
  const [stasiunList, setStasiunList] = useState<Stasiun[]>([]);
  const [tiketList, setTiketList] = useState<TiketDapur[]>([]);
  const [selectedStasiun, setSelectedStasiun] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [stasiun, tiket] = await Promise.all([
        trpc.kitchen.stasiun.list.query({ includeAturan: false }),
        trpc.kitchen.tiket.list.query({
          includeBaris: true,
          includeRiwayat: false,
        }),
      ]);
      setStasiunList(stasiun as Stasiun[]);
      setTiketList(tiket as TiketDapur[]);
    } catch (err) {
      console.error("Gagal memuat data dapur:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredTiket = tiketList.filter((t) => {
    if (selectedStasiun === "all") return true;
    return t.stasiunDapurId === selectedStasiun;
  });

  const handleStatusChange = async (tiketId: string, newStatus: string) => {
    try {
      await trpc.kitchen.tiket.updateStatus.mutate({
        tiketDapurId: tiketId,
        status: newStatus as "BARU" | "DITERIMA" | "SEDANG_DISIAPKAN" | "SIAP" | "DIBATALKAN",
      });
      fetchData();
    } catch (err) {
      console.error("Gagal update status:", err);
    }
  };

  const handleBarisStatusChange = async (barisId: string, status: string) => {
    try {
      await trpc.kitchen.tiket.updateBarisStatus.mutate({
        tiketDapurBarisId: barisId,
        statusMasak: status as "MENUNGGU" | "DIMASAK" | "SIAP",
      });
      fetchData();
    } catch (err) {
      console.error("Gagal update status baris:", err);
    }
  };

  const getElapsed = (masukPada: string) => {
    const diff = Date.now() - new Date(masukPada).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}j ${mins % 60}m`;
  };

  const activeCount = tiketList.filter((t) =>
    ["BARU", "DITERIMA", "SEDANG_DISIAPKAN", "SELESAI_SEBAGIAN"].includes(t.status)
  ).length;

  const readyCount = tiketList.filter((t) => t.status === "SIAP").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Display Dapur (KDS)</h1>
          <p className="text-muted-foreground">Tampilan tiket masak per stasiun</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-muted-foreground">
              {activeCount} aktif
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-muted-foreground">
              {readyCount} siap
            </span>
          </div>
        </div>
      </div>

      {/* Stasiun tabs */}
      <Tabs value={selectedStasiun} onValueChange={setSelectedStasiun}>
        <TabsList>
          <TabsTrigger value="all">
            Semua Stasiun
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {activeCount}
              </Badge>
            )}
          </TabsTrigger>
          {stasiunList.map((s) => {
            const count = tiketList.filter(
              (t) =>
                t.stasiunDapurId === s.id &&
                ["BARU", "DITERIMA", "SEDANG_DISIAPKAN", "SELESAI_SEBAGIAN"].includes(t.status)
            ).length;
            return (
              <TabsTrigger key={s.id} value={s.id}>
                {s.nama}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={selectedStasiun} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <ChefHat className="mr-2 h-5 w-5 animate-pulse" />
              Memuat tiket dapur...
            </div>
          ) : filteredTiket.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ChefHat className="mb-4 h-16 w-16 opacity-20" />
              <p className="text-lg">Tidak ada tiket aktif</p>
              <p className="text-sm">Semua pesanan sudah selesai</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTiket.map((tiket) => {
                const statusInfo = (statusConfig[tiket.status] ?? statusConfig.BARU)!;
                const StatusIcon = statusInfo.icon;
                return (
                  <Card key={tiket.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          #{tiket.pesanan?.nomorPesanan ?? tiket.id.slice(0, 8)}
                        </CardTitle>
                        <Badge variant="outline" className={statusInfo.color}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {getElapsed(tiket.masukPada)}
                        {tiket.nomorGelombang > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            G{tiket.nomorGelombang}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {/* Baris items */}
                      {tiket.baris.map((baris) => {
                        const masakInfo = (masakStatusConfig[baris.statusMasak] ?? masakStatusConfig.MENUNGGU)!;
                        return (
                          <div
                            key={baris.id}
                            className="flex items-center justify-between rounded-md border p-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {baris.itemPesanan?.namaItemSnapshot ?? "Item"}
                                {baris.itemPesanan?.kuantitas && baris.itemPesanan.kuantitas > 1 && (
                                  <span className="ml-1 text-muted-foreground">
                                    x{baris.itemPesanan.kuantitas}
                                  </span>
                                )}
                              </p>
                              {baris.itemPesanan?.catatan && (
                                <p className="text-xs text-muted-foreground italic truncate">
                                  {baris.itemPesanan.catatan}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className={`text-xs ${masakInfo.color}`}>
                              {masakInfo.label}
                            </Badge>
                          </div>
                        );
                      })}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2">
                        {tiket.status === "BARU" && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleStatusChange(tiket.id, "DITERIMA")}
                          >
                            Terima
                          </Button>
                        )}
                        {tiket.status === "DITERIMA" && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleStatusChange(tiket.id, "SEDANG_DISIAPKAN")}
                          >
                            Mulai Masak
                          </Button>
                        )}
                        {tiket.status === "SEDANG_DISIAPKAN" && (
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleStatusChange(tiket.id, "SIAP")}
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Siap
                          </Button>
                        )}
                        {["BARU", "DITERIMA", "SEDANG_DISIAPKAN"].includes(tiket.status) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusChange(tiket.id, "DIBATALKAN")}
                          >
                            Batal
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
