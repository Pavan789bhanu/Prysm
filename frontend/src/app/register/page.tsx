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

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nextPath = safeNextPath(searchParams.get("next"));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, email, password);
      router.push(nextPath);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create account.");
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
        <CardTitle className="text-2xl text-white">Create your account</CardTitle>
        <CardDescription>
          Start analyzing datasets with AI-powered agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="letters, numbers, underscore"
              autoComplete="username"
              pattern="[A-Za-z0-9_]{3,32}"
              title="3–32 characters: letters, numbers, underscore"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
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
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
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
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="font-medium text-fuchsia-300 hover:text-fuchsia-200 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="orb left-[-6rem] bottom-[-4rem] h-80 w-80 bg-violet-600/40" />
        <div className="orb right-[-4rem] top-[-4rem] h-80 w-80 bg-rose-500/40" />
        <div className="grid-pattern absolute inset-0 opacity-60" />
      </div>
      <Suspense fallback={<div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-white/5" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
