import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { HoldMark } from "@/components/mark";
import { Panel, StatChip } from "@/components/panel";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { DEMESNE_META } from "@/lib/op20/catalogs";
import { relicDp, relicQuality, relicSpend, relicWarnings } from "@/lib/op20/campaign";
import { relicToGear } from "@/lib/op20/defaults";
import { nextTierCost } from "@/lib/op20/compute";
import type { DemesneElement, GearKind, Relic, WeaponType } from "@/lib/op20/types";
import { ATTR_KEYS, ATTR_LABELS, CORE_DEMESNE_ELEMENTS, WEAPON_TYPES } from "@/lib/op20/types";
import { uid } from "@/lib/utils";
import { useCharacters } from "@/store/characters";

export function RelicWorkspace({ relic: r }: { relic: Relic }) {
  const updateRelic = useCharacters((s) => s.updateRelic);
  const characters = useCharacters((s) => s.characters);
  const update = useCharacters((s) => s.update);
  const patch = (fn: (cur: Relic) => Relic) => updateRelic(r.id, fn);
  const s = relicSpend(r);
  const q = relicQuality(r);
  const dp = relicDp(r);
  const warns = relicWarnings(r);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-leather-2/20 bg-leather text-parchment">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-6">
          <Link
            to="/"
            search={{ desk: "relics" }}
            className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10"
            aria-label="Back to relics"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <HoldMark className="hidden size-7 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">{r.name || "Unnamed relic"}</p>
            <p className="truncate text-xs text-parchment/70">
              {q} · {s.spent} Essence
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px] sm:px-6 sm:py-8">
        <div className="space-y-5">
          <Panel title="Identity">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Name"
                value={r.name}
                onChange={(e) => patch((x) => ({ ...x, name: e.target.value }))}
              />
              <NativeSelect
                value={r.kind}
                onChange={(e) => patch((x) => ({ ...x, kind: e.target.value as GearKind }))}
              >
                <option value="weapon">Weapon</option>
                <option value="armor">Armor</option>
                <option value="shield">Shield</option>
                <option value="demesne">Demesne charm</option>
                <option value="other">Other</option>
              </NativeSelect>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={r.listed !== false}
                  onChange={(e) => patch((x) => ({ ...x, listed: e.target.checked }))}
                />
                List in games — characters can pick this relic if the type matches
              </label>
              <Textarea
                className="sm:col-span-2"
                rows={2}
                placeholder="What it is, how it binds"
                value={r.bio}
                onChange={(e) => patch((x) => ({ ...x, bio: e.target.value }))}
              />
            </div>
          </Panel>

          <Panel title="Combat" action={<span>WV 2ST · Soak/Dur 1ST</span>}>
            <div className="grid gap-3 sm:grid-cols-2">
              {r.kind === "weapon" ? (
                <>
                  <NativeSelect
                    value={r.weaponType}
                    onChange={(e) => patch((x) => ({ ...x, weaponType: e.target.value as WeaponType }))}
                  >
                    {WEAPON_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </NativeSelect>
                  <Row label="Weapon Value">
                    <Stepper value={r.wv} max={10} nextCost={nextTierCost(2, r.wv)} onChange={(v) => patch((x) => ({ ...x, wv: v }))} />
                  </Row>
                  <Input
                    placeholder="Range"
                    value={r.range}
                    onChange={(e) => patch((x) => ({ ...x, range: e.target.value }))}
                  />
                </>
              ) : null}
              {r.kind === "armor" || r.kind === "shield" ? (
                <>
                  <Row label="Soak">
                    <Stepper value={r.soak} max={12} nextCost={nextTierCost(1, r.soak)} onChange={(v) => patch((x) => ({ ...x, soak: v }))} />
                  </Row>
                  <Row label="Durability">
                    <Stepper
                      value={r.durability}
                      max={40}
                      nextCost={nextTierCost(1, r.durability)}
                      onChange={(v) => patch((x) => ({ ...x, durability: v }))}
                    />
                  </Row>
                </>
              ) : null}
              <Row label="Weapon Proficiency">
                <Stepper value={r.wpTier} nextCost={nextTierCost(5, r.wpTier)} onChange={(v) => patch((x) => ({ ...x, wpTier: v }))} />
              </Row>
              <Row label="Extra Actions">
                <Stepper
                  value={r.extraActions}
                  max={3}
                  nextCost={nextTierCost(20, r.extraActions)}
                  onChange={(v) => patch((x) => ({ ...x, extraActions: v }))}
                />
              </Row>
            </div>
          </Panel>

          <Panel title="Attributes on the item" action={<span>3ST</span>}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ATTR_KEYS.map((k) => (
                <div key={k}>
                  <div className="mb-1 text-xs text-muted">{ATTR_LABELS[k]}</div>
                  <Stepper
                    value={r.attributes[k]}
                    nextCost={nextTierCost(3, r.attributes[k])}
                    onChange={(v) => patch((x) => ({ ...x, attributes: { ...x.attributes, [k]: v } }))}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Demesne" action={<span>10ST · DP 5ST + 2ST attrs</span>}>
            <div className="space-y-3">
              {r.demesnes.map((d, i) => (
                <div key={`${d.element}-${i}`} className="flex items-center gap-2 rounded-2xl bg-cream p-3">
                  <div className="flex-1 font-display text-burgundy">{DEMESNE_META[d.element].name}</div>
                  <Stepper
                    value={d.tier}
                    nextCost={nextTierCost(10, d.tier)}
                    onChange={(v) =>
                      patch((x) => ({
                        ...x,
                        demesnes: x.demesnes.map((y, j) => (j === i ? { ...y, tier: v } : y)),
                      }))
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => patch((x) => ({ ...x, demesnes: x.demesnes.filter((_, j) => j !== i) }))}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {CORE_DEMESNE_ELEMENTS.filter((e) => !r.demesnes.some((d) => d.element === e)).map((el) => (
                  <Button
                    key={el}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      patch((x) => ({ ...x, demesnes: [...x.demesnes, { element: el as DemesneElement, tier: 1 }] }))
                    }
                  >
                    <Plus /> {DEMESNE_META[el].name}
                  </Button>
                ))}
              </div>
              <Row label="Extra DP Essence">
                <Stepper
                  value={r.extraDpEssence}
                  max={80}
                  onChange={(v) => patch((x) => ({ ...x, extraDpEssence: v }))}
                />
              </Row>
              <Row label="Bound DP">
                <Stepper value={r.boundDp} max={Math.max(80, dp.total, r.boundDp)} onChange={(v) => patch((x) => ({ ...x, boundDp: v }))} />
              </Row>
            </div>
          </Panel>

          <Panel title="Abilities" action={<span>Usually 3ST per tier</span>}>
            <div className="space-y-3">
              {r.abilities.map((a) => (
                <div key={a.id} className="space-y-2 rounded-2xl bg-cream p-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Name"
                      value={a.name}
                      onChange={(e) =>
                        patch((x) => ({
                          ...x,
                          abilities: x.abilities.map((y) => (y.id === a.id ? { ...y, name: e.target.value } : y)),
                        }))
                      }
                    />
                    <Input
                      type="number"
                      className="w-24"
                      value={a.essence}
                      onChange={(e) =>
                        patch((x) => ({
                          ...x,
                          abilities: x.abilities.map((y) =>
                            y.id === a.id ? { ...y, essence: Number(e.target.value) || 0 } : y,
                          ),
                        }))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => patch((x) => ({ ...x, abilities: x.abilities.filter((y) => y.id !== a.id) }))}
                    >
                      <X />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="What it does"
                    value={a.text}
                    onChange={(e) =>
                      patch((x) => ({
                        ...x,
                        abilities: x.abilities.map((y) => (y.id === a.id ? { ...y, text: e.target.value } : y)),
                      }))
                    }
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  patch((x) => ({
                    ...x,
                    abilities: [...x.abilities, { id: uid(), name: "", text: "", essence: 18 }],
                  }))
                }
              >
                <Plus /> Ability (18 Essence = 3ST T3)
              </Button>
            </div>
          </Panel>

          <Panel title="Notes">
            <Textarea rows={4} value={r.notes} onChange={(e) => patch((x) => ({ ...x, notes: e.target.value }))} />
          </Panel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel title="Quality">
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted">{q}</span>
              <span className="font-display text-3xl tabular-nums">{s.spent}</span>
            </div>
            <p className="mt-2 text-xs text-muted">Common 20 · Uncommon 50 · Rare 100 · Legendary 250 · Mythic 500</p>
            <dl className="mt-3 space-y-1 text-sm">
              {s.lines.map((l) => (
                <div key={l.key} className="flex justify-between gap-2">
                  <dt className="text-muted">{l.label}</dt>
                  <dd className="tabular-nums">{l.essence}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Demesne Points">
            <div className="grid grid-cols-2 gap-2">
              <StatChip label="Pool" value={dp.total} />
              <StatChip label="Available" value={dp.available} />
            </div>
          </Panel>
          {warns.length > 0 ? (
            <Panel title="Flags">
              <ul className="space-y-1 text-sm text-warn">
                {warns.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Panel>
          ) : null}
          {characters.length > 0 ? (
            <Panel title="Give to">
              <NativeSelect
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  update(id, (c) => ({ ...c, items: [...c.items, relicToGear(r)] }));
                  e.currentTarget.value = "";
                }}
              >
                <option value="">Add a copy to a character…</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || "Unnamed"}
                  </option>
                ))}
              </NativeSelect>
            </Panel>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-soft">{label}</span>
      {children}
    </div>
  );
}

export function MissingRecord({ desk }: { desk: "relics" | "hostiles" | "keels" }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-4 px-6">
      <HoldMark className="size-10 text-burgundy" />
      <h1 className="font-display text-3xl">Not in this Hold</h1>
      <p className="text-muted">It may have been deleted, or this device does not have that record.</p>
      <Button asChild>
        <Link to="/" search={{ desk }}>
          Back
        </Link>
      </Button>
    </div>
  );
}
