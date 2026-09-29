import { Link, useNavigate } from "@tanstack/react-router";
import { Copy, Download, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { HoldMark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { CampaignHall } from "@/components/campaign-hall";
import { SignInAsk, useAccountPhase } from "@/components/sign-in-ask";
import { UserButton } from "@/lib/auth/gates";
import {
  mobThreat,
  relicQuality,
  relicSpend,
} from "@/lib/op20/campaign";
import { APP_NAME, APP_TAGLINE, EXPORT_FILENAME } from "@/lib/brand";
import { derive, totalEssence } from "@/lib/op20/compute";
import type { Desk } from "@/lib/op20/types";
import { useCharacters } from "@/store/characters";
import { cn } from "@/lib/utils";

const DESKS: { id: "company" | "relics" | "story"; label: string; hint: string }[] = [
  { id: "company", label: "Company", hint: "Characters" },
  { id: "relics", label: "Relics", hint: "Items" },
  { id: "story", label: "Story Master", hint: "Table" },
];

const ASK: Record<Desk, string> = {
  company: "Sign in to open the company",
  relics: "Sign in to open relics",
  hostiles: "Sign in to open hostiles",
  story: "Sign in to open a table",
  keels: "Sign in to open the Hold",
};

type PendingDelete = {
  kind: "character" | "relic" | "mob" | "airship" | "table";
  id: string;
  name: string;
};

export function Desk({ desk }: { desk: Desk }) {
  const navigate = useNavigate();
  const store = useCharacters();
  const phase = useAccountPhase();
  const [starting, setStarting] = useState(100);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(store.exportPayload(), null, 2)], {
      type: "application/json",
    });
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
      store.importCampaign(JSON.parse(text));
    } catch {
      /* ignore malformed */
    }
  };

  const empty =
    store.characters.length + store.relics.length + store.mobs.length + store.tables.length === 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-16 pt-8 sm:px-6">
      <header className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <HoldMark className="h-16 w-auto shrink-0 sm:h-20" decorative={false} />
          <div>
            <h1 className="font-display text-4xl leading-none text-ink sm:text-5xl">{APP_NAME}</h1>
            <p className="mt-2 max-w-md text-muted">{APP_TAGLINE}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {phase === "loading" ? (
            <div className="h-11 w-28 rounded-xl bg-parchment-2" />
          ) : phase === "out" ? (
            <Button asChild variant="outline">
              <Link to="/login" search={{ from: desk }}>
                Sign in
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={exportAll} disabled={empty}>
                <Download /> Export
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload /> Import
              </Button>
              <UserButton />
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => onImport(e.target.files?.[0])}
              />
            </>
          )}
        </div>
        </div>
      </header>

      <nav className="mb-6 grid grid-cols-3 gap-1 rounded-2xl bg-parchment-2 p-1">
        {DESKS.map((d) => (
          <Link
            key={d.id}
            to="/"
            search={{ desk: d.id }}
            className={cn(
              "flex h-11 flex-col items-center justify-center rounded-xl text-center leading-none",
              desk === d.id ? "bg-leather text-parchment" : "text-ink-soft hover:bg-cream",
            )}
          >
            <span className="text-[13px] font-medium whitespace-nowrap sm:text-sm">{d.label}</span>
            <span className={cn("text-[10px] tracking-wide uppercase", desk === d.id ? "text-parchment/70" : "text-muted")}>
              {d.hint}
            </span>
          </Link>
        ))}
      </nav>

      {phase !== "in" ? (
        phase === "out" ? (
          <SignInAsk title={ASK[desk]} from={desk} />
        ) : (
          <div className="ornament-frame h-40 rounded-[28px]" />
        )
      ) : desk === "story" ? (
        <CampaignHall />
      ) : empty ? (
        <EmptyState
          onCreate={() => {
            if (desk === "company") setOpen(true);
            else if (desk === "relics") {
              const r = store.createRelic();
              navigate({ to: "/r/$id", params: { id: r.id } });
            } else if (desk === "hostiles") {
              navigate({ to: "/h/$id", params: { id: "new" }, search: { table: "" } });
            } else {
              const t = store.createTable();
              navigate({ to: "/t/$id", params: { id: t.id } });
            }
          }}
          onSamples={() => store.seedSamples()}
          desk={desk}
        />
      ) : (
        <>
          <DeskList desk={desk} onDelete={setPendingDelete} />
          <div className="mt-4">
            {desk === "company" ? (
              <Button onClick={() => setOpen(true)}>
                <Plus /> New character
              </Button>
            ) : desk === "relics" ? (
              <Button
                onClick={() => {
                  const r = store.createRelic();
                  navigate({ to: "/r/$id", params: { id: r.id } });
                }}
              >
                <Plus /> New relic
              </Button>
            ) : desk === "hostiles" ? (
              <Button
                onClick={() => {
                  navigate({ to: "/h/$id", params: { id: "new" }, search: { table: "" } });
                }}
              >
                <Plus /> New hostile
              </Button>
            ) : (
              <Button
                onClick={() => {
                  const t = store.createTable();
                  navigate({ to: "/t/$id", params: { id: t.id } });
                }}
              >
                <Plus /> New table
              </Button>
            )}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
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
          <Button
            className="w-full"
            onClick={() => {
              const c = store.create(starting);
              setOpen(false);
              navigate({ to: "/c/$id", params: { id: c.id }, search: { tab: "create", step: "identity" } });
            }}
          >
            Start creation
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDelete != null} onOpenChange={(v) => !v && setPendingDelete(null)}>
        <DialogContent title="Delete from the Hold?" className="space-y-4">
          <p className="text-sm text-muted">
            Delete {pendingDelete?.name || "this record"}? This cannot be undone on this device.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Keep
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!pendingDelete) return;
                const { kind, id } = pendingDelete;
                if (kind === "character") store.remove(id);
                else if (kind === "relic") store.removeRelic(id);
                else if (kind === "mob") store.removeMob(id);
                else if (kind === "airship") store.removeAirship(id);
                else store.removeTable(id);
                setPendingDelete(null);
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeskList({
  desk,
  onDelete,
}: {
  desk: Desk;
  onDelete: (item: PendingDelete) => void;
}) {
  const store = useCharacters();

  if (desk === "company") {
    if (store.characters.length === 0) {
      return <Quiet hint="No characters in the Hold yet." />;
    }
    return (
      <ul className="grid gap-4 sm:grid-cols-2">
        {store.characters.map((c) => {
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
                  <p className="text-xs tracking-wide text-burgundy uppercase">
                    {c.sheetOpened === false ? "In creation" : c.profession || "Unassigned"}
                  </p>
                  <h2 className="font-display text-2xl text-ink">{c.name || "Unnamed"}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{c.bio || "No biography yet."}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Mini label="Total Essence" value={total} />
                    <Mini label="Health" value={d.healthMax} />
                    <Mini label="DP" value={d.dpMax} />
                  </dl>
                </Link>
                <RowActions
                  onDup={() => store.duplicate(c.id)}
                  onDel={() =>
                    onDelete({ kind: "character", id: c.id, name: c.name || "Unnamed" })
                  }
                />
              </article>
            </li>
          );
        })}
      </ul>
    );
  }

  if (desk === "relics") {
    if (store.relics.length === 0) return <Quiet hint="No relics on the shelf." />;
    return (
      <ul className="grid gap-4 sm:grid-cols-2">
        {store.relics.map((r) => {
          const s = relicSpend(r);
          const q = relicQuality(r);
          return (
            <li key={r.id}>
              <article className="ornament-frame rounded-[28px] p-5">
                <Link to="/r/$id" params={{ id: r.id }} className="block">
                  <p className="text-xs tracking-wide text-burgundy uppercase">
                    {q} · {r.kind}
                  </p>
                  <h2 className="font-display text-2xl text-ink">{r.name || "Unnamed relic"}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{r.bio || "No description yet."}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Mini label="Essence" value={s.spent} />
                    <Mini label="Damage" value={r.wv} />
                    <Mini label="DP" value={r.demesnes.length ? r.demesnes[0].tier : 0} />
                  </dl>
                </Link>
                <RowActions
                  onDup={() => store.duplicateRelic(r.id)}
                  onDel={() =>
                    onDelete({ kind: "relic", id: r.id, name: r.name || "Unnamed relic" })
                  }
                />
              </article>
            </li>
          );
        })}
      </ul>
    );
  }

  if (desk === "hostiles") {
    if (store.mobs.length === 0) return <Quiet hint="No hostiles on the table." />;
    return (
      <ul className="grid gap-4 sm:grid-cols-2">
        {store.mobs.map((m) => (
          <li key={m.id}>
            <article className="ornament-frame rounded-[28px] p-5">
              <Link to="/h/$id" params={{ id: m.id }} search={{ table: "" }} className="block">
                <p className="text-xs tracking-wide text-burgundy uppercase">
                  {m.kind === "named" ? "Named" : `${mobThreat(m)} · Mob`}
                </p>
                <h2 className="font-display text-2xl text-ink">{m.name || "Unnamed"}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{m.bio || m.special || "No notes."}</p>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Acc" value={m.accuracy} signed />
                  <Mini label="Hits" value={m.hits} />
                  <Mini label="Dmg" value={m.damage} />
                </dl>
              </Link>
              <RowActions
                onDup={() => store.duplicateMob(m.id)}
                onDel={() =>
                  onDelete({ kind: "mob", id: m.id, name: m.name || "Unnamed" })
                }
              />
            </article>
          </li>
        ))}
      </ul>
    );
  }

  if (store.tables.length === 0) return <Quiet hint="No table is set. The Story Master has not sat down." />;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {store.tables.map((t) => (
        <li key={t.id}>
          <article className="ornament-frame rounded-[28px] p-5">
            <Link to="/t/$id" params={{ id: t.id }} className="block">
              <p className="text-xs tracking-wide text-burgundy uppercase">Story Master</p>
              <h2 className="font-display text-2xl text-ink">{t.name || "Unnamed table"}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted">{t.notes || "No session notes."}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="Players" value={t.playerIds.length} />
                <Mini label="Hostiles" value={t.encounter.length} />
                <Mini label="Loot" value={t.loot.length} />
              </dl>
            </Link>
            <RowActions
              onDup={() => {
                const copy = store.createTable();
                store.updateTable(copy.id, {
                  name: t.name ? `${t.name} (copy)` : "Unnamed table",
                  notes: t.notes,
                });
              }}
              onDel={() =>
                onDelete({ kind: "table", id: t.id, name: t.name || "Unnamed table" })
              }
            />
          </article>
        </li>
      ))}
    </ul>
  );
}

function RowActions({ onDup, onDel }: { onDup: () => void; onDel: () => void }) {
  return (
    <div className="mt-4 flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDup();
        }}
      >
        <Copy /> Duplicate
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-danger"
        aria-label="Delete"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDel();
        }}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function Mini({
  label,
  value,
  signed,
}: {
  label: string;
  value: number;
  signed?: boolean;
}) {
  const shown = signed && value > 0 ? `+${value}` : value;
  return (
    <div className="rounded-2xl bg-cream py-2">
      <div className="text-[10px] tracking-wide text-muted uppercase">{label}</div>
      <div className="font-display text-lg tabular-nums">{shown}</div>
    </div>
  );
}

function Quiet({ hint }: { hint: string }) {
  return (
    <div className="ornament-frame rounded-[28px] p-8 text-muted">
      <p>{hint}</p>
    </div>
  );
}

function EmptyState({
  onCreate,
  onSamples,
  desk,
}: {
  onCreate: () => void;
  onSamples: () => void;
  desk: Desk;
}) {
  const label =
    desk === "company"
      ? "character"
      : desk === "relics"
        ? "relic"
        : desk === "hostiles"
          ? "hostile"
          : desk === "story"
            ? "table"
            : "character";
  return (
    <div className="ornament-frame flex flex-col items-start gap-4 rounded-[28px] p-8">
      <h2 className="font-display text-2xl">The Hold stands empty</h2>
      <p className="max-w-lg text-muted">
        Start a Zero, 50, or 100 Essence character, or a relic. Essence follows the
        Step chart. Load the sample survivors, Pummeling Eruption, Swarm, and The Random Few to see the
        math.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onCreate}>
          <Plus /> Create {label}
        </Button>
        <Button variant="outline" onClick={onSamples}>
          Load sample company
        </Button>
      </div>
    </div>
  );
}
