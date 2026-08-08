"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { UtensilsCrossed, Loader2 } from "lucide-react";

function MasukForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await trpc.auth.login.mutate({ email, password });

      if (result?.token) {
        document.cookie = `altora-session=${result.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
        router.push(from);
        router.refresh();
      } else {
        setError("Login gagal. Periksa email dan kata sandi.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="altora-ambient flex min-h-screen items-center justify-center p-4">
      <Card className="altora-glass w-full max-w-md rounded-[18px]">
        <CardHeader className="space-y-1 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
            style={{
              background:
                "linear-gradient(135deg, #7c5ce8 0%, #c05bc8 100%)",
              boxShadow: "0 12px 30px -8px rgba(124, 92, 232, 0.45)",
            }}
          >
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl font-bold text-[hsl(var(--ink))]">
            Altora Resto
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Masuk ke sistem operasional restoran
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@resto.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-10 rounded-xl border-[hsl(var(--line))] bg-white/70 focus-visible:ring-[hsl(var(--accent))]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                disabled={loading}
                className="h-10 rounded-xl border-[hsl(var(--line))] bg-white/70 focus-visible:ring-[hsl(var(--accent))]"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="h-10 w-full rounded-xl font-semibold"
              style={{
                background: "linear-gradient(135deg, #7c5ce8 0%, #c05bc8 100%)",
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function MasukPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MasukForm />
    </Suspense>
  );
}
