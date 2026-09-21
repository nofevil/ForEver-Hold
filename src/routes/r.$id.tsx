import { createFileRoute } from "@tanstack/react-router";
import { MissingRecord, RelicWorkspace } from "@/components/relic-workspace";
import { useCharacters, useRelic } from "@/store/characters";

export const Route = createFileRoute("/r/$id")({
  component: RelicPage,
});

function RelicPage() {
  const { id } = Route.useParams();
  const hydrated = useCharacters((s) => s.hydrated);
  const relic = useRelic(id);
  if (!hydrated) return <div className="min-h-dvh bg-parchment" />;
  if (!relic) return <MissingRecord desk="relics" />;
  return <RelicWorkspace relic={relic} />;
}
