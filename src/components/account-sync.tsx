import { useEffect, useRef } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { authEnabled } from "@/lib/auth/client";
import { saveHold, loadHold, upsertCampaign } from "@/lib/campaigns.functions";
import { makeJoinCode } from "@/lib/join-code";
import { useCharacters } from "@/store/characters";
import { migrateCharacter } from "@/lib/op20/normalize";

export function AccountSync() {
  const { user, isPending } = useCurrentUserState();
  const hydrated = useCharacters((s) => s.hydrated);
  const userId = user?.id ?? null;
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (!authEnabled || isPending || !hydrated) return;
    if (previous.current && !userId) {
      useCharacters.setState({
        characters: [],
        relics: [],
        mobs: [],
        airships: [],
        tables: [],
      });
    }
    previous.current = userId;
    if (!userId) return;

    let cancel = false;
    let applying = true;
    let timer = 0;

    const persist = async () => {
      const payload = useCharacters.getState().exportPayload();
      await saveHold({ data: payload });
      for (const table of payload.tables) {
        const joinCode = (table.joinCode || makeJoinCode()).toUpperCase();
        if (!table.joinCode) {
          useCharacters.getState().updateTable(table.id, { joinCode });
        }
        await upsertCampaign({
          data: {
            id: table.id,
            name: table.name,
            joinCode,
            epoch: table.epoch,
            notes: table.notes,
          },
        });
      }
    };

    const schedule = () => {
      if (applying) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void persist().catch(() => {});
      }, 400);
    };

    void (async () => {
      try {
        const remote = await loadHold();
        if (cancel) return;
        const local = useCharacters.getState().exportPayload();
        if (!remote || remote.characters.length + remote.tables.length === 0) {
          if (local.characters.length || local.tables.length) await persist();
        } else {
          const ids = new Set(remote.characters.map((c) => c.id));
          const extra = local.characters.filter((c) => !ids.has(c.id));
          const merged = extra.length ? { ...remote, characters: [...extra, ...remote.characters] } : remote;
          useCharacters.getState().importCampaign(merged);
          if (extra.length) await persist();
        }
      } catch {
        /* stay on the device copy if the account cannot be read yet */
      } finally {
        applying = false;
      }
    })();

    const unsub = useCharacters.subscribe(schedule);
    const poll = window.setInterval(() => {
      if (applying) return;
      void loadHold()
        .then((remote) => {
          if (cancel || !remote || applying) return;
          const local = useCharacters.getState().characters;
          let changed = false;
          const characters = local.map((c) => {
            const next = remote.characters.find((r) => r.id === c.id);
            if (!next || (next.updatedAt || "") <= (c.updatedAt || "")) return c;
            changed = true;
            return migrateCharacter(next);
          });
          if (!changed) return;
          applying = true;
          useCharacters.setState({ characters });
          applying = false;
        })
        .catch(() => {});
    }, 8000);
    return () => {
      cancel = true;
      applying = true;
      window.clearTimeout(timer);
      window.clearInterval(poll);
      unsub();
    };
  }, [userId, isPending, hydrated]);

  return null;
}
