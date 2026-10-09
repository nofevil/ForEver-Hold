import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Lock, Plus, X } from "lucide-react";
import { HoldMark } from "@/components/mark";
import { Panel, StatChip } from "@/components/panel";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { AbilitySelect, BaneAgainst, MenuSelect } from "@/components/ability-select";
import type { AbilityDef } from "@/lib/op20/catalogs";
import {
  ATHLETICS,
  DEMESNE_ABILITIES,
  DEMESNE_META,
  MONSTER_HUNTING,
  SMITHING,
  SOCIAL_TRICKS,
  SUBTERFUGE,
  TRICKS,
  TRICK_LABELS,
  armorSkillsForWeights,
  baneAbilityText,
  baneTargetLabel,
  isBaneAbility,
  shieldSkillsForWeights,
  wpSkillsForTypes,
} from "@/lib/op20/catalogs";
import { relicDp, relicQuality, relicSpend, relicTreeLabel, relicTreeMax, relicTreeStep, relicWarnings } from "@/lib/op20/campaign";
import { relicToGear } from "@/lib/op20/defaults";
import { nextTierCost } from "@/lib/op20/compute";
import { demesnePlayText, playedAbilityText } from "@/lib/op20/sustain";
import {
  defaultRangeFeet,
  formatRangeFeet,
  isRangedWeaponType,
  nextRangeCost,
  parseRangeFeet,
  rangeForWeaponType,
  rangeIncrementFeet,
  damageForWeaponType,
} from "@/lib/op20/formulas";
import type { ArmorWeight, DemesneElement, GearKind, Relic, RelicAbilityTree, RelicTreeKind, RelicTreePick, TreePick, TrickCategory, WeaponType } from "@/lib/op20/types";
import { ARMOR_WEIGHTS, ARMOR_WEIGHT_LABELS, ATTR_KEYS, ATTR_LABELS, CORE_DEMESNE_ELEMENTS, WEAPON_TYPES } from "@/lib/op20/types";
import { uid } from "@/lib/utils";
import { useCharacters } from "@/store/characters";

export function RelicWorkspace({ relic: r }: { relic: Relic }) {
  const updateRelic = useCharacters((s) => s.updateRelic);
  const characters = useCharacters((s) => s.characters);
  const [addingAbility, setAddingAbility] = useState(false);
  const [spendMode, setSpendMode] = useState(false);
  const spendBaseline = useRef<Relic | null>(null);
  const spendLocked = useRef(true);
  const update = useCharacters((s) => s.update);
  const patch = (fn: (cur: Relic) => Relic) => updateRelic(r.id, fn);
  const beginSpend = () => {
    spendBaseline.current = structuredClone(r);
    spendLocked.current = false;
    setSpendMode(true);
  };
  const lockSpend = () => {
    spendLocked.current = true;
    spendBaseline.current = null;
    setSpendMode(false);
  };
  useEffect(() => {
    return () => {
      const snap = spendBaseline.current;
      if (spendLocked.current || !snap) return;
      useCharacters.getState().updateRelic(snap.id, snap);
    };
  }, [r.id]);
  useEffect(() => {
    if (r.kind !== "weapon" || !isRangedWeaponType(r.weaponType)) return;
    const range = r.range.trim();
    if (range !== "" && range !== "5'") return;
    if (r.wv !== 4) return;
    patch((x) => ({
      ...x,
      wv: 3,
      range: rangeForWeaponType(x.weaponType, x.range),
    }));
  }, [r.id, r.kind, r.weaponType, r.wv, r.range]);
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
          <HoldMark light className="hidden h-11 w-auto sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">{r.name || "Unnamed relic"}</p>
            <p className="truncate text-xs text-parchment/70">
              {spendMode ? "Spending Essence · " : ""}
              {r.epoch ? `${r.epoch} · ` : ""}
              {q} · {s.spent} Essence
            </p>
          </div>
          {spendMode ? (
            <Button
              size="sm"
              className="bg-parchment text-ink hover:bg-cream"
              onClick={lockSpend}
            >
              <Lock /> Lock in
            </Button>
          ) : null}
        </div>
      </header>
      {spendMode ? (
      <>
      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px] sm:px-6 sm:py-8">
        <div className="space-y-5">
          <Panel title="Identity">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Name"
                value={r.name}
                onChange={(e) => patch((x) => ({ ...x, name: e.target.value }))}
              />
              <Input
                placeholder="Epoch"
                value={r.epoch}
                onChange={(e) => patch((x) => ({ ...x, epoch: e.target.value }))}
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

          <Panel
            title="Combat"
            action={
              r.kind === "weapon" ? (
                <span>{isRangedWeaponType(r.weaponType) ? "Damage 2ST · Range 2ST" : "Damage 2ST · Range 5ST"}</span>
              ) : r.kind === "armor" || r.kind === "shield" ? (
                <span>Soak/Dur 1ST</span>
              ) : undefined
            }
          >
            <div className="space-y-3">
              {r.kind === "weapon" ? (
                <NativeSelect
                  value={r.weaponType}
                  onChange={(e) => {
                    const weaponType = e.target.value as WeaponType;
                    patch((x) => ({
                      ...x,
                      weaponType,
                      range: rangeForWeaponType(weaponType, x.range),
                      wv: damageForWeaponType(weaponType, x.wv),
                    }));
                  }}
                >
                  {WEAPON_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </NativeSelect>
              ) : null}
              {r.kind === "armor" || r.kind === "shield" ? (
                <NativeSelect
                  value={r.armorWeight || ""}
                  onChange={(e) =>
                    patch((x) => ({ ...x, armorWeight: e.target.value as ArmorWeight | "" }))
                  }
                >
                  <option value="">Choose Light, Medium, or Heavy</option>
                  {ARMOR_WEIGHTS.map((w) => (
                    <option key={w} value={w}>
                      {ARMOR_WEIGHT_LABELS[w]}
                    </option>
                  ))}
                </NativeSelect>
              ) : null}
              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                <div className="space-y-3">
                  <Row label="Weapon Proficiency" stack>
                    <Stepper
                      value={r.wpTier}
                      nextCost={nextTierCost(5, r.wpTier)}
                      onChange={(v) =>
                        patch((x) => ({ ...x, wpTier: v, wpPicks: resizeWpPicks(x.wpPicks, v) }))
                      }
                    />
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
                <div className="space-y-3">
                  {r.kind === "weapon" ? (
                    <>
                      <Row label="Physical Damage" stack>
                        <Stepper value={r.wv} max={10} nextCost={nextTierCost(2, r.wv)} onChange={(v) => patch((x) => ({ ...x, wv: v }))} />
                      </Row>
                      <Row label="Range">
                        <Stepper
                          value={r.range.trim() ? parseRangeFeet(r.range) : defaultRangeFeet(r.weaponType)}
                          min={0}
                          max={300}
                          step={rangeIncrementFeet(r.weaponType)}
                          suffix="'"
                          nextCost={nextRangeCost(
                            r.range.trim() ? parseRangeFeet(r.range) : defaultRangeFeet(r.weaponType),
                            r.weaponType,
                          )}
                          onChange={(v) => patch((x) => ({ ...x, range: formatRangeFeet(v) }))}
                        />
                      </Row>
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
                </div>
              </div>
            </div>
            {r.wpTier >= 1 ? <RelicWeaponProficiency relic={r} patch={patch} /> : null}
          </Panel>

          <Panel title="Attributes on the item" action={<span>3ST</span>}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ATTR_KEYS.map((k) => (
                <div key={k} className="flex flex-col items-center">
                  <div className="text-sm text-ink">{ATTR_LABELS[k]}</div>
                  <div className="mb-1 text-xs text-muted">{nextTierCost(3, r.attributes[k])} ess</div>
                  <Stepper
                    value={r.attributes[k]}
                    onChange={(v) => patch((x) => ({ ...x, attributes: { ...x.attributes, [k]: v } }))}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Demesne" action={<span>10ST · DP 5ST + 2ST attrs</span>}>
            <div className="space-y-3">
              {r.demesnes.map((d, i) => {
                const picks = demesnePicks(d);
                const taken = new Set(picks.map((p) => p.abilityId).filter(Boolean));
                return (
                  <div key={`${d.element}-${i}`} className="space-y-3 rounded-2xl bg-cream p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-display text-burgundy">{DEMESNE_META[d.element].name}</div>
                      <Stepper
                        value={d.tier}
                        nextCost={nextTierCost(10, d.tier)}
                        onChange={(v) =>
                          patch((x) => ({
                            ...x,
                            demesnes: x.demesnes.map((y, j) =>
                              j === i ? { ...y, tier: v, picks: demesnePicks({ ...y, tier: v }) } : y,
                            ),
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
                    {picks.map((p) => (
                      <div key={p.tier}>
                        <div className="mb-1 text-xs tracking-wide text-muted uppercase">Tier {p.tier}</div>
                        <AbilitySelect
                          list={(DEMESNE_ABILITIES[d.element] ?? [])
                            .filter((a) => a.id === p.abilityId || !taken.has(a.id))
                            .map((a) => ({
                              ...a,
                              text: demesnePlayText(d.element, a, d.tier),
                            }))}
                          value={p.abilityId}
                          onChange={(id) =>
                            patch((x) => ({
                              ...x,
                              demesnes: x.demesnes.map((y, j) =>
                                j === i
                                  ? {
                                      ...y,
                                      picks: demesnePicks(y).map((q) =>
                                        q.tier === p.tier ? { ...q, abilityId: id } : q,
                                      ),
                                    }
                                  : y,
                              ),
                            }))
                          }
                          placeholder={`Ability T${p.tier}`}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2">
                {CORE_DEMESNE_ELEMENTS.filter((e) => !r.demesnes.some((d) => d.element === e)).map((el) => (
                  <Button
                    key={el}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      patch((x) => ({
                        ...x,
                        demesnes: [
                          ...x.demesnes,
                          { element: el as DemesneElement, tier: 1, picks: [{ tier: 1, abilityId: "" }] },
                        ],
                      }))
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

          <Panel title="Abilities">
            <div className="space-y-3">
              {r.abilities.map((a, i) => (
                <div key={a.id} className="flex items-start gap-2 rounded-2xl bg-cream p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink">{a.name || "Ability"}</div>
                    {a.text ? (
                      <p className="mt-1 text-sm text-muted">{playedAbilityText(a.text, i + 1)}</p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => patch((x) => ({ ...x, abilities: x.abilities.filter((y) => y.id !== a.id) }))}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              {(r.trees ?? []).map((tree) => (
                <RelicTreeCard key={tree.id} tree={tree} patch={patch} />
              ))}
              {addingAbility ? (
                <MenuSelect
                  value=""
                  placeholder="Choose a tree"
                  options={RELIC_TREE_KINDS.filter((kind) => !(r.trees ?? []).some((t) => t.kind === kind)).map(
                    (kind) => ({
                      value: kind,
                      label: relicTreeLabel(kind),
                      text: `${relicTreeStep(kind)}ST`,
                    }),
                  )}
                  onChange={(kind) => {
                    setAddingAbility(false);
                    if (!kind) return;
                    const next = kind as RelicTreeKind;
                    patch((x) => ({
                      ...x,
                      trees: [
                        ...(x.trees ?? []),
                        {
                          id: uid(),
                          kind: next,
                          tier: 1,
                          picks: [{ tier: 1, abilityId: "", category: "combat" }],
                          weaponType: x.kind === "weapon" ? x.weaponType : "",
                          armorWeight: x.kind === "armor" || x.kind === "shield" ? x.armorWeight : "",
                        },
                      ],
                    }));
                  }}
                />
              ) : (
                <Button variant="outline" size="sm" onClick={() => setAddingAbility(true)}>
                  <Plus /> Ability
                </Button>
              )}
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
      <div className="sticky bottom-0 z-20 border-t border-rule bg-parchment/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3">
          <p className="mr-auto hidden text-sm text-muted sm:block">{q} · {s.spent} Essence</p>
          <Button onClick={lockSpend}>
            <Lock /> Lock in
          </Button>
        </div>
      </div>
      </>
      ) : (
        <RelicSheet relic={r} onSpend={beginSpend} />
      )}
    </div>
  );
}

function resizeWpPicks(picks: TreePick[] | undefined, tier: number): TreePick[] {
  const next = (picks ?? []).slice(0, tier);
  while (next.length < tier) next.push({ tier: next.length + 1, abilityId: "" });
  return next.map((p, i) => ({ ...p, tier: i + 1, abilityId: p.abilityId ?? "", against: p.against }));
}

function relicWpTypes(relic: Relic): WeaponType[] {
  const extra = (relic.wpPicks ?? [])
    .filter((p) => p.abilityId?.startsWith("type:"))
    .map((p) => p.abilityId.slice(5) as WeaponType);
  return [...new Set([relic.wpType, ...extra].filter(Boolean))] as WeaponType[];
}

function RelicWeaponProficiency({
  relic: r,
  patch,
}: {
  relic: Relic;
  patch: (fn: (cur: Relic) => Relic) => void;
}) {
  const types = relicWpTypes(r);
  const tier = Math.max(1, r.wpTier);
  const skills = wpSkillsForTypes(types).map((s) => ({
    ...s,
    text: playedAbilityText(s.text, tier),
  }));
  const picks = resizeWpPicks(r.wpPicks, r.wpTier);
  return (
    <div className="mt-4 space-y-3 rounded-2xl bg-cream p-3">
      <label className="block text-xs tracking-wide text-muted uppercase">
        Weapon
        <NativeSelect
          className="mt-1"
          value={r.wpType ?? ""}
          onChange={(e) => {
            const wpType = e.target.value as WeaponType | "";
            patch((x) => {
              const allowed = new Set(wpSkillsForTypes(wpType ? [wpType] : []).map((s) => s.id));
              return {
                ...x,
                wpType,
                wpPicks: (x.wpPicks ?? []).map((p) =>
                  !p.abilityId || p.abilityId.startsWith("type:") || allowed.has(p.abilityId)
                    ? p
                    : { ...p, abilityId: "", against: undefined },
                ),
              };
            });
          }}
        >
          <option value="">Choose a weapon</option>
          {WEAPON_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
      </label>
      {r.wpType ? (
        picks.map((p, i) => {
          const taken = new Set(
            picks
              .filter((q) => q.tier !== p.tier && q.abilityId && !q.abilityId.startsWith("type:"))
              .map((q) => q.abilityId),
          );
          const extras =
            i > 0
              ? WEAPON_TYPES.filter((t) => {
                  const id = `type:${t}`;
                  if (p.abilityId === id) return true;
                  return t !== r.wpType && !types.includes(t);
                }).map((t) => ({
                  id: `type:${t}`,
                  name: `Extra type: ${t}`,
                  text: `Adds ${t} proficiency. No combat skill this tier.`,
                }))
              : [];
          return (
            <div key={p.tier}>
              <div className="mb-1 text-xs tracking-wide text-muted uppercase">
                {i === 0 ? "Tier 1 ability" : `Tier ${p.tier}`}
              </div>
              <AbilitySelect
                  list={[
                    ...extras,
                    ...skills
                      .filter((s) => s.id === p.abilityId || !taken.has(s.id))
                      .map((s) =>
                        isBaneAbility(s.id) ? { ...s, text: baneAbilityText(s.text, p.against) } : s,
                      ),
                  ]}
                  value={p.abilityId}
                  tier={r.wpTier}
                  onChange={(id) =>
                    patch((x) => ({
                      ...x,
                      wpPicks: resizeWpPicks(x.wpPicks, x.wpTier).map((q) =>
                        q.tier === p.tier
                          ? { ...q, abilityId: id, against: isBaneAbility(id) ? q.against : undefined }
                          : q,
                      ),
                    }))
                  }
                  placeholder={i === 0 ? "Choose ability" : "Skill or extra weapon"}
                />
              {isBaneAbility(p.abilityId) ? (
                <BaneAgainst
                  value={p.against}
                  onChange={(against) =>
                    patch((x) => ({
                      ...x,
                      wpPicks: resizeWpPicks(x.wpPicks, x.wpTier).map((q) =>
                        q.tier === p.tier ? { ...q, against } : q,
                      ),
                    }))
                  }
                />
              ) : null}
            </div>
          );
        })
      ) : (
        <p className="text-sm text-muted">Choose the weapon. The tier 1 ability appears after that.</p>
      )}
    </div>
  );
}

function demesnePicks(d: { tier: number; picks?: TreePick[] }): TreePick[] {
  return Array.from({ length: Math.max(0, d.tier) }, (_, i) => ({
    tier: i + 1,
    abilityId: d.picks?.[i]?.abilityId ?? "",
  }));
}

const RELIC_TREE_KINDS: RelicTreeKind[] = [
  "wp",
  "armor",
  "shield",
  "tricks",
  "social",
  "athletics",
  "subterfuge",
  "hunting",
  "smith",
];

function resizeTreePicks(picks: RelicTreePick[] | undefined, tier: number): RelicTreePick[] {
  return Array.from({ length: Math.max(0, tier) }, (_, i) => ({
    tier: i + 1,
    abilityId: picks?.[i]?.abilityId ?? "",
    category: picks?.[i]?.category ?? "combat",
    ...(picks?.[i]?.against ? { against: picks[i]?.against } : {}),
  }));
}

function treeCatalog(tree: RelicAbilityTree, pick: RelicTreePick): AbilityDef[] {
  if (tree.kind === "wp") return tree.weaponType ? wpSkillsForTypes([tree.weaponType]) : [];
  if (tree.kind === "armor") return tree.armorWeight ? armorSkillsForWeights([tree.armorWeight]) : [];
  if (tree.kind === "shield") return tree.armorWeight ? shieldSkillsForWeights([tree.armorWeight]) : [];
  if (tree.kind === "tricks") return TRICKS[pick.category ?? "combat"] ?? [];
  if (tree.kind === "social") return SOCIAL_TRICKS;
  if (tree.kind === "athletics") return ATHLETICS;
  if (tree.kind === "subterfuge") return SUBTERFUGE;
  if (tree.kind === "hunting") return MONSTER_HUNTING;
  return SMITHING;
}

function RelicTreeCard({
  tree,
  patch,
}: {
  tree: RelicAbilityTree;
  patch: (fn: (cur: Relic) => Relic) => void;
}) {
  const picks = resizeTreePicks(tree.picks, tree.tier);
  const write = (next: RelicAbilityTree) =>
    patch((x) => ({ ...x, trees: (x.trees ?? []).map((t) => (t.id === tree.id ? next : t)) }));
  const taken = new Set(picks.map((p) => p.abilityId).filter((id) => id && !id.startsWith("type:")));
  const ownedTypes = new Set<string>();
  if (tree.weaponType) ownedTypes.add(tree.weaponType);
  if (tree.armorWeight) ownedTypes.add(tree.armorWeight);
  for (const p of picks) {
    if (p.abilityId.startsWith("type:")) ownedTypes.add(p.abilityId.slice(5));
  }

  return (
    <div className="space-y-3 rounded-2xl bg-cream p-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-display text-burgundy">{relicTreeLabel(tree.kind)}</div>
          <div className="text-xs text-muted">{relicTreeStep(tree.kind)}ST</div>
        </div>
        <Stepper
          value={tree.tier}
          max={relicTreeMax(tree.kind)}
          nextCost={nextTierCost(relicTreeStep(tree.kind), tree.tier)}
          onChange={(v) => write({ ...tree, tier: v, picks: resizeTreePicks(tree.picks, v) })}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => patch((x) => ({ ...x, trees: (x.trees ?? []).filter((t) => t.id !== tree.id) }))}
        >
          <X />
        </Button>
      </div>
      {tree.kind === "wp" ? (
        <NativeSelect
          value={tree.weaponType || ""}
          onChange={(e) =>
            write({
              ...tree,
              weaponType: e.target.value as WeaponType | "",
              picks: picks.map((p) => ({ ...p, abilityId: "", against: undefined })),
            })
          }
        >
          <option value="">Choose a weapon</option>
          {WEAPON_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
      ) : null}
      {tree.kind === "armor" || tree.kind === "shield" ? (
        <NativeSelect
          value={tree.armorWeight || ""}
          onChange={(e) =>
            write({
              ...tree,
              armorWeight: e.target.value as ArmorWeight | "",
              picks: picks.map((p) => ({ ...p, abilityId: "" })),
            })
          }
        >
          <option value="">Choose Light, Medium, or Heavy</option>
          {ARMOR_WEIGHTS.map((w) => (
            <option key={w} value={w}>
              {ARMOR_WEIGHT_LABELS[w]}
            </option>
          ))}
        </NativeSelect>
      ) : null}
      {tree.kind === "wp" && !tree.weaponType ? (
        <p className="text-sm text-muted">Choose the weapon. The tier 1 ability appears after that.</p>
      ) : null}
      {(tree.kind === "armor" || tree.kind === "shield") && !tree.armorWeight ? (
        <p className="text-sm text-muted">Choose the weight. The tier 1 ability appears after that.</p>
      ) : null}
      {picks.map((p, i) => {
        const waiting =
          (tree.kind === "wp" && !tree.weaponType) ||
          ((tree.kind === "armor" || tree.kind === "shield") && !tree.armorWeight);
        if (waiting) return null;
        const extras =
          i > 0 && (tree.kind === "wp" || tree.kind === "armor" || tree.kind === "shield")
            ? (tree.kind === "wp" ? WEAPON_TYPES : ARMOR_WEIGHTS)
                .filter((t) => {
                  const id = `type:${t}`;
                  if (p.abilityId === id) return true;
                  return !ownedTypes.has(t);
                })
                .map((t) => ({
                  id: `type:${t}`,
                  name: tree.kind === "wp" ? `Extra type: ${t}` : `Extra weight: ${ARMOR_WEIGHT_LABELS[t as ArmorWeight]}`,
                  text: `Adds ${tree.kind === "wp" ? t : ARMOR_WEIGHT_LABELS[t as ArmorWeight]} proficiency. No skill this tier.`,
                }))
            : [];
        const skills = treeCatalog(tree, p)
          .filter((a) => a.id === p.abilityId || !taken.has(a.id))
          .map((a) => ({ ...a, text: playedAbilityText(a.text, p.tier) }));
        return (
          <div key={p.tier} className="space-y-2">
            <div className="text-xs tracking-wide text-muted uppercase">Tier {p.tier}</div>
            {tree.kind === "tricks" ? (
              <MenuSelect
                value={p.category ?? "combat"}
                onChange={(v) =>
                  write({
                    ...tree,
                    picks: picks.map((q) =>
                      q.tier === p.tier
                        ? { ...q, category: (v || "combat") as TrickCategory, abilityId: "" }
                        : q,
                    ),
                  })
                }
                placeholder="Choose tree"
                allowEmpty={false}
                options={(Object.keys(TRICK_LABELS) as TrickCategory[]).map((cat) => ({
                  value: cat,
                  label: TRICK_LABELS[cat],
                }))}
              />
            ) : null}
            <AbilitySelect
              list={[
                ...extras,
                ...skills.map((s) =>
                  isBaneAbility(s.id) ? { ...s, text: baneAbilityText(s.text, p.against) } : s,
                ),
              ]}
              value={p.abilityId}
              tier={tree.tier}
              onChange={(id) =>
                write({
                  ...tree,
                  picks: picks.map((q) =>
                    q.tier === p.tier
                      ? { ...q, abilityId: id, against: isBaneAbility(id) ? q.against : undefined }
                      : q,
                  ),
                })
              }
              placeholder={i === 0 ? "Choose ability" : "Skill or extra type"}
            />
            {isBaneAbility(p.abilityId) ? (
              <BaneAgainst
                value={p.against}
                onChange={(against) =>
                  write({
                    ...tree,
                    picks: picks.map((q) => (q.tier === p.tier ? { ...q, against } : q)),
                  })
                }
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, children, stack }: { label: string; children: ReactNode; stack?: boolean }) {
  const words = stack ? label.split(" ") : [];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      {words.length > 1 ? (
        <span className="text-sm leading-tight text-ink-soft">
          {words[0]}
          <br />
          {words.slice(1).join(" ")}
        </span>
      ) : (
        <span className="text-sm whitespace-nowrap text-ink-soft">{label}</span>
      )}
      {children}
    </div>
  );
}

function pickLine(
  list: AbilityDef[],
  id: string,
  tier: number,
  against?: string,
): { name: string; text: string } | null {
  if (!id) return null;
  if (id.startsWith("type:")) {
    const raw = id.slice(5);
    const weight = ARMOR_WEIGHT_LABELS[raw as ArmorWeight];
    return { name: weight ? `Extra weight: ${weight}` : `Extra type: ${raw}`, text: "" };
  }
  const def = list.find((a) => a.id === id);
  if (!def) return { name: id, text: "" };
  const vs = isBaneAbility(id) ? baneTargetLabel(against) : "";
  const raw = isBaneAbility(id) ? baneAbilityText(def.text, against) : def.text;
  return { name: vs ? `${def.name} vs ${vs}` : def.name, text: playedAbilityText(raw, tier) };
}

function RelicSheet({ relic: r, onSpend }: { relic: Relic; onSpend: () => void }) {
  const s = relicSpend(r);
  const q = relicQuality(r);
  const dp = relicDp(r);
  const kind =
    r.kind === "weapon"
      ? "Weapon"
      : r.kind === "armor"
        ? "Armor"
        : r.kind === "shield"
          ? "Shield"
          : r.kind === "demesne"
            ? "Demesne charm"
            : "Other";
  const range =
    r.kind === "weapon"
      ? `${r.range.trim() ? parseRangeFeet(r.range) : defaultRangeFeet(r.weaponType)}'`
      : "";
  const wpSkills = r.wpType ? wpSkillsForTypes([r.wpType]) : [];
  const attrs = ATTR_KEYS.filter((k) => r.attributes[k] > 0);
  const facts: { label: string; value: string }[] = [];
  if (r.kind === "weapon" && r.weaponType) facts.push({ label: "Weapon", value: r.weaponType });
  if ((r.kind === "armor" || r.kind === "shield") && r.armorWeight)
    facts.push({ label: "Weight", value: ARMOR_WEIGHT_LABELS[r.armorWeight] });
  if (r.kind === "weapon" || r.wv > 0) facts.push({ label: "Physical Damage", value: String(r.wv) });
  if (r.kind === "weapon") facts.push({ label: "Range", value: range });
  if (r.kind === "armor" || r.kind === "shield" || r.soak > 0) facts.push({ label: "Soak", value: String(r.soak) });
  if (r.kind === "armor" || r.kind === "shield" || r.durability > 0)
    facts.push({ label: "Durability", value: String(r.durability) });
  if (r.extraActions > 0) facts.push({ label: "Extra Actions", value: String(r.extraActions) });
  if (r.wpTier > 0) facts.push({ label: "Weapon Proficiency", value: `Tier ${r.wpTier}` });

  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-5">
        <section className="ornament-frame rounded-[28px] p-6">
          <p className="text-xs tracking-wide text-burgundy uppercase">{kind}</p>
          <h1 className="font-display text-4xl text-ink">{r.name || "Unnamed relic"}</h1>
          {r.epoch ? <p className="mt-1 text-sm text-muted">{r.epoch}</p> : null}
          {r.bio ? <p className="mt-3 max-w-xl text-sm text-ink-soft">{r.bio}</p> : null}
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-rule pt-4">
            <div>
              <div className="text-xs tracking-wide text-muted uppercase">Essence</div>
              <div className="font-display text-4xl tabular-nums text-ink">{s.spent}</div>
              <div className="text-sm text-muted">{q}</div>
            </div>
            <Button onClick={onSpend}>Spend Essence</Button>
          </div>
        </section>

        {facts.length > 0 ? (
          <Panel title="Combat">
            <dl className="space-y-1 text-sm">
              {facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-3">
                  <dt className="text-muted">{f.label}</dt>
                  <dd className="text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        ) : null}

        {r.wpTier > 0 ? (
          <Panel title="Weapon Proficiency">
            <AbilityReadout
              rows={resizeWpPicks(r.wpPicks, r.wpTier).map((p) => {
                const line = pickLine(wpSkills, p.abilityId, p.tier, p.against);
                return { tier: p.tier, name: line?.name ?? "", text: line?.text ?? "" };
              })}
            />
          </Panel>
        ) : null}

        {attrs.length > 0 ? (
          <Panel title="Attributes">
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {attrs.map((k) => (
                <div key={k} className="rounded-2xl bg-cream px-3 py-2 text-center">
                  <div className="text-[10px] tracking-wide text-muted uppercase">{ATTR_LABELS[k]}</div>
                  <div className="font-display text-xl tabular-nums">{r.attributes[k]}</div>
                </div>
              ))}
            </dl>
          </Panel>
        ) : null}

        {r.demesnes.length > 0 ? (
          <Panel title="Demesne">
            <div className="space-y-4">
              {r.demesnes.map((d, i) => (
                <div key={`${d.element}-${i}`}>
                  <div className="font-display text-lg text-burgundy">
                    {DEMESNE_META[d.element]?.name ?? d.element} · Tier {d.tier}
                  </div>
                  <AbilityReadout
                    rows={demesnePicks(d).map((p) => {
                      const def = (DEMESNE_ABILITIES[d.element] ?? []).find((a) => a.id === p.abilityId);
                      return {
                        tier: p.tier,
                        name: def?.name ?? "",
                        text: def ? demesnePlayText(d.element, def, d.tier) : "",
                      };
                    })}
                  />
                </div>
              ))}
              {dp.total > 0 ? (
                <p className="text-sm text-muted">
                  Demesne Points {dp.available} of {dp.total}
                  {r.boundDp > 0 ? ` · ${r.boundDp} bound` : ""}
                </p>
              ) : null}
            </div>
          </Panel>
        ) : null}

        {(r.trees ?? []).length > 0 ? (
          <Panel title="Abilities">
            <div className="space-y-4">
              {(r.trees ?? []).map((tree) => (
                <div key={tree.id}>
                  <div className="font-display text-lg text-burgundy">
                    {relicTreeLabel(tree.kind)} · Tier {tree.tier}
                  </div>
                  <AbilityReadout
                    rows={resizeTreePicks(tree.picks, tree.tier).map((p) => {
                      const line = pickLine(treeCatalog(tree, p), p.abilityId, p.tier, p.against);
                      return { tier: p.tier, name: line?.name ?? "", text: line?.text ?? "" };
                    })}
                  />
                </div>
              ))}
              {r.abilities.map((a) => (
                <div key={a.id}>
                  <div className="font-medium text-ink">{a.name || "Ability"}</div>
                  {a.text ? <p className="text-sm text-muted">{a.text}</p> : null}
                </div>
              ))}
            </div>
          </Panel>
        ) : r.abilities.length > 0 ? (
          <Panel title="Abilities">
            <div className="space-y-3">
              {r.abilities.map((a, i) => (
                <div key={a.id}>
                  <div className="font-medium text-ink">{a.name || "Ability"}</div>
                  {a.text ? <p className="text-sm text-muted">{playedAbilityText(a.text, i + 1)}</p> : null}
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {r.notes.trim() ? (
          <Panel title="Notes">
            <p className="text-sm whitespace-pre-wrap text-ink-soft">{r.notes}</p>
          </Panel>
        ) : null}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Panel title="Quality">
          <div className="flex items-end justify-between">
            <span className="text-sm text-muted">{q}</span>
            <span className="font-display text-3xl tabular-nums">{s.spent}</span>
          </div>
          <dl className="mt-3 space-y-1 text-sm">
            {s.lines.map((l) => (
              <div key={l.key} className="flex justify-between gap-2">
                <dt className="text-muted">{l.label}</dt>
                <dd className="tabular-nums">{l.essence}</dd>
              </div>
            ))}
          </dl>
          <Button className="mt-4 w-full" onClick={onSpend}>
            Spend Essence
          </Button>
        </Panel>
      </aside>
    </main>
  );
}

function AbilityReadout({ rows }: { rows: { tier: number; name: string; text: string }[] }) {
  const filled = rows.filter((row) => row.name);
  if (filled.length === 0) return <p className="text-sm text-muted">No abilities chosen yet.</p>;
  return (
    <ul className="mt-2 space-y-3">
      {filled.map((row) => (
        <li key={row.tier}>
          <div className="text-xs tracking-wide text-muted uppercase">Tier {row.tier}</div>
          <div className="font-medium text-ink">{row.name}</div>
          {row.text ? <p className="text-sm text-muted">{row.text}</p> : null}
        </li>
      ))}
    </ul>
  );
}

export function MissingRecord({ desk }: { desk: "relics" | "hostiles" | "keels" }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center gap-4 px-6">
      <HoldMark className="h-16 w-auto" decorative={false} />
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
