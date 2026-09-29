import { createFileRoute } from "@tanstack/react-router";
import { MissingRecord, RelicWorkspace } from "@/components/relic-workspace";
import { SignInAsk, useAccountPhase } from "@/components/sign-in-ask";
import { useCharacters, useRelic } from "@/store/characters";

export const Route = createFileRoute("/r/$id")({
  component: RelicPage,
});

function RelicPage() {
  const { id } = Route.useParams();
  const hydrated = useCharacters((s) => s.hydrated);
  const relic = useRelic(id);
  const phase = useAccountPhase();
  if (!hydrated || phase === "loading") return <div className="min-h-dvh bg-parchment" />;
  if (phase === "out") return <SignInAsk page title="Sign in to open this relic" from="relics" />;
  if (!relic) return <MissingRecord desk="relics" />;
  return <RelicWorkspace relic={relic} />;
}
