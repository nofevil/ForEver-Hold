import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { HostileWorkspace } from "@/components/hostile-workspace";
import { MissingRecord } from "@/components/relic-workspace";
import { SignInAsk, useAccountPhase } from "@/components/sign-in-ask";
import { blankMob } from "@/lib/op20/defaults";
import type { Mob } from "@/lib/op20/types";
import { useCharacters, useMob } from "@/store/characters";

type Search = { table: string };

export const Route = createFileRoute("/h/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    table: typeof search.table === "string" ? search.table : "",
  }),
  component: HostilePage,
});

function HostilePage() {
  const { id } = Route.useParams();
  const { table } = Route.useSearch();
  const hydrated = useCharacters((s) => s.hydrated);
  const mob = useMob(id);
  const phase = useAccountPhase();
  if (!hydrated || phase === "loading") return <div className="min-h-dvh bg-parchment" />;
  if (phase === "out") return <SignInAsk page title="Sign in to open this hostile" from="story" />;
  if (id === "new") return <NewHostile table={table} />;
  if (!mob) return <MissingRecord desk="hostiles" />;
  return <HostileWorkspace mob={mob} returnTableId={table || undefined} />;
}

function NewHostile({ table }: { table: string }) {
  const navigate = useNavigate();
  const saveMob = useCharacters((s) => s.saveMob);
  const [mob, setMob] = useState<Mob>(() => blankMob());
  return (
    <HostileWorkspace
      mob={mob}
      returnTableId={table || undefined}
      draft
      onDraft={setMob}
      onCreate={() => {
        const saved = saveMob(mob);
        void navigate({
          to: "/h/$id",
          params: { id: saved.id },
          search: { table },
          replace: true,
        });
      }}
    />
  );
}
