import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HoldMark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { Desk } from "@/lib/op20/types";

/** Same tree on the server and the first client paint, then the real session. */
export function useAccountPhase(): "loading" | "out" | "in" {
  const { user, isPending } = useCurrentUserState();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || isPending) return "loading";
  return user ? "in" : "out";
}

export function SignInAsk({
  title,
  from,
  page = false,
}: {
  title: string;
  from: Desk;
  page?: boolean;
}) {
  const home = from === "relics" ? "relics" : from === "story" || from === "hostiles" ? "story" : "company";
  const panel = (
    <div className="ornament-frame rounded-[28px] p-8">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-2 max-w-lg text-muted">
        Characters, relics, hostiles, and tables are saved on your account. Sign in first so none of that work is lost.
        If this device already has a Hold, signing in keeps it.
      </p>
      <Button asChild className="mt-4">
        <Link to="/login" search={{ from }}>
          Sign in
        </Link>
      </Button>
    </div>
  );
  if (!page) return panel;
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <Link to="/" search={{ desk: home }} className="mb-6 flex items-center gap-3">
        <HoldMark className="h-14 w-auto" decorative={false} />
        <span className="font-display text-3xl">Forever Hold</span>
      </Link>
      {panel}
    </main>
  );
}
