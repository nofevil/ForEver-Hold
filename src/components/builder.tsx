import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { AbilitySelect } from "@/components/ability-select";
import { AffordButton, EssenceBudgetProvider, useCanAfford } from "@/components/essence-budget";
import { Panel, StatChip } from "@/components/panel";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import type { AbilityDef } from "@/lib/op20/catalogs";
import {
  ARMOR_PATTERNS,
  ARMOR_SKILLS,
  ATHLETICS,
  canWearPattern,
  CORE_DEMESNE_ELEMENTS,
  DEMESNE_ABILITIES,
  DEMESNE_META,
  SHIELD_PATTERNS,
  SHIELD_SKILLS,
  SOCIAL_TRICKS,
  STARTER_ITEMS,
  SUBTERFUGE,
  SUBTERFUGE_ADDONS,
  TRICK_LABELS,
  TRICKS,
  wpSkillsForTypes,
} from "@/lib/op20/catalogs";
import { derive, maxArmorProficiency, maxShieldProficiency, maxWeaponProficiency, nextTierCost, spend, treeElements, warnings } from "@/lib/op20/compute";
import { makeItem, relicToGear } from "@/lib/op20/defaults";
import { stepCost, ticFromSteps } from "@/lib/op20/formulas";
import type {
  Airship,
  ArmorWeight,
  Character,
  DemesneElement,
  Relic,
  SimpleTree,
  SpendBreakdown,
  TrickCategory,
  WeaponProficiency,
  WeaponType,
} from "@/lib/op20/types";
import { ATTR_KEYS, ATTR_LABELS, WEAPON_TYPES } from "@/lib/op20/types";
import { uid } from "@/lib/utils";
import { useCharacters } from "@/store/characters";

export type BuilderSection = "identity" | "stats" | "combat" | "demesne" | "inventory";

const ALL_SECTIONS: BuilderSection[] = ["identity", "stats", "combat", "demesne", "inventory"];

export function Builder({
  character: c,
  sections,
  showBudget = true,
}: {
  character: Character;
  sections?: BuilderSection[];
  showBudget?: boolean;
}) {
  const update = useCharacters((s) => s.update);
  const relics = useCharacters((s) => s.relics);
  const airships = useCharacters((s) => s.airships);
  const patch = (fn: (cur: Character) => Character) => update(c.id, fn);
  const d = derive(c);
  const s = spend(c);
  const warns = warnings(c);
  const active = new Set(sections ?? ALL_SECTIONS);
  const onSheet = c.sheetOpened !== false;

  return (
    <EssenceBudgetProvider remaining={s.remaining} dedicatedRemaining={s.dedicatedRemaining}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          {active.has("identity") ? <Identity c={c} patch={patch} creating={!onSheet} /> : null}
          {active.has("stats") ? (
            <>
              {onSheet ? <StatsOverview c={c} patch={patch} d={d} s={s} /> : null}
              <Attributes c={c} patch={patch} />
              <Secondary c={c} patch={patch} d={d} />
            </>
          ) : null}
          {active.has("combat") ? (
            <>
              <WeaponBlock c={c} patch={patch} />
              <ArmorBlock c={c} patch={patch} />
              <TricksBlock c={c} patch={patch} />
              <SkillsBlock c={c} patch={patch} />
            </>
          ) : null}
          {active.has("demesne") ? <DemesneBlock c={c} patch={patch} /> : null}
          {active.has("inventory") ? (
            <>
              <GearBlock c={c} patch={patch} relics={relics} airships={airships} />
              <NotesBlock c={c} patch={patch} />
            </>
          ) : null}
        </div>
        {showBudget ? (
          <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <Panel title="Budget">
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="text-sm text-muted">Available</span>
                  <span
                    className={`font-display text-3xl tabular-nums ${s.overspent ? "text-danger" : "text-ink"}`}
                  >
                    {s.remaining}
                  </span>
                </div>
                <Meter value={s.spent} max={Math.max(s.generalBudget, 1)} over={s.overspent} />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted">Starting</dt>
                  <dd className="text-right tabular-nums">{c.startingEssence}</dd>
                  {onSheet ? (
                    <>
                      <dt className="text-muted">Earned</dt>
                      <dd className="text-right tabular-nums">{c.earnedEssence}</dd>
                    </>
                  ) : null}
                  <dt className="text-muted">Traits</dt>
                  <dd className="text-right tabular-nums">+{s.granted}</dd>
                  <dt className="text-muted">Spent</dt>
                  <dd className="text-right tabular-nums">{s.spent}</dd>
                </dl>
              </div>
            </Panel>
            <Panel title="Derived">
              <DerivedGrid d={d} />
            </Panel>
            {warns.length > 0 ? (
              <Panel title="Checks">
                <ul className="space-y-2 text-sm text-warn">
                  {warns.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </Panel>
            ) : null}
            <Panel title="Spend">
              <ul className="space-y-1 text-sm">
                {s.lines
                  .filter((l) => l.essence > 0)
                  .map((l) => (
                    <li key={l.key} className="flex justify-between gap-2">
                      <span className="text-muted">{l.label}</span>
                      <span className="tabular-nums">{l.essence}</span>
                    </li>
                  ))}
              </ul>
            </Panel>
          </aside>
        ) : null}
      </div>
    </EssenceBudgetProvider>
  );
}

function signed(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

function Meter({ value, max, over }: { value: number; max: number; over: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="h-2 overflow-hidden rounded-full bg-parchment-2">
      <div
        className={`resource-fill h-full rounded-full ${over ? "bg-danger" : "bg-burgundy"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function DerivedGrid({ d }: { d: ReturnType<typeof derive> }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatChip label="Prowess" value={signed(d.prowess)} />
      <StatChip label="Precision" value={signed(d.precision)} />
      {d.showDodge ? <StatChip label="Dodge" value={signed(d.dodgeWithAthletics)} /> : null}
      <StatChip label="Discernment" value={signed(d.discernment)} />
      <StatChip label="Force of Will" value={signed(d.forceOfWill)} />
      <StatChip label="Fortitude" value={signed(d.fortitude)} />
      <StatChip label="Reflex" value={signed(d.reflex)} />
      <StatChip label="Aura" value={signed(d.aura)} />
      <StatChip label="Majesty" value={signed(d.majesty)} />
      <StatChip label="Resolve" value={signed(d.resolve)} />
      <StatChip label="Withstanding" value={signed(d.withstanding)} />
    </div>
  );
}

function StatsOverview({
  c,
  patch,
  d,
  s,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
  d: ReturnType<typeof derive>;
  s: SpendBreakdown;
}) {
  return (
    <Panel title={c.name || "Unnamed"} action={<span>{c.profession || "No profession"}</span>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatChip label="Life" value={`${c.tracker.currentHealth} / ${d.healthMax}`} />
        <StatChip label={d.furyLabel ? "Fury" : "DP"} value={`${c.tracker.currentDp} / ${d.dpMax}`} />
        <StatChip label="CP" value={`${c.tracker.currentCp} / ${d.combatPool}`} />
        <StatChip label="Earned Essence" value={c.earnedEssence} hint="Sessions, quests, SM grants" />
        <StatChip label="Available Essence" value={s.remaining} hint="Starting + earned − spent" />
        <StatChip label="Gildar" value={c.gildar} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="General earned Essence">
          <Input
            type="number"
            min={0}
            value={c.earnedEssence}
            onChange={(e) => patch((x) => ({ ...x, earnedEssence: Number(e.target.value) || 0 }))}
          />
        </Field>
        <Field label="Gildar">
          <Input
            type="number"
            min={0}
            value={c.gildar}
            onChange={(e) => patch((x) => ({ ...x, gildar: Number(e.target.value) || 0 }))}
          />
        </Field>
      </div>
    </Panel>
  );
}

function Identity({
  c,
  patch,
  creating,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
  creating: boolean;
}) {
  return (
    <Panel title="Identity">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={c.name} onChange={(e) => patch((x) => ({ ...x, name: e.target.value }))} />
        </Field>
        <Field label="Profession">
          <Input
            value={c.profession}
            onChange={(e) => patch((x) => ({ ...x, profession: e.target.value }))}
          />
        </Field>
        <Field label="Epoch">
          <Input
            value={c.epoch}
            placeholder="Set by the Story Master’s table"
            onChange={(e) => patch((x) => ({ ...x, epoch: e.target.value }))}
          />
        </Field>
        <Field label="Starting Essence">
          <Input
            type="number"
            min={0}
            value={c.startingEssence}
            onChange={(e) =>
              patch((x) => ({ ...x, startingEssence: Number(e.target.value) || 0 }))
            }
          />
        </Field>
        {creating ? null : (
          <Field label="General earned Essence">
            <Input
              type="number"
              min={0}
              value={c.earnedEssence}
              onChange={(e) =>
                patch((x) => ({ ...x, earnedEssence: Number(e.target.value) || 0 }))
              }
            />
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field label="Short bio">
            <Textarea
              rows={2}
              value={c.bio}
              onChange={(e) => patch((x) => ({ ...x, bio: e.target.value }))}
            />
          </Field>
        </div>
      </div>
    </Panel>
  );
}

function Attributes({
  c,
  patch,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
}) {
  return (
    <Panel title="Attributes" action={<span>3ST each</span>}>
      <div className="grid gap-2">
        {ATTR_KEYS.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-3 py-2"
          >
            <div>
              <div className="font-medium">{ATTR_LABELS[key]}</div>
              <div className="text-xs text-muted">
                {c.attributes[key]}/5 · total {stepCost(3, c.attributes[key])} ess
              </div>
            </div>
            <Stepper
              value={c.attributes[key]}
              max={8}
              nextCost={nextTierCost(3, c.attributes[key])}
              spendKey={`attr-${key}`}
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  attributes: { ...x.attributes, [key]: v },
                }))
              }
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Secondary({
  c,
  patch,
  d,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
  d: ReturnType<typeof derive>;
}) {
  return (
    <Panel title="Health, DP, Tic, Actions">
      <div className="grid gap-3 sm:grid-cols-2">
        <Row label="Extra Health" hint={`1 ess each · max ${c.attributes.end * 10} · base ${d.healthBase}`}>
          <Stepper
            value={c.purchasedHealth}
            max={Math.max(0, c.attributes.end * 10)}
            nextCost={1}
            spendKey="health"
            onChange={(v) => patch((x) => ({ ...x, purchasedHealth: v }))}
          />
        </Row>
        <Row label="Extra DP" hint="1 Essence = 2 DP">
          <Stepper
            value={c.purchasedDpEssence}
            max={40}
            nextCost={1}
            spendKey="dp"
            onChange={(v) => patch((x) => ({ ...x, purchasedDpEssence: v }))}
          />
        </Row>
        <Row label="Movement tree" hint={`5ST · base ${d.movement - c.movementTree}`}>
          <Stepper
            value={c.movementTree}
            nextCost={nextTierCost(5, c.movementTree)}
            spendKey="move"
            onChange={(v) => patch((x) => ({ ...x, movementTree: v }))}
          />
        </Row>
        <Row label="Tic" hint={`Default 5 · now ${ticFromSteps(c.ticSteps)}`}>
          <Stepper
            value={c.ticSteps}
            max={4}
            nextCost={nextTierCost(5, c.ticSteps)}
            spendKey="tic"
            onChange={(v) => patch((x) => ({ ...x, ticSteps: v }))}
          />
        </Row>
        <Row label="Resist Physical" hint="5ST">
          <Stepper
            value={c.resistPhysical}
            nextCost={nextTierCost(5, c.resistPhysical)}
            spendKey="rphys"
            onChange={(v) => patch((x) => ({ ...x, resistPhysical: v }))}
          />
        </Row>
        <Row label="Resist Demesne (All)" hint="5ST">
          <Stepper
            value={c.resistDemesneAll}
            nextCost={nextTierCost(5, c.resistDemesneAll)}
            spendKey="rall"
            onChange={(v) => patch((x) => ({ ...x, resistDemesneAll: v }))}
          />
        </Row>
        <Row label="Extra Attack Actions" hint="20ST · default 1">
          <Stepper
            value={c.extraAttackActions}
            max={3}
            nextCost={nextTierCost(20, c.extraAttackActions)}
            spendKey="atk-act"
            onChange={(v) => patch((x) => ({ ...x, extraAttackActions: v }))}
          />
        </Row>
        <Row label="Movement Actions" hint="10ST">
          <Stepper
            value={c.movementActions}
            max={3}
            nextCost={nextTierCost(10, c.movementActions)}
            spendKey="move-act"
            onChange={(v) => patch((x) => ({ ...x, movementActions: v }))}
          />
        </Row>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Specific Demesne Resist (1ST)">
            <NativeSelect id="pending-resist" defaultValue="fire" className="w-32">
              {CORE_DEMESNE_ELEMENTS.map((el) => (
                <option key={el} value={el}>
                  {DEMESNE_META[el].name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <AffordButton
            size="sm"
            variant="outline"
            cost={1}
            onClick={() => {
              const select = document.getElementById("pending-resist") as HTMLSelectElement | null;
              const el = (select?.value as DemesneElement) || "fire";
              const label = DEMESNE_META[el]?.name ?? "Fire";
              patch((x) => {
                if (x.resistSpecific.some((r) => r.label === label)) return x;
                return {
                  ...x,
                  resistSpecific: [...x.resistSpecific, { id: uid(), label, tier: 1 }],
                };
              });
            }}
          >
            <Plus /> Add
          </AffordButton>
        </div>
        {c.resistSpecific.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-2xl bg-cream px-3 py-2">
            <span className="flex-1 font-medium">{r.label}</span>
            <Stepper
              value={r.tier}
              min={1}
              nextCost={nextTierCost(1, r.tier)}
              spendKey={`rspec-${r.id}`}
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  resistSpecific: x.resistSpecific.map((y) =>
                    y.id === r.id ? { ...y, tier: Math.max(1, v) } : y,
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
                  resistSpecific: x.resistSpecific.filter((y) => y.id !== r.id),
                }))
              }
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function WeaponBlock({
  c,
  patch,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
}) {
  const setWp = (fn: (w: WeaponProficiency) => WeaponProficiency) =>
    patch((x) => ({ ...x, wp: syncWp(fn(x.wp)) }));
  const skills = wpSkillsForTypes(c.wp.types.length ? c.wp.types : ["Sword"]);

  return (
    <Panel title="Weapon Proficiency" action={<span>5ST · +1 Acc / tier</span>}>
      <Row label="Tier">
        <Stepper
          value={c.wp.tier}
          max={Math.max(c.wp.tier, Math.min(8, maxWeaponProficiency(c)))}
          nextCost={nextTierCost(5, c.wp.tier)}
          spendKey="wp"
          onChange={(v) =>
            setWp((w) => {
              const picks = resizePicks(w.picks, v);
              return { ...w, tier: v, picks };
            })
          }
        />
      </Row>
      {c.wp.tier >= 1 ? (
        <div className="mt-3 space-y-3">
          <Field label="First weapon type (also removes −2 untrained)">
            <NativeSelect
              value={c.wp.types[0] ?? ""}
              onChange={(e) =>
                setWp((w) => ({
                  ...w,
                  types: [e.target.value as WeaponType, ...w.types.slice(1)],
                }))
              }
            >
              <option value="">Choose type</option>
              {WEAPON_TYPES.filter((t) => {
                const melee = t !== "Bow";
                const cap = melee
                  ? Math.max(c.attributes.str, c.attributes.agi)
                  : Math.max(c.attributes.agi, c.attributes.per);
                return cap >= c.wp.tier;
              }).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {c.wp.picks.map((p, i) => {
            const extras: AbilityDef[] =
              i > 0
                ? WEAPON_TYPES.filter((t) => t !== c.wp.types[0]).map((t) => ({
                    id: `type:${t}`,
                    name: `Extra type: ${t}`,
                    text: "Spend this tier’s skill slot on another weapon type. No Combat Skill this tier.",
                  }))
                : [];
            return (
              <Field
                key={p.tier}
                label={i === 0 ? "Tier 1 Combat Skill" : `Tier ${p.tier} — skill or extra type`}
              >
                <AbilitySelect
                  list={[...extras, ...skills]}
                  value={p.abilityId}
                  onChange={(id) =>
                    setWp((w) => ({
                      ...w,
                      picks: w.picks.map((q) =>
                        q.tier === p.tier ? { ...q, abilityId: id } : q,
                      ),
                    }))
                  }
                  placeholder={`Choose T${p.tier}`}
                />
              </Field>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          First tier: choose a type, a Combat Skill, and gain +1 Accuracy. Untrained weapons are −2
          and do not add WP.
        </p>
      )}
    </Panel>
  );
}

function syncWp(w: WeaponProficiency): WeaponProficiency {
  const extra = w.picks
    .filter((p) => p.abilityId.startsWith("type:"))
    .map((p) => p.abilityId.slice(5) as WeaponType);
  const first = w.types[0];
  const types = [...new Set([first, ...extra].filter(Boolean))] as WeaponType[];
  return { ...w, types };
}

function ArmorBlock({
  c,
  patch,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
}) {
  const setArmorWeight = (weight: ArmorWeight | "") =>
    patch((x) => {
      const picks = x.armor.picks.map((p, i) =>
        i === 0 && weight ? { ...p, abilityId: p.abilityId || "proficiency" } : p,
      );
      return { ...x, armor: { ...x.armor, weight, picks } };
    });
  const setShieldWeight = (weight: ArmorWeight | "") =>
    patch((x) => {
      const picks = x.shield.picks.map((p, i) =>
        i === 0 && weight ? { ...p, abilityId: p.abilityId || "proficiency" } : p,
      );
      return { ...x, shield: { ...x.shield, weight, picks } };
    });

  return (
    <Panel title="Armor & Shield">
      <h3 className="mb-2 text-sm font-medium">Armor Proficiency — 5ST</h3>
      <Row label="Tier">
        <Stepper
          value={c.armor.tier}
          max={Math.max(c.armor.tier, Math.min(8, maxArmorProficiency(c)))}
          nextCost={nextTierCost(5, c.armor.tier)}
          spendKey="armor"
          onChange={(v) =>
            patch((x) => ({
              ...x,
              armor: {
                ...x.armor,
                tier: v,
                picks: resizePicks(x.armor.picks, v).map((p, i) =>
                  i === 0 && x.armor.weight && !p.abilityId ? { ...p, abilityId: "proficiency" } : p,
                ),
                bonuses: resizeBonus(x.armor.bonuses, v),
              },
            }))
          }
        />
      </Row>
      {c.armor.tier >= 1 ? (
        <div className="mt-3 space-y-3">
          <Field label="Armor type (first tier grants this proficiency)">
            <NativeSelect
              value={c.armor.weight}
              onChange={(e) => setArmorWeight(e.target.value as ArmorWeight | "")}
            >
              <option value="">Choose type</option>
              <option value="light">Light — Agility ≥ Tier. Grants Light proficiency.</option>
              <option value="medium">Medium — Strength ≥ Tier. Grants Medium proficiency.</option>
              <option value="heavy">Heavy — Str+End ≥ Tier. Grants Heavy proficiency.</option>
            </NativeSelect>
          </Field>
          {c.armor.weight
            ? c.armor.picks.map((p, i) => (
                <div key={p.tier} className="grid gap-2 sm:grid-cols-[1fr_140px]">
                  <AbilitySelect
                    list={ARMOR_SKILLS[c.armor.weight as ArmorWeight]}
                    value={p.abilityId}
                    onChange={(id) =>
                      patch((x) => ({
                        ...x,
                        armor: {
                          ...x.armor,
                          picks: x.armor.picks.map((q) =>
                            q.tier === p.tier ? { ...q, abilityId: id } : q,
                          ),
                        },
                      }))
                    }
                    placeholder={i === 0 ? "Proficiency of the chosen type" : `Armor ability T${p.tier}`}
                  />
                  <NativeSelect
                    value={c.armor.bonuses[i] ?? "soak"}
                    onChange={(e) =>
                      patch((x) => ({
                        ...x,
                        armor: {
                          ...x.armor,
                          bonuses: x.armor.bonuses.map((b, j) =>
                            j === i ? (e.target.value as "soak" | "durability") : b,
                          ),
                        },
                      }))
                    }
                  >
                    <option value="soak">+1 Soak</option>
                    <option value="durability">+1 Durability</option>
                  </NativeSelect>
                </div>
              ))
            : (
              <p className="text-sm text-muted">
                First tier: pick Light, Medium, or Heavy. That type’s proficiency is granted, then choose
                an ability.
              </p>
            )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Add a tier, then choose an armor type. Tier 1 grants proficiency in that type.
        </p>
      )}

      <h3 className="mt-6 mb-2 text-sm font-medium">Shield Proficiency — 3ST</h3>
      <Row label="Tier">
        <Stepper
          value={c.shield.tier}
          max={Math.max(c.shield.tier, Math.min(8, maxShieldProficiency(c)))}
          nextCost={nextTierCost(3, c.shield.tier)}
          spendKey="shield"
          onChange={(v) =>
            patch((x) => ({
              ...x,
              shield: {
                ...x.shield,
                tier: v,
                picks: resizePicks(x.shield.picks, v).map((p, i) =>
                  i === 0 && x.shield.weight && !p.abilityId ? { ...p, abilityId: "proficiency" } : p,
                ),
                bonuses: resizeBonus(x.shield.bonuses, v),
              },
            }))
          }
        />
      </Row>
      {c.shield.tier >= 1 ? (
        <div className="mt-3 space-y-3">
          <Field label="Shield type (first tier grants this proficiency)">
            <NativeSelect
              value={c.shield.weight}
              onChange={(e) => setShieldWeight(e.target.value as ArmorWeight | "")}
            >
              <option value="">Choose type</option>
              <option value="light">Light — Agility ≥ Tier. Grants Light shield proficiency.</option>
              <option value="medium">Medium — Strength ≥ Tier. Grants Medium shield proficiency.</option>
              <option value="heavy">Heavy — Str+End ≥ Tier. Grants Heavy shield proficiency.</option>
            </NativeSelect>
          </Field>
          {c.shield.weight
            ? c.shield.picks.map((p, i) => (
                <div key={p.tier} className="grid gap-2 sm:grid-cols-[1fr_140px]">
                  <AbilitySelect
                    list={SHIELD_SKILLS[c.shield.weight as ArmorWeight]}
                    value={p.abilityId}
                    onChange={(id) =>
                      patch((x) => ({
                        ...x,
                        shield: {
                          ...x.shield,
                          picks: x.shield.picks.map((q) =>
                            q.tier === p.tier ? { ...q, abilityId: id } : q,
                          ),
                        },
                      }))
                    }
                    placeholder={i === 0 ? "Proficiency of the chosen type" : `Shield ability T${p.tier}`}
                  />
                  <NativeSelect
                    value={c.shield.bonuses[i] ?? "soak"}
                    onChange={(e) =>
                      patch((x) => ({
                        ...x,
                        shield: {
                          ...x.shield,
                          bonuses: x.shield.bonuses.map((b, j) =>
                            j === i ? (e.target.value as "soak" | "durability") : b,
                          ),
                        },
                      }))
                    }
                  >
                    <option value="soak">+1 Soak</option>
                    <option value="durability">+1 Durability</option>
                  </NativeSelect>
                </div>
              ))
            : (
              <p className="text-sm text-muted">First tier: pick Light, Medium, or Heavy.</p>
            )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Add a tier, then choose a shield type. Tier 1 grants proficiency in that type.
        </p>
      )}
    </Panel>
  );
}

function resizeDemesnePicks(
  picks: Array<{ tier: number; element: DemesneElement; abilityId: string }>,
  tier: number,
  fallback: DemesneElement = "fire",
) {
  const next = picks.slice(0, tier);
  while (next.length < tier) {
    next.push({ tier: next.length + 1, element: fallback, abilityId: "" });
  }
  return next.map((p, i) => ({ ...p, tier: i + 1 }));
}

function DemesneBlock({
  c,
  patch,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
}) {
  return (
    <Panel title="Demesne" action={<span>10ST · mix elements in a tree · max 2 trees</span>}>
      <p className="mb-3 text-sm text-muted">
        One tree can mix Air, Fire, Earth, and Water. A second tree costs its own 10ST curve and grants
        another DP pool. DP = 5ST of the tree’s overall tier + 2ST of each element’s primary attribute
        in the tree.
      </p>
      <div className="space-y-4">
        {c.demesnes.map((d, treeIndex) => {
          const els = treeElements(d);
          const title =
            els.map((el) => `${DEMESNE_META[el]?.name}`).join(" / ") || `Tree ${treeIndex + 1}`;
          return (
            <div key={d.id} className="rounded-2xl bg-cream p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="font-display text-lg text-burgundy">{title}</div>
                  <div className="text-xs text-muted">
                    Overall T{d.picks.length || d.tier}
                    {els.map((el) => {
                      const meta = DEMESNE_META[el];
                      const n = d.picks.filter((p) => p.element === el).length;
                      return ` · ${meta?.name} ×${n} (${meta?.roll})`;
                    })}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    patch((x) => ({
                      ...x,
                      demesnes: x.demesnes.filter((y) => y.id !== d.id),
                    }))
                  }
                >
                  <X />
                </Button>
              </div>
              <Row label="Tier">
                <Stepper
                  value={d.picks.length || d.tier}
                  nextCost={nextTierCost(10, d.picks.length || d.tier)}
                  spendKey={`dem-${d.id}`}
                  onChange={(v) =>
                    patch((x) => ({
                      ...x,
                      demesnes: x.demesnes.map((y) =>
                        y.id === d.id
                          ? {
                              ...y,
                              tier: v,
                              picks: resizeDemesnePicks(y.picks, v, y.picks[0]?.element ?? "fire"),
                            }
                          : y,
                      ),
                    }))
                  }
                />
              </Row>
              <div className="mt-3 space-y-3">
                {d.picks.map((p) => (
                  <div key={p.tier} className="space-y-2">
                    <Field label={`Tier ${p.tier} element`}>
                      <NativeSelect
                        value={p.element}
                        onChange={(e) =>
                          patch((x) => ({
                            ...x,
                            demesnes: x.demesnes.map((y) =>
                              y.id === d.id
                                ? {
                                    ...y,
                                    picks: y.picks.map((q) =>
                                      q.tier === p.tier
                                        ? {
                                            ...q,
                                            element: e.target.value as DemesneElement,
                                            abilityId: "",
                                          }
                                        : q,
                                    ),
                                  }
                                : y,
                            ),
                          }))
                        }
                      >
                        {CORE_DEMESNE_ELEMENTS.map((el) => (
                          <option key={el} value={el}>
                            {DEMESNE_META[el].name} · {DEMESNE_META[el].court}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                    <AbilitySelect
                      list={DEMESNE_ABILITIES[p.element] ?? []}
                      value={p.abilityId}
                      onChange={(id) =>
                        patch((x) => ({
                          ...x,
                          demesnes: x.demesnes.map((y) =>
                            y.id === d.id
                              ? {
                                  ...y,
                                  picks: y.picks.map((q) =>
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
            </div>
          );
        })}
      </div>
      {c.demesnes.length < 2 ? (
        <AffordButton
          className="mt-3"
          size="sm"
          variant="outline"
          cost={10}
          onClick={() =>
            patch((x) => ({
              ...x,
              demesnes: [
                ...x.demesnes,
                {
                  id: uid(),
                  tier: 1,
                  picks: [{ tier: 1, element: "fire" as DemesneElement, abilityId: "" }],
                },
              ],
            }))
          }
        >
          <Plus /> Add Demesne tree
        </AffordButton>
      ) : null}
    </Panel>
  );
}

function TricksBlock({
  c,
  patch,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
}) {
  const categories = (Object.keys(TRICK_LABELS) as TrickCategory[]).filter((cat) => {
    if (cat === "axemaster") return c.wp.types.includes("Axe");
    if (cat === "swordmaster") return c.wp.types.includes("Sword");
    if (cat === "rangemaster") return c.wp.types.includes("Bow");
    return true;
  });
  return (
    <Panel title="Tricks" action={<span>3ST · CP / SP = 3 × tier</span>}>
      <h3 className="mb-2 text-sm font-medium">Combat Tricks — Combat Pool = 3 × tier</h3>
      <Row label="Tier">
        <Stepper
          value={c.tricks.length}
          nextCost={nextTierCost(3, c.tricks.length)}
          spendKey="tricks"
          onChange={(v) =>
            patch((x) => {
              const next = x.tricks.slice(0, v);
              while (next.length < v) {
                next.push({ id: uid(), category: "combat", abilityId: "" });
              }
              return { ...x, tricks: next };
            })
          }
        />
      </Row>
      <div className="mt-3 space-y-3">
        {c.tricks.map((t, i) => (
          <div key={t.id} className="space-y-2">
            <Field label={`Combat Trick ${i + 1}`}>
              <NativeSelect
                value={categories.includes(t.category) ? t.category : t.category}
                onChange={(e) =>
                  patch((x) => ({
                    ...x,
                    tricks: x.tricks.map((y) =>
                      y.id === t.id
                        ? { ...y, category: e.target.value as TrickCategory, abilityId: "" }
                        : y,
                    ),
                  }))
                }
              >
                {(categories.includes(t.category) ? categories : [t.category, ...categories]).map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {TRICK_LABELS[cat]}
                    </option>
                  ),
                )}
              </NativeSelect>
            </Field>
            <AbilitySelect
              list={TRICKS[t.category]}
              value={t.abilityId}
              onChange={(id) =>
                patch((x) => ({
                  ...x,
                  tricks: x.tricks.map((y) => (y.id === t.id ? { ...y, abilityId: id } : y)),
                }))
              }
              placeholder="Choose combat trick"
            />
          </div>
        ))}
      </div>

      <h3 className="mt-6 mb-2 text-sm font-medium">Social Tricks — Social Pool = 3 × tier</h3>
      <Row label="Tier">
        <Stepper
          value={c.socialTricks.length}
          nextCost={nextTierCost(3, c.socialTricks.length)}
          spendKey="social"
          onChange={(v) =>
            patch((x) => {
              const next = x.socialTricks.slice(0, v);
              while (next.length < v) next.push({ id: uid(), abilityId: "" });
              return { ...x, socialTricks: next };
            })
          }
        />
      </Row>
      <div className="mt-3 space-y-3">
        {c.socialTricks.map((t, i) => (
          <Field key={t.id} label={`Social Trick ${i + 1}`}>
            <AbilitySelect
              list={SOCIAL_TRICKS}
              value={t.abilityId}
              onChange={(id) =>
                patch((x) => ({
                  ...x,
                  socialTricks: x.socialTricks.map((y) =>
                    y.id === t.id ? { ...y, abilityId: id } : y,
                  ),
                }))
              }
              placeholder="Choose social trick"
            />
          </Field>
        ))}
      </div>
    </Panel>
  );
}

function SkillsBlock({
  c,
  patch,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
}) {
  const setTree = (key: "athletics" | "subterfuge", tree: SimpleTree) =>
    patch((x) => ({ ...x, [key]: tree }));
  const canAddon = useCanAfford(10);
  return (
    <Panel title="Athletics, Subterfuge, Field">
      <h3 className="mb-2 text-sm font-medium">Athletics — 3ST</h3>
      <Row label="Tier">
        <Stepper
          value={c.athletics.tier}
          nextCost={nextTierCost(3, c.athletics.tier)}
          spendKey="ath"
          onChange={(v) => setTree("athletics", { tier: v, picks: resizePicks(c.athletics.picks, v) })}
        />
      </Row>
      <div className="mt-2 space-y-2">
        {c.athletics.picks.map((p) => (
          <AbilitySelect
            key={p.tier}
            list={ATHLETICS}
            value={p.abilityId}
            onChange={(id) =>
              setTree("athletics", {
                ...c.athletics,
                picks: c.athletics.picks.map((q) => (q.tier === p.tier ? { ...q, abilityId: id } : q)),
              })
            }
            placeholder={`Athletics T${p.tier}`}
          />
        ))}
      </div>

      <h3 className="mt-5 mb-2 text-sm font-medium">Subterfuge — 3ST</h3>
      <Row label="Tier">
        <Stepper
          value={c.subterfuge.tier}
          nextCost={nextTierCost(3, c.subterfuge.tier)}
          spendKey="sub"
          onChange={(v) =>
            setTree("subterfuge", { tier: v, picks: resizePicks(c.subterfuge.picks, v) })
          }
        />
      </Row>
      <div className="mt-2 space-y-2">
        {c.subterfuge.picks.map((p) => (
          <AbilitySelect
            key={p.tier}
            list={SUBTERFUGE}
            value={p.abilityId}
            onChange={(id) =>
              setTree("subterfuge", {
                ...c.subterfuge,
                picks: c.subterfuge.picks.map((q) =>
                  q.tier === p.tier ? { ...q, abilityId: id } : q,
                ),
              })
            }
            placeholder={`Subterfuge T${p.tier}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUBTERFUGE_ADDONS.map((a) => {
          const on = c.subterfugeAddons.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                if (!on && !canAddon) return;
                patch((x) => ({
                  ...x,
                  subterfugeAddons: on
                    ? x.subterfugeAddons.filter((id) => id !== a.id)
                    : [...x.subterfugeAddons, a.id],
                }));
              }}
              className={`h-9 rounded-full px-3 text-sm ${on ? "bg-burgundy text-parchment" : "bg-cream text-ink-soft shadow-[inset_0_0_0_1px_rgba(42,28,20,0.12)]"}`}
              title={!on && !canAddon ? "10 more essence is needed to increase this tier" : a.text}
            >
              {a.name} · 10
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Row label="Smithing 5ST">
          <Stepper
            value={c.smith}
            nextCost={nextTierCost(5, c.smith)}
            spendKey="smith"
            onChange={(v) => patch((x) => ({ ...x, smith: v }))}
          />
        </Row>
        <Row label="Harvest 3ST">
          <Stepper
            value={c.harvest}
            nextCost={nextTierCost(3, c.harvest)}
            spendKey="harvest"
            onChange={(v) => patch((x) => ({ ...x, harvest: v }))}
          />
        </Row>
        <Row label="Monster Hunting 3ST">
          <Stepper
            value={c.hunting}
            nextCost={nextTierCost(3, c.hunting)}
            spendKey="hunt"
            onChange={(v) => patch((x) => ({ ...x, hunting: v }))}
          />
        </Row>
        <Row label="Foraging 3ST">
          <Stepper
            value={c.foraging}
            nextCost={nextTierCost(3, c.foraging)}
            spendKey="forage"
            onChange={(v) => patch((x) => ({ ...x, foraging: v }))}
          />
        </Row>
        <Row label="Mining 3ST">
          <Stepper
            value={c.mining}
            nextCost={nextTierCost(3, c.mining)}
            spendKey="mine"
            onChange={(v) => patch((x) => ({ ...x, mining: v }))}
          />
        </Row>
      </div>
    </Panel>
  );
}

function GearBlock({
  c,
  patch,
  relics,
  airships,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
  relics: Relic[];
  airships: Airship[];
}) {
  const listedRelics = relics.filter((r) => r.listed !== false);
  return (
    <Panel title="Equipment" action={<span>Item Essence is separate from the character budget</span>}>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <Field label="Gildar">
          <Input
            type="number"
            min={0}
            value={c.gildar}
            onChange={(e) => patch((x) => ({ ...x, gildar: Number(e.target.value) || 0 }))}
          />
        </Field>
        <Field label="Assigned keel">
          <NativeSelect
            value={c.airshipId ?? ""}
            onChange={(e) => patch((x) => ({ ...x, airshipId: e.target.value || null }))}
          >
            <option value="">None</option>
            {airships.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name || "Unnamed keel"} · size {a.size}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {STARTER_ITEMS.map((t) => (
            <Button
              key={t.name}
              size="sm"
              variant="outline"
              onClick={() =>
                patch((x) => ({
                  ...x,
                  items: [
                    ...x.items,
                    makeItem({
                      ...t,
                      equipped: t.kind === "weapon" || t.kind === "armor" || t.kind === "shield",
                    }),
                  ],
                }))
              }
            >
              <Plus /> {t.name}
            </Button>
          ))}
      </div>

      <div className="mb-3">
        <Field label="Take from Relics">
          <NativeSelect
            defaultValue=""
            onChange={(e) => {
              const id = e.target.value;
              e.target.value = "";
              const r = listedRelics.find((x) => x.id === id);
              if (!r) return;
              if (c.items.some((i) => i.relicId === r.id)) return;
              patch((x) => ({
                ...x,
                items: [...x.items, relicToGear(r)],
              }));
            }}
          >
            <option value="">Matching relics…</option>
            {listedRelics.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name || "Unnamed"} · {r.kind}
                {r.kind === "weapon" && r.weaponType ? ` · ${r.weaponType}` : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="space-y-3">
        {c.items.map((item) => (
          <div key={item.id} className="rounded-2xl bg-cream p-3">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <Input
                  value={item.name}
                  onChange={(e) =>
                    patch((x) => ({
                      ...x,
                      items: x.items.map((i) =>
                        i.id === item.id ? { ...i, name: e.target.value } : i,
                      ),
                    }))
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <NativeSelect
                    value={item.kind}
                    onChange={(e) =>
                      patch((x) => ({
                        ...x,
                        items: x.items.map((i) =>
                          i.id === item.id ? { ...i, kind: e.target.value as typeof item.kind } : i,
                        ),
                      }))
                    }
                  >
                    <option value="weapon">Weapon</option>
                    <option value="armor">Armor</option>
                    <option value="shield">Shield</option>
                    <option value="demesne">Demesne</option>
                    <option value="other">Other</option>
                  </NativeSelect>
                  <Input
                    type="number"
                    value={item.essence}
                    onChange={(e) =>
                      patch((x) => ({
                        ...x,
                        items: x.items.map((i) =>
                          i.id === item.id ? { ...i, essence: Number(e.target.value) || 0 } : i,
                        ),
                      }))
                    }
                  />
                </div>
                {item.kind === "weapon" ? (
                  <>
                    <NativeSelect
                      value={item.weaponType ?? ""}
                      onChange={(e) =>
                        patch((x) => ({
                          ...x,
                          items: x.items.map((i) =>
                            i.id === item.id
                              ? { ...i, weaponType: e.target.value as WeaponType }
                              : i,
                          ),
                        }))
                      }
                    >
                      {WEAPON_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </NativeSelect>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="WV"
                        value={item.wv ?? ""}
                        onChange={(e) =>
                          patch((x) => ({
                            ...x,
                            items: x.items.map((i) =>
                              i.id === item.id ? { ...i, wv: Number(e.target.value) || 0 } : i,
                            ),
                          }))
                        }
                      />
                      <Input
                        placeholder="Range"
                        value={item.range ?? ""}
                        onChange={(e) =>
                          patch((x) => ({
                            ...x,
                            items: x.items.map((i) =>
                              i.id === item.id ? { ...i, range: e.target.value } : i,
                            ),
                          }))
                        }
                      />
                    </div>
                  </>
                ) : null}
                {item.kind === "armor" ? (
                  <Field label="Armor type" className="sm:col-span-2">
                    <NativeSelect
                      value={item.armorPattern ?? ""}
                      onChange={(e) => {
                        const p = ARMOR_PATTERNS.find((x) => x.id === e.target.value);
                        if (!p) return;
                        patch((x) => ({
                          ...x,
                          items: x.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  armorPattern: p.id,
                                  armorWeight: p.weight,
                                  soak: p.soak,
                                  durability: p.durability,
                                  currentDurability: p.durability,
                                  abilities: `${p.need}. ${p.traits}`,
                                  name: i.name.startsWith("Common") ? `Common ${p.name}` : i.name,
                                }
                              : i,
                          ),
                        }));
                      }}
                    >
                      <option value="">Choose armor type…</option>
                      {ARMOR_PATTERNS.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={!canWearPattern(c.attributes, p)}
                        >
                          {p.name} · Soak {p.soak} / Dur {p.durability}
                          {canWearPattern(c.attributes, p) ? "" : " (need stats)"}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                ) : null}
                {item.kind === "shield" ? (
                  <Field label="Shield type" className="sm:col-span-2">
                    <NativeSelect
                      value={item.shieldPattern ?? ""}
                      onChange={(e) => {
                        const p = SHIELD_PATTERNS.find((x) => x.id === e.target.value);
                        if (!p) return;
                        patch((x) => ({
                          ...x,
                          items: x.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  shieldPattern: p.id,
                                  shieldWeight: p.weight,
                                  soak: p.soak,
                                  durability: p.durability,
                                  currentDurability: p.durability,
                                  abilities: `${p.need}. ${p.traits}`,
                                  name: i.name.startsWith("Common") ? `Common ${p.name}` : i.name,
                                }
                              : i,
                          ),
                        }));
                      }}
                    >
                      <option value="">Choose shield type…</option>
                      {SHIELD_PATTERNS.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={!canWearPattern(c.attributes, p)}
                        >
                          {p.name} · Soak {p.soak} / Dur {p.durability}
                          {canWearPattern(c.attributes, p) ? "" : " (need stats)"}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                ) : null}
                {item.kind === "armor" || item.kind === "shield" ? (
                  <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                    <Input
                      type="number"
                      placeholder="Soak"
                      value={item.soak ?? ""}
                      onChange={(e) =>
                        patch((x) => ({
                          ...x,
                          items: x.items.map((i) =>
                            i.id === item.id ? { ...i, soak: Number(e.target.value) || 0 } : i,
                          ),
                        }))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Durability"
                      value={item.durability ?? ""}
                      onChange={(e) =>
                        patch((x) => ({
                          ...x,
                          items: x.items.map((i) =>
                            i.id === item.id
                              ? {
                                  ...i,
                                  durability: Number(e.target.value) || 0,
                                  currentDurability: Number(e.target.value) || 0,
                                }
                              : i,
                          ),
                        }))
                      }
                    />
                  </div>
                ) : null}
                {c.sheetOpened !== false ? (
                  <Field label="Earned Essence (this item)">
                    <Input
                      type="number"
                      min={0}
                      value={item.earnedEssence ?? 0}
                      onChange={(e) =>
                        patch((x) => ({
                          ...x,
                          items: x.items.map((i) =>
                            i.id === item.id
                              ? { ...i, earnedEssence: Number(e.target.value) || 0 }
                              : i,
                          ),
                        }))
                      }
                    />
                  </Field>
                ) : null}
                <Textarea
                  className="sm:col-span-2"
                  rows={2}
                  placeholder="Abilities, +10, fatigue"
                  value={item.abilities}
                  onChange={(e) =>
                    patch((x) => ({
                      ...x,
                      items: x.items.map((i) =>
                        i.id === item.id ? { ...i, abilities: e.target.value } : i,
                      ),
                    }))
                  }
                />
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() =>
                  patch((x) => ({ ...x, items: x.items.filter((i) => i.id !== item.id) }))
                }
              >
                <X />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function NotesBlock({
  c,
  patch,
}: {
  c: Character;
  patch: (fn: (cur: Character) => Character) => void;
}) {
  return (
    <Panel title="Notes & Negative Traits">
      <Field label="Notes">
        <Textarea
          rows={3}
          value={c.notes}
          onChange={(e) => patch((x) => ({ ...x, notes: e.target.value }))}
        />
      </Field>
      <Field label="Other abilities" className="mt-3">
        <Textarea
          rows={3}
          value={c.otherAbilities}
          onChange={(e) => patch((x) => ({ ...x, otherAbilities: e.target.value }))}
        />
      </Field>
      <div className="mt-4 space-y-2">
        {c.negativeTraits.map((t) => (
          <div key={t.id} className="grid gap-2 sm:grid-cols-[1fr_88px_1fr_40px]">
            <Input
              placeholder="Trait"
              value={t.name}
              onChange={(e) =>
                patch((x) => ({
                  ...x,
                  negativeTraits: x.negativeTraits.map((y) =>
                    y.id === t.id ? { ...y, name: e.target.value } : y,
                  ),
                }))
              }
            />
            <Input
              type="number"
              placeholder="Ess"
              value={t.essence}
              onChange={(e) =>
                patch((x) => ({
                  ...x,
                  negativeTraits: x.negativeTraits.map((y) =>
                    y.id === t.id ? { ...y, essence: Number(e.target.value) || 0 } : y,
                  ),
                }))
              }
            />
            <Input
              placeholder="When it bites"
              value={t.notes}
              onChange={(e) =>
                patch((x) => ({
                  ...x,
                  negativeTraits: x.negativeTraits.map((y) =>
                    y.id === t.id ? { ...y, notes: e.target.value } : y,
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
                  negativeTraits: x.negativeTraits.filter((y) => y.id !== t.id),
                }))
              }
            >
              <X />
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            patch((x) => ({
              ...x,
              negativeTraits: [...x.negativeTraits, { id: uid(), name: "", essence: 0, notes: "" }],
            }))
          }
        >
          <Plus /> Negative Trait
        </Button>
      </div>
    </Panel>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <div className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">{label}</div>
      {children}
    </label>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-3 py-2">
      <div>
        <div className="font-medium">{label}</div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

function resizePicks(picks: Array<{ tier: number; abilityId: string }>, tier: number) {
  const next = picks.slice(0, tier);
  while (next.length < tier) next.push({ tier: next.length + 1, abilityId: "" });
  return next.map((p, i) => ({ ...p, tier: i + 1 }));
}

function resizeBonus(list: Array<"soak" | "durability">, tier: number) {
  const next = list.slice(0, tier);
  while (next.length < tier) next.push("soak");
  return next;
}
