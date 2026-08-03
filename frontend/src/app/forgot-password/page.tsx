"use client";

import Link from "next/link";
import { useState } from "react";
import { Gem, Loader2 } from "lucide-react";
import { ApiError, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setDevLink("");
    try {
      const result = await api.requestPasswordReset(email);
      setMessage(result.message);
      if (result.dev_reset_link) setDevLink(result.dev_reset_link);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="orb left-[-6rem] top-[-4rem] h-80 w-80 bg-fuchsia-600/40" />
        <div className="orb bottom-[-6rem] right-[-4rem] h-80 w-80 bg-rose-500/40" />
      </div>
      <Card className="w-full max-w-md glass-panel">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 flex items-center gap-2.5 font-semibold">
            <span className="bg-sunset flex h-9 w-9 items-center justify-center rounded-xl">
              <Gem className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg text-white">Prysm</span>
          </Link>
          <CardTitle className="text-2xl text-white">Reset password</CardTitle>
          <CardDescription>
            Enter your account email. Operators can retrieve the reset link from logs or
            `flask password-reset-link`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                {message}
              </p>
            ) : null}
            {devLink ? (
              <p className="break-all rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground">
                Dev reset link:{" "}
                <Link href={devLink} className="text-fuchsia-300 underline">
                  open
                </Link>
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Request reset
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-fuchsia-300 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
