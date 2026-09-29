import { Link, useNavigate } from "@tanstack/react-router";
import { Copy, Download, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { HoldMark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { APP_NAME, APP_TAGLINE, EXPORT_FILENAME } from "@/lib/brand";
import { derive, totalEssence } from "@/lib/op20/compute";
import { sampleRoster } from "@/lib/op20/samples";
import { useCharacters } from "@/store/characters";

export function Roster() {
  const navigate = useNavigate();
  const { characters, create, remove, duplicate, replaceAll, seedSamples } = useCharacters();
  const [starting, setStarting] = useState(100);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onCreate = () => {
    const c = create(starting);
    setOpen(false);
    navigate({ to: "/c/$id", params: { id: c.id }, search: { tab: "create", step: "identity" } });
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(characters, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = EXPORT_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text) as unknown;
      const list = Array.isArray(data) ? data : [data];
      if (list.every((x) => x && typeof x === "object" && "id" in x && "attributes" in x)) {
        replaceAll(list as typeof characters);
      }
    } catch {
      /* ignore malformed */
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <HoldMark className="h-16 w-auto shrink-0 sm:h-20" decorative={false} />
          <div>
            <h1 className="font-display text-4xl leading-none text-ink sm:text-5xl">{APP_NAME}</h1>
            <p className="mt-2 max-w-md text-muted">{APP_TAGLINE}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportAll} disabled={characters.length === 0}>
            <Download /> Export
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => onImport(e.target.files?.[0])}
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> New character
              </Button>
            </DialogTrigger>
            <DialogContent title="New character" className="space-y-4">
              <p className="text-sm text-muted">Starting Essence sets the budget. You can earn more later.</p>
              <NativeSelect value={starting} onChange={(e) => setStarting(Number(e.target.value))}>
                <option value={0}>0 — Zero start</option>
                <option value={50}>50 — Gritty / OSR</option>
                <option value={100}>100 — Standard</option>
              </NativeSelect>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Custom</span>
                <Input
                  type="number"
                  min={0}
                  className="w-28"
                  value={starting}
                  onChange={(e) => setStarting(Number(e.target.value) || 0)}
                />
              </div>
              <Button className="w-full" onClick={onCreate}>
                Open builder
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {characters.length === 0 ? (
        <EmptyState
          onCreate={() => setOpen(true)}
          onSamples={() => {
            seedSamples();
            if (useCharacters.getState().characters.length === 0) {
              replaceAll(sampleRoster());
            }
          }}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {characters.map((c) => {
            const d = derive(c);
            const total = totalEssence(c);
            return (
              <li key={c.id}>
                <article className="ornament-frame group rounded-[28px] p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5">
                  <Link
                    to="/c/$id"
                    params={{ id: c.id }}
                    search={
                      c.sheetOpened === false
                        ? { tab: "create", step: "identity" }
                        : { tab: "stats", step: "stats" }
                    }
                    className="block"
                  >
                    <p className="text-xs tracking-wide text-burgundy uppercase">{c.profession || "Unassigned"}</p>
                    <h2 className="font-display text-2xl text-ink">{c.name || "Unnamed"}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{c.bio || "No biography yet."}</p>
                    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <Mini label="Total Essence" value={total} />
                      <Mini label="Health" value={d.healthMax} />
                      <Mini label="DP" value={d.dpMax} />
                    </dl>
                  </Link>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => duplicate(c.id)}
                    >
                      <Copy /> Duplicate
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      onClick={() => {
                        if (confirm(`Delete ${c.name || "this character"}?`)) remove(c.id);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-auto pt-12 text-center text-sm text-muted">A companion for OP20.</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-cream py-2">
      <div className="text-[10px] tracking-wide text-muted uppercase">{label}</div>
      <div className="font-display text-lg tabular-nums">{value}</div>
    </div>
  );
}

function EmptyState({ onCreate, onSamples }: { onCreate: () => void; onSamples: () => void }) {
  return (
    <div className="ornament-frame flex flex-col items-start gap-4 rounded-[28px] p-8">
      <h2 className="font-display text-2xl">The Hold stands empty</h2>
      <p className="max-w-lg text-muted">
        Start a Zero, 50, or 100 Essence character. Essence buys attributes (3ST), Weapon Proficiency (5ST),
        Demesne (10ST), Tricks (3ST), and extra Health.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onCreate}>
          <Plus /> Create character
        </Button>
        <Button variant="outline" onClick={onSamples}>
          Load sample survivors
        </Button>
      </div>
    </div>
  );
}
