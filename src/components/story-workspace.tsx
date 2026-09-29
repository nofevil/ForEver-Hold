import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus, ScrollText, Sword, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { HoldMark } from "@/components/mark";
import { Panel, StatChip } from "@/components/panel";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { MenuSelect } from "@/components/ability-select";
import { listSeats, saveHold, sitDown, upsertCampaign, type SeatView } from "@/lib/campaigns.functions";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { makeJoinCode } from "@/lib/join-code";
import { encounterHasStanding, expandEncounterEntry, relicQuality, standingMobTargets } from "@/lib/op20/campaign";
import { EPOCHS } from "@/lib/op20/catalogs";
import { derive, spend, totalEssence } from "@/lib/op20/compute";
import { relicToGear } from "@/lib/op20/defaults";
import type { EncounterCreature, EncounterEntry, GameTable, Mob } from "@/lib/op20/types";
import { uid } from "@/lib/utils";
import { useCharacters } from "@/store/characters";

export function StoryWorkspace({ table: t }: { table: GameTable }) {
  const navigate = useNavigate();
  const store = useCharacters();
  const { user } = useCurrentUserState();
  const [seats, setSeats] = useState<SeatView[]>([]);
  const [seatId, setSeatId] = useState("");
  const [seatError, setSeatError] = useState("");
  const [pickMobId, setPickMobId] = useState("");
  const patch = (fn: (cur: GameTable) => GameTable) => store.updateTable(t.id, fn);
  const seatable = store.characters;
  const npcs = store.characters.filter((c) => t.npcIds.includes(c.id));
  const company = store.characters.filter(
    (c) => c.role !== "npc" && !t.npcIds.includes(c.id),
  );
  const availableNpcs = store.characters.filter(
    (c) => c.role === "npc" && !t.npcIds.includes(c.id),
  );
  const listedRelics = store.relics.filter((r) => r.listed !== false);
  const unusedMobs = store.mobs.filter((m) => !t.encounter.some((e) => e.mobId === m.id));
  const stagedMob = unusedMobs.find((m) => m.id === pickMobId);
  const epoch = t.epoch.trim();
  const mobTargets = standingMobTargets(t.encounter, store.mobs);
  const orderedEncounter = [...t.encounter].sort(
    (a, b) => Number(!encounterHasStanding(a)) - Number(!encounterHasStanding(b)),
  );
  const code = (t.joinCode || "").toUpperCase();

  useEffect(() => {
    let joinCode = t.joinCode;
    if (!joinCode) {
      joinCode = makeJoinCode();
      patch((x) => ({ ...x, joinCode }));
    }
    if (!user) return;
    void upsertCampaign({
      data: { id: t.id, name: t.name, joinCode, epoch: t.epoch, notes: t.notes },
    }).catch(() => {});
  }, [t.id, t.joinCode, t.name, t.epoch, t.notes, user?.id]);

  const refreshSeats = () => {
    if (!user) return;
    void listSeats({ data: { campaignId: t.id } })
      .then(setSeats)
      .catch(() => {});
  };

  useEffect(() => {
    refreshSeats();
    const timer = window.setInterval(refreshSeats, 8000);
    return () => window.clearInterval(timer);
  }, [t.id, user?.id]);

  const addCompanyCharacter = (id: string) => {
    store.update(id, (cur) => ({
      ...cur,
      role: "npc",
      epoch: cur.epoch || epoch,
    }));
    patch((x) => ({ ...x, npcIds: x.npcIds.includes(id) ? x.npcIds : [...x.npcIds, id] }));
  };

  const addHostile = (m: Mob) => {
    patch((x) =>
      x.encounter.some((e) => e.mobId === m.id)
        ? x
        : { ...x, encounter: [...x.encounter, trackHostile(m)] },
    );
  };

  const sit = async () => {
    setSeatError("");
    try {
      await saveHold({ data: useCharacters.getState().exportPayload() });
      await sitDown({ data: { code, characterId: seatId } });
      refreshSeats();
    } catch (err) {
      setSeatError(err instanceof Error ? err.message : "Could not sit down.");
    }
  };

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
          <HoldMark light className="hidden h-11 w-auto sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">{t.name || "Unnamed table"}</p>
            <p className="truncate text-xs text-parchment/70">
              {seats.length} seated · {npcs.length} SM characters · {t.encounter.length} hostiles
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
            <Input
              list={`epochs-${t.id}`}
              placeholder="Epoch — pick one or name a new one"
              value={t.epoch}
              onChange={(e) => patch((x) => ({ ...x, epoch: e.target.value }))}
            />
            <datalist id={`epochs-${t.id}`}>
              {EPOCHS.filter((e) => e !== "Custom").map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
            <Textarea
              className="sm:col-span-2"
              rows={2}
              placeholder="Session notes"
              value={t.notes}
              onChange={(e) => patch((x) => ({ ...x, notes: e.target.value }))}
            />
          </div>
        </Panel>

        <Panel title="Players">
          <p className="text-xs tracking-wide text-muted uppercase">Join code</p>
          <p className="font-display text-4xl tracking-[0.2em]">{code || "——"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!code}
              onClick={() => void navigator.clipboard.writeText(code)}
            >
              Copy code
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted">
            Players sign in and enter this code to sit a character from their account. You can sit your own the same way.
          </p>
          {user ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1 text-xs tracking-wide text-muted uppercase">
                Your character
                <NativeSelect className="mt-1" value={seatId} onChange={(e) => setSeatId(e.target.value)}>
                  <option value="">Choose…</option>
                  {seatable.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || "Unnamed"}
                      {c.role === "npc" ? " (SM)" : ""}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <Button disabled={!seatId || !code} onClick={() => void sit()}>
                Sit down
              </Button>
            </div>
          ) : (
            <Button asChild className="mt-4" variant="outline">
              <Link to="/login" search={{ from: "story" }}>
                Sign in to sit a character
              </Link>
            </Button>
          )}
          {seatError ? <p className="mt-2 text-sm text-danger">{seatError}</p> : null}
          <div className="mt-4 space-y-2">
            {seats.map((seat) => (
              <div key={seat.userId} className="rounded-2xl bg-cream px-3 py-2">
                <div className="font-medium">
                  {seat.name}
                  {seat.userId === user?.id ? " · you" : ""}
                </div>
                <div className="text-xs text-muted">
                  {seat.profession || "Unassigned"} · Life {seat.health}/{seat.healthMax} · DP {seat.dp}/{seat.dpMax}
                </div>
                {seat.userId === user?.id ? (
                  <label className="mt-2 block text-xs tracking-wide text-muted uppercase">
                    Target
                    <NativeSelect
                      className="mt-1"
                      value={
                        store.characters.find((c) => c.id === seat.characterId)?.tracker.targetId ?? ""
                      }
                      onChange={(e) =>
                        store.update(seat.characterId, (cur) => ({
                          ...cur,
                          tracker: { ...cur.tracker, targetId: e.target.value },
                        }))
                      }
                    >
                      <option value="">No one</option>
                      {seats
                        .filter((other) => other.characterId !== seat.characterId)
                        .map((other) => (
                          <option key={other.characterId} value={other.characterId}>
                            {other.name}
                          </option>
                        ))}
                      {mobTargets.map((mob) => (
                        <option key={mob.id} value={mob.id}>
                          {mob.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                ) : seat.targetId ? (
                  <p className="mt-1 text-xs text-muted">
                    Targeting{" "}
                    {seats.find((other) => other.characterId === seat.targetId)?.name ??
                      mobTargets.find((mob) => mob.id === seat.targetId)?.name ??
                      "someone"}
                  </p>
                ) : null}
              </div>
            ))}
            {seats.length === 0 ? <p className="text-sm text-muted">No one is seated yet.</p> : null}
          </div>
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
          {company.length > 0 ? (
            <div className="mb-3">
              <p className="mb-2 text-sm text-muted">
                Adding a company character makes them an SM character. To play your own, sit them with the join code instead.
              </p>
              <div className="flex flex-wrap gap-2">
                {company.map((c) => (
                  <Button key={c.id} size="sm" variant="outline" onClick={() => addCompanyCharacter(c.id)}>
                    Add {c.name || "Unnamed"}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
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
                navigate({ to: "/h/$id", params: { id: "new" }, search: { table: t.id } });
              }}
            >
              <Sword /> New hostile
            </Button>
          }
        >
          <div className="mb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <MenuSelect
                className="min-w-0 flex-1"
                value={stagedMob ? pickMobId : ""}
                placeholder={unusedMobs.length === 0 ? "No hostiles in the Hold yet" : "Choose a hostile…"}
                options={unusedMobs.map((m) => ({
                  value: m.id,
                  label: m.name || "Unnamed",
                  onDelete: () => {
                    if (pickMobId === m.id) setPickMobId("");
                    store.removeMob(m.id);
                    for (const table of store.tables) {
                      if (!table.encounter.some((e) => e.mobId === m.id)) continue;
                      store.updateTable(table.id, (x) => ({
                        ...x,
                        encounter: x.encounter.filter((e) => e.mobId !== m.id),
                      }));
                    }
                  },
                }))}
                onChange={setPickMobId}
              />
              <Button
                className="w-full shrink-0 sm:w-auto"
                disabled={!stagedMob}
                onClick={() => {
                  if (!stagedMob) return;
                  addHostile(stagedMob);
                  setPickMobId("");
                }}
              >
                Add MOB
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {orderedEncounter.map((raw) => {
              const m = store.mobs.find((x) => x.id === raw.mobId);
              if (!m) return null;
              const entry = raw.creatures ? raw : expandEncounterEntry(raw, m);
              const creatures = entry.creatures ?? [];
              const defeated = entry.defeated ?? [];
              const accuracy = entry.accuracy ?? m.accuracy;
              const damage = entry.damage ?? m.damage;
              const movement = entry.movement ?? m.movement;
              const pack = entry.packSize ?? m.packSize;
              const fullHits = Math.max(1, m.hits);
              const setHits = (creatureId: string, next: number) => {
                patch((x) => ({
                  ...x,
                  encounter: x.encounter.map((e) => {
                    if (e.id !== entry.id) return e;
                    const living = e.creatures ?? creatures;
                    const fallenBin = e.defeated ?? [];
                    if (next > 0) {
                      return {
                        ...e,
                        creatures: living.map((c) =>
                          c.id === creatureId ? { ...c, currentHits: next } : c,
                        ),
                        defeated: fallenBin,
                      };
                    }
                    const fallen = living.find((c) => c.id === creatureId);
                    if (!fallen) return e;
                    const nextDefeated = [...fallenBin, { ...fallen, currentHits: 0 }];
                    let standing = living.filter((c) => c.id !== creatureId);
                    if (pack === 0) {
                      const mark =
                        Math.max(0, ...standing.map((c) => c.mark), ...nextDefeated.map((c) => c.mark)) + 1;
                      standing = [...standing, { id: uid(), currentHits: fullHits, mark }];
                    }
                    return { ...e, creatures: standing, defeated: nextDefeated };
                  }),
                }));
              };
              return (
                <div key={entry.id} className="rounded-2xl bg-cream p-3">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() =>
                        navigate({ to: "/h/$id", params: { id: m.id }, search: { table: t.id } })
                      }
                    >
                      <div className="font-medium">{m.name || "Unnamed"}</div>
                      <div className="text-xs text-muted">
                        {m.damageType || "Physical"}
                        {m.kind === "named" ? " · Named" : ""}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove hostile"
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
                  <p className="mt-2 text-sm text-ink-soft">
                    Accuracy {accuracy} · Damage {damage} · Move {movement}
                    {" · "}
                    {pack === 0 ? "Endless trickle" : `Pack ${pack}`}
                  </p>
                  {m.special ? <p className="mt-1 text-sm text-muted">{m.special}</p> : null}
                  <div className="mt-3 space-y-2">
                    {creatures.length === 0 ? (
                      <p className="text-sm text-muted">None standing.</p>
                    ) : (
                      creatures.map((c) => (
                        <Tracked key={c.id} label={pack === 1 ? "Hits" : `Hits · ${c.mark}`}>
                          <Stepper
                            className="shrink-0 justify-start"
                            value={c.currentHits}
                            min={0}
                            max={Math.max(fullHits, c.currentHits)}
                            onChange={(v) => setHits(c.id, v)}
                          />
                        </Tracked>
                      ))
                    )}
                  </div>
                  {defeated.length > 0 ? (
                    <div className="mt-3 border-t border-rule pt-2">
                      <div className="text-xs tracking-wide text-muted uppercase">Defeated</div>
                      <ul className="mt-1 space-y-0.5">
                        {defeated.map((c) => (
                          <li key={c.id} className="text-sm text-muted">
                            {m.name || "Unnamed"}
                            {pack === 1 ? "" : ` ${c.mark}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {t.encounter.length === 0 ? <p className="text-sm text-muted">No hostiles on the table.</p> : null}
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
                if (epoch) store.updateRelic(r.id, { epoch });
                patch((x) => ({
                  ...x,
                  loot: [
                    ...x.loot,
                    { id: uid(), relicId: r.id, name: r.name || "Unnamed relic", kind: r.kind, notes: "" },
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
                        {relic?.epoch ? `${relic.epoch} · ` : ""}
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
                            loot: x.loot.map((l) => (l.id === loot.id ? { ...l, awardedToId: cid } : l)),
                          }));
                        }}
                      >
                        <option value="">Give to…</option>
                        {seatable.map((c) => (
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
            {t.loot.length === 0 ? <p className="text-sm text-muted">No loot listed for this table.</p> : null}
          </div>
        </Panel>
      </main>
    </div>
  );
}

function trackHostile(m: Mob): EncounterEntry {
  const id = uid();
  const pack = m.packSize;
  const full = Math.max(1, m.hits);
  const count = pack === 0 ? 1 : Math.max(1, pack);
  const creatures: EncounterCreature[] = Array.from({ length: count }, (_, i) => ({
    id: `${id}:${i + 1}`,
    currentHits: full,
    mark: i + 1,
  }));
  return {
    id,
    mobId: m.id,
    currentHits: full,
    packSize: pack,
    notes: "",
    accuracy: m.accuracy,
    damage: m.damage,
    movement: m.movement,
    creatures,
    defeated: [],
  };
}

function Tracked({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs tracking-wide text-muted uppercase">{label}</div>
      {children}
    </div>
  );
}

function Roster({
  ids,
  onOpen,
  onDrop,
}: {
  ids: string[];
  onOpen: (id: string) => void;
  onDrop: (id: string) => void;
}) {
  const characters = useCharacters((s) => s.characters);
  if (ids.length === 0) return <p className="text-sm text-muted">No SM characters at this table.</p>;
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
                Life {c.tracker.currentHealth}/{d.healthMax} · DP {c.tracker.currentDp}/{d.dpMax} · CP{" "}
                {Math.min(c.tracker.currentCp, d.combatPool)}/{d.combatPool}
              </div>
            </button>
            <StatChip label="Total" value={totalEssence(c)} />
            <StatChip label="Avail" value={spend(c).remaining} />
            <Button variant="ghost" size="icon-sm" onClick={() => onDrop(id)}>
              <Trash2 />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
