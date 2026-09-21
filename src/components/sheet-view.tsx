import { Dices } from "lucide-react";
import { Panel, StatChip } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { useDice } from "@/components/dice";
import {
  ARMOR_SKILLS,
  ATHLETICS,
  DEMESNE_ABILITIES,
  DEMESNE_META,
  findAbility,
  SHIELD_SKILLS,
  SOCIAL_TRICKS,
  SUBTERFUGE,
  TRICK_LABELS,
  TRICKS,
  wpSkillsForTypes,
} from "@/lib/op20/catalogs";
import { accuracyForWeapon, derive, signed, spend, treeElements } from "@/lib/op20/compute";
import { qualityBand } from "@/lib/op20/formulas";
import type { ArmorWeight, Character } from "@/lib/op20/types";
import { ATTR_KEYS, ATTR_LABELS } from "@/lib/op20/types";

export type SheetSection = "stats" | "combat" | "demesne" | "inventory";

export function SheetView({
  character: c,
  sections,
  onSpend,
}: {
  character: Character;
  sections?: SheetSection[];
  onSpend?: () => void;
}) {
  const d = derive(c);
  const s = spend(c);
  const wpSkills = wpSkillsForTypes(c.wp.types);
  const show = new Set(sections ?? ["stats", "combat", "demesne", "inventory"]);

  return (
    <div className="space-y-5 print:space-y-3">
      {show.has("stats") ? (
        <>
          <section className="ornament-frame rounded-[28px] p-6">
            <p className="text-xs tracking-[0.2em] text-burgundy uppercase">{c.profession || "Unassigned"}</p>
            <h1 className="font-display text-4xl text-ink">{c.name || "Unnamed"}</h1>
            {c.bio ? <p className="mt-2 max-w-2xl text-muted">{c.bio}</p> : null}
            {c.epoch ? (
              <p className="mt-1 text-sm text-muted">Epoch · {c.epoch}</p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatChip label="Life" value={`${c.tracker.currentHealth} / ${d.healthMax}`} />
              <StatChip label={d.furyLabel ? "Fury" : "DP"} value={`${c.tracker.currentDp} / ${d.dpMax}`} />
              <StatChip label="CP" value={`${c.tracker.currentCp} / ${d.combatPool}`} />
              <StatChip label="Earned Essence" value={c.earnedEssence} />
              <StatChip label="Available Essence" value={s.remaining} />
              <StatChip label="Gildar" value={c.gildar} />
            </div>
            {onSpend ? (
              <div className="mt-4">
                <Button onClick={onSpend}>Spend Essence</Button>
              </div>
            ) : null}
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Attributes">
              <ul className="divide-y divide-rule">
                {ATTR_KEYS.map((k) => (
                  <li key={k} className="flex items-center justify-between py-2">
                    <span>{ATTR_LABELS[k]}</span>
                    <span className="font-display text-xl tabular-nums">{signed(c.attributes[k])}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Derived">
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
            </Panel>
          </div>

          <Panel title="Health, DP, Tic, Actions">
            <List
              rows={[
                ["Health", `${d.healthMax}`],
                [d.furyLabel ? "Fury" : "Demesne Points", String(d.dpMax)],
                ["Combat Pool", String(d.combatPool)],
                ["Social Pool", String(d.socialPool)],
                ["Tic", String(d.tic)],
                ["Attack Actions", String(d.attackActions)],
                ["Movement", String(d.movement)],
                ["Resist Physical", String(c.resistPhysical)],
                ["Resist Demesne", String(c.resistDemesneAll)],
              ]}
            />
          </Panel>
        </>
      ) : null}

      {show.has("combat") ? (
        <>
          <AttackPanel character={c} />
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Weapon Proficiency">
              <p className="mb-2 text-sm text-muted">
                Tier {c.wp.tier}
                {c.wp.types.length ? ` · ${c.wp.types.join(", ")}` : ""}
              </p>
              <ul className="space-y-2 text-sm">
                {c.wp.picks.map((p) => {
                  if (p.abilityId.startsWith("type:")) {
                    return (
                      <li key={p.tier}>
                        T{p.tier}: extra type {p.abilityId.slice(5)}
                      </li>
                    );
                  }
                  const a = findAbility(wpSkills, p.abilityId);
                  return (
                    <li key={p.tier}>
                      <span className="font-medium">
                        T{p.tier}: {a?.name ?? "—"}
                      </span>
                      {a ? <p className="text-muted">{a.text}</p> : null}
                    </li>
                  );
                })}
              </ul>
            </Panel>
            <Panel title="Combat Tricks">
              <p className="mb-2 text-sm text-muted">
                Combined tier {c.tricks.length} · CP {d.combatPool}
              </p>
              <ul className="space-y-2 text-sm">
                {c.tricks.map((t) => {
                  const a = findAbility(TRICKS[t.category], t.abilityId);
                  return (
                    <li key={t.id}>
                      <span className="font-medium">{a?.name ?? "—"}</span>
                      <span className="text-muted"> · {TRICK_LABELS[t.category]}</span>
                      {a ? <p className="text-muted">{a.text}</p> : null}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Armor">
              <p className="mb-2 text-sm text-muted">
                {c.armor.weight || "None"} · T{c.armor.tier} · +{d.armorSoakBonus} Soak / +{d.armorDurBonus}{" "}
                Dur
              </p>
              {c.armor.weight
                ? c.armor.picks.map((p) => {
                    const a = findAbility(ARMOR_SKILLS[c.armor.weight as ArmorWeight], p.abilityId);
                    return (
                      <p key={p.tier} className="text-sm">
                        T{p.tier}: {a?.name ?? "—"}
                      </p>
                    );
                  })
                : null}
            </Panel>
            <Panel title="Shield">
              <p className="mb-2 text-sm text-muted">
                {c.shield.weight || "None"} · T{c.shield.tier} · +{d.shieldSoakBonus} Soak / +
                {d.shieldDurBonus} Dur
              </p>
              {c.shield.weight
                ? c.shield.picks.map((p) => {
                    const a = findAbility(SHIELD_SKILLS[c.shield.weight as ArmorWeight], p.abilityId);
                    return (
                      <p key={p.tier} className="text-sm">
                        T{p.tier}: {a?.name ?? "—"}
                      </p>
                    );
                  })
                : null}
            </Panel>
          </div>
          <Panel title="Athletics & Subterfuge">
            {c.athletics.picks.map((p) => {
              const a = findAbility(ATHLETICS, p.abilityId);
              return (
                <p key={`a${p.tier}`} className="text-sm">
                  Athletics T{p.tier}: {a?.name ?? "—"}
                </p>
              );
            })}
            {c.subterfuge.picks.map((p) => {
              const a = findAbility(SUBTERFUGE, p.abilityId);
              return (
                <p key={`s${p.tier}`} className="text-sm">
                  Subterfuge T{p.tier}: {a?.name ?? "—"}
                </p>
              );
            })}
            {c.socialTricks.map((t) => {
              const a = findAbility(SOCIAL_TRICKS, t.abilityId);
              return (
                <p key={t.id} className="text-sm">
                  Social: {a?.name ?? "—"}
                </p>
              );
            })}
          </Panel>
        </>
      ) : null}

      {show.has("demesne") ? (
        c.demesnes.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {c.demesnes.map((dem) => {
              const els = treeElements(dem);
              const title = els.map((el) => DEMESNE_META[el]?.name ?? el).join(" / ") || "Demesne";
              return (
                <Panel key={dem.id} title={`Demesne · ${title}`}>
                  <p className="mb-2 text-sm text-muted">Overall T{dem.picks.length || dem.tier}</p>
                  <ul className="space-y-2 text-sm">
                    {dem.picks.map((p) => {
                      const a = findAbility(DEMESNE_ABILITIES[p.element], p.abilityId);
                      return (
                        <li key={p.tier}>
                          <span className="font-medium">
                            T{p.tier} {DEMESNE_META[p.element]?.name}: {a?.name ?? "—"}
                          </span>
                          {a ? <p className="text-muted">{a.text}</p> : null}
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              );
            })}
          </div>
        ) : (
          <Panel title="Demesne">
            <p className="text-sm text-muted">No Demesne trees yet. Spend Essence to attune a court.</p>
          </Panel>
        )
      ) : null}

      {show.has("inventory") ? (
        <Panel title="Inventory">
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-cream px-3 py-2">
            <span className="font-medium">Gildar</span>
            <span className="font-display text-xl tabular-nums">{c.gildar}</span>
          </div>
          <ul className="space-y-3">
            {c.items.map((i) => (
              <li key={i.id} className="border-b border-rule pb-2">
                <div className="flex justify-between">
                  <span className="font-medium">{i.name}</span>
                  <span className="text-sm text-muted">
                    {i.kind} · {qualityBand(i.essence)}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {i.weaponType ? `${i.weaponType} · ` : ""}
                  {i.wv != null ? `WV ${i.wv} · ` : ""}
                  {i.soak != null ? `Soak ${i.soak} · ` : ""}
                  {i.durability != null ? `Dur ${i.durability} · ` : ""}
                  {i.abilities}
                </p>
              </li>
            ))}
          </ul>
          {c.notes ? <p className="mt-3 text-sm">{c.notes}</p> : null}
          {c.otherAbilities ? <p className="mt-2 text-sm text-muted">{c.otherAbilities}</p> : null}
        </Panel>
      ) : null}
    </div>
  );
}

function AttackPanel({ character: c }: { character: Character }) {
  const { roll } = useDice();
  const d = derive(c);
  const weapons = c.items.filter((i) => i.kind === "weapon");
  return (
    <Panel title="Rolls" action={<span>Opposed d20</span>}>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => roll("d20", 0)}>
          <Dices /> d20
        </Button>
        {weapons.map((w) => {
          const bonus = accuracyForWeapon(c, w);
          return (
            <Button
              key={w.id}
              onClick={() => roll(w.name || "Attack", bonus)}
            >
              Attack · {w.name || w.weaponType || "Weapon"} {signed(bonus)}
            </Button>
          );
        })}
        {d.dpMax > 0 ? (
          <Button variant="outline" onClick={() => roll("Demesne", d.demesneAccuracy)}>
            Demesne {signed(d.demesneAccuracy)}
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}

function List({ rows }: { rows: Array<[string, string]> }) {
  return (
    <ul className="divide-y divide-rule text-sm">
      {rows.map(([k, v]) => (
        <li key={k} className="flex justify-between py-1.5">
          <span className="text-muted">{k}</span>
          <span className="tabular-nums">{v}</span>
        </li>
      ))}
    </ul>
  );
}
