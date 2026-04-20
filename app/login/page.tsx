"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BodyText, Button, Input, Label } from "@globalcloudr/canopy-ui";
import { getSupabaseClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-shell-bg)] px-4">
      <div className="w-full max-w-sm">
        <p className="text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
          Canopy Create
        </p>
        <BodyText muted className="mt-1">
          Sign in to continue.
        </BodyText>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <BodyText className="text-sm text-red-600">{error}</BodyText>
          ) : null}

          <Button type="submit" variant="accent" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
