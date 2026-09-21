import { uid } from "@/lib/utils";
import type {
  Character,
  DemesneElement,
  DemesnePick,
  DemesneTree,
  Relic,
} from "./types";

export function normalizeDemesnes(raw: unknown): DemesneTree[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
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
}

export function migrateCharacter(c: Character): Character {
  return {
    ...c,
    earnedByKey: c.earnedByKey ?? {},
    gildar: c.gildar ?? 0,
    airshipId: c.airshipId ?? null,
    role: c.role ?? "player",
    demesnes: normalizeDemesnes(c.demesnes),
    items: (c.items ?? []).map((item) => ({
      ...item,
      earnedEssence: item.earnedEssence ?? 0,
    })),
  };
}

export function migrateRelic(r: Relic): Relic {
  return {
    ...r,
    listed: r.listed ?? true,
  };
}
