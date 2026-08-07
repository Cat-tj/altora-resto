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
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  QrCode,
  X,
} from "lucide-react";

type ItemMenu = {
  id: string;
  nama: string;
  deskripsi: string | null;
  kategoriId: string;
  status: string;
  stokTakTerbatas: boolean;
};

type Kategori = {
  id: string;
  nama: string;
};

type CartItem = {
  itemMenuId: string;
  nama: string;
  harga: number;
  kuantitas: number;
};

type ActiveOrder = {
  id: string;
  nomorPesanan: string;
  status: string;
  totalAkhir: number;
  mejaId: string | null;
  createdAt: string;
};

export default function KasirPage() {
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [itemList, setItemList] = useState<ItemMenu[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [selectedKategori, setSelectedKategori] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"TUNAI" | "QRIS" | "TRANSFER_MANUAL">("TUNAI");
  const [amountReceived, setAmountReceived] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [kategori, items, orders] = await Promise.all([
        trpc.menu.kategori.list.query({ includeItems: false, includeNonActive: false }),
        trpc.menu.item.list.query({ includeRelations: false, includeNonActive: false }),
        trpc.kasir.getActiveOrders.query({}),
      ]);
      setKategoriList(kategori as Kategori[]);
      setItemList(items as ItemMenu[]);
      setActiveOrders(orders as ActiveOrder[]);
    } catch (err) {
      console.error("Gagal memuat data kasir:", err);
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

  const addToCart = (item: ItemMenu) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.itemMenuId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.itemMenuId === item.id ? { ...c, kuantitas: c.kuantitas + 1 } : c
        );
      }
      return [...prev, { itemMenuId: item.id, nama: item.nama, harga: 0, kuantitas: 1 }];
    });
  };

  const updateCartQty = (itemMenuId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.itemMenuId === itemMenuId
            ? { ...c, kuantitas: c.kuantitas + delta }
            : c
        )
        .filter((c) => c.kuantitas > 0)
    );
  };

  const removeFromCart = (itemMenuId: string) => {
    setCart((prev) => prev.filter((c) => c.itemMenuId !== itemMenuId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.harga * c.kuantitas, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      // For now, just close the dialog - real checkout requires order creation
      setShowCheckout(false);
      setCart([]);
      setAmountReceived("");
      fetchData();
    } catch (err) {
      console.error("Gagal checkout:", err);
    }
  };

  const formatRupiah = (amount: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(amount);

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] gap-4 lg:h-[calc(100vh-theme(spacing.6))]">
      {/* Menu Grid */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Kategori tabs */}
        <Tabs value={selectedKategori ?? "all"} onValueChange={(v) => setSelectedKategori(v === "all" ? null : v)}>
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="all">Semua</TabsTrigger>
            {kategoriList.map((k) => (
              <TabsTrigger key={k.id} value={k.id}>
                {k.nama}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedKategori ?? "all"} className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Memuat menu...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    disabled={item.status !== "AKTIF"}
                    className="flex flex-col items-center rounded-lg border bg-card p-3 text-center transition-all hover:border-primary hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium leading-tight">{item.nama}</span>
                    {item.status === "HABIS" && (
                      <Badge variant="destructive" className="mt-1 text-xs">Habis</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Cart Panel */}
      <Card className="flex w-80 flex-col lg:w-96">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              <ShoppingCart className="mr-2 inline h-4 w-4" />
              Keranjang
            </CardTitle>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => setCart([])}
              >
                <X className="mr-1 h-3 w-3" />
                Kosongkan
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
          {cart.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Belum ada item dipilih
            </div>
          ) : (
            <div className="flex-1 overflow-auto px-4">
              {cart.map((item) => (
                <div
                  key={item.itemMenuId}
                  className="flex items-center justify-between border-b py-3 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.nama}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRupiah(item.harga)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateCartQty(item.itemMenuId, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.kuantitas}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateCartQty(item.itemMenuId, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFromCart(item.itemMenuId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Total & Checkout */}
          <div className="border-t p-4">
            <div className="mb-3 flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatRupiah(cartTotal)}</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Bayar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Orders Panel (desktop) */}
      <Card className="hidden w-72 flex-col xl:flex">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pesanan Aktif</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0 px-4">
          {activeOrders.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Tidak ada pesanan aktif
            </p>
          ) : (
            <div className="space-y-2 pb-4">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-md border p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">#{order.nomorPesanan}</span>
                    <Badge variant="outline" className="text-xs">
                      {order.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatRupiah(order.totalAkhir)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
            <DialogDescription>Pilih metode bayar dan proses pembayaran</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Tagihan</p>
              <p className="text-3xl font-bold">{formatRupiah(cartTotal)}</p>
            </div>

            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "TUNAI" as const, label: "Tunai", icon: Banknote },
                  { value: "QRIS" as const, label: "QRIS", icon: QrCode },
                  { value: "TRANSFER_MANUAL" as const, label: "Transfer", icon: CreditCard },
                ].map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setPaymentMethod(method.value)}
                    className={`flex flex-col items-center gap-1 rounded-md border p-3 text-sm transition-colors ${
                      paymentMethod === method.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                  >
                    <method.icon className="h-5 w-5" />
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "TUNAI" && (
              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah Diterima</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                />
                {Number(amountReceived) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Kembalian: {formatRupiah(Math.max(0, Number(amountReceived) - cartTotal))}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={paymentMethod === "TUNAI" && Number(amountReceived) < cartTotal}
            >
              Proses Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
