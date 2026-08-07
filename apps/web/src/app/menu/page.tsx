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
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  UtensilsCrossed,
  FolderOpen,
} from "lucide-react";

type Kategori = {
  id: string;
  nama: string;
  urutan: number;
  status: string;
};

type ItemMenu = {
  id: string;
  nama: string;
  deskripsi: string | null;
  kategoriId: string;
  status: string;
  stokTakTerbatas: boolean;
};

export default function MenuPage() {
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [itemList, setItemList] = useState<ItemMenu[]>([]);
  const [selectedKategori, setSelectedKategori] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [showKategoriDialog, setShowKategoriDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingKategori, setEditingKategori] = useState<Kategori | null>(null);
  const [editingItem, setEditingItem] = useState<ItemMenu | null>(null);

  // Form state
  const [kategoriNama, setKategoriNama] = useState("");
  const [itemNama, setItemNama] = useState("");
  const [itemDeskripsi, setItemDeskripsi] = useState("");
  const [itemKategoriId, setItemKategoriId] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [kategori, items] = await Promise.all([
        trpc.menu.kategori.list.query({ includeItems: false, includeNonActive: true }),
        trpc.menu.item.list.query({ includeRelations: false, includeNonActive: true }),
      ]);
      setKategoriList(kategori as Kategori[]);
      setItemList(items as ItemMenu[]);
    } catch (err) {
      console.error("Gagal memuat data menu:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = itemList.filter((item) => {
    const matchKategori = selectedKategori ? item.kategoriId === selectedKategori : true;
    const matchSearch = search
      ? item.nama.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchKategori && matchSearch;
  });

  const handleSaveKategori = async () => {
    if (!kategoriNama.trim()) return;
    try {
      if (editingKategori) {
        await trpc.menu.kategori.update.mutate({ id: editingKategori.id, nama: kategoriNama });
      } else {
        await trpc.menu.kategori.create.mutate({ nama: kategoriNama });
      }
      setShowKategoriDialog(false);
      setEditingKategori(null);
      setKategoriNama("");
      fetchData();
    } catch (err) {
      console.error("Gagal menyimpan kategori:", err);
    }
  };

  const handleDeleteKategori = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return;
    try {
      await trpc.menu.kategori.delete.mutate({ id });
      fetchData();
    } catch (err) {
      console.error("Gagal menghapus kategori:", err);
    }
  };

  const handleSaveItem = async () => {
    if (!itemNama.trim() || !itemKategoriId) return;
    try {
      if (editingItem) {
        await trpc.menu.item.update.mutate({
          id: editingItem.id,
          nama: itemNama,
          deskripsi: itemDeskripsi || undefined,
          kategoriId: itemKategoriId,
        });
      } else {
        await trpc.menu.item.create.mutate({
          nama: itemNama,
          deskripsi: itemDeskripsi || undefined,
          kategoriId: itemKategoriId,
        });
      }
      setShowItemDialog(false);
      setEditingItem(null);
      setItemNama("");
      setItemDeskripsi("");
      setItemKategoriId("");
      fetchData();
    } catch (err) {
      console.error("Gagal menyimpan item:", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Hapus item menu ini?")) return;
    try {
      await trpc.menu.item.delete.mutate({ id });
      fetchData();
    } catch (err) {
      console.error("Gagal menghapus item:", err);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "AKTIF":
        return <Badge variant="default" className="bg-green-600">Aktif</Badge>;
      case "NONAKTIF":
        return <Badge variant="secondary">Nonaktif</Badge>;
      case "HABIS":
        return <Badge variant="destructive">Habis</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Menu</h1>
          <p className="text-muted-foreground">
            Kelola kategori dan item menu restoran
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditingKategori(null);
              setKategoriNama("");
              setShowKategoriDialog(true);
            }}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            Kategori
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null);
              setItemNama("");
              setItemDeskripsi("");
              setItemKategoriId(selectedKategori ?? "");
              setShowItemDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Item Baru
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar: Kategori */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Kategori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <button
              onClick={() => setSelectedKategori(null)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedKategori === null
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              }`}
            >
              Semua Kategori
            </button>
            {kategoriList.map((k) => (
              <button
                key={k.id}
                onClick={() => setSelectedKategori(k.id)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  selectedKategori === k.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <span className="truncate">{k.nama}</span>
                <span className="ml-2 text-xs opacity-70">
                  {itemList.filter((i) => i.kategoriId === k.id).length}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Main: Items */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari item menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Memuat data...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <UtensilsCrossed className="mb-4 h-12 w-12 opacity-30" />
              <p>Belum ada item menu</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const kategori = kategoriList.find((k) => k.id === item.kategoriId);
                return (
                  <Card key={item.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{item.nama}</h3>
                          {item.deskripsi && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                              {item.deskripsi}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            {statusBadge(item.status)}
                            {kategori && (
                              <Badge variant="outline" className="text-xs">
                                {kategori.nama}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="ml-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingItem(item);
                              setItemNama(item.nama);
                              setItemDeskripsi(item.deskripsi ?? "");
                              setItemKategoriId(item.kategoriId);
                              setShowItemDialog(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Dialog: Kategori */}
      <Dialog open={showKategoriDialog} onOpenChange={setShowKategoriDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingKategori ? "Edit Kategori" : "Kategori Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingKategori
                ? "Ubah nama kategori"
                : "Tambahkan kategori menu baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="kategori-nama">Nama Kategori</Label>
              <Input
                id="kategori-nama"
                placeholder="Contoh: Makanan Utama"
                value={kategoriNama}
                onChange={(e) => setKategoriNama(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKategoriDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveKategori}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Item Menu */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item Menu" : "Item Menu Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Ubah detail item menu"
                : "Tambahkan item menu baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-nama">Nama Item</Label>
              <Input
                id="item-nama"
                placeholder="Contoh: Nasi Goreng Spesial"
                value={itemNama}
                onChange={(e) => setItemNama(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-deskripsi">Deskripsi</Label>
              <Input
                id="item-deskripsi"
                placeholder="Deskripsi singkat (opsional)"
                value={itemDeskripsi}
                onChange={(e) => setItemDeskripsi(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-kategori">Kategori</Label>
              <select
                id="item-kategori"
                value={itemKategoriId}
                onChange={(e) => setItemKategoriId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Pilih kategori</option>
                {kategoriList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveItem}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
