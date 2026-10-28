import { createFileRoute } from "@tanstack/react-router";
import { MissingRecord, RelicWorkspace } from "@/components/relic-workspace";
import { SignInAsk, useAccountPhase } from "@/components/sign-in-ask";
import { useCharacters, useRelic } from "@/store/characters";

type Search = { table: string; edit: boolean };

export const Route = createFileRoute("/r/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    table: typeof search.table === "string" ? search.table : "",
    edit: search.edit === true || search.edit === "1" || search.edit === "true",
  }),
  component: RelicPage,
});

function RelicPage() {
  const { id } = Route.useParams();
  const { table, edit } = Route.useSearch();
  const hydrated = useCharacters((s) => s.hydrated);
  const relic = useRelic(id);
  const phase = useAccountPhase();
  if (!hydrated || phase === "loading") return <div className="min-h-dvh bg-parchment" />;
  if (phase === "out") return <SignInAsk page title="Sign in to open this relic" from="relics" />;
  if (!relic) return <MissingRecord desk="relics" />;
  return <RelicWorkspace relic={relic} returnTableId={table || undefined} editing={edit} />;
}