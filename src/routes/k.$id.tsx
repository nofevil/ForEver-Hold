import { createFileRoute } from "@tanstack/react-router";
import { KeelWorkspace } from "@/components/keel-workspace";
import { MissingRecord } from "@/components/relic-workspace";
import { useAirship, useCharacters } from "@/store/characters";

export const Route = createFileRoute("/k/$id")({
  component: KeelPage,
});

function KeelPage() {
  const { id } = Route.useParams();
  const hydrated = useCharacters((s) => s.hydrated);
  const ship = useAirship(id);
  if (!hydrated) return <div className="min-h-dvh bg-parchment" />;
  if (!ship) return <MissingRecord desk="keels" />;
  return <KeelWorkspace ship={ship} />;
}
