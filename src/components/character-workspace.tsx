import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, Lock, Printer, ScrollText, Sparkles } from "lucide-react";
import { useState } from "react";
import { Builder, type BuilderSection } from "@/components/builder";
import { DiceButton, DiceProvider } from "@/components/dice";
import { HoldMark } from "@/components/mark";
import { PlayTracker } from "@/components/play-tracker";
import { SheetView, type SheetSection } from "@/components/sheet-view";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { spend } from "@/lib/op20/compute";
import type { Character } from "@/lib/op20/types";
import { useCharacters } from "@/store/characters";
import { cn } from "@/lib/utils";

export const CREATE_STEPS: { id: BuilderSection; label: string; hint: string }[] = [
  { id: "identity", label: "Identity", hint: "Name and budget" },
  { id: "stats", label: "Stats", hint: "Attributes" },
  { id: "combat", label: "Combat", hint: "Weapons and tricks" },
  { id: "demesne", label: "Demesne", hint: "Courts and DP" },
  { id: "inventory", label: "Inventory", hint: "Gear and notes" },
];

export const SHEET_TABS: { id: BuilderSection; label: string }[] = [
  { id: "stats", label: "Stats" },
  { id: "combat", label: "Combat" },
  { id: "demesne", label: "Demesne" },
  { id: "inventory", label: "Inventory" },
];

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
  const editing = creating || spendMode;

  const goCreate = (next: BuilderSection) =>
    navigate({ to: "/c/$id", params: { id: character.id }, search: { tab: "create", step: next } });

  const goSheet = (next: BuilderSection) =>
    navigate({ to: "/c/$id", params: { id: character.id }, search: { tab: next, step: next } });

  const openSheet = () => {
    update(character.id, (cur) => ({ ...cur, sheetOpened: true }));
    setSpendMode(false);
    navigate({ to: "/c/$id", params: { id: character.id }, search: { tab: "stats", step: "stats" } });
  };

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
            <HoldMark className="hidden size-7 sm:block" />
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
            <div className="hidden items-center sm:flex">
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-display text-lg tabular-nums",
                  s.remaining <= 0 ? "bg-burgundy text-parchment" : "bg-white/10 text-parchment",
                )}
              >
                {s.remaining}
                <span className="ml-1 text-xs font-sans tracking-wide uppercase opacity-70">ess</span>
              </span>
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
                    onClick={() => setSpendMode(false)}
                  >
                    <Lock /> Lock in
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-parchment text-ink hover:bg-cream"
                    onClick={() => setSpendMode(true)}
                  >
                    <Sparkles /> Spend Essence
                  </Button>
                )}
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
            <nav className="mx-auto grid max-w-6xl grid-cols-5 px-1 sm:px-6">
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
          ) : (
            <nav className="mx-auto grid max-w-6xl grid-cols-4 px-3 sm:px-6">
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
          ) : editing ? (
            <Builder
              character={character}
              sections={tab === "stats" ? ["identity", "stats"] : [tab as BuilderSection]}
            />
          ) : (
            <>
              <SheetView
                character={character}
                sections={[sheetTab]}
                onSpend={sheetTab === "stats" ? () => setSpendMode(true) : undefined}
              />
              {tab === "combat" ? (
                <div className="mt-5">
                  <PlayTracker character={character} />
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
              <p className="text-sm text-muted">
                {s.remaining} Essence remaining. Plus buttons stay open until you lock in.
              </p>
              <Button onClick={() => setSpendMode(false)}>
                <Lock /> Lock in purchases
              </Button>
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
      <HoldMark className="size-10 text-burgundy" />
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
