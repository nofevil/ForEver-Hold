import { useEffect } from "react";
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from "@/lib/brand";
import { useCharacters } from "@/store/characters";

export function HydrateCharacters() {
  const setHydrated = useCharacters((s) => s.setHydrated);
  useEffect(() => {
    try {
      const next = localStorage.getItem(STORAGE_KEY);
      const prev = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!next && prev) localStorage.setItem(STORAGE_KEY, prev);
    } catch {
      /* private mode */
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setHydrated();
    };
    const unsub = useCharacters.persist.onFinishHydration(finish);
    void useCharacters.persist.rehydrate();
    if (useCharacters.persist.hasHydrated()) finish();
    const fallback = window.setTimeout(finish, 80);
    return () => {
      unsub();
      window.clearTimeout(fallback);
    };
  }, [setHydrated]);
  return null;
}
