import {
  ATHLETICS,
  DEMESNE_ABILITIES,
  MONSTER_HUNTING,
  SMITHING,
  SOCIAL_TRICKS,
  SUBTERFUGE,
  TRICKS,
  armorSkillsForWeights,
  findAbility,
  shieldSkillsForWeights,
  wpSkillsForTypes,
  type AbilityDef,
} from "@/lib/op20/catalogs";
import {
  accuracyForWeapon,
  derive,
  equippedArmor,
  equippedShield,
  hasAthleticsDodge,
  proficientArmorWeights,
  proficientShieldWeights,
} from "@/lib/op20/compute";
import { abilityForPick, activeChannels, liveBound, playedAbilityText } from "@/lib/op20/sustain";
import type { Character, GearItem, TrackerState } from "@/lib/op20/types";
import { RANGED_WEAPON_TYPES } from "@/lib/op20/types";

export type StrikeReport = {
  hit: boolean;
  attack: { label: string; d20: number; bonus: number; total: number };
  defense: { label: string; d20: number; bonus: number; total: number };
  testResult: number;
  damage: number;
  lines: string[];
  attackerTracker: TrackerState;
  defenderTracker: TrackerState;
};

function rollD20(): number {
  return 1 + Math.floor(Math.random() * 20);
}

function isRangedWeapon(item: GearItem): boolean {
  return Boolean(item.weaponType && (RANGED_WEAPON_TYPES as readonly string[]).includes(item.weaponType));
}

type Owned = { name: string; text: string; tier: number };

function pushAbility(out: Owned[], list: AbilityDef[], id: string, tier: number) {
  if (!id || id.startsWith("type:")) return;
  const ability = findAbility(list, id);
  if (!ability) return;
  out.push({ name: ability.name, text: playedAbilityText(ability.text, tier), tier });
}

function ownedAbilities(c: Character): Owned[] {
  const out: Owned[] = [];
  for (const p of c.athletics?.picks ?? []) pushAbility(out, ATHLETICS, p.abilityId, c.athletics.tier);
  for (const p of c.subterfuge?.picks ?? []) pushAbility(out, SUBTERFUGE, p.abilityId, c.subterfuge.tier);
  for (const p of c.hunting?.picks ?? []) pushAbility(out, MONSTER_HUNTING, p.abilityId, c.hunting.tier);
  for (const p of c.smith?.picks ?? []) pushAbility(out, SMITHING, p.abilityId, c.smith.tier);
  for (const p of c.wp?.picks ?? []) pushAbility(out, wpSkillsForTypes(c.wp.types ?? []), p.abilityId, c.wp.tier);
  for (const p of c.armor?.picks ?? []) {
    pushAbility(out, armorSkillsForWeights(proficientArmorWeights(c)), p.abilityId, c.armor.tier);
  }
  for (const p of c.shield?.picks ?? []) {
    pushAbility(out, shieldSkillsForWeights(proficientShieldWeights(c)), p.abilityId, c.shield.tier);
  }
  for (const t of c.tricks ?? []) pushAbility(out, TRICKS[t.category] ?? [], t.abilityId, c.tricks.length);
  for (const t of c.socialTricks ?? []) pushAbility(out, SOCIAL_TRICKS, t.abilityId, c.socialTricks.length);
  for (const dem of c.demesnes ?? []) {
    const tier = dem.picks.length || dem.tier;
    for (const p of dem.picks) pushAbility(out, DEMESNE_ABILITIES[p.element] ?? [], p.abilityId, tier);
  }
  return out;
}

function defenseBonus(defender: Character, ranged: boolean): { bonus: number; label: string } {
  if (ranged && hasAthleticsDodge(defender)) {
    const bonus = derive(defender).precision + defender.athletics.tier;
    return { bonus, label: "Dodge" };
  }
  return { bonus: 0, label: ranged ? "no Dodge" : "melee" };
}

function fireAmount(effect: string): number {
  const match = effect.match(/\+(\d+)\s+Fire damage/i);
  return match ? Number(match[1]) : 0;
}

function spendMatch(text: string): { amount: number; pool: "CP" | "DP" } | null {
  const match = text.match(/spend\s+(\d+)\s+(CP|DP)/i);
  if (!match) return null;
  return { amount: Number(match[1]), pool: match[2].toUpperCase() as "CP" | "DP" };
}

/**
 * Opposed weapon attack.
 * Test result is the attacker's total minus the defender's.
 * Tic adds 1 damage per full interval (Tic 5 means +1 per 5).
 * A shield soaks only on an even test result.
 * Bound fire (the DP is already locked) always adds. A channel such as
 * Ensheathe adds only if the attacker can pay its DP this swing.
 */
export function resolveStrike(
  attackerIn: Character,
  defenderIn: Character,
  weapon: GearItem,
  rng: () => number = rollD20,
): StrikeReport {
  const attacker = attackerIn;
  const defender = defenderIn;
  const attackBonus = accuracyForWeapon(attacker, weapon);
  const attackD20 = rng();
  const attackTotal = attackD20 + attackBonus;
  const ranged = isRangedWeapon(weapon);
  const defense = defenseBonus(defender, ranged);
  const defenseD20 = rng();
  const defenseTotal = defenseD20 + defense.bonus;
  const testResult = attackTotal - defenseTotal;
  const hit = testResult > 0;
  const statsA = derive(attacker);
  const statsD = derive(defender);
  const tic = Math.max(1, statsA.tic);
  const weaponDamage = weapon.wv ?? 0;
  const ticDamage = hit ? Math.floor(testResult / tic) : 0;

  let dp = attacker.tracker.currentDp ?? 0;
  let cp = attacker.tracker.currentCp ?? 0;
  const lines: string[] = [];
  const weaponName = weapon.weaponType || weapon.name || "Attack";

  lines.push(
    `${attacker.name || "Attacker"} ${attackD20}${attackBonus >= 0 ? `+${attackBonus}` : attackBonus} = ${attackTotal}`,
  );
  lines.push(
    `${defender.name || "Defender"} ${defenseD20}${defense.bonus ? `+${defense.bonus}` : ""} = ${defenseTotal} (${defense.label})`,
  );
  lines.push(`Test result ${testResult}`);

  let fire = 0;
  if (hit) {
    for (const raw of attacker.boundEffects ?? []) {
      const effect = liveBound(attacker, raw);
      if (effect.itemId !== weapon.id) continue;
      const amount = fireAmount(effect.effect);
      if (amount <= 0) continue;
      const name = abilityForPick(effect.element, effect.abilityId)?.name ?? "Bound fire";
      fire += amount;
      lines.push(`${name} +${amount} Fire (DP already bound)`);
    }
    for (const channel of activeChannels(attacker)) {
      const ability = abilityForPick(channel.element, channel.abilityId);
      const target = ability?.sustain?.target;
      const onThisWeapon =
        target !== "self" &&
        (!channel.itemId || channel.itemId === weapon.id) &&
        !(target === "melee-weapon" && ranged) &&
        !(target === "blunt-weapon" && !["Maul", "Gauntlet", "Flail"].includes(weapon.weaponType ?? ""));
      const amount = fireAmount(channel.effect);
      if (onThisWeapon && amount > 0) {
        const name = ability?.name ?? "Channel";
        const cost = channel.dpPerRound ?? 0;
        if (cost > dp) {
          lines.push(`${name} does not trigger — need ${cost} DP, have ${dp}`);
        } else {
          dp -= cost;
          fire += amount;
          lines.push(cost > 0 ? `${name} +${amount} Fire — spent ${cost} DP` : `${name} +${amount} Fire`);
        }
      }
    }
  }

  const plus10At = ownedAbilities(attacker).some((a) => a.name === "Lucky") ? 5 : 10;
  const plusTen = hit && (testResult >= 10 || testResult === plus10At);
  let rider = 0;
  const statuses = new Set(defender.tracker.statuses ?? []);
  if (plusTen) {
    for (const ability of ownedAbilities(attacker)) {
      if (!/on \+10/i.test(ability.text)) continue;
      const cost = spendMatch(ability.text);
      if (cost?.pool === "CP" && cost.amount > cp) {
        lines.push(`${ability.name} does not trigger — need ${cost.amount} CP`);
        continue;
      }
      if (cost?.pool === "DP" && cost.amount > dp) {
        lines.push(`${ability.name} does not trigger — need ${cost.amount} DP`);
        continue;
      }
      if (cost?.pool === "CP") cp -= cost.amount;
      if (cost?.pool === "DP") dp -= cost.amount;
      lines.push(cost ? `${ability.name} triggers — spent ${cost.amount} ${cost.pool}` : `${ability.name} triggers`);
      if (/deal strength damage/i.test(ability.text)) rider += attacker.attributes.str;
      if (/deal shield soak/i.test(ability.text)) rider += statsA.shieldSoak;
      const per = ability.text.match(/(\d+)\s+Damage\/Tier/i);
      if (per) rider += Number(per[1]) * ability.tier;
      for (const status of ["Bleed", "Burn", "Prone", "Panic", "Stunned"]) {
        if (new RegExp(`\\b${status}\\b`, "i").test(ability.text)) statuses.add(status);
      }
    }
  }

  let armor = 0;
  let shield = 0;
  if (hit) {
    armor = equippedArmor(defender) ? statsD.armorSoak : 0;
    const even = testResult % 2 === 0;
    if (even && equippedShield(defender)) shield = statsD.shieldSoak;
    if (armor) lines.push(`Armor soaks ${armor}`);
    if (equippedShield(defender)) {
      lines.push(even ? `Shield blocks ${shield}` : "Shield does not block — test result is odd");
    }
    if (ticDamage) lines.push(`Tic ${tic} adds ${ticDamage} damage`);
    if (rider) lines.push(`+10 adds ${rider} damage`);
  } else {
    lines.push("Miss. No damage.");
  }

  const physical = Math.max(0, weaponDamage + ticDamage + rider - armor - shield);
  const damage = hit ? physical + fire : 0;
  const healthBefore = defender.tracker.currentHealth ?? 0;
  const healthAfter = hit ? Math.max(-statsD.edgeOfDeath, healthBefore - damage) : healthBefore;
  if (hit) lines.push(`Damage ${damage}. Life ${healthBefore} → ${healthAfter}`);

  return {
    hit,
    attack: { label: weaponName, d20: attackD20, bonus: attackBonus, total: attackTotal },
    defense: { label: defense.label, d20: defenseD20, bonus: defense.bonus, total: defenseTotal },
    testResult,
    damage,
    lines,
    attackerTracker: { ...attacker.tracker, currentDp: dp, currentCp: cp },
    defenderTracker: {
      ...defender.tracker,
      currentHealth: healthAfter,
      statuses: [...statuses],
    },
  };
}
