import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, Lock, Printer, ScrollText } from "lucide-react";
import { useState } from "react";
import { Builder, type BuilderSection } from "@/components/builder";
import { DiceButton, DiceProvider } from "@/components/dice";
import { HoldMark } from "@/components/mark";
import { ResourceTrack, RestStatus } from "@/components/play-tracker";
import { EssenceStrip, IdentityHero, SheetView, type SheetSection } from "@/components/sheet-view";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { autoEquipItems, canSpendEssence, fillResources, spend } from "@/lib/op20/compute";
import type { Character } from "@/lib/op20/types";
import { useCharacters } from "@/store/characters";
import { cn } from "@/lib/utils";

export const CREATE_STEPS: { id: BuilderSection; label: string; hint: string }[] = [
  { id: "identity", label: "Identity", hint: "Name and budget" },
  { id: "stats", label: "Stats", hint: "Attributes" },
  { id: "combat", label: "Combat", hint: "Weapons and tricks" },
  { id: "demesne", label: "Demesne", hint: "Demesnes and DP" },
  { id: "inventory", label: "Inventory", hint: "Gear" },
  { id: "notes", label: "Notes", hint: "Traits and notes" },
];

export const SHEET_TABS: { id: BuilderSection; label: string }[] = [
  { id: "stats", label: "Stats" },
  { id: "combat", label: "Combat" },
  { id: "demesne", label: "Demesne" },
  { id: "inventory", label: "Inventory" },
  { id: "notes", label: "Notes" },
];

/** Same tab walk as creation, without Identity. Purchases still use the shop filter. */
const SPEND_STEPS = CREATE_STEPS.filter((s) => s.id !== "identity");

export type WorkspaceTab = "create" | BuilderSection;

export function isCreating(c: Character): boolean {
  return c.sheetOpened === false;
}

export function CharacterWorkspace({
  character,
  tab,
  step,
}: {
  character: Character;
  tab: WorkspaceTab;
  step: BuilderSection;
}) {
  const navigate = useNavigate();
  const update = useCharacters((s) => s.update);
  const s = spend(character);
  const creating = isCreating(character);
  const [spendMode, setSpendMode] = useState(false);
  const [spendStep, setSpendStep] = useState<BuilderSection>("stats");

  const goCreate = (next: BuilderSection) =>
    navigate({ to: "/c/$id", params: { id: character.id }, search: { tab: "create", step: next } });

  const goSheet = (next: BuilderSection) =>
    navigate({ to: "/c/$id", params: { id: character.id }, search: { tab: next, step: next } });

  const openSheet = () => {
    update(character.id, (cur) => fillResources(autoEquipItems({ ...cur, sheetOpened: true })));
    setSpendMode(false);
    navigate({ to: "/c/$id", params: { id: character.id }, search: { tab: "stats", step: "stats" } });
  };

  const startSpend = () => {
    setSpendStep("stats");
    setSpendMode(true);
  };

  const lockSpend = () => setSpendMode(false);

  const exportOne = () => {
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(character.name || "character").replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stepIndex = CREATE_STEPS.findIndex((x) => x.id === step);
  const prev = CREATE_STEPS[stepIndex - 1];
  const next = CREATE_STEPS[stepIndex + 1];
  const spendIndex = SPEND_STEPS.findIndex((x) => x.id === spendStep);
  const spendPrev = SPEND_STEPS[spendIndex - 1];
  const spendNext = SPEND_STEPS[spendIndex + 1];
  const sheetTab: SheetSection =
    tab === "create" ? "stats" : (tab as SheetSection);

  return (
    <DiceProvider>
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 border-b border-leather-2/20 bg-leather text-parchment no-print">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-6">
            <Link
              to="/"
              search={{ desk: "company" }}
              className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10"
              aria-label={`Back to ${APP_NAME}`}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <HoldMark light className="hidden h-11 w-auto sm:block" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg leading-tight">
                {character.name || "Unnamed"}
              </p>
              <p className="truncate text-xs text-parchment/70">
                {creating
                  ? "Creating"
                  : spendMode
                    ? "Spending Essence"
                    : character.profession || "No profession"}{" "}
                · {s.remaining} Essence left
              </p>
            </div>
            {creating ? (
              <Button
                size="sm"
                className="bg-parchment text-ink hover:bg-cream"
                onClick={openSheet}
              >
                <ScrollText /> Open sheet
              </Button>
            ) : (
              <>
                <DiceButton ghost className="text-parchment hover:bg-white/10" />
                {spendMode ? (
                  <Button
                    size="sm"
                    className="bg-parchment text-ink hover:bg-cream"
                    onClick={lockSpend}
                  >
                    <Lock /> Lock in
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-parchment hover:bg-white/10"
                  onClick={exportOne}
                  aria-label="Export JSON"
                >
                  <Download />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hidden text-parchment hover:bg-white/10 sm:inline-flex"
                  onClick={() => window.print()}
                  aria-label="Print sheet"
                >
                  <Printer />
                </Button>
              </>
            )}
          </div>
          {creating ? (
            <nav className="mx-auto grid max-w-6xl grid-cols-6 px-1 sm:px-6">
              {CREATE_STEPS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goCreate(item.id)}
                  className={cn(
                    "h-12 border-b-2 px-1 text-center",
                    step === item.id
                      ? "border-parchment text-parchment"
                      : "border-transparent text-parchment/60 hover:text-parchment",
                  )}
                >
                  <span className="block text-[10px] tracking-wide uppercase sm:hidden">{i + 1}</span>
                  <span className="hidden text-sm font-medium sm:block">{item.label}</span>
                </button>
              ))}
            </nav>
          ) : spendMode ? (
            <nav className="mx-auto grid max-w-6xl grid-cols-5 px-1 sm:px-6">
              {SPEND_STEPS.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSpendStep(item.id)}
                  className={cn(
                    "h-12 border-b-2 px-1 text-center",
                    spendStep === item.id
                      ? "border-parchment text-parchment"
                      : "border-transparent text-parchment/60 hover:text-parchment",
                  )}
                >
                  <span className="block text-[10px] tracking-wide uppercase sm:hidden">{i + 1}</span>
                  <span className="hidden text-sm font-medium sm:block">{item.label}</span>
                </button>
              ))}
            </nav>
          ) : (
            <nav className="mx-auto grid max-w-6xl grid-cols-5 px-3 sm:px-6">
              {SHEET_TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goSheet(item.id)}
                  className={cn(
                    "h-11 border-b-2 text-sm font-medium",
                    tab === item.id
                      ? "border-parchment text-parchment"
                      : "border-transparent text-parchment/60 hover:text-parchment",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {creating ? (
            <Builder character={character} sections={[step]} />
          ) : spendMode ? (
            <Builder character={character} shop sections={[spendStep]} />
          ) : tab === "notes" ? (
            <Builder character={character} sections={["notes"]} showBudget={false} />
          ) : tab === "inventory" ? (
            <Builder character={character} sections={["inventory"]} showBudget={false} />
          ) : (
            <>
              {tab === "stats" ? (
                <div className="mb-5 space-y-5">
                  <IdentityHero character={character} />
                  <ResourceTrack character={character} />
                  <EssenceStrip
                    character={character}
                    onSpend={startSpend}
                    canSpend={canSpendEssence(character)}
                  />
                </div>
              ) : null}
              <SheetView character={character} sections={[sheetTab]} />
              {tab === "stats" ? (
                <div className="mt-5">
                  <RestStatus character={character} />
                </div>
              ) : null}
            </>
          )}
        </main>
        {creating ? (
          <div className="sticky bottom-0 z-20 border-t border-rule bg-parchment/95 px-4 py-3 backdrop-blur-sm no-print sm:px-6">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <Button variant="outline" disabled={!prev} onClick={() => prev && goCreate(prev.id)}>
                Back
              </Button>
              <p className="hidden text-sm text-muted sm:block">
                {s.remaining} Essence remaining of {s.budget}
              </p>
              {next ? (
                <Button onClick={() => goCreate(next.id)}>Next</Button>
              ) : (
                <Button onClick={openSheet}>
                  <ScrollText /> Open sheet
                </Button>
              )}
            </div>
          </div>
        ) : spendMode ? (
          <div className="sticky bottom-0 z-20 border-t border-rule bg-parchment/95 px-4 py-3 backdrop-blur-sm no-print sm:px-6">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={!spendPrev}
                onClick={() => spendPrev && setSpendStep(spendPrev.id)}
              >
                Back
              </Button>
              <p className="hidden text-sm text-muted sm:block">
                {s.remaining} Essence remaining of {s.budget}
              </p>
              {spendNext ? (
                <div className="flex items-center gap-2">
                  <Button onClick={() => setSpendStep(spendNext.id)}>Next</Button>
                  <Button onClick={lockSpend}>
                    <Lock /> Lock in
                  </Button>
                </div>
              ) : (
                <Button onClick={lockSpend}>
                  <Lock /> Lock in
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </DiceProvider>
  );
}

export function MissingCharacter() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-4 px-6">
      <HoldMark className="h-16 w-auto" decorative={false} />
      <h1 className="font-display text-3xl">Character not found</h1>
      <p className="text-muted">It may have been deleted, or this device does not have that record.</p>
      <Button asChild>
        <Link to="/" search={{ desk: "company" }}>
          Back to the Hold
        </Link>
      </Button>
    </div>
  );
}
