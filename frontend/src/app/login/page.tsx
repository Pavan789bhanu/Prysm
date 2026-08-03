"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Gem, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeNextPath } from "@/lib/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nextPath = safeNextPath(searchParams.get("next"));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md glass-panel">
      <CardHeader className="text-center">
        <Link href="/" className="mx-auto mb-4 flex items-center gap-2.5 font-semibold">
          <span className="bg-sunset flex h-9 w-9 items-center justify-center rounded-xl shadow-[0_6px_20px_rgba(236,72,153,0.45)]">
            <Gem className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg text-white">Prysm</span>
        </Link>
        <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
        <CardDescription>Sign in to access your analysis dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username or email</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="username or you@company.com"
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
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
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href={`/register?next=${encodeURIComponent(nextPath)}`}
            className="font-medium text-fuchsia-300 hover:text-fuchsia-200 hover:underline"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="orb left-[-6rem] top-[-4rem] h-80 w-80 bg-fuchsia-600/40" />
        <div className="orb bottom-[-6rem] right-[-4rem] h-80 w-80 bg-rose-500/40" />
        <div className="grid-pattern absolute inset-0 opacity-60" />
      </div>
      <Suspense fallback={<div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-white/5" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
