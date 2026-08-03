"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Gem, Loader2 } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.confirmPasswordReset({ token, new_password: password });
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md glass-panel">
      <CardHeader className="text-center">
        <Link href="/" className="mx-auto mb-4 flex items-center gap-2.5 font-semibold">
          <span className="bg-sunset flex h-9 w-9 items-center justify-center rounded-xl">
            <Gem className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg text-white">Prysm</span>
        </Link>
        <CardTitle className="text-2xl text-white">Choose a new password</CardTitle>
        <CardDescription>Paste your reset token if it is not already filled in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token">Reset token</Label>
            <Input
              id="token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="orb left-[-6rem] top-[-4rem] h-80 w-80 bg-violet-600/40" />
        <div className="orb bottom-[-6rem] right-[-4rem] h-80 w-80 bg-rose-500/40" />
      </div>
      <Suspense fallback={<div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-white/5" />}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
