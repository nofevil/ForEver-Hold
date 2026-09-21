import { createFileRoute } from "@tanstack/react-router";
import { HostileWorkspace } from "@/components/hostile-workspace";
import { MissingRecord } from "@/components/relic-workspace";
import { useCharacters, useMob } from "@/store/characters";

export const Route = createFileRoute("/h/$id")({
  component: HostilePage,
});

function HostilePage() {
  const { id } = Route.useParams();
  const hydrated = useCharacters((s) => s.hydrated);
  const mob = useMob(id);
  if (!hydrated) return <div className="min-h-dvh bg-parchment" />;
  if (!mob) return <MissingRecord desk="hostiles" />;
  return <HostileWorkspace mob={mob} />;
}
