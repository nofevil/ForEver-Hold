import { createFileRoute } from "@tanstack/react-router";
import {
  CharacterWorkspace,
  CREATE_STEPS,
  MissingCharacter,
  isCreating,
  type WorkspaceTab,
} from "@/components/character-workspace";
import type { BuilderSection } from "@/components/builder";
import { useCharacter, useCharacters } from "@/store/characters";

const TABS: WorkspaceTab[] = ["create", "stats", "combat", "demesne", "inventory"];
const STEPS = CREATE_STEPS.map((s) => s.id);

type Search = { tab: WorkspaceTab; step: BuilderSection };

export const Route = createFileRoute("/c/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    tab: TABS.includes(search.tab as WorkspaceTab) ? (search.tab as WorkspaceTab) : "stats",
    step: STEPS.includes(search.step as BuilderSection)
      ? (search.step as BuilderSection)
      : "identity",
  }),
  component: CharacterPage,
});

function CharacterPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const hydrated = useCharacters((s) => s.hydrated);
  const character = useCharacter(id);

  if (!hydrated) {
    return <div className="min-h-dvh bg-parchment" />;
  }
  if (!character) return <MissingCharacter />;

  const creating = isCreating(character);
  const tab: WorkspaceTab = creating ? "create" : search.tab === "create" ? "stats" : search.tab;
  const step: BuilderSection = creating ? search.step : "identity";

  return <CharacterWorkspace character={character} tab={tab} step={step} />;
}
