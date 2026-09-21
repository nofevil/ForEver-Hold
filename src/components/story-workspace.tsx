import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, ScrollText, Sword, Trash2, UserPlus } from "lucide-react";
import { HoldMark } from "@/components/mark";
import { Panel, StatChip } from "@/components/panel";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { relicQuality } from "@/lib/op20/campaign";
import { EPOCHS } from "@/lib/op20/catalogs";
import { derive } from "@/lib/op20/compute";
import { relicToGear } from "@/lib/op20/defaults";
import type { GameTable } from "@/lib/op20/types";
import { uid } from "@/lib/utils";
import { useCharacters } from "@/store/characters";

export function StoryWorkspace({ table: t }: { table: GameTable }) {
  const navigate = useNavigate();
  const store = useCharacters();
  const patch = (fn: (cur: GameTable) => GameTable) => store.updateTable(t.id, fn);
  const players = store.characters.filter((c) => t.playerIds.includes(c.id));
  const npcs = store.characters.filter((c) => t.npcIds.includes(c.id));
  const availablePlayers = store.characters.filter(
    (c) => c.role !== "npc" && !t.playerIds.includes(c.id) && !t.npcIds.includes(c.id),
  );
  const availableNpcs = store.characters.filter(
    (c) => c.role === "npc" && !t.npcIds.includes(c.id) && !t.playerIds.includes(c.id),
  );
  const listedRelics = store.relics.filter((r) => r.listed !== false);
  const unusedMobs = store.mobs.filter((m) => !t.encounter.some((e) => e.mobId === m.id));

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-leather-2/20 bg-leather text-parchment">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-6">
          <Link
            to="/"
            search={{ desk: "story" }}
            className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10"
            aria-label="Back to Story Master"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <HoldMark className="hidden size-7 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">{t.name || "Unnamed table"}</p>
            <p className="truncate text-xs text-parchment/70">
              {players.length} players · {npcs.length} SM characters · {t.encounter.length} hostiles
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <Panel title="Table">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Table name"
              value={t.name}
              onChange={(e) => patch((x) => ({ ...x, name: e.target.value }))}
            />
            <NativeSelect
              value={t.epoch || ""}
              onChange={(e) => patch((x) => ({ ...x, epoch: e.target.value }))}
            >
              <option value="">Epoch (optional)</option>
              {EPOCHS.filter((e) => e !== "Custom").map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </NativeSelect>
            <Textarea
              className="sm:col-span-2"
              rows={2}
              placeholder="Session notes"
              value={t.notes}
              onChange={(e) => patch((x) => ({ ...x, notes: e.target.value }))}
            />
          </div>
        </Panel>

        <Panel
          title="Players"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const c = store.create(100, "player");
                if (t.epoch) store.update(c.id, { epoch: t.epoch });
                patch((x) => ({ ...x, playerIds: [...x.playerIds, c.id] }));
                navigate({
                  to: "/c/$id",
                  params: { id: c.id },
                  search: { tab: "create", step: "identity" },
                });
              }}
            >
              <UserPlus /> New player
            </Button>
          }
        >
          {availablePlayers.length > 0 ? (
            <NativeSelect
              className="mb-3"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                e.target.value = "";
                if (!id) return;
                patch((x) => ({ ...x, playerIds: [...x.playerIds, id] }));
              }}
            >
              <option value="">Seat a character from the Company…</option>
              {availablePlayers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "Unnamed"}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <Roster
            ids={t.playerIds}
            onOpen={(id) =>
              navigate({ to: "/c/$id", params: { id }, search: { tab: "stats", step: "stats" } })
            }
            onDrop={(id) => patch((x) => ({ ...x, playerIds: x.playerIds.filter((p) => p !== id) }))}
            onGrant={(id, n) =>
              store.update(id, (cur) => ({ ...cur, earnedEssence: cur.earnedEssence + n }))
            }
          />
        </Panel>

        <Panel
          title="SM characters"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const c = store.create(100, "npc");
                store.update(c.id, {
                  name: "SM character",
                  role: "npc",
                  sheetOpened: true,
                  epoch: t.epoch || "",
                });
                patch((x) => ({ ...x, npcIds: [...x.npcIds, c.id] }));
                navigate({ to: "/c/$id", params: { id: c.id }, search: { tab: "stats", step: "stats" } });
              }}
            >
              <ScrollText /> New SM character
            </Button>
          }
        >
          {availableNpcs.length > 0 ? (
            <NativeSelect
              className="mb-3"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                e.target.value = "";
                if (!id) return;
                patch((x) => ({ ...x, npcIds: [...x.npcIds, id] }));
              }}
            >
              <option value="">Add an existing SM character…</option>
              {availableNpcs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "Unnamed"}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <Roster
            ids={t.npcIds}
            onOpen={(id) =>
              navigate({ to: "/c/$id", params: { id }, search: { tab: "stats", step: "stats" } })
            }
            onDrop={(id) => patch((x) => ({ ...x, npcIds: x.npcIds.filter((p) => p !== id) }))}
          />
        </Panel>

        <Panel
          title="Encounter"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const m = store.createMob();
                patch((x) => ({
                  ...x,
                  encounter: [
                    ...x.encounter,
                    { id: uid(), mobId: m.id, currentHits: m.hits, packSize: m.packSize, notes: "" },
                  ],
                }));
                navigate({ to: "/h/$id", params: { id: m.id } });
              }}
            >
              <Sword /> New hostile
            </Button>
          }
        >
          {unusedMobs.length > 0 ? (
            <NativeSelect
              className="mb-3"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                e.target.value = "";
                const m = store.mobs.find((x) => x.id === id);
                if (!m) return;
                patch((x) => ({
                  ...x,
                  encounter: [
                    ...x.encounter,
                    { id: uid(), mobId: m.id, currentHits: m.hits, packSize: m.packSize, notes: "" },
                  ],
                }));
              }}
            >
              <option value="">Add a hostile from the Hold…</option>
              {unusedMobs.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || "Unnamed"}
                </option>
              ))}
            </NativeSelect>
          ) : null}
          <div className="space-y-2">
            {t.encounter.map((entry) => {
              const m = store.mobs.find((x) => x.id === entry.mobId);
              if (!m) return null;
              return (
                <div key={entry.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-cream px-3 py-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => navigate({ to: "/h/$id", params: { id: m.id } })}
                  >
                    <div className="font-medium">{m.name || "Unnamed"}</div>
                    <div className="text-xs text-muted">
                      Acc {m.accuracy} · Dmg {m.damage} {m.damageType}
                    </div>
                  </button>
                  <div className="text-xs text-muted">Hits</div>
                  <Stepper
                    value={entry.currentHits}
                    min={0}
                    max={Math.max(entry.packSize, m.hits)}
                    onChange={(v) =>
                      patch((x) => ({
                        ...x,
                        encounter: x.encounter.map((e) =>
                          e.id === entry.id ? { ...e, currentHits: v } : e,
                        ),
                      }))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      patch((x) => ({
                        ...x,
                        encounter: x.encounter.filter((e) => e.id !== entry.id),
                      }))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              );
            })}
            {t.encounter.length === 0 ? (
              <p className="text-sm text-muted">No hostiles on the table.</p>
            ) : null}
          </div>
        </Panel>

        <Panel
          title="Loot"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const r = store.createRelic();
                patch((x) => ({
                  ...x,
                  loot: [
                    ...x.loot,
                    {
                      id: uid(),
                      relicId: r.id,
                      name: r.name || "Unnamed relic",
                      kind: r.kind,
                      notes: "",
                    },
                  ],
                }));
                navigate({ to: "/r/$id", params: { id: r.id } });
              }}
            >
              <Plus /> New relic
            </Button>
          }
        >
          {listedRelics.length > 0 ? (
            <NativeSelect
              className="mb-3"
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                e.target.value = "";
                const r = listedRelics.find((x) => x.id === id);
                if (!r) return;
                patch((x) => ({
                  ...x,
                  loot: [
                    ...x.loot,
                    { id: uid(), relicId: r.id, name: r.name || "Unnamed relic", kind: r.kind, notes: "" },
                  ],
                }));
              }}
            >
              <option value="">List a relic from the Hold…</option>
              {listedRelics.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || "Unnamed"} · {relicQuality(r)} {r.kind}
                </option>
              ))}
            </NativeSelect>
          ) : null}

          <div className="space-y-2">
            {t.loot.map((loot) => {
              const relic = loot.relicId ? store.relics.find((r) => r.id === loot.relicId) : undefined;
              const awarded = loot.awardedToId
                ? store.characters.find((c) => c.id === loot.awardedToId)
                : undefined;
              return (
                <div key={loot.id} className="rounded-2xl bg-cream p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{relic?.name || loot.name}</div>
                      <div className="text-xs text-muted">
                        {relic ? `${relicQuality(relic)} ${relic.kind}` : loot.kind}
                        {awarded ? ` · given to ${awarded.name || "Unnamed"}` : " · in the world"}
                      </div>
                    </div>
                    {!loot.awardedToId ? (
                      <NativeSelect
                        className="w-48"
                        defaultValue=""
                        onChange={(e) => {
                          const cid = e.target.value;
                          e.target.value = "";
                          if (!cid || !relic) return;
                          store.update(cid, (cur) => ({
                            ...cur,
                            items: [...cur.items, relicToGear(relic)],
                          }));
                          patch((x) => ({
                            ...x,
                            loot: x.loot.map((l) =>
                              l.id === loot.id ? { ...l, awardedToId: cid } : l,
                            ),
                          }));
                        }}
                      >
                        <option value="">Give to…</option>
                        {[...players, ...npcs].map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || "Unnamed"}
                          </option>
                        ))}
                      </NativeSelect>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => patch((x) => ({ ...x, loot: x.loot.filter((l) => l.id !== loot.id) }))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              );
            })}
            {t.loot.length === 0 ? (
              <p className="text-sm text-muted">No loot listed for this table.</p>
            ) : null}
          </div>
        </Panel>
      </main>
    </div>
  );
}

function Roster({
  ids,
  onOpen,
  onDrop,
  onGrant,
}: {
  ids: string[];
  onOpen: (id: string) => void;
  onDrop: (id: string) => void;
  onGrant?: (id: string, n: number) => void;
}) {
  const characters = useCharacters((s) => s.characters);
  if (ids.length === 0) {
    return <p className="text-sm text-muted">None seated.</p>;
  }
  return (
    <div className="space-y-2">
      {ids.map((id) => {
        const c = characters.find((x) => x.id === id);
        if (!c) return null;
        const d = derive(c);
        return (
          <div key={id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-cream px-3 py-2">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(id)}>
              <div className="font-medium">{c.name || "Unnamed"}</div>
              <div className="text-xs text-muted">
                Life {c.tracker.currentHealth}/{d.healthMax} · {d.furyLabel ? "Fury" : "DP"}{" "}
                {c.tracker.currentDp}/{d.dpMax} · CP {c.tracker.currentCp}/{d.combatPool}
              </div>
            </button>
            {onGrant ? (
              <Button size="sm" variant="outline" onClick={() => onGrant(id, 5)}>
                +5 ess
              </Button>
            ) : null}
            <StatChip label="Avail" value={c.startingEssence + c.earnedEssence} />
            <Button variant="ghost" size="icon-sm" onClick={() => onDrop(id)}>
              <Trash2 />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
