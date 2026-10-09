import { Fragment, useState, type ReactNode } from "react";
import { Plus, X, Lock, Minus } from "lucide-react";
import { AbilitySelect, BaneAgainst, MenuSelect } from "@/components/ability-select";
import {
  AffordButton,
  EssenceBudgetProvider,
  useBudget,
  useCanAfford,
  usePurchaseLock,
  type PurchaseLock,
} from "@/components/essence-budget";
import { Panel, StatChip } from "@/components/panel";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { AbilityDef } from "@/lib/op20/catalogs";
import {
  ATHLETICS,
  ATHLETICS_TEXT,
  ARMOR_TEXT,
  COMBAT_TRICKS_TEXT,
  CORE_DEMESNE_ELEMENTS,
  DEMESNE_ABILITIES,
  DEMESNE_ABOUT,
  DEMESNE_META,
  FORAGING,
  FORAGING_TEXT,
  HARVEST,
  HARVEST_TEXT,
  MINING,
  MINING_TEXT,
  MONSTER_HUNTING,
  MONSTER_HUNTING_TEXT,
  SMITH_TEXT,
  SMITHING,
  SOCIAL_TRICKS,
  SOCIAL_TRICKS_TEXT,
  STARTER_ITEMS,
  SUBTERFUGE,
  SUBTERFUGE_ADDONS,
  SUBTERFUGE_TEXT,
  SHIELD_TEXT,
  TRICKS,
  TRICK_LABELS,
  WP_TEXT,
  armorSkillsForWeights,
  baneAbilityText,
  isBaneAbility,
  shieldSkillsForWeights,
  smithCraftItemTier,
  wpSkillsForTypes,
} from "@/lib/op20/catalogs";
import {
  autoEquipItems,
  capForWeight,
  derive,
  equipReason,
  hasDemesneTier,
  maxArmorProficiency,
  maxShieldProficiency,
  maxWeaponProficiency,
  nextTierCost,
  proficientArmorWeights,
  proficientShieldWeights,
  proficientWeaponTypes,
  sealItem,
  commitItemPurchases,
  itemCanSpend,
  itemEssenceLeft,
  itemUpgradeCost,
  setItemEquipped,
  spend,
  syncWeaponProficiency,
  totalEssence,
  treeElements,
  warnings,
} from "@/lib/op20/compute";
import { makeItem, relicToGear } from "@/lib/op20/defaults";
import { damageForWeaponType, formatRangeFeet, nextRangeCost, parseRangeFeet, rangeForWeaponType, rangeIncrementFeet, stepCost, ticFromSteps } from "@/lib/op20/formulas";
import { migrateCharacter } from "@/lib/op20/normalize";
import { charmAbilityNote, demesnePlayText } from "@/lib/op20/sustain";
import type {
  Airship,
  ArmorTree,
  ArmorWeight,
  Character,
  DemesneElement,
  DemesnePick,
  DerivedStats,
  GearItem,
  Relic,
  SimpleTree,
  SpendBreakdown,
  TreePick,
  TrickCategory,
  WeaponType,
} from "@/lib/op20/types";
import {
  ARMOR_WEIGHTS,
  ARMOR_WEIGHT_LABELS,
  ATTR_KEYS,
  ATTR_LABELS,
  RANGED_WEAPON_TYPES,
  THROWN_WEAPON_TYPES,
  WEAPON_TYPES,
} from "@/lib/op20/types";
import { uid } from "@/lib/utils";
import { useCharacters } from "@/store/characters";

export type BuilderSection =
  | "identity"
  | "stats"
  | "combat"
  | "demesne"
  | "crafting"
  | "inventory"
  | "notes";

type Patch = (fn: (cur: Character) => Character) => void;

const ALL_SECTIONS: BuilderSection[] = [
  "identity",
  "stats",
  "combat",
  "demesne",
  "crafting",
  "inventory",
  "notes",
];
export function purchaseLock(c: Character): PurchaseLock {
  return {
    attributes: { ...c.attributes },
    purchasedHealth: c.purchasedHealth,
    purchasedDpEssence: c.purchasedDpEssence,
    movementTree: c.movementTree,
    resistPhysical: c.resistPhysical,
    resistDemesneAll: c.resistDemesneAll,
    resistTiers: Object.fromEntries(c.resistSpecific.map((r) => [r.id, r.tier])),
    movementActions: c.movementActions,
    extraAttackActions: c.extraAttackActions,
    ticSteps: c.ticSteps,
    wp: c.wp.tier,
    armor: c.armor.tier,
    shield: c.shield.tier,
    demesneTiers: Object.fromEntries(c.demesnes.map((d) => [d.id, d.picks.length || d.tier])),
    demesnePicks: Object.fromEntries(
      c.demesnes.map((d) => [
        d.id,
        d.picks
          .filter((p) => p.abilityId)
          .map((p) => ({ tier: p.tier, element: p.element, abilityId: p.abilityId })),
      ]),
    ),
    tricks: c.tricks.length,
    social: c.socialTricks.length,
    athletics: c.athletics.tier,
    subterfuge: c.subterfuge.tier,
    smith: c.smith.tier,
    hunting: c.hunting.tier,
    harvest: c.harvest.tier,
    foraging: c.foraging.tier,
    mining: c.mining.tier,
    itemIds: c.items.map((i) => i.id),
    traitIds: c.negativeTraits.map((t) => t.id),
    subterfugeAddons: [...c.subterfugeAddons],
  };
}

export function Builder({
  character,
  sections,
  showBudget = true,
  shop = false,
  lock = null,
  onPatch,
}: {
  character: Character;
  sections?: BuilderSection[];
  showBudget?: boolean;
  shop?: boolean;
  lock?: PurchaseLock | null;
  /** When set, purchases stay in this draft until the caller saves them. */
  onPatch?: (fn: (cur: Character) => Character) => void;
}) {
  const c = migrateCharacter(character);
  const update = useCharacters((s) => s.update);
  const relics = useCharacters((s) => s.relics);
  const airships = useCharacters((s) => s.airships);
  const patch = (fn: (cur: Character) => Character) => {
    if (onPatch) onPatch(fn);
    else update(c.id, fn);
  };
  const d = derive(c);
  const s = spend(c);
  const warns = warnings(c);
  const active = new Set(sections ?? ALL_SECTIONS);
  const onSheet = c.sheetOpened !== false;
  return (
    <EssenceBudgetProvider
      remaining={s.remaining}
      dedicatedRemaining={s.dedicatedRemaining}
      shop={shop}
      lock={shop ? lock : null}
    >
      <div className={showBudget ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]" : ""}>
        <div className="space-y-5">
          {shop ? (
            <Panel title="Spend Essence">
              <p className="text-sm text-muted">
                {"Only purchases you can afford with "}
                {s.remaining}
                {" Essence are listed. Anything already locked in stays. Lock in keeps what you add here. Leave before that and it is dropped. The Essence stays."}
              </p>
            </Panel>
          ) : null}
          {active.has("identity") && !shop ? (
            <Identity c={c} patch={patch} creating={!onSheet} />
          ) : null}
          {active.has("stats") ? (
            <Fragment>
              {onSheet && !shop ? <StatsOverview c={c} patch={patch} d={d} s={s} /> : null}
              <Attributes c={c} patch={patch} />
              <Secondary c={c} patch={patch} d={d} />
            </Fragment>
          ) : null}
          {active.has("combat") ? (
            <Fragment>
              <ProficiencyBlock c={c} patch={patch} />
              <TricksBlock c={c} patch={patch} />
              <SkillsBlock c={c} patch={patch} />
            </Fragment>
          ) : null}
          {active.has("demesne") ? <DemesneBlock c={c} patch={patch} /> : null}
          {active.has("crafting") ? <CraftingBlock c={c} patch={patch} /> : null}
          {active.has("inventory") ? (
            <GearBlock c={c} patch={patch} relics={relics} airships={airships} />
          ) : null}
          {active.has("notes") ? <NotesBlock c={c} patch={patch} /> : null}
        </div>
        {showBudget ? (
          <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <Panel title="Budget">
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="text-sm text-muted">{"Available"}</span>
                  <span
                    className={`font-display text-3xl tabular-nums ${s.overspent ? "text-danger" : "text-ink"}`}
                  >
                    {s.remaining}
                  </span>
                </div>
                <Meter value={s.spent} max={Math.max(s.generalBudget, 1)} over={s.overspent} />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted">{"Starting"}</dt>
                  <dd className="text-right tabular-nums">{c.startingEssence}</dd>
                  {onSheet ? (
                    <Fragment>
                      <dt className="text-muted">{"Earned"}</dt>
                      <dd className="text-right tabular-nums">{c.earnedEssence}</dd>
                    </Fragment>
                  ) : null}
                  <dt className="text-muted">{"Traits"}</dt>
                  <dd className="text-right tabular-nums">
                    {"+"}
                    {s.granted}
                  </dd>
                  <dt className="text-muted">{"Spent"}</dt>
                  <dd className="text-right tabular-nums">{s.spent}</dd>
                </dl>
              </div>
            </Panel>
            <Panel title="Derived Stats">
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
                    <li className="flex justify-between gap-2" key={l.key}>
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
function signed(n: number): string {
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
function DerivedGrid({ d }: { d: DerivedStats }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatChip label="Prowess" value={signed(d.prowess)} />
      <StatChip label="Precision" value={signed(d.precision)} />
      <StatChip label="Discernment" value={signed(d.discernment)} />
      <StatChip label="Force of Will" value={signed(d.forceOfWill)} />
      <StatChip label="Fortitude" value={signed(d.fortitude)} />
      <StatChip label="Reflex" value={signed(d.reflex)} />
      <StatChip label="Aura" value={signed(d.aura)} />
      <StatChip label="Majesty" value={signed(d.majesty)} />
      <StatChip label="Resolve" value={signed(d.resolve)} />
      <StatChip label="Withstanding" value={signed(d.withstanding)} />
      <StatChip label="Ingenuity" value={signed(d.ingenuity)} />
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
  patch: Patch;
  d: DerivedStats;
  s: SpendBreakdown;
}) {
  return (
    <Panel title={c.name || "Unnamed"} action={<span>{c.profession || "No profession"}</span>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatChip label="Life" value={`${c.tracker.currentHealth} / ${d.healthMax}`} />
        <StatChip label="DP" value={`${c.tracker.currentDp} / ${d.dpMax}`} />
        <StatChip label="CP" value={`${Math.min(c.tracker.currentCp, d.combatPool)} / ${d.combatPool}`} />
        <StatChip label="Total Essence" value={totalEssence(c)} hint="All Essence received" />
        <StatChip
          label="Available Essence"
          value={s.remaining}
          hint="Leftover starting + general earned"
        />
        <StatChip label="Gildar" value={c.gildar} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="General earned Essence">
          <Input
            type="number"
            min={0}
            value={c.earnedEssence}
            onChange={(e) =>
              patch((x) => ({
                ...x,
                earnedEssence: Number(e.target.value) || 0,
              }))
            }
          />
        </Field>
        <Field label="Gildar">
          <Input
            type="number"
            min={0}
            value={c.gildar}
            onChange={(e) =>
              patch((x) => ({
                ...x,
                gildar: Number(e.target.value) || 0,
              }))
            }
          />
        </Field>
      </div>
    </Panel>
  );
}
function Identity({ c, patch, creating }: { c: Character; patch: Patch; creating: boolean }) {
  return (
    <Panel title="Identity">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input
            value={c.name}
            onChange={(e) =>
              patch((x) => ({
                ...x,
                name: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="Profession">
          <Input
            value={c.profession}
            onChange={(e) =>
              patch((x) => ({
                ...x,
                profession: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="Epoch">
          <Input
            value={c.epoch}
            placeholder="Set by the Story Master’s table"
            onChange={(e) =>
              patch((x) => ({
                ...x,
                epoch: e.target.value,
              }))
            }
          />
        </Field>
        <Field label="Starting Essence">
          <Input
            type="number"
            min={0}
            value={c.startingEssence}
            onChange={(e) =>
              patch((x) => ({
                ...x,
                startingEssence: Number(e.target.value) || 0,
              }))
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
                patch((x) => ({
                  ...x,
                  earnedEssence: Number(e.target.value) || 0,
                }))
              }
            />
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field label="Short bio">
            <Textarea
              rows={2}
              value={c.bio}
              onChange={(e) =>
                patch((x) => ({
                  ...x,
                  bio: e.target.value,
                }))
              }
            />
          </Field>
        </div>
      </div>
    </Panel>
  );
}
function Attributes({ c, patch }: { c: Character; patch: Patch }) {
  const { remaining, dedicatedRemaining, shop } = useBudget();
  const lock = usePurchaseLock();
  const keys = ATTR_KEYS.filter((key) => {
    if (!shop) return true;
    if (c.attributes[key] >= 8) return false;
    return (
      remaining + (dedicatedRemaining[`attr-${key}`] ?? 0) >= nextTierCost(3, c.attributes[key])
    );
  });
  if (!keys.length) return null;
  return (
    <Panel title="Attributes" action={<span>{"3ST each"}</span>}>
      <div className="grid gap-2">
        {keys.map((key) => (
          <div
            className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-3 py-2"
            key={key}
          >
            <div>
              <div className="font-medium">{ATTR_LABELS[key]}</div>
              <div className="text-xs text-muted">
                {c.attributes[key]}
                {"/5 \u00B7 total "}
                {stepCost(3, c.attributes[key])}
                {" ess"}
              </div>
            </div>
            <Stepper
              value={c.attributes[key]}
              min={lock?.attributes[key] ?? 0}
              max={8}
              nextCost={nextTierCost(3, c.attributes[key])}
              spendKey={`attr-${key}`}
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  attributes: {
                    ...x.attributes,
                    [key]: v,
                  },
                }))
              }
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}
function shopShow(
  shop: boolean,
  remaining: number,
  dedicated: Record<string, number>,
  key: string,
  cost: number,
  canIncrease = true,
): boolean {
  if (!canIncrease) return !shop;
  if (!shop) return true;
  return remaining + (dedicated[key] ?? 0) >= cost;
}
function Secondary({ c, patch, d }: { c: Character; patch: Patch; d: DerivedStats }) {
  const [pendingResist, setPendingResist] = useState<DemesneElement>("fire");
  const { remaining, dedicatedRemaining, shop } = useBudget();
  const lock = usePurchaseLock();
  const show = (key: string, cost: number, canIncrease = true) =>
    shopShow(shop, remaining, dedicatedRemaining, key, cost, canIncrease);
  const showHealth = show("health", 1, c.purchasedHealth < Math.max(0, c.attributes.end * 10));
  const showDp = show("dp", 1, hasDemesneTier(c) && c.purchasedDpEssence < 40);
  const showMove = show("move", nextTierCost(5, c.movementTree));
  const showTic = show("tic", nextTierCost(5, c.ticSteps), c.ticSteps < 4);
  const showRphys = show("rphys", nextTierCost(5, c.resistPhysical));
  const showRall = show("rall", nextTierCost(5, c.resistDemesneAll));
  const showAtk = show("atk-act", nextTierCost(20, c.extraAttackActions), c.extraAttackActions < 3);
  const showMoveAct = show("move-act", nextTierCost(10, c.movementActions), c.movementActions < 3);
  const showAddResist = show("", 1, c.resistSpecific.length < CORE_DEMESNE_ELEMENTS.length);
  const showResists = c.resistSpecific.filter((r) =>
    show(`rspec-${r.id}`, nextTierCost(1, r.tier)),
  );
  if (!(
    showHealth ||
    showDp ||
    showMove ||
    showTic ||
    showRphys ||
    showRall ||
    showAtk ||
    showMoveAct ||
    showAddResist ||
    showResists.length
  ))
    return null;
  return (
    <Panel title="Health, DP, Tic, Actions">
      <div className="grid gap-3 sm:grid-cols-2">
        {showHealth ? (
          <Row
            label="Extra Health"
            hint={`1 ess each · max ${c.attributes.end * 10} · base ${d.healthBase}`}
          >
            <Stepper
              value={c.purchasedHealth}
              min={lock?.purchasedHealth ?? 0}
              max={Math.max(0, c.attributes.end * 10)}
              nextCost={1}
              spendKey="health"
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  purchasedHealth: v,
                }))
              }
            />
          </Row>
        ) : null}
        {showDp ? (
          <Row
            label="Extra DP"
            hint={hasDemesneTier(c) ? "1 Essence = 2 DP" : "Requires a Demesne tier"}
          >
            <Stepper
              value={c.purchasedDpEssence}
              min={lock?.purchasedDpEssence ?? 0}
              max={hasDemesneTier(c) ? 40 : 0}
              nextCost={1}
              spendKey="dp"
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  purchasedDpEssence: hasDemesneTier(x) ? v : 0,
                }))
              }
            />
          </Row>
        ) : null}
        {showMove ? (
          <Row label="Movement" hint={`5ST · extra squares · base ${d.movement - c.movementTree}`}>
            <Stepper
              value={c.movementTree}
              min={lock?.movementTree ?? 0}
              nextCost={nextTierCost(5, c.movementTree)}
              spendKey="move"
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  movementTree: v,
                }))
              }
            />
          </Row>
        ) : null}
        {showTic ? (
          <Row label="Tic" hint={`Default 5 · now ${ticFromSteps(c.ticSteps)}`}>
            <Stepper
              value={c.ticSteps}
              min={lock?.ticSteps ?? 0}
              max={4}
              nextCost={nextTierCost(5, c.ticSteps)}
              spendKey="tic"
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  ticSteps: v,
                }))
              }
            />
          </Row>
        ) : null}
        {showRphys ? (
          <Row label="Resist Physical" hint="5ST">
            <Stepper
              value={c.resistPhysical}
              min={lock?.resistPhysical ?? 0}
              nextCost={nextTierCost(5, c.resistPhysical)}
              spendKey="rphys"
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  resistPhysical: v,
                }))
              }
            />
          </Row>
        ) : null}
        {showRall ? (
          <Row label="Resist Demesne (All)" hint="5ST">
            <Stepper
              value={c.resistDemesneAll}
              min={lock?.resistDemesneAll ?? 0}
              nextCost={nextTierCost(5, c.resistDemesneAll)}
              spendKey="rall"
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  resistDemesneAll: v,
                }))
              }
            />
          </Row>
        ) : null}
        {showAtk ? (
          <Row label="Extra Attack Actions" hint="20ST · default 1">
            <Stepper
              value={c.extraAttackActions}
              min={lock?.extraAttackActions ?? 0}
              max={3}
              nextCost={nextTierCost(20, c.extraAttackActions)}
              spendKey="atk-act"
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  extraAttackActions: v,
                }))
              }
            />
          </Row>
        ) : null}
        {showMoveAct ? (
          <Row label="Extra Movement Actions" hint="10ST · default 1">
            <Stepper
              value={c.movementActions}
              min={lock?.movementActions ?? 0}
              max={3}
              nextCost={nextTierCost(10, c.movementActions)}
              spendKey="move-act"
              onChange={(v) =>
                patch((x) => ({
                  ...x,
                  movementActions: v,
                }))
              }
            />
          </Row>
        ) : null}
      </div>
      {showAddResist || showResists.length ? (
        <div className="mt-4 space-y-2">
          {showAddResist ? (
            <div>
              <div className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">
                {"Specific Demesne Resist (1ST)"}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <MenuSelect
                  fit={true}
                  allowEmpty={false}
                  value={pendingResist}
                  onChange={(v) => {
                    if ((CORE_DEMESNE_ELEMENTS as readonly string[]).includes(v)) {
                      setPendingResist(v as DemesneElement);
                    }
                  }}
                  placeholder="Demesne"
                  options={CORE_DEMESNE_ELEMENTS.map((el) => ({
                    value: el,
                    label: DEMESNE_META[el].name,
                  }))}
                />
                <AffordButton
                  size="sm"
                  variant="outline"
                  cost={1}
                  onClick={() => {
                    const label = DEMESNE_META[pendingResist || "fire"]?.name ?? "Fire";
                    patch((x) => {
                      if (x.resistSpecific.some((r) => r.label === label)) return x;
                      return {
                        ...x,
                        resistSpecific: [
                          ...x.resistSpecific,
                          {
                            id: uid(),
                            label,
                            tier: 1,
                          },
                        ],
                      };
                    });
                  }}
                >
                  <Plus />
                  {" Add"}
                </AffordButton>
              </div>
            </div>
          ) : null}
          {showResists.map((r) => (
            <div className="flex items-center gap-2 rounded-2xl bg-cream px-3 py-2" key={r.id}>
              <span className="flex-1 font-medium">{r.label}</span>
              <Stepper
                value={r.tier}
                min={lock?.resistTiers[r.id] ?? 1}
                nextCost={nextTierCost(1, r.tier)}
                spendKey={`rspec-${r.id}`}
                onChange={(v) =>
                  patch((x) => ({
                    ...x,
                    resistSpecific: x.resistSpecific.map((y) =>
                      y.id === r.id
                        ? {
                            ...y,
                            tier: Math.max(1, v),
                          }
                        : y,
                    ),
                  }))
                }
              />
              {lock?.resistTiers[r.id] == null ? (
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
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
function ProficiencyBlock({ c, patch }: { c: Character; patch: Patch }) {
  const { remaining, dedicatedRemaining, shop } = useBudget();
  const lock = usePurchaseLock();
  const setWp = (fn: (w: Character["wp"]) => Character["wp"]) =>
    patch((x) => ({
      ...x,
      wp: syncWeaponProficiency(fn(x.wp)),
    }));
  const types = proficientWeaponTypes(c);
  const skills = wpSkillsForTypes(types);
  const armorWeights = proficientArmorWeights(c);
  const shieldWeights = proficientShieldWeights(c);
  const armorSkills = armorSkillsForWeights(armorWeights);
  const shieldSkills = shieldSkillsForWeights(shieldWeights);
  const weightTypeOptions = (current: ArmorWeight | "", tier: number) =>
    ARMOR_WEIGHTS.filter(
      (w) => w === current || capForWeight(c.attributes, w) >= Math.max(1, tier),
    ).map((w) => ({
      value: w,
      label: ARMOR_WEIGHT_LABELS[w],
      text:
        w === "light"
          ? "Agility ≥ Tier. Grants Light proficiency."
          : w === "medium"
            ? "Strength ≥ Tier. Grants Medium proficiency."
            : "Str+End ≥ Tier. Grants Heavy proficiency.",
    }));
  const wpUnconfigured = c.wp.tier >= 1 && (!c.wp.types[0] || c.wp.picks.some((p) => !p.abilityId));
  const armorUnconfigured =
    c.armor.tier >= 1 && (!c.armor.weight || c.armor.picks.some((p) => !p.abilityId));
  const shieldUnconfigured =
    c.shield.tier >= 1 && (!c.shield.weight || c.shield.picks.some((p) => !p.abilityId));
  const showWp =
    shopShow(
      shop,
      remaining,
      dedicatedRemaining,
      "wp",
      nextTierCost(5, c.wp.tier),
      c.wp.tier < Math.min(8, maxWeaponProficiency(c)),
    ) ||
    (shop && wpUnconfigured);
  const showArmor =
    shopShow(
      shop,
      remaining,
      dedicatedRemaining,
      "armor",
      nextTierCost(5, c.armor.tier),
      c.armor.tier < Math.min(8, maxArmorProficiency(c)),
    ) ||
    (shop && armorUnconfigured);
  const showShield =
    shopShow(
      shop,
      remaining,
      dedicatedRemaining,
      "shield",
      nextTierCost(3, c.shield.tier),
      c.shield.tier < Math.min(8, maxShieldProficiency(c)),
    ) ||
    (shop && shieldUnconfigured);
  if (!showWp && !showArmor && !showShield) return null;
  return (
    <Panel title="Proficiencies">
      {showWp ? (
        <Fragment>
          <h3 className="mb-2 text-sm font-medium">
            {`Weapon Proficiency — 5ST · +${c.wp.tier} Acc`}
          </h3>
          <p className="mb-2 text-sm text-muted">{WP_TEXT}</p>
          <Row label="Tier">
            <Stepper
              value={c.wp.tier}
              min={lock?.wp ?? 0}
              max={Math.max(c.wp.tier, Math.min(8, maxWeaponProficiency(c)))}
              nextCost={nextTierCost(5, c.wp.tier)}
              spendKey="wp"
              onChange={(v) =>
                setWp((w) => {
                  const picks = resizePicks(w.picks, v);
                  return {
                    ...w,
                    tier: v,
                    picks,
                  };
                })
              }
            />
          </Row>
          {c.wp.tier >= 1 ? (
            <div className="mt-3 space-y-3">
              <Field label="First weapon type (also removes −2 untrained)">
                <MenuSelect
                  value={c.wp.types[0] ?? ""}
                  onChange={(v) =>
                    setWp((w) => {
                      const nextTypes = v ? [asWeapon(v), ...w.types.slice(1)] : w.types.slice(1);
                      const allowed = new Set(
                        wpSkillsForTypes(nextTypes.filter(Boolean) as WeaponType[]).map((s) => s.id),
                      );
                      return {
                        ...w,
                        types: nextTypes,
                        picks: w.picks.map((p) =>
                          !p.abilityId || p.abilityId.startsWith("type:") || allowed.has(p.abilityId)
                            ? p
                            : { ...p, abilityId: "", against: undefined },
                        ),
                      };
                    })
                  }
                  placeholder="Choose type"
                  options={WEAPON_TYPES.filter((t) => {
                    return (
                      (t !== "Bow"
                        ? Math.max(c.attributes.str, c.attributes.agi)
                        : Math.max(c.attributes.agi, c.attributes.per)) >= c.wp.tier
                    );
                  }).map((t) => ({
                    value: t,
                    label: t,
                    text: weaponTypeBlurb(t),
                  }))}
                />
              </Field>
              {types.length ? (
                <p className="text-sm text-muted">
                  {"Proficient: "}
                  {types.join(", ")}
                </p>
              ) : null}
              {c.wp.types[0] ? (
                c.wp.picks.map((p, i) => {
                const taken = new Set(
                  c.wp.picks
                    .filter((q) => q.tier !== p.tier && q.abilityId && !q.abilityId.startsWith("type:"))
                    .map((q) => q.abilityId),
                );
                const extras =
                  i > 0
                    ? WEAPON_TYPES.filter((t) => {
                        const id = `type:${t}`;
                        if (p.abilityId === id) return true;
                        return t !== c.wp.types[0] && !types.includes(t);
                      }).map((t) => ({
                        id: `type:${t}`,
                        name: `Extra type: ${t}`,
                        text: `Adds ${t} proficiency. Unlocks ${t === "Axe" ? "Axemaster" : t === "Sword" ? "Swordmaster" : t === "Bow" ? "Rangemaster" : "that weapon’s"} combat tricks. No Combat Skill this tier.`,
                      }))
                    : [];
                return (
                  <Field
                    label={i === 0 ? "Tier 1 Combat Skill" : `Tier ${p.tier} — skill or extra type`}
                    key={p.tier}
                  >
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
                      onChange={(id) =>
                        setWp((w) => ({
                          ...w,
                          picks: w.picks.map((q) =>
                            q.tier === p.tier
                              ? {
                                  ...q,
                                  abilityId: id,
                                  against: isBaneAbility(id) ? q.against : undefined,
                                }
                              : q,
                          ),
                        }))
                      }
                      placeholder={`Choose T${p.tier}`}
                      tier={c.wp.tier}
                    />
                    {isBaneAbility(p.abilityId) ? (
                      <BaneAgainst
                        value={p.against}
                        onChange={(against) =>
                          setWp((w) => ({
                            ...w,
                            picks: w.picks.map((q) => (q.tier === p.tier ? { ...q, against } : q)),
                          }))
                        }
                      />
                    ) : null}
                  </Field>
                );
              })
              ) : (
                <p className="text-sm text-muted">
                  Choose the weapon first. Tier 1’s combat skill appears after that, and only the skills for that weapon.
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {
                "First tier: choose a type, a Combat Skill, and gain +1 Accuracy. Untrained weapons are \u22122 and do not add WP."
              }
            </p>
          )}
        </Fragment>
      ) : null}
      {showArmor ? (
        <DefenseFields
          title="Armor Proficiency — 5ST"
          about={ARMOR_TEXT}
          kind="armor"
          tree={c.armor}
          skills={armorSkills}
          proficient={armorWeights}
          maxTier={maxArmorProficiency(c)}
          nextCost={nextTierCost(5, c.armor.tier)}
          spendKey="armor"
          typeOptions={weightTypeOptions(c.armor.weight, c.armor.tier)}
          gearEssence={c.items.find((i) => i.kind === "armor" && i.equipped)?.essence ?? null}
          onChange={(armor) =>
            patch((x) => ({
              ...x,
              armor,
            }))
          }
        />
      ) : null}
      {showShield ? (
        <DefenseFields
          title="Shield Proficiency — 3ST"
          about={SHIELD_TEXT}
          kind="shield"
          tree={c.shield}
          skills={shieldSkills}
          proficient={shieldWeights}
          maxTier={maxShieldProficiency(c)}
          nextCost={nextTierCost(3, c.shield.tier)}
          spendKey="shield"
          typeOptions={weightTypeOptions(c.shield.weight, c.shield.tier)}
          gearEssence={c.items.find((i) => i.kind === "shield" && i.equipped)?.essence ?? null}
          onChange={(shield) =>
            patch((x) => ({
              ...x,
              shield,
            }))
          }
        />
      ) : null}
    </Panel>
  );
}
function resizeDemesnePicks(
  picks: DemesnePick[],
  tier: number,
  fallback: DemesneElement = "fire",
): DemesnePick[] {
  const next = picks.slice(0, tier);
  while (next.length < tier)
    next.push({
      tier: next.length + 1,
      element: fallback,
      abilityId: "",
    });
  return next.map((p, i) => ({
    ...p,
    tier: i + 1,
  }));
}
function DemesneBlock({ c, patch }: { c: Character; patch: Patch }) {
  const { remaining, shop } = useBudget();
  const lock = usePurchaseLock();
  const canAdd = c.demesnes.length < 2 && (!shop || remaining >= 10);
  const trees = c.demesnes;
  if (!trees.length && !canAdd) return null;
  return (
    <Panel
      title="Demesne"
      action={<span>{"10ST · mix demesnes in a tree · max 2 trees"}</span>}
    >
      <p className="mb-3 text-sm text-muted">
        {
          "One tree can mix Air, Fire, Earth, and Water. A second tree costs its own 10ST curve and grants another DP pool. DP = 5ST of the tree’s overall tier + 2ST of each demesne’s primary attribute in the tree."
        }
      </p>
      <div className="space-y-4">
        {trees.map((d, treeIndex) => {
          const els = treeElements(d);
          const title =
            els.map((el) => `${DEMESNE_META[el]?.name}`).join(" / ") || `Tree ${treeIndex + 1}`;
          return (
            <div className="rounded-2xl bg-cream p-3" key={d.id}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="font-display text-lg text-burgundy">{title}</div>
                  <div className="text-xs text-muted">
                    {"Overall T"}
                    {d.picks.length || d.tier}
                    {els.map((el) => {
                      const meta = DEMESNE_META[el];
                      const n = d.picks.filter((p) => p.element === el).length;
                      return ` · ${meta?.name} ×${n} (${meta?.roll})`;
                    })}
                  </div>
                  {els.map((el) =>
                    DEMESNE_ABOUT[el] ? (
                      <p className="mt-1 text-sm text-muted" key={el}>
                        {DEMESNE_ABOUT[el]}
                      </p>
                    ) : null,
                  )}
                </div>
                {lock?.demesneTiers[d.id] == null ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    patch((x) => {
                      const demesnes = x.demesnes.filter((y) => y.id !== d.id);
                      return {
                        ...x,
                        demesnes,
                        purchasedDpEssence: demesnes.some((y) => (y.picks?.length || y.tier) > 0)
                          ? x.purchasedDpEssence
                          : 0,
                      };
                    })
                  }
                >
                  <X />
                </Button>
                ) : null}
              </div>
              <Row label="Tier">
                <Stepper
                  value={d.picks.length || d.tier}
                  min={lock?.demesneTiers[d.id] ?? 1}
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
                {d.picks.map((p) => {
                  const taken = new Set(
                    c.demesnes.flatMap((tree) =>
                      tree.picks
                        .filter((q) => q.abilityId && !(tree.id === d.id && q.tier === p.tier))
                        .map((q) => q.abilityId),
                    ),
                  );
                  const frozen = Boolean(
                    lock?.demesnePicks?.[d.id]?.some((lp) => lp.tier === p.tier && lp.abilityId),
                  );
                  return (
                  <div className="space-y-2" key={p.tier}>
                    <Field label={`Tier ${p.tier} demesne`}>
                      <MenuSelect
                        fit={true}
                        disabled={frozen}
                        value={p.element}
                        onChange={(v) => {
                          if (frozen) return;
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
                                            element: (v || "fire") as DemesneElement,
                                            abilityId: "",
                                          }
                                        : q,
                                    ),
                                  }
                                : y,
                            ),
                          }));
                        }}
                        placeholder="Choose demesne"
                        options={CORE_DEMESNE_ELEMENTS.map((el) => ({
                          value: el,
                          label: DEMESNE_META[el].name,
                        }))}
                      />
                    </Field>
                    <AbilitySelect
                      list={(DEMESNE_ABILITIES[p.element] ?? [])
                        .filter((a) => a.id === p.abilityId || !taken.has(a.id))
                        .map((a) => ({
                          ...a,
                          text: demesnePlayText(p.element, a, d.picks.length || d.tier),
                        }))}
                      value={p.abilityId}
                      disabled={frozen}
                      onChange={(id) => {
                        if (frozen) return;
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
                                          abilityId: taken.has(id) ? q.abilityId : id,
                                        }
                                      : q,
                                  ),
                                }
                              : y,
                          ),
                        }));
                      }}
                      placeholder={`Ability T${p.tier}`}
                    />
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {canAdd ? (
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
                  picks: [
                    {
                      tier: 1,
                      element: "fire",
                      abilityId: "",
                    },
                  ],
                },
              ],
            }))
          }
        >
          <Plus />
          {" Add Demesne tree"}
        </AffordButton>
      ) : null}
    </Panel>
  );
}
function TricksBlock({ c, patch }: { c: Character; patch: Patch }) {
  const { remaining, dedicatedRemaining, shop } = useBudget();
  const lock = usePurchaseLock();
  const types = proficientWeaponTypes(c);
  const categories = (Object.keys(TRICK_LABELS) as TrickCategory[]).filter((cat) => {
    if (cat === "axemaster") return types.includes("Axe");
    if (cat === "swordmaster") return types.includes("Sword");
    if (cat === "rangemaster") return types.includes("Bow");
    return true;
  });
  const combatOpen = c.tricks.some((t) => !t.abilityId);
  const socialOpen = c.socialTricks.some((t) => !t.abilityId);
  const showCombat =
    shopShow(shop, remaining, dedicatedRemaining, "tricks", nextTierCost(3, c.tricks.length)) ||
    (shop && combatOpen);
  const showSocial =
    shopShow(
      shop,
      remaining,
      dedicatedRemaining,
      "social",
      nextTierCost(3, c.socialTricks.length),
    ) ||
    (shop && socialOpen);
  if (!showCombat && !showSocial) return null;
  return (
    <Panel title="Tricks" action={<span>{"3ST \u00B7 CP / SP = 3 \u00D7 tier"}</span>}>
      {showCombat ? (
        <Fragment>
          <h3 className="mb-2 text-sm font-medium">{"Combat Tricks"}</h3>
          <p className="mb-2 text-sm text-muted">{COMBAT_TRICKS_TEXT}</p>
          {types.includes("Sword") || types.includes("Axe") || types.includes("Bow") ? (
            <p className="mb-2 text-sm text-muted">
              {types.includes("Sword") ? "Swordmaster unlocked. " : ""}
              {types.includes("Axe") ? "Axemaster unlocked. " : ""}
              {types.includes("Bow") ? "Rangemaster unlocked. " : ""}
              {"Pick the matching category on a trick."}
            </p>
          ) : null}
          <Row label="Tier">
            <Stepper
              value={c.tricks.length}
              min={lock?.tricks ?? 0}
              nextCost={nextTierCost(3, c.tricks.length)}
              spendKey="tricks"
              onChange={(v) =>
                patch((x) => {
                  const next = x.tricks.slice(0, v);
                  while (next.length < v)
                    next.push({
                      id: uid(),
                      category: "combat",
                      abilityId: "",
                    });
                  return {
                    ...x,
                    tricks: next,
                  };
                })
              }
            />
          </Row>
          <div className="mt-3 space-y-3">
            {c.tricks.map((t, i) => (
              <div className="space-y-2" key={t.id}>
                <Field label={`Combat Trick ${i + 1}`}>
                  <MenuSelect
                    value={categories.includes(t.category) ? t.category : t.category}
                    onChange={(v) =>
                      patch((x) => ({
                        ...x,
                        tricks: x.tricks.map((y) =>
                          y.id === t.id
                            ? {
                                ...y,
                                category: (v || "combat") as TrickCategory,
                                abilityId: "",
                              }
                            : y,
                        ),
                      }))
                    }
                    placeholder="Choose tree"
                    options={(categories.includes(t.category)
                      ? categories
                      : [t.category, ...categories]
                    ).map((cat) => ({
                      value: cat,
                      label: TRICK_LABELS[cat],
                      text:
                        cat === "swordmaster"
                          ? "Requires Sword proficiency."
                          : cat === "axemaster"
                            ? "Requires Axe proficiency."
                            : cat === "rangemaster"
                              ? "Requires Bow proficiency."
                              : undefined,
                    }))}
                  />
                </Field>
                <AbilitySelect
                  list={TRICKS[t.category]}
                  value={t.abilityId}
                  onChange={(id) =>
                    patch((x) => ({
                      ...x,
                      tricks: x.tricks.map((y) =>
                        y.id === t.id
                          ? {
                              ...y,
                              abilityId: id,
                            }
                          : y,
                      ),
                    }))
                  }
                  placeholder="Choose combat trick"
                  tier={c.tricks.length}
                />
              </div>
            ))}
          </div>
        </Fragment>
      ) : null}
      {showSocial ? (
        <Fragment>
          <h3 className="mt-6 mb-2 text-sm font-medium">{"Social Tricks"}</h3>
          <p className="mb-2 text-sm text-muted">{SOCIAL_TRICKS_TEXT}</p>
          <Row label="Tier">
            <Stepper
              value={c.socialTricks.length}
              min={lock?.social ?? 0}
              nextCost={nextTierCost(3, c.socialTricks.length)}
              spendKey="social"
              onChange={(v) =>
                patch((x) => {
                  const next = x.socialTricks.slice(0, v);
                  while (next.length < v)
                    next.push({
                      id: uid(),
                      abilityId: "",
                    });
                  return {
                    ...x,
                    socialTricks: next,
                  };
                })
              }
            />
          </Row>
          <div className="mt-3 space-y-3">
            {c.socialTricks.map((t, i) => (
              <Field label={`Social Trick ${i + 1}`} key={t.id}>
                <AbilitySelect
                  list={SOCIAL_TRICKS}
                  value={t.abilityId}
                  onChange={(id) =>
                    patch((x) => ({
                      ...x,
                      socialTricks: x.socialTricks.map((y) =>
                        y.id === t.id
                          ? {
                              ...y,
                              abilityId: id,
                            }
                          : y,
                      ),
                    }))
                  }
                  placeholder="Choose social trick"
                  tier={c.socialTricks.length}
                />
              </Field>
            ))}
          </div>
        </Fragment>
      ) : null}
    </Panel>
  );
}
function SkillsBlock({ c, patch }: { c: Character; patch: Patch }) {
  const { remaining, dedicatedRemaining, shop } = useBudget();
  const lock = usePurchaseLock();
  const setTree = (key: "athletics" | "subterfuge" | "hunting", tree: SimpleTree) =>
    patch((x) => ({
      ...x,
      [key]: tree,
    }));
  const canAddon = useCanAfford(10);
  const showAth =
    shopShow(shop, remaining, dedicatedRemaining, "ath", nextTierCost(3, c.athletics.tier)) ||
    (shop && c.athletics.picks.some((p) => !p.abilityId));
  const showSub =
    shopShow(shop, remaining, dedicatedRemaining, "sub", nextTierCost(3, c.subterfuge.tier)) ||
    (shop && c.subterfuge.picks.some((p) => !p.abilityId));
  const showAddons = shopShow(
    shop,
    remaining,
    dedicatedRemaining,
    "sub-addons",
    10,
    c.subterfugeAddons.length < SUBTERFUGE_ADDONS.length,
  );
  const showHunt =
    shopShow(
      shop,
      remaining,
      dedicatedRemaining,
      "hunt",
      nextTierCost(3, c.hunting.tier),
    ) ||
    (shop && c.hunting.picks.some((p) => !p.abilityId));
  if (!showAth && !showSub && !showAddons && !showHunt) return null;
  return (
    <Panel title="Athletics, Subterfuge, Hunting">
      {showAth ? (
        <Fragment>
          <h3 className="mb-2 text-sm font-medium">{"Athletics \u2014 3ST"}</h3>
          <p className="mb-2 text-sm text-muted">{ATHLETICS_TEXT}</p>
          <Row label="Tier">
            <Stepper
              value={c.athletics.tier}
              min={lock?.athletics ?? 0}
              nextCost={nextTierCost(3, c.athletics.tier)}
              spendKey="ath"
              onChange={(v) =>
                setTree("athletics", {
                  tier: v,
                  picks: resizePicks(c.athletics.picks, v, ATHLETICS.length),
                })
              }
            />
          </Row>
          <div className="mt-2 space-y-2">
            {c.athletics.picks.map((p) => (
              <AbilitySelect
                list={ATHLETICS}
                value={p.abilityId}
                onChange={(id) =>
                  setTree("athletics", {
                    ...c.athletics,
                    picks: c.athletics.picks.map((q) =>
                      q.tier === p.tier
                        ? {
                            ...q,
                            abilityId: id,
                          }
                        : q,
                    ),
                  })
                }
                placeholder={`Athletics T${p.tier}`}
                tier={c.athletics.tier}
                key={p.tier}
              />
            ))}
          </div>
        </Fragment>
      ) : null}
      {showSub ? (
        <Fragment>
          <h3 className="mt-5 mb-2 text-sm font-medium">{"Subterfuge \u2014 3ST"}</h3>
          <p className="mb-2 text-sm text-muted">{SUBTERFUGE_TEXT}</p>
          <Row label="Tier">
            <Stepper
              value={c.subterfuge.tier}
              min={lock?.subterfuge ?? 0}
              nextCost={nextTierCost(3, c.subterfuge.tier)}
              spendKey="sub"
              onChange={(v) =>
                setTree("subterfuge", {
                  tier: v,
                  picks: resizePicks(c.subterfuge.picks, v, SUBTERFUGE.length),
                })
              }
            />
          </Row>
          <div className="mt-2 space-y-2">
            {c.subterfuge.picks.map((p) => (
              <AbilitySelect
                list={SUBTERFUGE}
                value={p.abilityId}
                onChange={(id) =>
                  setTree("subterfuge", {
                    ...c.subterfuge,
                    picks: c.subterfuge.picks.map((q) =>
                      q.tier === p.tier
                        ? {
                            ...q,
                            abilityId: id,
                          }
                        : q,
                    ),
                  })
                }
                placeholder={`Subterfuge T${p.tier}`}
                tier={c.subterfuge.tier}
                key={p.tier}
              />
            ))}
          </div>
        </Fragment>
      ) : null}
      {showHunt ? (
        <Fragment>
          <h3 className="mt-5 mb-2 text-sm font-medium">{"Monster Hunting \u2014 3ST"}</h3>
          <p className="mb-2 text-sm text-muted">{MONSTER_HUNTING_TEXT}</p>
          <Row label="Tier">
            <Stepper
              value={c.hunting.tier}
              min={lock?.hunting ?? 0}
              nextCost={nextTierCost(3, c.hunting.tier)}
              spendKey="hunt"
              onChange={(v) =>
                setTree("hunting", {
                  tier: v,
                  picks: resizePicks(c.hunting.picks, v, MONSTER_HUNTING.length),
                })
              }
            />
          </Row>
          <div className="mt-2 space-y-2">
            {c.hunting.picks.map((p) => {
              const taken = new Set(
                c.hunting.picks
                  .filter((q) => q.tier !== p.tier && q.abilityId)
                  .map((q) => q.abilityId),
              );
              return (
                <AbilitySelect
                  list={MONSTER_HUNTING.filter((a) => a.id === p.abilityId || !taken.has(a.id))}
                  value={p.abilityId}
                  onChange={(id) =>
                    setTree("hunting", {
                      ...c.hunting,
                      picks: c.hunting.picks.map((q) =>
                        q.tier === p.tier
                          ? {
                              ...q,
                              abilityId: id,
                            }
                          : q,
                      ),
                    })
                  }
                  placeholder={`Monster Hunting T${p.tier}`}
                  tier={c.hunting.tier}
                  key={p.tier}
                />
              );
            })}
          </div>
        </Fragment>
      ) : null}
      {showAddons ? (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium">{"One Time Buys"}</h3>
          <div className="space-y-3">
            {SUBTERFUGE_ADDONS.map((a) => {
              const on = c.subterfugeAddons.includes(a.id);
              return (
                <div key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!on && !canAddon) return;
                      if (on && lock?.subterfugeAddons.includes(a.id)) return;
                      patch((x) => ({
                        ...x,
                        subterfugeAddons: on
                          ? x.subterfugeAddons.filter((id) => id !== a.id)
                          : [...x.subterfugeAddons, a.id],
                      }));
                    }}
                    className={`h-9 rounded-full px-3 text-sm ${on ? "bg-burgundy text-parchment" : "bg-cream text-ink-soft shadow-[inset_0_0_0_1px_rgba(42,28,20,0.12)]"}`}
                    title={!on && !canAddon ? "10 more essence is needed to increase this tier" : undefined}
                  >
                    {a.name}
                    {" \u00B7 10"}
                  </button>
                  {a.text ? <p className="mt-1 text-sm text-muted">{a.text}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
function CraftingBlock({ c, patch }: { c: Character; patch: Patch }) {
  const ingenuity = derive(c).ingenuity;
  const { remaining, dedicatedRemaining, shop } = useBudget();
  const lock = usePurchaseLock();
  const setSmith = (tree: SimpleTree) => patch((x) => ({ ...x, smith: tree }));
  const setHarvest = (tree: SimpleTree) => patch((x) => ({ ...x, harvest: tree }));
  const setForaging = (tree: SimpleTree) => patch((x) => ({ ...x, foraging: tree }));
  const setMining = (tree: SimpleTree) => patch((x) => ({ ...x, mining: tree }));
  const showSmith =
    shopShow(
      shop,
      remaining,
      dedicatedRemaining,
      "smith",
      nextTierCost(5, c.smith.tier),
    ) ||
    (shop && c.smith.picks.some((p) => !p.abilityId));
  const showHarvest =
    shopShow(
      shop,
      remaining,
      dedicatedRemaining,
      "harvest",
      nextTierCost(3, c.harvest.tier),
    ) ||
    (shop && c.harvest.picks.some((p) => !p.abilityId));
  const showForage =
    shopShow(
      shop,
      remaining,
      dedicatedRemaining,
      "forage",
      nextTierCost(3, c.foraging.tier),
    ) ||
    (shop && c.foraging.picks.some((p) => !p.abilityId));
  const showMine =
    shopShow(
      shop,
      remaining,
      dedicatedRemaining,
      "mine",
      nextTierCost(3, c.mining.tier),
    ) ||
    (shop && c.mining.picks.some((p) => !p.abilityId));
  if (!showSmith && !showHarvest && !showForage && !showMine) return null;
  return (
    <Panel title="Crafting">
      {showSmith ? (
        <Fragment>
          <h3 className="mb-2 text-sm font-medium">{"Smith — 5ST"}</h3>
          <p className="mb-2 text-sm text-muted">{SMITH_TEXT}</p>
          <Row label="Tier">
            <Stepper
              value={c.smith.tier}
              min={lock?.smith ?? 0}
              nextCost={nextTierCost(5, c.smith.tier)}
              spendKey="smith"
              onChange={(v) =>
                setSmith({
                  tier: v,
                  picks: resizePicks(c.smith.picks, v, SMITHING.length),
                })
              }
            />
          </Row>
          {c.smith.tier > 0 ? (
            <p className="mt-2 text-sm text-muted">
              {"Ingenuity "}
              {ingenuity}
              {" + Smith "}
              {c.smith.tier}
              {" = "}
              {ingenuity + c.smith.tier}
              {" · +"}
              {c.smith.tier}
              {" Accuracy · Tier "}
              {smithCraftItemTier(c.smith.tier)}
              {" items"}
            </p>
          ) : null}
          <div className="mt-2 space-y-2">
            {c.smith.picks.map((p) => {
              const taken = new Set(
                c.smith.picks
                  .filter((q) => q.tier !== p.tier && q.abilityId)
                  .map((q) => q.abilityId),
              );
              return (
                <AbilitySelect
                  list={SMITHING.filter((a) => a.id === p.abilityId || !taken.has(a.id))}
                  value={p.abilityId}
                  onChange={(id) =>
                    setSmith({
                      ...c.smith,
                      picks: c.smith.picks.map((q) =>
                        q.tier === p.tier
                          ? {
                              ...q,
                              abilityId: id,
                            }
                          : q,
                      ),
                    })
                  }
                  placeholder={`Smith T${p.tier}`}
                  tier={c.smith.tier}
                  key={p.tier}
                />
              );
            })}
          </div>
        </Fragment>
      ) : null}
      {showHarvest ? (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium">Harvest — 3ST</h3>
          <p className="mb-2 text-sm text-muted">{HARVEST_TEXT}</p>
          <Row label="Tier">
            <Stepper
              value={c.harvest.tier}
              min={lock?.harvest ?? 0}
              nextCost={nextTierCost(3, c.harvest.tier)}
              spendKey="harvest"
              onChange={(v) =>
                setHarvest({
                  tier: v,
                  picks: resizePicks(c.harvest.picks, v, HARVEST.length),
                })
              }
            />
          </Row>
          <div className="mt-2 space-y-2">
            {c.harvest.picks.map((p) => {
              const taken = new Set(
                c.harvest.picks.filter((q) => q.tier !== p.tier && q.abilityId).map((q) => q.abilityId),
              );
              return (
                <AbilitySelect
                  list={HARVEST.filter((a) => a.id === p.abilityId || !taken.has(a.id))}
                  value={p.abilityId}
                  onChange={(id) =>
                    setHarvest({
                      ...c.harvest,
                      picks: c.harvest.picks.map((q) =>
                        q.tier === p.tier ? { ...q, abilityId: id } : q,
                      ),
                    })
                  }
                  placeholder={`Harvest T${p.tier}`}
                  tier={c.harvest.tier}
                  key={p.tier}
                />
              );
            })}
          </div>
        </div>
      ) : null}
      {showForage ? (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium">Foraging — 3ST</h3>
          <p className="mb-2 text-sm text-muted">{FORAGING_TEXT}</p>
          <Row label="Tier">
            <Stepper
              value={c.foraging.tier}
              min={lock?.foraging ?? 0}
              nextCost={nextTierCost(3, c.foraging.tier)}
              spendKey="forage"
              onChange={(v) =>
                setForaging({
                  tier: v,
                  picks: resizePicks(c.foraging.picks, v, FORAGING.length),
                })
              }
            />
          </Row>
          <div className="mt-2 space-y-2">
            {c.foraging.picks.map((p) => {
              const taken = new Set(
                c.foraging.picks.filter((q) => q.tier !== p.tier && q.abilityId).map((q) => q.abilityId),
              );
              return (
                <AbilitySelect
                  list={FORAGING.filter((a) => a.id === p.abilityId || !taken.has(a.id))}
                  value={p.abilityId}
                  onChange={(id) =>
                    setForaging({
                      ...c.foraging,
                      picks: c.foraging.picks.map((q) =>
                        q.tier === p.tier ? { ...q, abilityId: id } : q,
                      ),
                    })
                  }
                  placeholder={`Foraging T${p.tier}`}
                  tier={c.foraging.tier}
                  key={p.tier}
                />
              );
            })}
          </div>
        </div>
      ) : null}
      {showMine ? (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-medium">Mining — 3ST</h3>
          <p className="mb-2 text-sm text-muted">{MINING_TEXT}</p>
          <Row label="Tier">
            <Stepper
              value={c.mining.tier}
              min={lock?.mining ?? 0}
              nextCost={nextTierCost(3, c.mining.tier)}
              spendKey="mine"
              onChange={(v) =>
                setMining({
                  tier: v,
                  picks: resizePicks(c.mining.picks, v, MINING.length),
                })
              }
            />
          </Row>
          <div className="mt-2 space-y-2">
            {c.mining.picks.map((p) => {
              const taken = new Set(
                c.mining.picks.filter((q) => q.tier !== p.tier && q.abilityId).map((q) => q.abilityId),
              );
              return (
                <AbilitySelect
                  list={MINING.filter((a) => a.id === p.abilityId || !taken.has(a.id))}
                  value={p.abilityId}
                  onChange={(id) =>
                    setMining({
                      ...c.mining,
                      picks: c.mining.picks.map((q) =>
                        q.tier === p.tier ? { ...q, abilityId: id } : q,
                      ),
                    })
                  }
                  placeholder={`Mining T${p.tier}`}
                  tier={c.mining.tier}
                  key={p.tier}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
function isDemesneCharm(item: GearItem): boolean {
  return item.charm === true || item.name.trim() === "Tier 1 Demesne Charm";
}

function asWeight(v: string): ArmorWeight | undefined {
  return (ARMOR_WEIGHTS as readonly string[]).includes(v) ? (v as ArmorWeight) : undefined;
}

function weaponTypeBlurb(t: WeaponType): string {
  if (t === "Bow") return "Ranged. Agility or Perception ≥ WP Tier.";
  if ((THROWN_WEAPON_TYPES as readonly string[]).includes(t)) {
    return "Melee or thrown. Strength or Agility ≥ WP Tier.";
  }
  return "Melee. Strength or Agility ≥ WP Tier.";
}

function asWeapon(v: string): WeaponType {
  return (WEAPON_TYPES as readonly string[]).includes(v) ? (v as WeaponType) : "Sword";
}

function weaponNameForType(name: string, type: WeaponType | undefined, range?: string): string {
  const generics = new Set<string>([
    "",
    "Common Melee Weapon",
    "Common Ranged Weapon",
    ...WEAPON_TYPES.map((t) => `Common ${t}`),
  ]);
  if (!generics.has(name.trim())) return name;
  if (!type) return (range ?? "").includes("30") ? "Common Ranged Weapon" : "Common Melee Weapon";
  return `Common ${type}`;
}

const CHARM_PLACEHOLDER = "Choose a Tier 1 ability.";

function NumField({
  label,
  value,
  onChange,
  wide,
  allowEmpty,
}: {
  label: string;
  value: number | "";
  onChange: (next: number | undefined) => void;
  wide?: boolean;
  allowEmpty?: boolean;
}) {
  return (
    <Field label={label} nowrap className={wide ? "w-36 shrink-0" : "w-20 shrink-0"}>
      <Input
        type="number"
        min={0}
        inputMode="numeric"
        className="h-8 px-2 text-sm tabular-nums"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "" && allowEmpty) onChange(undefined);
          else onChange(Number(raw) || 0);
        }}
      />
    </Field>
  );
}

function CharmFields({
  item,
  onPatch,
}: {
  item: GearItem;
  onPatch: (next: Partial<GearItem>) => void;
}) {
  const element = item.charmElement;
  const list = element ? (DEMESNE_ABILITIES[element] ?? []) : [];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Demesne" className="shrink-0">
          <MenuSelect
            value={element ?? ""}
            allowEmpty={false}
            fit
            placeholder="Pick"
            options={CORE_DEMESNE_ELEMENTS.map((el) => ({
              value: el,
              label: DEMESNE_META[el].name,
            }))}
            onChange={(v) => {
              const next = v as DemesneElement;
              onPatch({
                charm: true,
                charmElement: next,
                charmAbilityId: undefined,
                dp: item.dp ?? 25,
                abilities: CHARM_PLACEHOLDER,
              });
            }}
          />
        </Field>
        <Field label="Tier 1 ability" className="min-w-0 max-w-full shrink">
          <MenuSelect
            value={item.charmAbilityId ?? ""}
            disabled={!element}
            fit
            placeholder={element ? "Choose" : "Ability"}
            options={list.map((a) => ({
              value: a.id,
              label: a.name,
              text: element ? demesnePlayText(element, a, 1) : a.text,
            }))}
            onChange={(id) => {
              const next = list.find((a) => a.id === id);
              onPatch({
                charm: true,
                charmElement: element,
                charmAbilityId: id || undefined,
                dp: item.dp ?? 25,
                abilities: next && element ? charmAbilityNote(element, next) : CHARM_PLACEHOLDER,
              });
            }}
          />
        </Field>
        <NumField
          label="DP"
          value={item.dp ?? 25}
          onChange={(n) => onPatch({ charm: true, dp: n ?? 0 })}
        />
      </div>
      {!element ? <p className="text-sm text-muted">Choose a demesne first.</p> : null}
    </div>
  );
}

function GearBlock({
  c,
  patch,
  relics,
  airships,
}: {
  c: Character;
  patch: Patch;
  relics: Relic[];
  airships: Airship[];
}) {
  const lock = usePurchaseLock();
  const [spendingId, setSpendingId] = useState<string | null>(null);
  const listedRelics = relics.filter((r) => r.listed !== false);
  const setItem = (id: string, fn: (item: GearItem) => GearItem) =>
    patch((x) => ({
      ...x,
      items: x.items.map((i) => (i.id === id ? fn(i) : i)),
    }));

  return (
    <Panel title="Equipment">
      <p className="mb-3 text-sm text-muted">
        Add or swap gear any time. Item Essence does not spend the character’s Essence.
      </p>
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
          <MenuSelect
            value={c.airshipId ?? ""}
            onChange={(v) => patch((x) => ({ ...x, airshipId: v || null }))}
            placeholder="None"
            options={airships.map((a) => ({
              value: a.id,
              label: a.name || "Unnamed keel",
              text: `Size ${a.size}`,
            }))}
          />
        </Field>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {STARTER_ITEMS.map((t) => (
          <Button
            key={t.name}
            size="sm"
            variant="outline"
            onClick={() =>
              patch((x) => {
                const item = makeItem({
                  ...t,
                  equipped: false,
                  locked: x.sheetOpened === false ? undefined : false,
                });
                const next = { ...x, items: [...x.items, item] };
                return x.sheetOpened === false ? next : autoEquipItems(next);
              })
            }
          >
            <Plus /> {t.name}
          </Button>
        ))}
      </div>
      <div className="mb-3">
        <Field label="Take from Relics">
          <MenuSelect
            value=""
            onChange={(id) => {
              if (!id) return;
              const r = listedRelics.find((x) => x.id === id);
              if (!r) return;
              if (c.items.some((i) => i.relicId === r.id)) return;
              patch((x) => {
                const gear = relicToGear(r);
                const next = {
                  ...x,
                  items: [...x.items, { ...gear, locked: x.sheetOpened === false ? undefined : false }],
                };
                return x.sheetOpened === false ? next : autoEquipItems(next);
              });
            }}
            placeholder="Matching relics…"
            options={listedRelics.map((r) => ({
              value: r.id,
              label: r.name || "Unnamed",
              text: [
                r.kind,
                r.kind === "weapon" && r.weaponType,
                r.kind === "armor" && r.armorWeight,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
        </Field>
      </div>
      <div className="space-y-3">
        {c.items.map((item) => {
          const charm = item.kind === "demesne" && isDemesneCharm(item);
          const sealed = c.sheetOpened !== false && item.locked !== false;
          if (sealed && spendingId === item.id) {
            return (
              <ItemSpend
                key={item.id}
                item={item}
                onPatch={(fn) => setItem(item.id, fn)}
                onLock={() => {
                  setItem(item.id, commitItemPurchases);
                  setSpendingId(null);
                }}
              />
            );
          }
          if (sealed) {
            return (
              <LockedItem
                key={item.id}
                c={c}
                item={item}
                patch={patch}
                onSpend={itemCanSpend(item) ? () => setSpendingId(item.id) : undefined}
              />
            );
          }
          return (
            <div key={item.id} className="rounded-2xl bg-cream p-3">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex items-end gap-2">
                  <Field label="Name" className="min-w-0 flex-1">
                    <Input
                      className="h-11"
                      value={item.name}
                      onChange={(e) => setItem(item.id, (i) => ({ ...i, name: e.target.value }))}
                    />
                  </Field>
                  <NumField
                    label="Essence"
                    value={item.essence}
                    onChange={(n) => setItem(item.id, (i) => ({ ...i, essence: n ?? 0 }))}
                  />
                  {lock?.itemIds.includes(item.id) ? null : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="mb-0.5 shrink-0"
                    aria-label="Remove item"
                    onClick={() =>
                      patch((x) => ({ ...x, items: x.items.filter((i) => i.id !== item.id) }))
                    }
                  >
                    <X />
                  </Button>
                  )}
                </div>
                {item.kind === "weapon" ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-end gap-2">
                      <Field label="Weapon type" className="shrink-0">
                        <MenuSelect
                          fit
                          value={item.weaponType ?? ""}
                          onChange={(v) => {
                            const weaponType = (WEAPON_TYPES as readonly string[]).includes(v)
                              ? (v as WeaponType)
                              : undefined;
                            setItem(item.id, (i) => ({
                              ...i,
                              weaponType,
                              name: weaponNameForType(i.name, weaponType, i.range),
                              range: weaponType ? rangeForWeaponType(weaponType, i.range) : i.range,
                              wv: weaponType ? damageForWeaponType(weaponType, i.wv ?? 0) : i.wv,
                            }));
                          }}
                          placeholder="Type"
                          options={WEAPON_TYPES.map((t) => ({
                            value: t,
                            label: t,
                            text: weaponTypeBlurb(t),
                          }))}
                        />
                      </Field>
                      <NumField
                        wide
                        label="Physical Damage"
                        value={item.wv ?? 0}
                        onChange={(n) => setItem(item.id, (i) => ({ ...i, wv: n ?? 0 }))}
                      />
                      <Field label="Range" className="w-36 shrink-0">
                        <Input
                          className="h-8 px-2 text-sm"
                          value={item.range ?? ""}
                          onChange={(e) =>
                            setItem(item.id, (i) => ({ ...i, range: e.target.value }))
                          }
                        />
                      </Field>
                    </div>
                    {item.weaponType ? (
                      <p className="text-sm text-muted">{weaponTypeBlurb(item.weaponType)}</p>
                    ) : (
                      <p className="text-sm text-muted">Choose a weapon type.</p>
                    )}
                  </div>
                ) : null}
                {item.kind === "armor" ? (
                  <div className="space-y-2">
                    <Field label="Armor type" className="shrink-0">
                      <MenuSelect
                        fit
                        value={item.armorWeight ?? ""}
                        onChange={(v) => {
                          const weight = asWeight(v);
                          setItem(item.id, (i) => ({
                            ...i,
                            armorWeight: weight,
                            soak: i.soak ?? 4,
                            durability: i.durability ?? 4,
                            currentDurability: i.currentDurability ?? i.durability ?? 4,
                            equipped: false,
                            name:
                              !i.name ||
                              i.name === "Common Armor" ||
                              /^Common (Light|Medium|Heavy) Armor$/.test(i.name)
                                ? weight
                                  ? `Common ${ARMOR_WEIGHT_LABELS[weight]} Armor`
                                  : "Common Armor"
                                : i.name,
                          }));
                        }}
                        placeholder="Type"
                        options={ARMOR_WEIGHTS.map((w) => ({
                          value: w,
                          label: ARMOR_WEIGHT_LABELS[w],
                          text: `Requires ${ARMOR_WEIGHT_LABELS[w]} armor proficiency to equip.`,
                        }))}
                      />
                    </Field>
                    {item.armorWeight ? (
                      <p className="text-sm text-muted">
                        Requires {ARMOR_WEIGHT_LABELS[item.armorWeight]} armor proficiency to equip.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {item.kind === "shield" ? (
                  <div className="space-y-2">
                    <Field label="Shield type" className="shrink-0">
                      <MenuSelect
                        fit
                        value={item.shieldWeight ?? ""}
                        onChange={(v) => {
                          const weight = asWeight(v);
                          setItem(item.id, (i) => ({
                            ...i,
                            shieldWeight: weight,
                            soak: i.soak ?? 4,
                            durability: i.durability ?? 4,
                            currentDurability: i.currentDurability ?? i.durability ?? 4,
                            equipped: false,
                            name:
                              !i.name ||
                              i.name === "Common Shield" ||
                              /^Common (Light|Medium|Heavy) Shield$/.test(i.name)
                                ? weight
                                  ? `Common ${ARMOR_WEIGHT_LABELS[weight]} Shield`
                                  : "Common Shield"
                                : i.name,
                          }));
                        }}
                        placeholder="Type"
                        options={ARMOR_WEIGHTS.map((w) => ({
                          value: w,
                          label: ARMOR_WEIGHT_LABELS[w],
                          text: `Requires ${ARMOR_WEIGHT_LABELS[w]} shield proficiency to equip.`,
                        }))}
                      />
                    </Field>
                    {item.shieldWeight ? (
                      <p className="text-sm text-muted">
                        Requires {ARMOR_WEIGHT_LABELS[item.shieldWeight]} shield proficiency to equip.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {item.kind === "armor" || item.kind === "shield" ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <NumField
                      label="Soak"
                      value={item.soak ?? 0}
                      onChange={(n) => setItem(item.id, (i) => ({ ...i, soak: n ?? 0 }))}
                    />
                    <NumField
                      wide
                      label="Durability"
                      value={item.durability ?? 0}
                      onChange={(n) =>
                        setItem(item.id, (i) => ({
                          ...i,
                          durability: n ?? 0,
                          currentDurability: n ?? 0,
                        }))
                      }
                    />
                  </div>
                ) : null}
                {charm ? (
                  <CharmFields
                    item={item}
                    onPatch={(next) => setItem(item.id, (i) => ({ ...i, ...next }))}
                  />
                ) : null}
                <div className="flex flex-wrap items-end gap-2">
                  <NumField
                    wide
                    label="Earned Essence"
                    value={item.earnedEssence ?? 0}
                    onChange={(n) => setItem(item.id, (i) => ({ ...i, earnedEssence: n ?? 0 }))}
                  />
                  {item.kind === "demesne" && !charm ? (
                    <NumField
                      label="DP"
                      value={item.dp ?? 0}
                      onChange={(n) => setItem(item.id, (i) => ({ ...i, dp: n ?? 0 }))}
                    />
                  ) : null}
                </div>
                <Textarea
                  rows={2}
                  className="min-h-16 py-2 text-sm"
                  placeholder="Abilities, +10, fatigue"
                  value={item.abilities}
                  onChange={(e) => setItem(item.id, (i) => ({ ...i, abilities: e.target.value }))}
                />
                {c.sheetOpened !== false ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" onClick={() => setItem(item.id, sealItem)}>
                      <Lock /> Lock in
                    </Button>
                    <EquipToggle
                      equipped={item.equipped}
                      reason={item.equipped ? null : equipReason(c, item)}
                      onEquip={() => patch((x) => setItemEquipped(x, item.id, true))}
                      onUnequip={() => patch((x) => setItemEquipped(x, item.id, false))}
                    />
                  </div>
                ) : null}
              </div>
              {c.sheetOpened !== false && !item.equipped && equipReason(c, item) ? (
                <p className="mt-2 text-xs text-muted">{equipReason(c, item)}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function lockedStatLine(item: GearItem): string {
  const bits: string[] = [];
  if (item.kind === "weapon") {
    if (item.weaponType) bits.push(item.weaponType);
    if (item.wv) bits.push(`Physical Damage ${item.wv}`);
    if (item.range) bits.push(item.range);
  }
  if (item.kind === "armor" || item.kind === "shield") {
    const weight = item.kind === "armor" ? item.armorWeight : item.shieldWeight;
    if (weight) bits.push(ARMOR_WEIGHT_LABELS[weight]);
    if (item.soak != null) bits.push(`Soak ${item.soak}`);
    if (item.durability != null) bits.push(`Durability ${item.durability}`);
  }
  if (item.accuracy) bits.push(`Accuracy +${item.accuracy}`);
  if (item.extraActions) bits.push(`+${item.extraActions} action`);
  if (item.dp) bits.push(`DP ${item.dp}`);
  return bits.join(" · ");
}

function LockedItem({
  c,
  item,
  patch,
  onSpend,
}: {
  c: Character;
  item: GearItem;
  patch: Patch;
  onSpend?: () => void;
}) {
  const setEarned = (n: number) =>
    patch((x) => ({
      ...x,
      items: x.items.map((i) => (i.id === item.id ? { ...i, earnedEssence: n } : i)),
    }));
  const title = item.name?.trim() || (item.kind === "weapon" ? item.weaponType || "Weapon" : "Item");
  const stats = lockedStatLine(item);
  const note = item.abilities?.trim();
  return (
    <div className="rounded-2xl bg-cream p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{title}</p>
          {stats ? <p className="text-sm text-muted">{stats}</p> : null}
          {note && !/^starter\b/i.test(note) ? <p className="text-sm text-muted">{note}</p> : null}
        </div>
        <EquipToggle
          equipped={item.equipped}
          reason={item.equipped ? null : equipReason(c, item)}
          onEquip={() => patch((x) => setItemEquipped(x, item.id, true))}
          onUnequip={() => patch((x) => setItemEquipped(x, item.id, false))}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <NumField
          wide
          label="Earned Essence"
          value={item.earnedEssence ?? 0}
          onChange={(n) => setEarned(n ?? 0)}
        />
        {onSpend ? (
          <Button size="sm" onClick={onSpend}>
            Spend Essence
          </Button>
        ) : null}
      </div>
      {!item.equipped && equipReason(c, item) ? (
        <p className="mt-2 text-xs text-muted">{equipReason(c, item)}</p>
      ) : null}
    </div>
  );
}

function ItemSpend({
  item,
  onPatch,
  onLock,
}: {
  item: GearItem;
  onPatch: (fn: (item: GearItem) => GearItem) => void;
  onLock: () => void;
}) {
  const floors = item.lockedStats ?? {
    wv: item.wv ?? 0,
    soak: item.soak ?? 0,
    durability: item.durability ?? 0,
    extraActions: item.extraActions ?? 0,
    range: item.range ?? "",
    accuracy: item.accuracy ?? 0,
  };
  const left = itemEssenceLeft(item);
  const tryPatch = (next: GearItem) => {
    const cost = itemUpgradeCost(next);
    if (cost > (next.earnedEssence ?? 0)) return;
    onPatch(() => next);
  };
  return (
    <div className="rounded-2xl bg-cream p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">{item.name?.trim() || "Item"}</p>
          <p className="text-sm text-muted">
            {left} Essence left on this item. Lock in keeps what you buy. A smith can still change it later.
          </p>
        </div>
        <Button size="sm" onClick={onLock}>
          <Lock /> Lock in
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <NumField
          wide
          label="Earned Essence"
          value={item.earnedEssence ?? 0}
          onChange={(n) =>
            onPatch((i) => ({ ...i, earnedEssence: Math.max(itemUpgradeCost(i), n ?? 0) }))
          }
        />
      </div>
      <div className="space-y-2">
        {item.kind === "weapon" ? (
          <>
            <BuyRow
              label="Physical Damage 2ST"
              value={item.wv ?? 0}
              min={floors?.wv ?? 0}
              nextCost={nextTierCost(2, item.wv ?? 0)}
              left={left}
              onChange={(v) => tryPatch({ ...item, wv: v })}
            />
            <BuyRow
              label="Range"
              value={parseRangeFeet(item.range)}
              min={parseRangeFeet(floors?.range)}
              step={rangeIncrementFeet(item.weaponType)}
              suffix="'"
              nextCost={nextRangeCost(parseRangeFeet(item.range), item.weaponType) ?? 0}
              left={left}
              onChange={(v) => tryPatch({ ...item, range: formatRangeFeet(v) })}
            />
          </>
        ) : null}
        {item.kind === "armor" || item.kind === "shield" ? (
          <>
            <BuyRow
              label="Soak 1ST"
              value={item.soak ?? 0}
              min={floors?.soak ?? 0}
              nextCost={nextTierCost(1, item.soak ?? 0)}
              left={left}
              onChange={(v) => tryPatch({ ...item, soak: v })}
            />
            <BuyRow
              label="Durability 1ST"
              value={item.durability ?? 0}
              min={floors?.durability ?? 0}
              nextCost={nextTierCost(1, item.durability ?? 0)}
              left={left}
              onChange={(v) => tryPatch({ ...item, durability: v, currentDurability: v })}
            />
          </>
        ) : null}
        <BuyRow
          label="Accuracy 5ST"
          value={item.accuracy ?? 0}
          min={floors?.accuracy ?? 0}
          nextCost={nextTierCost(5, item.accuracy ?? 0)}
          left={left}
          onChange={(v) => tryPatch({ ...item, accuracy: v })}
        />
        <BuyRow
          label="Extra Actions 20ST"
          value={item.extraActions ?? 0}
          min={floors?.extraActions ?? 0}
          max={3}
          nextCost={nextTierCost(20, item.extraActions ?? 0)}
          left={left}
          onChange={(v) => tryPatch({ ...item, extraActions: v })}
        />
      </div>
    </div>
  );
}

function BuyRow({
  label,
  value,
  min,
  max = 15,
  step = 1,
  suffix = "",
  nextCost,
  left,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  step?: number;
  suffix?: string;
  nextCost: number;
  left: number;
  onChange: (next: number) => void;
}) {
  const up = value + step;
  const canUp = up <= max && (nextCost <= 0 || left >= nextCost);
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          size="icon-sm"
          variant="outline"
          disabled={value - step < min}
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Lower ${label}`}
        >
          <Minus />
        </Button>
        <span className="w-10 text-center font-display text-xl tabular-nums">
          {value}
          {suffix}
        </span>
        <Button
          size="icon-sm"
          variant="outline"
          disabled={!canUp}
          title={nextCost > 0 ? `${nextCost} Essence` : undefined}
          onClick={() => onChange(up)}
          aria-label={`Raise ${label}`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function NotesBlock({ c, patch }: { c: Character; patch: Patch }) {
  const lock = usePurchaseLock();
  return (
    <Panel title="Notes & Negative Traits">
      <Field label="Notes">
        <Textarea
          rows={6}
          value={c.notes}
          onChange={(e) =>
            patch((x) => ({
              ...x,
              notes: e.target.value,
            }))
          }
          placeholder="Session notes, secrets, unfinished business…"
        />
      </Field>
      <Field label="Other abilities" className="mt-3">
        <Textarea
          rows={3}
          value={c.otherAbilities}
          onChange={(e) =>
            patch((x) => ({
              ...x,
              otherAbilities: e.target.value,
            }))
          }
        />
      </Field>
      <div className="mt-4 space-y-2">
        {c.negativeTraits.map((t) => (
          <div className="grid gap-2 sm:grid-cols-[1fr_88px_1fr_40px]" key={t.id}>
            <Input
              placeholder="Trait"
              value={t.name}
              onChange={(e) =>
                patch((x) => ({
                  ...x,
                  negativeTraits: x.negativeTraits.map((y) =>
                    y.id === t.id
                      ? {
                          ...y,
                          name: e.target.value,
                        }
                      : y,
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
                    y.id === t.id
                      ? {
                          ...y,
                          essence: Number(e.target.value) || 0,
                        }
                      : y,
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
                    y.id === t.id
                      ? {
                          ...y,
                          notes: e.target.value,
                        }
                      : y,
                  ),
                }))
              }
            />
            {lock?.traitIds.includes(t.id) ? null : (
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
            )}
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            patch((x) => ({
              ...x,
              negativeTraits: [
                ...x.negativeTraits,
                {
                  id: uid(),
                  name: "",
                  essence: 0,
                  notes: "",
                },
              ],
            }))
          }
        >
          <Plus />
          {" Negative Trait"}
        </Button>
      </div>
    </Panel>
  );
}
function EquipToggle({
  equipped,
  reason,
  onEquip,
  onUnequip,
}: {
  equipped: boolean;
  reason: string | null;
  onEquip: () => void;
  onUnequip: () => void;
}) {
  if (equipped)
    return (
      <Button type="button" size="sm" variant="leather" className="self-start" onClick={onUnequip}>
        {"Unequip"}
      </Button>
    );
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="self-start"
      disabled={Boolean(reason)}
      onClick={onEquip}
    >
      {"Equip"}
    </Button>
  );
}
function Field({
  label,
  children,
  className,
  nowrap,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  nowrap?: boolean;
}) {
  return (
    <label className={className}>
      <div
        className={`mb-1 text-xs font-medium tracking-wide text-muted uppercase ${nowrap ? "whitespace-nowrap" : ""}`}
      >
        {label}
      </div>
      {children}
    </label>
  );
}
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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
function resizePicks(picks: TreePick[], tier: number, abilityCount?: number): TreePick[] {
  const slots = abilityCount == null ? tier : Math.min(tier, abilityCount);
  const next = picks.slice(0, slots);
  while (next.length < slots)
    next.push({
      tier: next.length + 1,
      abilityId: "",
    });
  return next.map((p, i) => ({
    ...p,
    tier: i + 1,
  }));
}
function resizeBonus(
  list: Array<"soak" | "durability">,
  tier: number,
): Array<"soak" | "durability"> {
  const next = list.slice(0, tier);
  while (next.length < tier) next.push("soak");
  return next;
}
function extraWeightAbilities(
  first: ArmorWeight | "",
  proficient: ArmorWeight[],
  currentId: string,
  kind: "armor" | "shield",
): AbilityDef[] {
  return ARMOR_WEIGHTS.filter((w) => {
    if (currentId === `type:${w}`) return true;
    return Boolean(first) && w !== first && !proficient.includes(w);
  }).map((w) => ({
    id: `type:${w}`,
    name: `Extra type: ${ARMOR_WEIGHT_LABELS[w]}`,
    text: `Adds ${ARMOR_WEIGHT_LABELS[w]} ${kind} proficiency. No ${kind} skill this tier.`,
  }));
}
function DefenseFields({
  title,
  kind,
  tree,
  skills,
  proficient,
  maxTier,
  nextCost,
  spendKey,
  typeOptions,
  gearEssence = null,
  about,
  onChange,
}: {
  title: string;
  kind: "armor" | "shield";
  tree: ArmorTree;
  skills: AbilityDef[];
  proficient: ArmorWeight[];
  maxTier: number;
  nextCost: number;
  spendKey: string;
  typeOptions: { value: string; label: string; text?: string }[];
  gearEssence?: number | null;
  about?: string;
  onChange: (tree: ArmorTree) => void;
}) {
  const bonusOptions = [
    {
      value: "soak",
      label: "+1 Soak",
    },
    {
      value: "durability",
      label: "+1 Durability",
    },
  ];
  const lock = usePurchaseLock();
  const floor = spendKey === "armor" ? lock?.armor : spendKey === "shield" ? lock?.shield : 0;
  const skillLabel = kind === "armor" ? "Armor" : "Shield";
  return (
    <Fragment>
      <h3 className="mt-6 mb-2 text-sm font-medium">{title}</h3>
      {about ? <p className="mb-2 text-sm text-muted">{about}</p> : null}
      <Row label="Tier">
        <Stepper
          value={tree.tier}
          min={floor ?? 0}
          max={Math.max(tree.tier, Math.min(8, maxTier))}
          nextCost={nextCost}
          spendKey={spendKey}
          onChange={(v) =>
            onChange({
              ...tree,
              tier: v,
              picks: resizePicks(tree.picks, v),
              bonuses: resizeBonus(tree.bonuses, v),
            })
          }
        />
      </Row>
      {tree.tier >= 1 ? (
        <div className="mt-3 space-y-3">
          <Field label={`First ${kind} type (grants proficiency)`}>
            <MenuSelect
              value={tree.weight}
              onChange={(v) => {
                const weight = asWeight(v) ?? "";
                onChange({
                  ...tree,
                  weight,
                  picks: tree.picks.map((p) =>
                    p.abilityId === `type:${weight}`
                      ? {
                          ...p,
                          abilityId: "",
                        }
                      : p,
                  ),
                });
              }}
              placeholder="Choose type"
              options={typeOptions}
            />
          </Field>
          {proficient.length ? (
            <p className="text-sm text-muted">
              {"Proficient: "}
              {proficient.map((w) => ARMOR_WEIGHT_LABELS[w]).join(", ")}
            </p>
          ) : null}
          {tree.weight ? (
            tree.picks.map((p, i) => {
              const extras =
                i > 0 ? extraWeightAbilities(tree.weight, proficient, p.abilityId, kind) : [];
              return (
                <Field
                  label={
                    i === 0 ? `Tier 1 ${skillLabel} Skill` : `Tier ${p.tier} — skill or extra type`
                  }
                  key={p.tier}
                >
                  <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                    <AbilitySelect
                      list={[...extras, ...skills]}
                      value={p.abilityId}
                      onChange={(id) =>
                        onChange({
                          ...tree,
                          picks: tree.picks.map((q) =>
                            q.tier === p.tier
                              ? {
                                  ...q,
                                  abilityId: id,
                                }
                              : q,
                          ),
                        })
                      }
                      placeholder={i === 0 ? `Choose T${p.tier} skill` : `Choose T${p.tier}`}
                      tier={tree.tier}
                      quality={{ gear: kind, essence: gearEssence }}
                    />
                    <MenuSelect
                      value={tree.bonuses[i] ?? "soak"}
                      onChange={(v) =>
                        onChange({
                          ...tree,
                          bonuses: tree.bonuses.map((b, j) =>
                            j === i ? (v === "durability" ? "durability" : "soak") : b,
                          ),
                        })
                      }
                      options={bonusOptions}
                      placeholder="+1 Soak or Durability"
                    />
                  </div>
                </Field>
              );
            })
          ) : (
            <p className="text-sm text-muted">
              {
                "First tier: pick Light, Medium, or Heavy. That type\u2019s proficiency is granted, then choose a skill and +1 Soak or Durability."
              }
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {
            "Add a tier, then choose a type. Tier 1 grants proficiency in that type. Later tiers can add another type instead of a skill."
          }
        </p>
      )}
    </Fragment>
  );
}
