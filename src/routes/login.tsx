import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HoldMark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { Desk } from "@/lib/op20/types";

const DESKS: Desk[] = ["company", "relics", "hostiles", "keels", "story"];

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { from: Desk } => ({
    from: DESKS.includes(search.from as Desk) ? (search.from as Desk) : "company",
  }),
  component: Login,
});

const BEARER_KEY = "grok-auth.bearer-token";

function Login() {
  const navigate = useNavigate();
  const { from } = Route.useSearch();
  const back = from === "keels" ? "company" : from === "hostiles" ? "story" : from;
  const { user, isPending } = useCurrentUserState();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const left = useRef(false);

  useEffect(() => {
    if (left.current || isPending || !user) return;
    left.current = true;
    void navigate({ to: "/", search: { desk: back } });
  }, [isPending, user, navigate, back]);

  const submit = async () => {
    setError("");
    setPending(true);
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({
              email: email.trim(),
              password,
              name: email.trim().split("@")[0] || "Player",
            })
          : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) throw new Error(result.error.message || "Sign-in failed");
      const token = (result.data as { token?: string } | null)?.token;
      if (token) window.sessionStorage.setItem(BEARER_KEY, token);
      window.location.assign(`/?desk=${back}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setPending(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Link to="/" search={{ desk: back }} className="mb-6 flex items-center gap-3">
        <HoldMark className="h-14 w-auto" decorative={false} />
        <span className="font-display text-3xl">Forever Hold</span>
      </Link>
      <div className="ornament-frame rounded-[28px] p-6">
        <h1 className="font-display text-2xl text-burgundy">{mode === "up" ? "Create an account" : "Sign in"}</h1>
        <p className="mt-2 text-sm text-muted">
          Your characters stay on this account. A join code seats one of them at a table.
        </p>
        {authEnabled ? (
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <label className="block text-xs tracking-wide text-muted uppercase">
              Email
              <Input
                className="mt-1"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="block text-xs tracking-wide text-muted uppercase">
              Password
              <Input
                className="mt-1"
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Working…" : mode === "up" ? "Create account" : "Sign in"}
            </Button>
            <button
              type="button"
              className="w-full cursor-pointer text-sm text-muted underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === "up" ? "in" : "up");
                setError("");
              }}
            >
              {mode === "up" ? "Already have an account? Sign in" : "Need an account? Create one"}
            </button>
            <div className="space-y-2 pt-2">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void signIn(p.providerId, { callbackURL: `/?desk=${back}` })}
                >
                  Continue with {p.label}
                </Button>
              ))}
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted">Sign-in is disabled.</p>
        )}
      </div>
    </main>
  );
}
