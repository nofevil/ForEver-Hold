import { createFileRoute } from "@tanstack/react-router";
import { Desk } from "@/components/desk";
import { useCharacters } from "@/store/characters";
import type { Desk as DeskId } from "@/lib/op20/types";

const DESKS: DeskId[] = ["company", "relics", "hostiles", "keels", "story"];

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { desk: DeskId } => ({
    desk: DESKS.includes(search.desk as DeskId) ? (search.desk as DeskId) : "company",
  }),
  component: Home,
});

function Home() {
  const hydrated = useCharacters((s) => s.hydrated);
  const { desk } = Route.useSearch();
  if (!hydrated) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 pt-16">
        <div className="h-10 w-48 rounded-lg bg-parchment-2" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="h-48 rounded-[28px] bg-parchment-2" />
          <div className="h-48 rounded-[28px] bg-parchment-2" />
        </div>
      </div>
    );
  }
  return <Desk desk={desk} />;
}
