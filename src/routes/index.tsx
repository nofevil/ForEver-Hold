import { createFileRoute } from "@tanstack/react-router";
import { Desk } from "@/components/desk";
import type { Desk as DeskId } from "@/lib/op20/types";

const DESKS: DeskId[] = ["company", "relics", "story"];

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { desk: DeskId } => ({
    desk: DESKS.includes(search.desk as DeskId) ? (search.desk as DeskId) : "company",
  }),
  component: Home,
});

function Home() {
  const { desk } = Route.useSearch();
  return <Desk desk={desk} />;
}
