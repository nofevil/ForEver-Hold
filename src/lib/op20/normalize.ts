import { uid } from "@/lib/utils";
import { FORAGING, HARVEST, MINING, SMITHING } from "./catalogs";
import { abilityForPick, charmAbilityNote, liveBound, settleChannels, shortCharmNote, sustainSourceMatches } from "./sustain";
import type {
  ChannelState,
  Character,
  DemesneElement,
  DemesnePick,
  DemesneTree,
  GearItem,
  Relic,
  SimpleTree,
  WeaponType,
} from "./types";
import { RANGED_WEAPON_TYPES } from "./types";

export function normalizeDemesnes(raw: unknown): DemesneTree[] {
  if (!Array.isArray(raw)) return [];
  const trees = raw.map((entry) => {
    const d = entry as Record<string, unknown>;
    const fallbackEl = (d.element as DemesneElement | undefined) ?? "fire";
    const rawPicks = Array.isArray(d.picks) ? d.picks : [];
    const picks: DemesnePick[] = rawPicks.map((p, i) => {
      const pick = p as Record<string, unknown>;
      return {
        tier: i + 1,
        element: (pick.element as DemesneElement | undefined) ?? fallbackEl,
        abilityId: String(pick.abilityId ?? ""),
      };
    });
    const target = Number(d.tier ?? picks.length) || picks.length;
    while (picks.length < target) {
      picks.push({ tier: picks.length + 1, element: fallbackEl, abilityId: "" });
    }
    return {
      id: typeof d.id === "string" && d.id ? d.id : uid(),
      tier: picks.length,
      picks,
    };
  });
  const seen = new Set<string>();
  return trees.map((d) => ({
    ...d,
    picks: d.picks.map((p) => {
      if (!p.abilityId || seen.has(p.abilityId)) return { ...p, abilityId: "" };
      seen.add(p.abilityId);
      return p;
    }),
  }));
}

function retireThrownType(type: string | undefined): WeaponType | undefined {
  if (!type) return undefined;
  if (type === "Thrown") return "Throwing Axe";
  return type as WeaponType;
}

function syncWpTypes(wp: Character["wp"]): Character["wp"] {
  const picks = (wp.picks ?? []).map((p) =>
    p.abilityId === "type:Thrown" ? { ...p, abilityId: "type:Throwing Axe" } : p,
  );
  const extra = picks
    .filter((p) => p.abilityId?.startsWith("type:"))
    .map((p) => p.abilityId.slice(5) as WeaponType);
  const first = retireThrownType(wp.types?.[0]);
  const types = [...new Set([first, ...extra].filter(Boolean))] as WeaponType[];
  return { ...wp, picks, types };
}

function defenseWeights(tree: { weight?: string; picks?: Array<{ abilityId?: string }> } | undefined): string[] {
  if (!tree) return [];
  const extra = (tree.picks ?? [])
    .filter((p) => p.abilityId?.startsWith("type:"))
    .map((p) => String(p.abilityId).slice(5));
  return [...new Set([tree.weight, ...extra].filter((w) => w === "light" || w === "medium" || w === "heavy"))];
}

function withoutGrantedProficiency<T extends { picks?: Array<{ abilityId: string }> }>(tree: T): T {
  if (!tree?.picks) return tree;
  return {
    ...tree,
    picks: tree.picks.map((p) => (p.abilityId === "proficiency" ? { ...p, abilityId: "" } : p)),
  };
}

function asSimpleTree(raw: unknown): SimpleTree {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const tier = Math.max(0, Math.floor(raw));
    return {
      tier,
      picks: Array.from({ length: tier }, (_, i) => ({ tier: i + 1, abilityId: "" })),
    };
  }
  if (raw && typeof raw === "object") {
    const tree = raw as Partial<SimpleTree>;
    const picks = Array.isArray(tree.picks)
      ? tree.picks.map((p, i) => ({ tier: i + 1, abilityId: String(p?.abilityId ?? "") }))
      : [];
    const stated = Number(tree.tier);
    const tier = Math.max(0, Math.floor(Number.isFinite(stated) ? stated : picks.length));
    while (picks.length < tier) picks.push({ tier: picks.length + 1, abilityId: "" });
    return { tier: Math.min(tier, picks.length), picks: picks.slice(0, tier) };
  }
  return { tier: 0, picks: [] };
}

function asPickTree(raw: unknown, abilityCount: number): SimpleTree {
  const tree = asSimpleTree(raw);
  const picks = tree.picks.slice(0, abilityCount).map((p, i) => ({ tier: i + 1, abilityId: p.abilityId }));
  return { tier: Math.max(tree.tier, picks.length), picks };
}

function asSmithTree(raw: unknown): SimpleTree {
  return asPickTree(raw, SMITHING.length);
}

function asMiningTree(raw: unknown): SimpleTree {
  return asPickTree(raw, MINING.length);
}

function withMeleeRange(item: GearItem): GearItem {
  if (item.kind !== "weapon") return item;
  if (item.range != null && item.range.trim() !== "") return item;
  const type = item.weaponType;
  if (type && (RANGED_WEAPON_TYPES as readonly string[]).includes(type)) return item;
  return { ...item, range: "5'" };
}

function retireItemWv(item: GearItem): GearItem {
  if (!item.abilities || !/\bWV\b/.test(item.abilities)) return item;
  const word = item.kind === "weapon" ? "Physical Damage" : "Damage";
  return { ...item, abilities: item.abilities.replace(/\bWV\b/g, word) };
}

function looksGeneratedCharm(text: string): boolean {
  const t = text.trim();
  if (t.startsWith("+") && /DP/i.test(t)) return true;
  if (/^One Tier 1 ability/i.test(t)) return true;
  return false;
}

function withStoredDp(item: GearItem): GearItem {
  const charm = item.charm === true || item.name.trim() === "Tier 1 Demesne Charm";
  if (charm) {
    const ability =
      item.charmElement && item.charmAbilityId
        ? abilityForPick(item.charmElement, item.charmAbilityId)
        : undefined;
    const generated = looksGeneratedCharm(item.abilities ?? "");
    const stored = (item.abilities ?? "").trim();
    const stale =
      generated ||
      stored === "" ||
      /^choose a tier 1 ability\.?$/i.test(stored) ||
      (ability != null && stored === shortCharmNote(ability));
    const abilities =
      stale && ability && item.charmElement
        ? charmAbilityNote(item.charmElement, ability)
        : stale
          ? "Choose a Tier 1 ability."
          : item.abilities;
    return { ...item, charm: true, dp: item.dp ?? 25, abilities };
  }
  const storage =
    item.kind === "demesne" &&
    (/bracer/i.test(item.name) || /\bDP storage\b/i.test(item.abilities ?? ""));
  if (!storage) return item;
  const noted = (item.abilities ?? "").match(/(\d+)\s*DP storage/i);
  const dp = item.dp ?? (noted ? Number(noted[1]) : 40);
  const abilities = /^\d*\s*DP storage\.?$/i.test((item.abilities ?? "").trim())
    ? "DP storage."
    : item.abilities;
  return { ...item, dp, abilities };
}

function readChannels(raw: Character): ChannelState[] {
  const extra = raw as Character & { channel?: ChannelState | null; channels?: ChannelState[] | null };
  if (Array.isArray(extra.channels)) return extra.channels.filter((ch): ch is ChannelState => Boolean(ch));
  return extra.channel ? [extra.channel] : [];
}

export function migrateCharacter(c: Character): Character {
  const demesnes = normalizeDemesnes(c.demesnes);
  const hasDemesne = demesnes.some((d) => (d.picks?.length || d.tier) > 0);
  const armor = withoutGrantedProficiency(c.armor ?? { weight: "", tier: 0, picks: [], bonuses: [] });
  const shield = withoutGrantedProficiency(c.shield ?? { weight: "", tier: 0, picks: [], bonuses: [] });
  const armorOk = new Set(defenseWeights(armor));
  const shieldOk = new Set(defenseWeights(shield));
  const items = (c.items ?? []).map((item) => {
    const weaponType = retireThrownType(item.weaponType) || item.weaponType;
    const next = withStoredDp(
      withMeleeRange(retireItemWv({ ...item, weaponType, earnedEssence: item.earnedEssence ?? 0 })),
    );
    if (next.kind === "armor" && next.equipped) {
      const ok = next.armorWeight && armorOk.has(next.armorWeight);
      if (!ok) return { ...next, equipped: false };
    }
    if (next.kind === "shield" && next.equipped) {
      const ok = next.shieldWeight && shieldOk.has(next.shieldWeight);
      if (!ok) return { ...next, equipped: false };
    }
    return next;
  });
  const itemIds = new Set(items.map((i) => i.id));
  const sealedItems =
    c.sheetOpened === false
      ? items
      : items.map((item) => {
          if (item.locked === false) return item;
          if (item.lockedStats) return { ...item, locked: true };
          return {
            ...item,
            locked: true,
            lockedStats: {
              wv: item.wv ?? 0,
              soak: item.soak ?? 0,
              durability: item.durability ?? 0,
              extraActions: item.extraActions ?? 0,
              range: item.range ?? "",
              accuracy: item.accuracy ?? 0,
            },
          };
        });
  const keptEffects = (c.boundEffects ?? []).filter(
    (e) => (!e.itemId || itemIds.has(e.itemId)) && (!e.poolItemId || itemIds.has(e.poolItemId)),
  );
  const { channel: _legacyChannel, ...base } = c as Character & { channel?: ChannelState | null };
  const draft = { ...base, demesnes, items: sealedItems, channels: [] as ChannelState[] };
  let refundPool = 0;
  const charmRefund = new Map<string, number>();
  const boundEffects = keptEffects.flatMap((e) => {
    if (!sustainSourceMatches(draft, e)) {
      const dp = liveBound(draft, e).dp;
      if (e.poolItemId) charmRefund.set(e.poolItemId, (charmRefund.get(e.poolItemId) ?? 0) + dp);
      else refundPool += dp;
      return [];
    }
    return [liveBound(draft, e)];
  });
  const channels = settleChannels(draft, readChannels(c));
  const itemsWithRefund =
    charmRefund.size === 0
      ? sealedItems
      : sealedItems.map((item) => {
          const back = charmRefund.get(item.id);
          if (!back) return item;
          const cap = item.dp ?? 0;
          const have = item.currentDp == null ? cap : Math.max(0, Math.min(cap, item.currentDp));
          return { ...item, currentDp: Math.min(cap, have + back) };
        });
  return {
    ...base,
    earnedByKey: c.earnedByKey ?? {},
    gildar: c.gildar ?? 0,
    airshipId: c.airshipId ?? null,
    role: c.role ?? "player",
    demesnes,
    wp: syncWpTypes(c.wp ?? { tier: 0, types: [], picks: [] }),
    armor,
    shield,
    purchasedDpEssence: hasDemesne ? (c.purchasedDpEssence ?? 0) : 0,
    boundDp: c.boundDp ?? 0,
    boundEffects,
    channels,
    items: itemsWithRefund,
    tracker: {
      ...c.tracker,
      currentDp: (c.tracker?.currentDp ?? 0) + refundPool,
    },
    hunting: asSimpleTree(c.hunting),
    smith: asSmithTree(c.smith),
    harvest: asPickTree(c.harvest, HARVEST.length),
    foraging: asPickTree(c.foraging, FORAGING.length),
    mining: asMiningTree(c.mining),
  };
}

function placeSampleDemesne(r: Relic): Relic {
  const open = r.demesnes.every((d) => d.picks.every((p) => !p.abilityId));
  if (!open) return r;
  const name = r.name.replace(/[’']/g, "'");
  const drop = (names: string[]) => r.abilities.filter((a) => !names.includes(a.name.replace(/[’']/g, "'")));
  if (name === "Cauterizing Edge") {
    return {
      ...r,
      wpType: r.wpType || "Sword",
      demesnes: [
        {
          element: "fire",
          tier: 4,
          picks: [
            { tier: 1, abilityId: "breath-of-fire" },
            { tier: 2, abilityId: "fire-shield" },
            { tier: 3, abilityId: "create-elemental" },
            { tier: 4, abilityId: "combust" },
          ],
        },
      ],
      abilities: drop(["Breath of Fire", "Fire Shield", "Elemental (Fire)", "Combust"]),
    };
  }
  if (name === "Pummeling Eruption") {
    return {
      ...r,
      wpType: r.wpType || "Gauntlet",
      wpTier: Math.max(r.wpTier, 2),
      wpPicks: r.wpPicks.some((p) => p.abilityId)
        ? r.wpPicks
        : [
            { tier: 1, abilityId: "bane-damage", against: "creature:night" },
            { tier: 2, abilityId: "bane-accuracy", against: "creature:night" },
          ],
      demesnes: [
        {
          element: "lava",
          tier: 3,
          picks: [
            { tier: 1, abilityId: "obsidian-skin" },
            { tier: 2, abilityId: "lava-strike" },
            { tier: 3, abilityId: "suffocating-eruption" },
          ],
        },
      ],
      abilities: drop(["Bane, Night", "Obsidian Skin", "Lava Strike", "Suffocating Eruption"]),
    };
  }
  if (name === "Hammer of Smithing") {
    return {
      ...r,
      demesnes: [
        {
          element: "fire",
          tier: 2,
          picks: [
            { tier: 1, abilityId: "blacksmith-searing" },
            { tier: 2, abilityId: "heat-metal" },
          ],
        },
      ],
      abilities: drop(["Blacksmith's Searing", "Heat Metal"]),
    };
  }
  if (name === "Earth's Defense") {
    return {
      ...r,
      armorWeight: r.armorWeight || "medium",
      demesnes: [{ element: "earth", tier: 1, picks: [{ tier: 1, abilityId: "earth-shield" }] }],
      abilities: drop(["Earth Shield"]),
    };
  }
  return r;
}

export function migrateRelic(r: Relic): Relic {
  const next: Relic = {
    ...r,
    listed: r.listed ?? true,
    armorWeight: r.armorWeight ?? "",
    weaponType: retireThrownType(r.weaponType) ?? "",
    epoch: r.epoch ?? "",
    wpType: r.wpType ?? "",
    wpPicks: Array.isArray(r.wpPicks)
      ? r.wpPicks.slice(0, r.wpTier ?? 0).map((p, i) => ({
          tier: i + 1,
          abilityId: p.abilityId ?? "",
          ...(p.against ? { against: p.against } : {}),
        }))
      : [],
    demesnes: (r.demesnes ?? []).map((d) => ({
      element: d.element,
      tier: d.tier ?? 0,
      picks: Array.from({ length: Math.max(0, d.tier ?? 0) }, (_, i) => ({
        tier: i + 1,
        abilityId: d.picks?.[i]?.abilityId ?? "",
      })),
    })),
    trees: Array.isArray(r.trees)
      ? r.trees.map((t) => ({
          ...t,
          tier: t.tier ?? 0,
          picks: Array.from({ length: Math.max(0, t.tier ?? 0) }, (_, i) => ({
            tier: i + 1,
            abilityId: t.picks?.[i]?.abilityId ?? "",
            category: t.picks?.[i]?.category,
            ...(t.picks?.[i]?.against ? { against: t.picks[i]?.against } : {}),
          })),
          weaponType: t.weaponType ?? "",
          armorWeight: t.armorWeight ?? "",
        }))
      : [],
  };
  return stampSampleBane(placeSampleDemesne(next));
}

/** Pummeling Eruption’s printed banes are Night. Fill only an empty target. */
function stampSampleBane(r: Relic): Relic {
  if (r.name.replace(/[’']/g, "'") !== "Pummeling Eruption") return r;
  return {
    ...r,
    wpPicks: r.wpPicks.map((p) =>
      (p.abilityId === "bane-damage" || p.abilityId === "bane-accuracy") && !p.against
        ? { ...p, against: "creature:night" }
        : p,
    ),
  };
}