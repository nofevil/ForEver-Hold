import { createFileRoute, Link } from "@tanstack/react-router";
import { StoryWorkspace } from "@/components/story-workspace";
import { Button } from "@/components/ui/button";
import { HoldMark } from "@/components/mark";
import { useCharacters, useTable } from "@/store/characters";

export const Route = createFileRoute("/t/$id")({
  component: TablePage,
});

function TablePage() {
  const { id } = Route.useParams();
  const hydrated = useCharacters((s) => s.hydrated);
  const table = useTable(id);

  if (!hydrated) return <div className="min-h-dvh bg-parchment" />;
  if (!table) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-4 px-6">
        <HoldMark className="size-10 text-burgundy" />
        <h1 className="font-display text-3xl">Table not found</h1>
        <Button asChild>
          <Link to="/" search={{ desk: "story" }}>
            Back to Story Master
          </Link>
        </Button>
      </div>
    );
  }
  return <StoryWorkspace table={table} />;
}
