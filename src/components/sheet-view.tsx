import { Pencil, Minus, Plus } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Panel, ShieldStat, StatChip } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input, NativeSelect } from "@/components/ui/input";
import { useDice } from "@/components/dice";
import { ChannelBanner, CombatPoolBar, ItemDpChip, SocialPoolBar, DemesnePoolBar } from "@/components/play-tracker";
import { exchangeStrike, listTableMates, saveHold, type TableMate } from "@/lib/campaigns.functions";
import {
  ARMOR_PATTERNS,
  ATHLETICS,
  DEMESNE_ABILITIES,
  DEMESNE_META,
  SHIELD_PATTERNS,
  MONSTER_HUNTING,
  FORAGING,
  HARVEST,
  MINING,
  SMITHING,
  SOCIAL_TRICKS,
  SUBTERFUGE,
  findAbility,
  smithCraftItemTier,
  TRICK_LABELS,
  TRICKS,
  armorSkillsForWeights,
  baneAbilityText,
  baneTargetLabel,
  isBaneAbility,
  shieldSkillsForWeights,
  wpSkillsForTypes,
} from "@/lib/op20/catalogs";
import { accuracyForWeapon, availableEssence, derive, equipReason, equippedArmor, equippedShield, isArmorProficient, isShieldProficient, itemDpCurrent, proficientArmorWeights, proficientShieldWeights, proficientWeaponTypes, setItemEquipped, signed, spend, totalEssence, treeElements } from "@/lib/op20/compute";
import { fillQualityTier, qualityBand, stepCost } from "@/lib/op20/formulas";
import { abilityRoll } from "@/lib/op20/rolls";
import { resolveStrike } from "@/lib/op20/resolve";
import { migrateCharacter } from "@/lib/op20/normalize";
import {
  allowsUnarmed,
  abilityForPick,
  abilityWriteup,
  bindCharm,
  bindSustain,
  boundOnAbility,
  channelCost,
  channelCostLine,
  channelLabel,
  channelOnAbility,
  channelPayLabel,
  charmAbilityNote,
  charmChannelDraft,
  charmTreeId,
  defenseShields,
  demesneChannelDraft,
  demesnePlayText,
  eligibleSustainItems,
  effectsOnItem,
  fillAttributeText,
  isChannelingAbility,
  liveBound,
  planChannelStart,
  playedAbilityText,
  selfSustainLines,
  startChannel,
  startCharmChannel,
  stopChannel,
  sustainCost,
  sustainCostLabel,
  sustainTargetLabel,
  unbindCharm,
  unbindSustain,
} from "@/lib/op20/sustain";
import type { ArmorWeight, ChannelState, Character, CoreDemesneElement, DemesnePick, DerivedStats, GearItem } from "@/lib/op20/types";
import { ARMOR_WEIGHT_LABELS, ATTR_KEYS, ATTR_LABELS, CORE_DEMESNE_ELEMENTS, DEMESNE_ELEMENTS } from "@/lib/op20/types";
import { useCharacters } from "@/store/characters";

export type SheetSection = "stats" | "combat" | "demesne" | "crafting" | "inventory" | "notes";

export function IdentityHero({
  character: c,
}: {
  character: Character;
}) {
  const update = useCharacters((s) => s.update);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [profession, setProfession] = useState(c.profession);

  const save = () => {
    update(c.id, (cur) => ({ ...cur, name: name.trim(), profession: profession.trim() }));
    setEditing(false);
  };

  return (
    <section className="ornament-frame rounded-[28px] p-6">
      <p className="text-xs tracking-[0.2em] text-burgundy uppercase">At the table</p>
      {editing ? (
        <div className="mt-3 space-y-3">
          <Input
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            placeholder="Profession"
            aria-label="Profession"
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            aria-label="Name"
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
          />
          <Button size="sm" onClick={save}>
            Save
          </Button>
        </div>
      ) : (
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">{c.profession || "Unassigned"}</p>
            <h1 className="font-display text-4xl text-ink">{c.name || "Unnamed"}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Edit name and profession"
            onClick={() => {
              setName(c.name);
              setProfession(c.profession);
              setEditing(true);
            }}
          >
            <Pencil />
          </Button>
        </div>
      )}
      {c.bio ? <p className="mt-2 max-w-2xl text-muted">{c.bio}</p> : null}
      {c.epoch ? <p className="mt-1 text-sm text-muted">Epoch · {c.epoch}</p> : null}
    </section>
  );
}

export function EssenceStrip({
  character: c,
  onSpend,
  canSpend,
}: {
  character: Character;
  onSpend?: () => void;
  canSpend?: boolean;
}) {
  const available = availableEssence(c);
  const total = totalEssence(c);
  const d = derive(c);
  const update = useCharacters((s) => s.update);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const earned = Math.floor(Number(amount) || 0);

  const addEssence = () => {
    if (earned <= 0) return;
    update(c.id, (cur) => ({ ...cur, earnedEssence: (cur.earnedEssence || 0) + earned }));
    setAmount("");
    setAdding(false);
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="lg:order-1">
        <ShieldStat label="Movement" value={d.movement} />
      </div>
      <div className="lg:order-2">
        <ShieldStat
          label="Actions"
          parts={[
            { label: "Attack", value: d.attackActions },
            { label: "Move", value: d.moveActions },
          ]}
        />
      </div>
      <div className="order-3 lg:order-5 lg:col-span-2">
        <ShieldStat label="Total Essence" value={total} sub="All received" />
      </div>
      <div className="stat-shield order-4 flex h-full min-h-[6.5rem] flex-col items-center justify-center px-2 py-3 text-center lg:order-6 lg:col-span-2">
        <div className="text-[10px] font-medium tracking-[0.16em] text-burgundy uppercase">
          Available Essence
        </div>
        <div className="font-display text-[2.35rem] leading-none tabular-nums text-ink">{available}</div>
        <div className="mt-2 flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:justify-center">
          <Dialog open={adding} onOpenChange={setAdding}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-9 w-[7.625rem] text-burgundy hover:bg-burgundy hover:text-cream"
              >
                Add Essence
              </Button>
            </DialogTrigger>
            <DialogContent title="Add Essence" className="space-y-3">
              <p className="text-sm text-muted">Earned Essence joins the pool you can spend.</p>
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                value={amount}
                placeholder="Amount"
                aria-label="Essence earned"
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addEssence();
                }}
              />
              <Button className="w-full" disabled={earned <= 0} onClick={addEssence}>
                {earned > 0 ? `Add ${earned} Essence` : "Add Essence"}
              </Button>
            </DialogContent>
          </Dialog>
          {onSpend ? (
            <Button
              size="sm"
              className="h-9 w-[7.625rem] text-cream shadow-none hover:bg-cream hover:text-burgundy hover:shadow-[inset_0_0_0_1px_#7c2d22]"
              disabled={!canSpend}
              title={canSpend ? "Spend available Essence" : "Need more Essence to buy anything"}
              onClick={onSpend}
            >
              Spend Essence
            </Button>
          ) : null}
        </div>
      </div>
      <div className="order-5 lg:order-3">
        <ShieldStat label="Tic" value={d.tic} />
      </div>
      <div className="order-6 lg:order-4">
        <ShieldStat label="Gildar" value={c.gildar} />
      </div>
    </div>
  );
}

function demesneResistRows(c: Character): Array<[string, string]> {
  const used = new Set<string>();
  const rows: Array<[string, string]> = CORE_DEMESNE_ELEMENTS.map((el) => {
    const name = DEMESNE_META[el].name;
    used.add(name.toLowerCase());
    return [`Resist ${name}`, String(demesneResist(c, name))];
  });
  for (const r of c.resistSpecific) {
    const key = r.label.trim().toLowerCase();
    if (!key || used.has(key)) continue;
    used.add(key);
    rows.push([`Resist ${r.label}`, String(demesneResist(c, r.label))]);
  }
  return rows;
}

function demesneResist(c: Character, name: string): number {
  const specific = c.resistSpecific
    .filter((r) => r.label.trim().toLowerCase() === name.trim().toLowerCase())
    .reduce((n, r) => n + r.tier, 0);
  return c.resistDemesneAll + specific;
}

function derivedChips(d: DerivedStats) {
  const chips = [
    { label: "Prowess", value: d.prowess },
    { label: "Precision", value: d.precision },
    { label: "Discernment", value: d.discernment },
    { label: "Force of Will", value: d.forceOfWill },
    { label: "Fortitude", value: d.fortitude },
    { label: "Reflex", value: d.reflex },
    { label: "Aura", value: d.aura },
    { label: "Majesty", value: d.majesty },
    { label: "Resolve", value: d.resolve },
    { label: "Withstanding", value: d.withstanding },
    { label: "Ingenuity", value: d.ingenuity },
  ];
  const longLabels = new Set(
    [...chips]
      .sort((a, b) => b.label.length - a.label.length)
      .slice(0, 3)
      .map((chip) => chip.label),
  );
  return [
    ...chips.filter((chip) => !longLabels.has(chip.label)),
    ...chips.filter((chip) => longLabels.has(chip.label)),
  ];
}

function weaponCategory(type: string): string {
  if (type === "Claws") return type;
  if (type.endsWith("Axe")) return `${type.slice(0, -3)}Axes`;
  return `${type}s`;
}

/** Twelve columns: four across, and a leftover row of three shares the width. */
function derivedSpan(index: number, total: number) {
  const rem = total % 4;
  if (rem === 0 || index < total - rem) return "col-span-3";
  if (rem === 3) return "col-span-4";
  if (rem === 2) return "col-span-6";
  return "col-span-12";
}

export function SheetView({
  character: c,
  sections,
}: {
  character: Character;
  sections?: SheetSection[];
  onSpend?: () => void;
}) {
  const d = derive(c);
  const migrated = migrateCharacter(c);
  const hunting = migrated.hunting;
  const smith = migrated.smith;
  const harvest = migrated.harvest;
  const foraging = migrated.foraging;
  const mining = migrated.mining;
  const wpSkills = wpSkillsForTypes(c.wp.types);
  const show = new Set(sections ?? ["stats", "combat", "demesne", "crafting", "inventory", "notes"]);
  const combatBlank =
    !c.items.some((i) => i.kind === "weapon" || i.kind === "armor" || i.kind === "shield") &&
    c.wp.tier <= 0 &&
    c.armor.tier <= 0 &&
    c.shield.tier <= 0 &&
    c.tricks.length === 0 &&
    c.socialTricks.length === 0 &&
    c.athletics.tier <= 0 &&
    c.subterfuge.tier <= 0 &&
    hunting.tier <= 0;
  const craftingBlank = smith.tier <= 0 && harvest.tier <= 0 && foraging.tier <= 0 && mining.tier <= 0;
  const demesneBlank =
    !c.demesnes.some((dem) => (dem.picks.length || dem.tier) > 0) &&
    !c.items.some((i) => i.equipped && (i.charm || (i.dp ?? 0) > 0));
  const spent = spend(c).lines.filter((l) => l.essence > 0);

  return (
    <div className="space-y-5 print:space-y-3">
      {show.has("stats") ? (
        <>
          <div className="grid gap-5">
            <Panel title="Attributes">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {ATTR_KEYS.map((k) => {
                  const spent = stepCost(3, c.attributes[k]);
                  const earned = c.earnedByKey?.[`attr-${k}`] ?? 0;
                  return (
                    <ShieldStat
                      key={k}
                      label={ATTR_LABELS[k]}
                      value={signed(c.attributes[k])}
                      rollBonus={c.attributes[k]}
                      sub={earned ? `ess ${spent} · earned ${earned}` : `ess ${spent}`}
                    />
                  );
                })}
              </div>
            </Panel>
            <Panel title="Derived Stats">
              <div className="grid grid-cols-12 gap-2">
                {derivedChips(d).map((chip, i, all) => (
                  <div key={chip.label} className={derivedSpan(i, all.length)}>
                    <StatChip compact label={chip.label} value={signed(chip.value)} rollBonus={chip.value} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Defenses">
            <ul className="divide-y divide-rule text-sm">
              {defenseShields(c).map((row) => (
                <li key={row.key} className="flex items-start justify-between gap-3 py-1.5">
                  <span className="text-muted">{row.label}</span>
                  <span className="max-w-[62%] text-right">{row.detail}</span>
                </li>
              ))}
              {(
                [
                  ["Shield", wornShieldLine(c, d)],
                  ["Armor", wornArmorLine(c, d)],
                  ["Resist Physical", String(c.resistPhysical)],
                  ...demesneResistRows(c),
                ] as Array<[string, string]>
              ).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3 py-1.5">
                  <span className="text-muted">{k}</span>
                  <span className="tabular-nums">{v}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : null}

      {show.has("combat") ? (
        <>
          {combatBlank ? <p className="text-sm text-muted">No abilities purchased.</p> : null}
          <CombatPoolBar character={c} />
          <CombatLoadout character={c} />
          {c.wp.tier > 0 || c.armor.tier > 0 || c.shield.tier > 0 ? (
            <Panel title="Proficiencies">
              {c.wp.tier > 0 ? (
                <div className="mb-5">
                  <h3 className="mb-3 flex items-baseline justify-between gap-3 border-b border-rule pb-2 font-display text-lg text-burgundy">
                    Weapon Proficiency
                    <span className="font-display text-2xl leading-none text-ink">T{c.wp.tier}</span>
                  </h3>
                  <p className="mb-2 text-sm text-muted">
                    {`+${c.wp.tier} Accuracy${
                      proficientWeaponTypes(c).length
                        ? ` with ${proficientWeaponTypes(c).map(weaponCategory).join(", ")}`
                        : ""
                    }`}
                  </p>
                  <ul className="space-y-2 text-sm">
                    {c.wp.picks
                      .filter((p) => !p.abilityId.startsWith("type:"))
                      .map((p) => {
                      const a = findAbility(wpSkills, p.abilityId);
                      const vs = isBaneAbility(p.abilityId) ? baneTargetLabel(p.against) : "";
                      return (
                        <li key={p.tier}>
                          <AbilityLine
                            character={c}
                            abilityId={p.abilityId}
                            name={`T${c.wp.tier}: ${a?.name ?? "—"}${vs ? ` vs ${vs}` : ""}`}
                            text={
                              a?.text
                                ? isBaneAbility(p.abilityId)
                                  ? baneAbilityText(a.text, p.against)
                                  : a.text
                                : undefined
                            }
                            tier={c.wp.tier}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              {c.armor.tier > 0 ? (
                <div className="mb-5">
                  <h3 className="mb-3 flex items-baseline justify-between gap-3 border-b border-rule pb-2 font-display text-lg text-burgundy">
                    Armor Proficiency
                    <span className="font-display text-2xl leading-none text-ink">T{c.armor.tier}</span>
                  </h3>
                  <p className="mb-2 text-sm text-muted">
                    {proficientArmorWeights(c).length
                      ? proficientArmorWeights(c).map((w) => ARMOR_WEIGHT_LABELS[w]).join(", ")
                      : "None"}
                    {c.armor.tier ? ` · +${d.armorSoakBonus} Soak / +${d.armorDurBonus} Dur` : ""}
                  </p>
                  {c.armor.picks
                    .filter((p) => !p.abilityId.startsWith("type:"))
                    .map((p) => {
                    const a = findAbility(armorSkillsForWeights(proficientArmorWeights(c)), p.abilityId);
                    return (
                      <div key={p.tier} className="mb-2 text-sm">
                        <AbilityLine
                          character={c}
                          abilityId={p.abilityId}
                          name={`T${c.armor.tier}: ${a?.name ?? "—"}`}
                          text={a?.text ? fillQualityTier(a.text, equippedArmor(c)?.essence ?? null, "armor") : undefined}
                          tier={c.armor.tier}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {c.shield.tier > 0 ? (
                <div>
                  <h3 className="mb-3 flex items-baseline justify-between gap-3 border-b border-rule pb-2 font-display text-lg text-burgundy">
                    Shield Proficiency
                    <span className="font-display text-2xl leading-none text-ink">T{c.shield.tier}</span>
                  </h3>
                  <p className="mb-2 text-sm text-muted">
                    {proficientShieldWeights(c).length
                      ? proficientShieldWeights(c).map((w) => ARMOR_WEIGHT_LABELS[w]).join(", ")
                      : "None"}
                    {c.shield.tier ? ` · +${d.shieldSoakBonus} Soak / +${d.shieldDurBonus} Dur` : ""}
                  </p>
                  {c.shield.picks
                    .filter((p) => !p.abilityId.startsWith("type:"))
                    .map((p) => {
                    const a = findAbility(shieldSkillsForWeights(proficientShieldWeights(c)), p.abilityId);
                    return (
                      <div key={p.tier} className="mb-2 text-sm">
                        <AbilityLine
                          character={c}
                          abilityId={p.abilityId}
                          name={`T${c.shield.tier}: ${a?.name ?? "—"}`}
                          text={a?.text ? fillQualityTier(a.text, equippedShield(c)?.essence ?? null, "shield") : undefined}
                          tier={c.shield.tier}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Panel>
          ) : null}
          {c.tricks.length > 0 || c.socialTricks.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {c.tricks.length > 0 ? (
                <Panel
                  title="Combat Tricks"
                  action={
                    <span className="font-display text-2xl leading-none text-ink">T{c.tricks.length}</span>
                  }
                >
                  <ul className="space-y-2 text-sm">
                    {c.tricks.map((t) => {
                      const a = findAbility(TRICKS[t.category], t.abilityId);
                      return (
                        <li key={t.id}>
                          <AbilityLine
                            character={c}
                            abilityId={t.abilityId}
                            name={`${a?.name ?? "—"} · ${TRICK_LABELS[t.category]}`}
                            text={a?.text}
                            tier={c.tricks.length}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              ) : null}
              {c.socialTricks.length > 0 ? (
                <Panel
                  title="Social Tricks"
                  action={
                    <span className="font-display text-2xl leading-none text-ink">
                      T{c.socialTricks.length}
                    </span>
                  }
                >
                  <SocialPoolBar character={c} />
                  <ul className="mt-3 space-y-2 text-sm">
                    {c.socialTricks.map((t) => {
                      const a = findAbility(SOCIAL_TRICKS, t.abilityId);
                      return (
                        <li key={t.id}>
                          <AbilityLine
                            character={c}
                            abilityId={t.abilityId}
                            name={a?.name ?? "—"}
                            text={a?.text}
                            tier={c.socialTricks.length}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              ) : null}
            </div>
          ) : null}
          {c.athletics.tier > 0 || c.subterfuge.tier > 0 || hunting.tier > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {c.athletics.tier > 0 ? (
                <Panel
                  title="Athletics"
                  action={
                    <span className="font-display text-2xl leading-none text-ink">T{c.athletics.tier}</span>
                  }
                >
                  <ul className="space-y-2 text-sm">
                    {c.athletics.picks.map((p) => {
                      const a = findAbility(ATHLETICS, p.abilityId);
                      return (
                        <li key={`a${p.tier}`}>
                          <AbilityLine
                            character={c}
                            abilityId={p.abilityId}
                            name={`T${c.athletics.tier}: ${a?.name ?? "—"}`}
                            text={a?.text}
                            tier={c.athletics.tier}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              ) : null}
              {c.subterfuge.tier > 0 ? (
                <Panel
                  title="Subterfuge"
                  action={
                    <span className="font-display text-2xl leading-none text-ink">T{c.subterfuge.tier}</span>
                  }
                >
                  <ul className="space-y-2 text-sm">
                    {c.subterfuge.picks.map((p) => {
                      const a = findAbility(SUBTERFUGE, p.abilityId);
                      return (
                        <li key={`s${p.tier}`}>
                          <AbilityLine
                            character={c}
                            abilityId={p.abilityId}
                            name={`T${c.subterfuge.tier}: ${a?.name ?? "—"}`}
                            text={a?.text}
                            tier={c.subterfuge.tier}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              ) : null}
              {hunting.tier > 0 ? (
                <Panel
                  title="Monster Hunting"
                  action={
                    <span className="font-display text-2xl leading-none text-ink">T{hunting.tier}</span>
                  }
                >
                  <ul className="space-y-2 text-sm">
                    {hunting.picks.map((p) => {
                      const a = findAbility(MONSTER_HUNTING, p.abilityId);
                      return (
                        <li key={`h${p.tier}`}>
                          <AbilityLine
                            character={c}
                            abilityId={p.abilityId}
                            name={`T${p.tier}: ${a?.name ?? "—"}`}
                            text={a?.text}
                            tier={hunting.tier}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {show.has("demesne") ? (
        <>
          {demesneBlank ? <p className="text-sm text-muted">No abilities purchased.</p> : null}
          <DemesnePoolBar character={c} />
          <ChannelBanner character={c} />
          {CORE_DEMESNE_ELEMENTS.some((el) => courtTier(c, el) > 0) ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CORE_DEMESNE_ELEMENTS.filter((el) => courtTier(c, el) > 0).map((el) => (
                <ShieldStat
                  key={el}
                  label={DEMESNE_META[el]?.name ?? el}
                  value={`T${courtTier(c, el)}`}
                  sub={demesneBonusStat(el)}
                />
              ))}
            </div>
          ) : null}
          {selfSustainLines(c).length ? (
            <Panel title="Sustained">
              <ul className="space-y-1.5 text-sm">
                {selfSustainLines(c).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Panel>
          ) : null}
          {migrated.demesnes.some((dem) => (dem.picks.length || dem.tier) > 0) ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {migrated.demesnes
                .filter((dem) => (dem.picks.length || dem.tier) > 0)
                .map((dem) => {
                  const els = treeElements(dem);
                  const title = els.map((el) => DEMESNE_META[el]?.name ?? el).join(" / ") || "Demesne";
                  const tier = dem.picks.length || dem.tier;
                  return (
                    <Panel
                      key={dem.id}
                      title={`Demesne · ${title}`}
                      action={<span className="font-display text-2xl leading-none text-ink">T{tier}</span>}
                    >
                      <ul className="space-y-3 text-sm">
                        {dem.picks.map((p) =>
                          p.abilityId ? (
                            <AbilityCard
                              key={p.tier}
                              character={migrated}
                              treeId={dem.id}
                              pick={p}
                              powerTier={tier}
                            />
                          ) : (
                            <li key={p.tier} className="text-sm text-muted">
                              T{p.tier}: choose an ability.
                            </li>
                          ),
                        )}
                      </ul>
                    </Panel>
                  );
                })}
            </div>
          ) : null}
          <CharmAbilities character={migrated} />
          <DpStorageCards character={migrated} />
        </>
      ) : null}

      {show.has("crafting") ? (
        craftingBlank ? (
          <p className="text-sm text-muted">No abilities purchased.</p>
        ) : (
          <div className="space-y-5">
            {smith.tier > 0 ? (
              <Panel
                title="Smith"
                action={<span className="font-display text-2xl leading-none text-ink">T{smith.tier}</span>}
              >
                <p className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium">
                      {"Ingenuity "}
                      {d.ingenuity}
                      {" + Smith "}
                      {smith.tier}
                      {" = "}
                      {d.ingenuity + smith.tier}
                    </span>
                    <span className="text-muted">
                      {" · +"}
                      {smith.tier}
                      {" Accuracy · Tier "}
                      {smithCraftItemTier(smith.tier)}
                      {" items"}
                    </span>
                  </span>
                  <BonusRoll label="Smith" bonus={d.ingenuity + smith.tier} />
                </p>
                <ul className="space-y-2 text-sm">
                  {smith.picks.map((p) => {
                    const a = findAbility(SMITHING, p.abilityId);
                    return (
                      <li key={`m${p.tier}`}>
                        <AbilityLine
                          character={c}
                          abilityId={p.abilityId}
                          name={`T${p.tier}: ${a?.name ?? "—"}`}
                          text={a?.text}
                          tier={smith.tier}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ) : null}
            {harvest.tier > 0 ? (
              <Panel
                title="Harvest"
                action={<span className="font-display text-2xl leading-none text-ink">T{harvest.tier}</span>}
              >
                <ul className="space-y-2 text-sm">
                  {harvest.picks.map((p) => {
                    const a = findAbility(HARVEST, p.abilityId);
                    return (
                      <li key={`harv${p.tier}`}>
                        <AbilityLine
                          character={c}
                          abilityId={p.abilityId}
                          name={`T${p.tier}: ${a?.name ?? "—"}`}
                          text={a?.text}
                          tier={harvest.tier}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ) : null}
            {foraging.tier > 0 ? (
              <Panel
                title="Foraging"
                action={<span className="font-display text-2xl leading-none text-ink">T{foraging.tier}</span>}
              >
                <ul className="space-y-2 text-sm">
                  {foraging.picks.map((p) => {
                    const a = findAbility(FORAGING, p.abilityId);
                    return (
                      <li key={`for${p.tier}`}>
                        <AbilityLine
                          character={c}
                          abilityId={p.abilityId}
                          name={`T${p.tier}: ${a?.name ?? "—"}`}
                          text={a?.text}
                          tier={foraging.tier}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ) : null}
            {mining.tier > 0 ? (
              <Panel
                title="Mining"
                action={<span className="font-display text-2xl leading-none text-ink">T{mining.tier}</span>}
              >
                <ul className="space-y-2 text-sm">
                  {mining.picks.map((p) => {
                    const a = findAbility(MINING, p.abilityId);
                    return (
                      <li key={`mine${p.tier}`}>
                        <AbilityLine
                          character={c}
                          abilityId={p.abilityId}
                          name={`T${p.tier}: ${a?.name ?? "—"}`}
                          text={a?.text}
                          tier={mining.tier}
                        />
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ) : null}
          </div>
        )
      ) : null}

      {show.has("inventory") ? (
        <div className="space-y-5">
          <GearGroup title="Weapons" character={c} kinds={["weapon"]} />
          <GearGroup title="Armor" character={c} kinds={["armor"]} />
          <GearGroup title="Shield" character={c} kinds={["shield"]} />
          <GearGroup title="Inventory" character={c} kinds={["demesne", "other"]} />
          {c.items.length === 0 ? (
            <p className="text-sm text-muted">No gear purchased.</p>
          ) : null}
        </div>
      ) : null}

      {show.has("notes") ? (
        <div className="space-y-5">
          <Panel title="Notes & Negative Traits">
          {c.notes ? <p className="text-sm">{c.notes}</p> : <p className="text-sm text-muted">No notes yet.</p>}
          {c.otherAbilities ? <p className="mt-3 text-sm text-muted">{c.otherAbilities}</p> : null}
          {c.negativeTraits.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {c.negativeTraits.map((t) => (
                <li key={t.id}>
                  <span className="font-medium">{t.name || "Trait"}</span>
                  <span className="text-muted"> · +{t.essence} Essence</span>
                  {t.notes ? <p className="text-muted">{t.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          </Panel>
          <Panel title="Spent">
            {spent.length ? (
              <ul className="divide-y divide-rule text-sm">
                {spent.map((l) => (
                  <li key={l.key} className="flex justify-between gap-3 py-1.5">
                    <span className="text-muted">{l.label}</span>
                    <span className="tabular-nums">{l.essence}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing spent yet.</p>
            )}
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function CharmAbilities({ character: c }: { character: Character }) {
  const charms = c.items.filter((i) => i.charm && i.equipped);
  const d = derive(c);
  if (!charms.length) return null;
  return (
    <div className="space-y-5">
      {charms.map((item) => {
        const el = item.charmElement;
        const ability = el && item.charmAbilityId ? abilityForPick(el, item.charmAbilityId) : undefined;
        const attack = ability && el ? demesneAttack(el, ability, 1, d) : null;
        const note = ability && el ? charmAbilityNote(el, ability) : "";
        const prefix = ability ? `${ability.name}. ` : "";
        const body = note.startsWith(prefix) ? note.slice(prefix.length) : note;
        const name = item.name?.trim() || "Demesne item";
        const bindable = ability?.sustain?.mode === "bind";
        const channelable = ability?.sustain?.mode === "channel";
        const channeling = channelable && isChannelingAbility(c, charmTreeId(item.id), 1);
        const onChannel = channeling ? channelOnAbility(c, charmTreeId(item.id), 1) : undefined;
        return (
          <Panel key={item.id} title={name}>
              {ability && el ? (
                <div className="text-sm">
                  <span className="font-medium">
                    T1 {DEMESNE_META[el]?.name ?? el}: {ability.name}
                  </span>
                  {body ? <p className="text-muted">{fillAttributeText(body, c.attributes)}</p> : null}
                  {channelable && ability.sustain ? (
                    <p className="mt-1 text-sm tabular-nums">
                      {channelCostLine(c, ability.sustain, 1, charmTreeId(item.id))}
                    </p>
                  ) : null}
                  {onChannel ? (
                    <p className="mt-1 text-burgundy">Channeling · {onChannel.effect}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    {attack ? <BonusRoll label={attack.label} bonus={attack.bonus} /> : <span />}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <ItemDpChip character={c} item={item} />
                      {bindable && ability.sustain ? <CharmBoundBox character={c} item={item} /> : null}
                      {channelable && ability.sustain ? (
                        <CharmChannelButton character={c} item={item} />
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <ItemDpChip character={c} item={item} />
                  <p className="text-sm text-muted">Choose its Tier 1 ability on Inventory.</p>
                </div>
              )}
            </Panel>
        );
      })}
    </div>
  );
}

function ChannelButton({
  character: c,
  disabled,
  title,
  draft,
  start,
  label = "Channel",
  variant = "default",
}: {
  character: Character;
  disabled?: boolean;
  title?: string;
  draft: ChannelState | null;
  start: (cur: Character) => Character;
  label?: string;
  variant?: "default" | "outline";
}) {
  const update = useCharacters((s) => s.update);
  const [ask, setAsk] = useState<{ mode: "sure" | "which"; choices: ChannelState[] } | null>(null);

  const go = (stops: ChannelState[]) => {
    update(c.id, (cur) => {
      let next = cur;
      for (const ch of stops) next = stopChannel(next, ch.treeId, ch.pickTier);
      return start(next);
    });
    setAsk(null);
  };

  return (
    <>
      <Button
        size="sm"
        variant={variant}
        disabled={disabled}
        title={title}
        onClick={() => {
          if (!draft) {
            update(c.id, start);
            return;
          }
          const plan = planChannelStart(c, draft);
          if (plan.replaced.length === 0) {
            update(c.id, start);
            return;
          }
          setAsk({
            mode: plan.pick ? "which" : "sure",
            choices: plan.pick ? plan.choices : plan.replaced,
          });
        }}
      >
        {label}
      </Button>
      <Dialog
        open={ask != null}
        onOpenChange={(open) => {
          if (!open) setAsk(null);
        }}
      >
        <DialogContent
          title={
            ask?.mode === "which"
              ? "Which channel should stop?"
              : `Stop channel for ${
                  ask?.choices
                    .map((ch) => abilityForPick(ch.element, ch.abilityId)?.name ?? ch.abilityId)
                    .join(" and ") || "the active channel"
                }?`
          }
          className="space-y-3"
        >
          {ask?.mode === "which" ? (
            <p className="text-sm text-muted">This channel starts in its place. No leaves the ones you have.</p>
          ) : null}
          {ask?.mode === "which"
            ? ask.choices.map((ch) => (
                <Button
                  key={`${ch.treeId}:${ch.pickTier}`}
                  className="h-11 w-full"
                  variant="outline"
                  onClick={() => go([ch])}
                >
                  {channelLabel(ch)}
                </Button>
              ))
            : null}
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => setAsk(null)}>
              No
            </Button>
            {ask?.mode === "sure" ? (
              <Button className="flex-1" onClick={() => go(ask.choices)}>
                Yes
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CharmChannelButton({ character: c, item }: { character: Character; item: GearItem }) {
  const el = item.charmElement;
  const ability = el && item.charmAbilityId ? abilityForPick(el, item.charmAbilityId) : undefined;
  const sustain = ability?.sustain;
  const on = isChannelingAbility(c, charmTreeId(item.id), 1);
  const treeId = charmTreeId(item.id);
  const cost = sustain?.mode === "channel" ? channelCost(c, sustain, 1, treeId) : 0;
  const have = itemDpCurrent(item);
  const label = sustain?.mode === "channel" ? channelPayLabel(c, sustain, 1, treeId) : "";
  return (
    <ChannelButton
      character={c}
      variant={on ? "outline" : "default"}
      disabled={!on && have < cost}
      title={on ? "Stop this channel" : have < cost ? `Need ${label} in this item` : `Channel ${label}`}
      label={on ? "Stop Channel" : "Channel"}
      draft={on ? null : charmChannelDraft(c, item.id)}
      start={(cur) => (on ? stopChannel(cur, treeId, 1) : startCharmChannel(cur, item.id))}
    />
  );
}

function CharmBoundBox({ character: c, item }: { character: Character; item: GearItem }) {
  const update = useCharacters((s) => s.update);
  const [picking, setPicking] = useState(false);
  const el = item.charmElement;
  const ability = el && item.charmAbilityId ? abilityForPick(el, item.charmAbilityId) : undefined;
  const sustain = ability?.sustain;
  const bound = boundOnAbility(c, charmTreeId(item.id), 1);
  const shown = bound ? liveBound(c, bound) : null;
  const cost = sustain ? sustainCost(sustain, 1) : 0;
  const have = itemDpCurrent(item);
  const items = sustain ? eligibleSustainItems(c, sustain.target) : [];
  const canUnarmed = Boolean(sustain && allowsUnarmed(sustain.target));
  const hasTarget = sustain?.target === "self" || items.length > 0 || canUnarmed;
  const canBind = Boolean(sustain && !bound && hasTarget && have >= cost);

  const bindTo = (targetId: string | null) => {
    update(c.id, (cur) => bindCharm(cur, item.id, targetId));
    setPicking(false);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 items-center gap-2 rounded-lg bg-cream px-3 shadow-[inset_0_0_0_1px_rgba(42,28,20,0.16)]">
        <span className="text-[10px] font-medium tracking-[0.14em] text-burgundy uppercase">Bound DP</span>
        <span className="font-display text-lg leading-none tabular-nums text-ink">{shown?.dp ?? 0}</span>
      </div>
      <Button
        size="sm"
        variant={bound ? "outline" : "default"}
        disabled={!bound && !canBind}
        title={
          bound
            ? "Return this DP to the charm."
            : !hasTarget
              ? "Needs a target"
              : have < cost
                ? `Need ${cost} DP in this item`
                : `Bind ${cost} DP from this item`
        }
        onClick={() => {
          if (bound) {
            update(c.id, (cur) => unbindCharm(cur, item.id));
            return;
          }
          if (!sustain || !canBind) return;
          if (sustain.target === "self") bindTo(null);
          else setPicking(true);
        }}
      >
        {bound ? "Unbind DP" : "Bind DP"}
      </Button>
      {sustain && sustain.target !== "self" ? (
        <Dialog open={picking} onOpenChange={setPicking}>
          <DialogContent title={`Bind ${ability?.name ?? "ability"}`}>
            <p className="mt-1 text-sm text-muted">
              Choose {sustainTargetLabel(sustain.target)}. Costs {cost} DP from this item.
            </p>
            <ul className="mt-4 space-y-2">
              {items.map((target) => (
                <li key={target.id}>
                  <Button
                    variant="outline"
                    className="h-11 w-full justify-start"
                    onClick={() => bindTo(target.id)}
                  >
                    <span className="truncate">{gearTypeLabel(target)}</span>
                  </Button>
                </li>
              ))}
              {canUnarmed ? (
                <li>
                  <Button variant="outline" className="h-11 w-full justify-start" onClick={() => bindTo(null)}>
                    Unarmed
                  </Button>
                </li>
              ) : null}
            </ul>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function DpStorageCards({ character: c }: { character: Character }) {
  const items = c.items.filter((i) => !i.charm && i.equipped && i.kind === "demesne" && (i.dp ?? 0) > 0);
  if (!items.length) return null;
  return (
    <div className="space-y-5">
      {items.map((item) => (
        <Panel key={item.id} title={item.name?.trim() || "Item"}>
          <ItemDpChip character={c} item={item} />
        </Panel>
      ))}
    </div>
  );
}

function CombatLoadout({ character: c }: { character: Character }) {
  const { roll, reveal } = useDice();
  const update = useCharacters((s) => s.update);
  const [mates, setMates] = useState<TableMate[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const weapons = c.items.filter((i) => i.kind === "weapon");
  const equippedWeapons = weapons.filter((i) => i.equipped);
  const armor = c.items.filter((i) => i.kind === "armor" && i.equipped);
  const shields = c.items.filter((i) => i.kind === "shield" && i.equipped);
  const targetId = c.tracker.targetId ?? "";
  const target = mates.find((m) => m.characterId === targetId);
  const targetingMob = target?.kind === "mob";
  const mutual = Boolean(target && !targetingMob && target.targetId === c.id);

  useEffect(() => {
    let cancel = false;
    const load = () => {
      void listTableMates({ data: { characterId: c.id } })
        .then((row) => {
          if (cancel) return;
          setCampaignId(row?.campaignId ?? "");
          setMates(row?.mates ?? []);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, 8000);
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [c.id]);

  const strike = async (item: GearItem) => {
    const bonus = accuracyForWeapon(c, item);
    const label = gearTypeLabel(item);
    if (!targetId || !campaignId) {
      roll(label, bonus);
      return;
    }
    const local = useCharacters.getState().characters.find((x) => x.id === targetId);
    if (local) {
      if ((local.tracker.targetId ?? "") !== c.id) {
        roll(label, bonus);
        return;
      }
      const report = resolveStrike(c, local, item);
      update(c.id, (cur) => ({ ...cur, tracker: report.attackerTracker }));
      update(local.id, (cur) => ({ ...cur, tracker: report.defenderTracker }));
      reveal({
        label,
        d20: report.attack.d20,
        bonus: report.attack.bonus,
        fatigue: report.attack.fatigue,
        total: report.attack.total,
        lines: report.lines,
      });
      return;
    }
    try {
      await saveHold({ data: useCharacters.getState().exportPayload() });
      const result = await exchangeStrike({
        data: { campaignId, attackerId: c.id, weaponId: item.id },
      });
      if (!result.exchanged) {
        roll(label, bonus);
        return;
      }
      update(c.id, (cur) => ({ ...cur, tracker: result.attackerTracker }));
      reveal({
        label,
        d20: result.report.attack.d20,
        bonus: result.report.attack.bonus,
        fatigue: result.report.attack.fatigue,
        total: result.report.attack.total,
        lines: result.report.lines,
      });
    } catch {
      roll(label, bonus);
    }
  };

  if (!weapons.length && !armor.length && !shields.length && !campaignId) return null;

  return (
    <>
      {campaignId ? (
        <Panel title="Target">
          <NativeSelect
            value={targetId}
            onChange={(e) =>
              update(c.id, (cur) => ({
                ...cur,
                tracker: { ...cur.tracker, targetId: e.target.value },
              }))
            }
          >
            <option value="">No one</option>
            {mates.map((m) => (
              <option key={m.characterId} value={m.characterId}>
                {m.name}
              </option>
            ))}
          </NativeSelect>
          <p className="mt-2 text-sm text-muted">
            {targetingMob
              ? `Targeting ${target?.name}.`
              : mutual
                ? `You and ${target?.name} have each other targeted. An attack resolves the hit, Tic, shield, +10s, and Demesne Points.`
                : target
                  ? `${target.name} is not targeting you back yet. The attack only rolls until they do.`
                  : "Choose a character or a hostile on the table."}
          </p>
        </Panel>
      ) : null}
      {weapons.length ? (
        <Panel title="Weapons">
          {equippedWeapons.length ? (
            <ul className="space-y-3">
              {equippedWeapons.map((item) => {
                const bonus = accuracyForWeapon(c, item);
                return (
                  <GearCard
                    key={item.id}
                    character={c}
                    item={item}
                    actions={
                      <Button className="shrink-0" onClick={() => void strike(item)}>
                        {`Attack ${signed(bonus)}`}
                      </Button>
                    }
                  />
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">No weapon equipped. Equip one on Inventory.</p>
          )}
        </Panel>
      ) : null}
      {armor.length ? (
        <Panel title="Armor">
          <ul className="space-y-3">
            {armor.map((item) => (
              <GearCard key={item.id} character={c} item={item} trackDurability />
            ))}
          </ul>
        </Panel>
      ) : null}
      {shields.length ? (
        <Panel title="Shield">
          <ul className="space-y-3">
            {shields.map((item) => (
              <GearCard key={item.id} character={c} item={item} trackDurability />
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}

function demesneBonusStat(el: CoreDemesneElement): string {
  if (el === "air") return "Discernment";
  if (el === "earth") return "Fortitude";
  if (el === "water") return "Aura";
  return "Force of Will";
}

function courtTier(c: Character, el: CoreDemesneElement): number {
  return c.demesnes.reduce(
    (n, d) => n + d.picks.filter((p) => p.element === el).length,
    0,
  );
}

function AbilityText({
  text,
  tier,
  attributes,
}: {
  text: string;
  tier: number;
  attributes: Character["attributes"];
}) {
  return <p className="text-muted">{fillAttributeText(playedAbilityText(text, tier), attributes)}</p>;
}

function BonusRoll({ label, bonus }: { label: string; bonus: number }) {
  const { roll } = useDice();
  return (
    <Button className="shrink-0" onClick={() => roll(label, bonus)}>
      {`${label} ${signed(bonus)}`}
    </Button>
  );
}

function abilityButtonName(name: string): string {
  const stripped = name.replace(/^T\d+:\s*/, "");
  return stripped.split(" · ")[0]?.trim() || name;
}

function AbilityLine({
  character,
  abilityId,
  name,
  text,
  tier,
}: {
  character: Character;
  abilityId: string;
  name: string;
  text?: string;
  tier: number;
}) {
  const offer = text ? abilityRoll(character, abilityId, text, tier) : null;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <span className="font-medium">{name}</span>
        {text ? <AbilityText text={text} tier={tier} attributes={character.attributes} /> : null}
      </div>
      {offer ? <BonusRoll label={abilityButtonName(name)} bonus={offer.bonus} /> : null}
    </div>
  );
}

function gearPlayTier(c: Character, item: GearItem): number {
  if (item.kind === "weapon") return c.wp.tier;
  if (item.kind === "armor") return c.armor.tier;
  if (item.kind === "shield") return c.shield.tier;
  return 0;
}

function demesneAttack(
  element: DemesnePick["element"],
  ability: NonNullable<ReturnType<typeof findAbility>>,
  tier: number,
  d: DerivedStats,
): { label: string; bonus: number } | null {
  const blob = `${ability.text}\n${abilityWriteup(element, ability)}`;
  const stats: Array<[string, number]> = [
    ["Force of Will", d.forceOfWill],
    ["Discernment", d.discernment],
    ["Fortitude", d.fortitude],
    ["Reflex", d.reflex],
    ["Aura", d.aura],
    ["Prowess", d.prowess],
    ["Precision", d.precision],
  ];
  let named: { label: string; bonus: number; at: number } | null = null;
  for (const [label, base] of stats) {
    const at = blob.indexOf(`${label} vs`);
    if (at >= 0 && (!named || at < named.at)) named = { label, bonus: base + tier, at };
  }
  const bolt = /bolt/i.test(ability.name);
  if (!named && !bolt && !/\bvs\b/i.test(blob)) return null;
  if (named) return { label: named.label, bonus: named.bonus };
  if (element === "air") {
    const discern = bolt;
    return {
      label: discern ? "Discernment" : "Reflex",
      bonus: (discern ? d.discernment : d.reflex) + tier,
    };
  }
  if (element === "earth") return { label: "Fortitude", bonus: d.fortitude + tier };
  if (element === "water") return { label: "Aura", bonus: d.aura + tier };
  return { label: "Force of Will", bonus: d.forceOfWill + tier };
}

function AbilityCard({
  character: c,
  treeId,
  pick,
  powerTier,
}: {
  character: Character;
  treeId: string;
  pick: DemesnePick;
  powerTier: number;
}) {
  const update = useCharacters((s) => s.update);
  const { roll } = useDice();
  const d = derive(c);
  const [picking, setPicking] = useState(false);
  const ability = findAbility(DEMESNE_ABILITIES[pick.element], pick.abilityId);
  const attack = ability ? demesneAttack(pick.element, ability, powerTier, d) : null;
  const sustain = ability?.sustain;
  const bound = boundOnAbility(c, treeId, pick.tier);
  const channeling = isChannelingAbility(c, treeId, pick.tier);
  const onChannel = channeling ? channelOnAbility(c, treeId, pick.tier) : undefined;
  const cost = sustain
    ? sustain.mode === "channel"
      ? channelCost(c, sustain, powerTier, treeId)
      : sustainCost(sustain, powerTier)
    : 0;
  const costLabel =
    sustain?.mode === "channel"
      ? channelPayLabel(c, sustain, powerTier, treeId)
      : sustain
        ? sustainCostLabel(sustain, powerTier)
        : "";
  const items = sustain ? eligibleSustainItems(c, sustain.target) : [];
  const canUnarmed = Boolean(sustain && allowsUnarmed(sustain.target));
  const hasBindTarget = sustain?.target === "self" || items.length > 0 || canUnarmed;
  const canAfford = cost <= (c.tracker.currentDp ?? 0);

  const bindTo = (itemId: string | null) => {
    update(c.id, (cur) => bindSustain(cur, treeId, pick.tier, itemId));
    setPicking(false);
  };

  let status: string | null = null;
  if (bound && sustain) {
    const shown = liveBound(c, bound);
    const item = shown.itemId ? c.items.find((i) => i.id === shown.itemId) : undefined;
    const where = item
      ? ` on ${gearTypeLabel(item)}`
      : canUnarmed && shown.itemId === null && sustain.target !== "self"
        ? " on Unarmed"
        : "";
    status = `Bound · ${shown.effect}${where} (${shown.dp}DP Bound)`;
  } else if (onChannel && sustain) {
    status = `Channeling · ${onChannel.effect}`;
  }

  return (
    <li className="border-b border-rule pb-3 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="font-medium">
            T{powerTier} {DEMESNE_META[pick.element]?.name}: {ability?.name ?? "—"}
          </span>
          {ability ? (
            <p className="text-muted">
              {fillAttributeText(demesnePlayText(pick.element, ability, powerTier), c.attributes)}
            </p>
          ) : null}
          {attack ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => roll(attack.label, attack.bonus)}
            >
              {attack.label} {signed(attack.bonus)}
            </Button>
          ) : null}
          {sustain?.mode === "channel" ? (
            <p className="mt-1 text-sm tabular-nums">{channelCostLine(c, sustain, powerTier, treeId)}</p>
          ) : null}
          {status ? <p className="mt-1 text-burgundy">{status}</p> : null}
        </div>
        {sustain?.mode === "bind" ? (
          bound ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => update(c.id, (cur) => unbindSustain(cur, treeId, pick.tier))}
            >
              Unbind DP
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!hasBindTarget || !canAfford}
              title={
                !hasBindTarget
                  ? `Needs ${sustainTargetLabel(sustain.target)}`
                  : !canAfford
                    ? `Need ${costLabel}`
                    : `Bind ${costLabel}`
              }
              onClick={() => {
                if (sustain.target === "self") bindTo(null);
                else setPicking(true);
              }}
            >
              Bind DP
            </Button>
          )
        ) : null}
        {sustain?.mode === "channel" ? (
          channeling ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => update(c.id, (cur) => stopChannel(cur, treeId, pick.tier))}
            >
              Stop Channel
            </Button>
          ) : (
            <ChannelButton
              character={c}
              disabled={!canAfford}
              title={!canAfford ? `Need ${costLabel}` : `Channel ${costLabel}`}
              draft={demesneChannelDraft(c, treeId, pick.tier)}
              start={(cur) => startChannel(cur, treeId, pick.tier)}
            />
          )
        ) : null}
      </div>
      {sustain?.mode === "bind" && sustain.target !== "self" ? (
        <Dialog open={picking} onOpenChange={setPicking}>
          <DialogContent title={`Bind ${ability?.name ?? "ability"}`}>
            <p className="mt-1 text-sm text-muted">
              Choose {sustainTargetLabel(sustain.target)}. Costs {costLabel}.
            </p>
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <Button
                    variant="outline"
                    className="h-11 w-full justify-start"
                    onClick={() => bindTo(item.id)}
                  >
                    <span className="truncate">
                      {gearTypeLabel(item)}
                      {qualityBand(item.essence) ? ` · ${qualityBand(item.essence)}` : ""}
                      {distinctiveGearName(item) ? ` · ${distinctiveGearName(item)}` : ""}
                    </span>
                  </Button>
                </li>
              ))}
              {canUnarmed ? (
                <li>
                  <Button variant="outline" className="h-11 w-full justify-start" onClick={() => bindTo(null)}>
                    Unarmed
                  </Button>
                </li>
              ) : null}
              {!items.length && !canUnarmed ? (
                <li className="text-sm text-muted">No matching items.</li>
              ) : null}
            </ul>
          </DialogContent>
        </Dialog>
      ) : null}
    </li>
  );
}

function GearGroup({
  title,
  character: c,
  kinds,
}: {
  title: string;
  character: Character;
  kinds: Array<"weapon" | "armor" | "shield" | "demesne" | "other">;
}) {
  const items = c.items.filter((i) => kinds.includes(i.kind));
  if (!items.length) return null;
  return (
    <Panel title={title}>
      <ul className="space-y-3">
        {items.map((i) => (
          <InventoryRow key={i.id} character={c} itemId={i.id} />
        ))}
      </ul>
    </Panel>
  );
}

function durabilityText(item: GearItem, bonus: number): string {
  const { current, max } = itemDurability(item);
  const shown = current + bonus;
  const cap = max + bonus;
  return shown === cap ? String(shown) : `${shown}/${cap}`;
}

function itemDurability(item: GearItem): { current: number; max: number } {
  const max = Math.max(0, item.durability ?? 0);
  const current =
    item.currentDurability == null ? max : Math.max(0, Math.min(max, item.currentDurability));
  return { current, max };
}

function DurabilityStepper({ character: c, item }: { character: Character; item: GearItem }) {
  const update = useCharacters((s) => s.update);
  const { current, max } = itemDurability(item);
  if (max <= 0) return null;
  const set = (next: number) =>
    update(c.id, (cur) => ({
      ...cur,
      items: cur.items.map((i) => (i.id === item.id ? { ...i, currentDurability: next } : i)),
    }));
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-sm text-muted">Durability</span>
      <span className="text-sm tabular-nums">
        {current}
        {current === max ? "" : `/${max}`}
      </span>
      <Button
        size="icon-sm"
        variant="outline"
        className="size-7"
        disabled={current <= 0}
        aria-label="Lose durability"
        onClick={() => set(current - 1)}
      >
        <Minus />
      </Button>
      <Button
        size="icon-sm"
        variant="outline"
        className="size-7"
        disabled={current >= max}
        aria-label="Repair durability"
        onClick={() => set(current + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}

function wornArmorLine(c: Character, d: ReturnType<typeof derive>): string {
  const item = equippedArmor(c);
  if (!item) return "None equipped";
  const wt = item.armorWeight ? ARMOR_WEIGHT_LABELS[item.armorWeight] : "";
  return `${d.armorSoak} soak / ${durabilityText(item, Math.max(0, d.armorDur - (item.durability ?? 0)))} dur${wt ? ` · ${wt}` : ""}`;
}

function wornShieldLine(c: Character, d: ReturnType<typeof derive>): string {
  const item = equippedShield(c);
  if (!item) return "None equipped";
  const wt = item.shieldWeight ? ARMOR_WEIGHT_LABELS[item.shieldWeight] : "";
  return `${d.shieldSoak} soak / ${durabilityText(item, Math.max(0, d.shieldDur - (item.durability ?? 0)))} dur${wt ? ` · ${wt}` : ""}`;
}

function InventoryRow({ character: c, itemId }: { character: Character; itemId: string }) {
  const update = useCharacters((s) => s.update);
  const item = c.items.find((i) => i.id === itemId);
  if (!item) return null;
  const reason = item.equipped ? null : equipReason(c, item);
  return (
    <GearCard
      character={c}
      item={item}
      showEquipped
      actions={
        item.equipped ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => update(c.id, (cur) => setItemEquipped(cur, item.id, false))}
          >
            Unequip
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={Boolean(reason)}
            onClick={() => update(c.id, (cur) => setItemEquipped(cur, item.id, true))}
          >
            Equip
          </Button>
        )
      }
    />
  );
}

function GearCard({
  character: c,
  item,
  showEquipped,
  actions,
  trackDurability,
}: {
  character: Character;
  item: GearItem;
  showEquipped?: boolean;
  actions?: ReactNode;
  trackDurability?: boolean;
}) {
  const title = gearTypeLabel(item);
  const rarity = qualityBand(item.essence);
  const custom = distinctiveGearName(item);
  const stats = gearStatLine(c, item, trackDurability);
  const abilities = abilityText(item);
  const reason = item.equipped ? null : equipReason(c, item);

  return (
    <li className="border-b border-rule pb-3 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-medium">{title}</span>
            <span className="text-sm text-muted">{rarity}</span>
            {showEquipped && item.equipped ? (
              <span className="text-xs tracking-wide text-burgundy uppercase">Equipped</span>
            ) : null}
          </div>
          {custom ? <p className="text-sm text-muted">{custom}</p> : null}
          {stats ? <p className="text-sm text-muted">{stats}</p> : null}
          {trackDurability ? <DurabilityStepper character={c} item={item} /> : null}
          {abilities ? (
            <p className="text-sm text-muted">{playedAbilityText(abilities, gearPlayTier(c, item))}</p>
          ) : null}
          {effectsOnItem(c, item.id).map((line) => (
            <p key={line} className="mt-1 text-sm text-burgundy">
              {line}
            </p>
          ))}
          {showEquipped && reason ? <p className="mt-1 text-xs text-muted">{reason}</p> : null}
          <ItemDpChip character={c} item={item} />
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </li>
  );
}

function gearTypeLabel(item: GearItem): string {
  if (item.kind === "weapon") return item.weaponType || "Weapon";
  if (item.kind === "armor") {
    const pattern = ARMOR_PATTERNS.find((p) => p.id === item.armorPattern);
    if (pattern) return pattern.name;
    return item.armorWeight ? ARMOR_WEIGHT_LABELS[item.armorWeight] : "Armor";
  }
  if (item.kind === "shield") {
    const pattern = SHIELD_PATTERNS.find((p) => p.id === item.shieldPattern);
    if (pattern) return pattern.name;
    return item.shieldWeight ? ARMOR_WEIGHT_LABELS[item.shieldWeight] : "Shield";
  }
  return item.name?.trim() || "Item";
}

function distinctiveGearName(item: GearItem): string | null {
  if (item.kind !== "weapon" && item.kind !== "armor" && item.kind !== "shield") return null;
  const name = item.name?.trim();
  if (!name) return null;
  const type = item.weaponType ?? "";
  const weight =
    item.kind === "armor" && item.armorWeight
      ? ARMOR_WEIGHT_LABELS[item.armorWeight]
      : item.kind === "shield" && item.shieldWeight
        ? ARMOR_WEIGHT_LABELS[item.shieldWeight]
        : "";
  const generics = [
    "common melee weapon",
    "common ranged weapon",
    "common armor",
    "common shield",
    type ? `common ${type}` : "",
    weight ? `common ${weight} ${item.kind}` : "",
    weight ? `common ${weight}` : "",
    item.kind === "weapon" ? "weapon" : "",
    item.kind === "armor" ? "armor" : "",
    item.kind === "shield" ? "shield" : "",
  ]
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  if (generics.includes(name.toLowerCase())) return null;
  return name;
}

function gearStatLine(c: Character, item: GearItem, hideDurability = false): string {
  const bits: string[] = [];
  if (item.kind === "armor" && item.armorWeight && item.armorPattern) {
    bits.push(ARMOR_WEIGHT_LABELS[item.armorWeight]);
  }
  if (item.kind === "shield" && item.shieldWeight && item.shieldPattern) {
    bits.push(ARMOR_WEIGHT_LABELS[item.shieldWeight]);
  }
  if (item.wv != null && item.wv > 0) {
    bits.push(item.kind === "weapon" ? `Physical Damage ${item.wv}` : `Elemental Damage ${item.wv}`);
  }
  if (item.range) bits.push(playedAbilityText(item.range, gearPlayTier(c, item)));
  if (item.accuracy) bits.push(`Accuracy +${item.accuracy}`);
  const bonus = wornDefenseBonus(c, item);
  if (item.soak != null) bits.push(statWithBonus("Soak", item.soak, bonus.soak));
  if (!hideDurability && item.durability != null) bits.push(statWithBonus("Dur", item.durability, bonus.dur));
  if (item.boundDp) bits.push(`Bound DP ${item.boundDp}`);
  if (item.extraActions) bits.push(`+${item.extraActions} action`);
  return bits.join(" · ");
}

function wornDefenseBonus(c: Character, item: GearItem): { soak: number; dur: number } {
  if (!item.equipped) return { soak: 0, dur: 0 };
  const tree =
    item.kind === "armor" && isArmorProficient(c, item.armorWeight)
      ? c.armor
      : item.kind === "shield" && isShieldProficient(c, item.shieldWeight)
        ? c.shield
        : null;
  if (!tree) return { soak: 0, dur: 0 };
  return {
    soak: (tree.bonuses ?? []).filter((b) => b === "soak").length,
    dur: (tree.bonuses ?? []).filter((b) => b === "durability").length,
  };
}

function statWithBonus(label: string, base: number, bonus: number): string {
  if (bonus > 0) return `${label} ${base} (+${bonus})`;
  return `${label} ${base}`;
}

function abilityText(item: GearItem): string {
  const t = item.abilities?.trim() ?? "";
  if (!t) return "";
  if (/^starter\b/i.test(t)) return "";
  return t;
}
