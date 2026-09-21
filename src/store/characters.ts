import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EXPORT_FILENAME, STORAGE_KEY } from "@/lib/brand";
import { derive } from "@/lib/op20/compute";
import { blankAirship, blankCharacter, blankMob, blankRelic, blankTable } from "@/lib/op20/defaults";
import { migrateCharacter, migrateRelic } from "@/lib/op20/normalize";
import { sampleAirships, sampleMobs, sampleRelics, sampleRoster } from "@/lib/op20/samples";
import type { Airship, CampaignExport, Character, GameTable, Mob, Relic } from "@/lib/op20/types";
import { uid } from "@/lib/utils";

interface CampaignStore {
  characters: Character[];
  relics: Relic[];
  mobs: Mob[];
  airships: Airship[];
  tables: GameTable[];
  hydrated: boolean;
  setHydrated: () => void;
  upsert: (c: Character) => void;
  update: (id: string, patch: Partial<Character> | ((c: Character) => Character)) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => Character | null;
  create: (startingEssence?: number, role?: Character["role"]) => Character;
  replaceAll: (list: Character[]) => void;
  seedSamples: () => void;
  createRelic: () => Relic;
  updateRelic: (id: string, patch: Partial<Relic> | ((r: Relic) => Relic)) => void;
  removeRelic: (id: string) => void;
  duplicateRelic: (id: string) => Relic | null;
  createMob: () => Mob;
  updateMob: (id: string, patch: Partial<Mob> | ((m: Mob) => Mob)) => void;
  removeMob: (id: string) => void;
  duplicateMob: (id: string) => Mob | null;
  createAirship: () => Airship;
  updateAirship: (id: string, patch: Partial<Airship> | ((a: Airship) => Airship)) => void;
  removeAirship: (id: string) => void;
  duplicateAirship: (id: string) => Airship | null;
  createTable: () => GameTable;
  updateTable: (id: string, patch: Partial<GameTable> | ((t: GameTable) => GameTable)) => void;
  removeTable: (id: string) => void;
  importCampaign: (data: unknown) => boolean;
  exportPayload: () => CampaignExport;
}

function touch<T extends { updatedAt: string }>(c: T): T {
  return { ...c, updatedAt: new Date().toISOString() };
}

export const useCharacters = create<CampaignStore>()(
  persist(
    (set, get) => ({
      characters: [],
      relics: [],
      mobs: [],
      airships: [],
      tables: [],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      upsert: (c) =>
        set((state) => {
          const i = state.characters.findIndex((x) => x.id === c.id);
          const next = touch(migrateCharacter(c));
          if (i === -1) return { characters: [next, ...state.characters] };
          const copy = state.characters.slice();
          copy[i] = next;
          return { characters: copy };
        }),
      update: (id, patch) =>
        set((state) => ({
          characters: state.characters.map((c) => {
            if (c.id !== id) return c;
            const next = typeof patch === "function" ? patch(c) : { ...c, ...patch };
            return touch(migrateCharacter(next));
          }),
        })),
      remove: (id) =>
        set((state) => ({
          characters: state.characters.filter((c) => c.id !== id),
        })),
      duplicate: (id) => {
        const src = get().characters.find((c) => c.id === id);
        if (!src) return null;
        const copy = touch({
          ...structuredClone(src),
          id: uid(),
          name: src.name ? `${src.name} (copy)` : "Unnamed copy",
          createdAt: new Date().toISOString(),
        });
        set((state) => ({ characters: [copy, ...state.characters] }));
        return copy;
      },
      create: (startingEssence = 100, role = "player") => {
        const c = blankCharacter({ startingEssence, role, epoch: "" });
        const d = derive(c);
        c.tracker.currentHealth = d.healthMax;
        c.tracker.currentDp = d.dpMax;
        set((state) => ({ characters: [c, ...state.characters] }));
        return c;
      },
      replaceAll: (list) => set({ characters: list.map(migrateCharacter) }),
      seedSamples: () =>
        set((state) => {
          if (
            state.characters.length +
              state.relics.length +
              state.mobs.length +
              state.airships.length +
              state.tables.length >
            0
          ) {
            return state;
          }
          return {
            characters: sampleRoster(),
            relics: sampleRelics(),
            mobs: sampleMobs(),
            airships: sampleAirships(),
            tables: [],
          };
        }),
      createRelic: () => {
        const r = blankRelic();
        set((s) => ({ relics: [r, ...s.relics] }));
        return r;
      },
      updateRelic: (id, patch) =>
        set((state) => ({
          relics: state.relics.map((r) => {
            if (r.id !== id) return r;
            const next = typeof patch === "function" ? patch(r) : { ...r, ...patch };
            return touch(migrateRelic(next));
          }),
        })),
      removeRelic: (id) => set((s) => ({ relics: s.relics.filter((r) => r.id !== id) })),
      duplicateRelic: (id) => {
        const src = get().relics.find((r) => r.id === id);
        if (!src) return null;
        const copy = touch({
          ...structuredClone(src),
          id: uid(),
          name: src.name ? `${src.name} (copy)` : "Unnamed relic",
          createdAt: new Date().toISOString(),
        });
        set((s) => ({ relics: [copy, ...s.relics] }));
        return copy;
      },
      createMob: () => {
        const m = blankMob();
        set((s) => ({ mobs: [m, ...s.mobs] }));
        return m;
      },
      updateMob: (id, patch) =>
        set((state) => ({
          mobs: state.mobs.map((m) => {
            if (m.id !== id) return m;
            const next = typeof patch === "function" ? patch(m) : { ...m, ...patch };
            return touch(next);
          }),
        })),
      removeMob: (id) => set((s) => ({ mobs: s.mobs.filter((m) => m.id !== id) })),
      duplicateMob: (id) => {
        const src = get().mobs.find((m) => m.id === id);
        if (!src) return null;
        const copy = touch({
          ...structuredClone(src),
          id: uid(),
          name: src.name ? `${src.name} (copy)` : "Unnamed hostile",
          createdAt: new Date().toISOString(),
        });
        set((s) => ({ mobs: [copy, ...s.mobs] }));
        return copy;
      },
      createAirship: () => {
        const a = blankAirship();
        set((s) => ({ airships: [a, ...s.airships] }));
        return a;
      },
      updateAirship: (id, patch) =>
        set((state) => ({
          airships: state.airships.map((a) => {
            if (a.id !== id) return a;
            const next = typeof patch === "function" ? patch(a) : { ...a, ...patch };
            return touch(next);
          }),
        })),
      removeAirship: (id) => set((s) => ({ airships: s.airships.filter((a) => a.id !== id) })),
      duplicateAirship: (id) => {
        const src = get().airships.find((a) => a.id === id);
        if (!src) return null;
        const copy = touch({
          ...structuredClone(src),
          id: uid(),
          name: src.name ? `${src.name} (copy)` : "Unnamed keel",
          createdAt: new Date().toISOString(),
        });
        set((s) => ({ airships: [copy, ...s.airships] }));
        return copy;
      },
      createTable: () => {
        const t = blankTable({ name: "New table" });
        set((s) => ({ tables: [t, ...s.tables] }));
        return t;
      },
      updateTable: (id, patch) =>
        set((state) => ({
          tables: state.tables.map((t) => {
            if (t.id !== id) return t;
            const next = typeof patch === "function" ? patch(t) : { ...t, ...patch };
            return touch(next);
          }),
        })),
      removeTable: (id) => set((s) => ({ tables: s.tables.filter((t) => t.id !== id) })),
      importCampaign: (data) => {
        try {
          if (Array.isArray(data) && data.every((x) => x && typeof x === "object" && "attributes" in x)) {
            set({ characters: (data as Character[]).map(migrateCharacter) });
            return true;
          }
          if (data && typeof data === "object") {
            const d = data as Partial<CampaignExport>;
            const next: Partial<CampaignExport> = {};
            if (Array.isArray(d.characters)) next.characters = d.characters.map(migrateCharacter);
            if (Array.isArray(d.relics)) next.relics = d.relics.map(migrateRelic);
            if (Array.isArray(d.mobs)) next.mobs = d.mobs;
            if (Array.isArray(d.airships)) next.airships = d.airships;
            if (Array.isArray(d.tables)) next.tables = d.tables;
            if (Object.keys(next).length === 0) return false;
            set(next);
            return true;
          }
        } catch {
          return false;
        }
        return false;
      },
      exportPayload: () => {
        const s = get();
        return {
          characters: s.characters,
          relics: s.relics,
          mobs: s.mobs,
          airships: s.airships,
          tables: s.tables,
        };
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        characters: s.characters,
        relics: s.relics,
        mobs: s.mobs,
        airships: s.airships,
        tables: s.tables,
      }),
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<{
          characters: Character[];
          relics: Relic[];
          mobs: Mob[];
          airships: Airship[];
          tables: GameTable[];
        }>;
        return {
          ...current,
          characters: Array.isArray(p.characters) ? p.characters.map(migrateCharacter) : current.characters,
          relics: Array.isArray(p.relics) ? p.relics.map(migrateRelic) : [],
          mobs: Array.isArray(p.mobs) ? p.mobs : [],
          airships: Array.isArray(p.airships) ? p.airships : [],
          tables: Array.isArray(p.tables)
            ? p.tables.map((t) => ({ ...t, epoch: t.epoch ?? "" }))
            : [],
        };
      },
    },
  ),
);

export function useCharacter(id: string | undefined) {
  return useCharacters((s) => s.characters.find((c) => c.id === id));
}

export function useRelic(id: string | undefined) {
  return useCharacters((s) => s.relics.find((r) => r.id === id));
}

export function useMob(id: string | undefined) {
  return useCharacters((s) => s.mobs.find((m) => m.id === id));
}

export function useAirship(id: string | undefined) {
  return useCharacters((s) => s.airships.find((a) => a.id === id));
}

export function useTable(id: string | undefined) {
  return useCharacters((s) => s.tables.find((t) => t.id === id));
}

export { EXPORT_FILENAME };
