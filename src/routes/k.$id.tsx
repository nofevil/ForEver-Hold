import { createFileRoute } from "@tanstack/react-router";
import { KeelWorkspace } from "@/components/keel-workspace";
import { MissingRecord } from "@/components/relic-workspace";
import { SignInAsk, useAccountPhase } from "@/components/sign-in-ask";
import { useAirship, useCharacters } from "@/store/characters";

export const Route = createFileRoute("/k/$id")({
  component: KeelPage,
});

function KeelPage() {
  const { id } = Route.useParams();
  const hydrated = useCharacters((s) => s.hydrated);
  const ship = useAirship(id);
  const phase = useAccountPhase();
  if (!hydrated || phase === "loading") return <div className="min-h-dvh bg-parchment" />;
  if (phase === "out") return <SignInAsk page title="Sign in to open the Hold" from="company" />;
  if (!ship) return <MissingRecord desk="keels" />;
  return <KeelWorkspace ship={ship} />;
}
