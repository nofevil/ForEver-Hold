import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { standingMobTargets } from "@/lib/op20/campaign";
import type { CampaignExport, Character } from "@/lib/op20/types";

export type SeatView = {
  characterId: string;
  userId: string;
  name: string;
  profession: string;
  health: number;
  healthMax: number;
  dp: number;
  dpMax: number;
  targetId: string;
};

export type CampaignCard = {
  id: string;
  name: string;
  epoch: string;
  joinCode: string;
  role: "owner" | "player";
  seatName: string;
};

function asPayload(value: unknown): CampaignExport | null {
  if (value == null) return null;
  const obj = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (!obj || typeof obj !== "object") return null;
  return obj as CampaignExport;
}

async function sql() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

export const loadHold = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CampaignExport | null> => {
    const db = await sql();
    const rows = await db<{ payload: unknown }>`
      select payload from holds where user_id = ${context.userId}
    `;
    return asPayload(rows[0]?.payload);
  });

export const saveHold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: CampaignExport) => {
    if (!input || typeof input !== "object" || !Array.isArray(input.characters)) {
      throw new Error("The company could not be saved.");
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    const db = await sql();
    const payload = JSON.stringify(data);
    await db`
      insert into holds (user_id, payload, updated_at)
      values (${context.userId}, ${payload}::jsonb, now())
      on conflict (user_id) do update
      set payload = excluded.payload, updated_at = now()
    `;
    const { migrateCharacter } = await import("@/lib/op20/normalize");
    const { derive } = await import("@/lib/op20/compute");
    for (const raw of data.characters) {
      const character = migrateCharacter(raw as Character);
      const stats = derive(character);
      const sheet = JSON.stringify(character);
      await db`
        update campaign_seats
        set name = ${character.name || "Unnamed"},
            profession = ${character.profession || ""},
            health = ${character.tracker.currentHealth ?? 0},
            health_max = ${stats.healthMax},
            dp = ${character.tracker.currentDp ?? 0},
            dp_max = ${stats.dpMax},
            target_id = ${character.tracker.targetId ?? ""},
            sheet = ${sheet}::jsonb
        where user_id = ${context.userId} and character_id = ${character.id}
      `;
    }
    return { ok: true };
  });

export const upsertCampaign = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; name: string; joinCode: string; epoch: string; notes: string }) => {
    const joinCode = input.joinCode.trim().toUpperCase();
    if (!input.id || joinCode.length < 4) throw new Error("This table needs a join code.");
    return {
      id: input.id,
      name: input.name ?? "",
      joinCode,
      epoch: input.epoch ?? "",
      notes: input.notes ?? "",
    };
  })
  .handler(async ({ context, data }) => {
    const db = await sql();
    await db`
      insert into campaigns (id, owner_user_id, name, join_code, epoch, notes)
      values (${data.id}, ${context.userId}, ${data.name}, ${data.joinCode}, ${data.epoch}, ${data.notes})
      on conflict (id) do update
      set name = excluded.name,
          epoch = excluded.epoch,
          notes = excluded.notes,
          join_code = excluded.join_code,
          updated_at = now()
      where campaigns.owner_user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const listMyCampaigns = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CampaignCard[]> => {
    const db = await sql();
    const owned = await db<{ id: string; name: string; epoch: string; join_code: string }>`
      select id, name, epoch, join_code from campaigns
      where owner_user_id = ${context.userId}
      order by updated_at desc
    `;
    const seated = await db<{ id: string; name: string; epoch: string; join_code: string; seat_name: string }>`
      select c.id, c.name, c.epoch, c.join_code, s.name as seat_name
      from campaign_seats s
      join campaigns c on c.id = s.campaign_id
      where s.user_id = ${context.userId} and c.owner_user_id <> ${context.userId}
      order by s.seated_at desc
    `;
    return [
      ...owned.map((c) => ({
        id: c.id,
        name: c.name || "Unnamed table",
        epoch: c.epoch,
        joinCode: c.join_code,
        role: "owner" as const,
        seatName: "",
      })),
      ...seated.map((c) => ({
        id: c.id,
        name: c.name || "Unnamed table",
        epoch: c.epoch,
        joinCode: c.join_code,
        role: "player" as const,
        seatName: c.seat_name,
      })),
    ];
  });

export const listSeats = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { campaignId: string }) => {
    if (!input?.campaignId) throw new Error("Missing table.");
    return { campaignId: input.campaignId };
  })
  .handler(async ({ context, data }): Promise<SeatView[]> => {
    const db = await sql();
    const allowed = await db<{ ok: number }>`
      select 1 as ok from campaigns
      where id = ${data.campaignId} and owner_user_id = ${context.userId}
      union
      select 1 as ok from campaign_seats
      where campaign_id = ${data.campaignId} and user_id = ${context.userId}
    `;
    if (!allowed.length) return [];
    const rows = await db<{
      character_id: string;
      user_id: string;
      name: string;
      profession: string;
      health: number;
      health_max: number;
      dp: number;
      dp_max: number;
      target_id: string;
    }>`
      select character_id, user_id, name, profession, health, health_max, dp, dp_max, target_id
      from campaign_seats
      where campaign_id = ${data.campaignId}
      order by seated_at
    `;
    return rows.map((r) => ({
      characterId: r.character_id,
      userId: r.user_id,
      name: r.name,
      profession: r.profession,
      health: Number(r.health),
      healthMax: Number(r.health_max),
      dp: Number(r.dp),
      dpMax: Number(r.dp_max),
      targetId: r.target_id ?? "",
    }));
  });

export const sitDown = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string; characterId: string }) => {
    const code = input.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) throw new Error("Enter the join code.");
    if (!input.characterId) throw new Error("Choose a character.");
    return { code, characterId: input.characterId };
  })
  .handler(async ({ context, data }) => {
    const db = await sql();
    const campaigns = await db<{ id: string; name: string }>`
      select id, name from campaigns where join_code = ${data.code}
    `;
    const campaign = campaigns[0];
    if (!campaign) throw new Error("No table uses that code.");
    const holds = await db<{ payload: unknown }>`
      select payload from holds where user_id = ${context.userId}
    `;
    const hold = asPayload(holds[0]?.payload);
    const raw = hold?.characters?.find((c) => c.id === data.characterId);
    if (!raw) throw new Error("That character is not on your account yet. Open the company, then try again.");
    const { migrateCharacter } = await import("@/lib/op20/normalize");
    const { derive } = await import("@/lib/op20/compute");
    const character = migrateCharacter(raw as Character);
    const stats = derive(character);
    const name = character.name || "Unnamed";
    const profession = character.profession || "";
    const health = character.tracker.currentHealth;
    const healthMax = stats.healthMax;
    const dp = character.tracker.currentDp;
    const dpMax = stats.dpMax;
    const sheet = JSON.stringify(character);
    const seatId = `${campaign.id}:${context.userId}`;
    await db`
      insert into campaign_seats (
        id, campaign_id, user_id, character_id, name, profession, health, health_max, dp, dp_max, target_id, sheet
      )
      values (
        ${seatId}, ${campaign.id}, ${context.userId}, ${character.id},
        ${name}, ${profession}, ${health}, ${healthMax}, ${dp}, ${dpMax},
        ${character.tracker.targetId ?? ""}, ${sheet}::jsonb
      )
      on conflict (campaign_id, user_id) do update
      set character_id = excluded.character_id,
          name = excluded.name,
          profession = excluded.profession,
          health = excluded.health,
          health_max = excluded.health_max,
          dp = excluded.dp,
          dp_max = excluded.dp_max,
          target_id = excluded.target_id,
          sheet = excluded.sheet,
          seated_at = now()
    `;
    return { campaignId: campaign.id, name: campaign.name || "Unnamed table" };
  });

export type TableMate = {
  characterId: string;
  name: string;
  targetId: string;
  kind: "character" | "mob";
};

export const listTableMates = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { characterId: string }) => {
    if (!input?.characterId) throw new Error("Missing character.");
    return { characterId: input.characterId };
  })
  .handler(async ({ context, data }): Promise<{ campaignId: string; mates: TableMate[] } | null> => {
    const db = await sql();
    const seated = await db<{ campaign_id: string }>`
      select campaign_id from campaign_seats
      where user_id = ${context.userId} and character_id = ${data.characterId}
      limit 1
    `;
    const campaignId = seated[0]?.campaign_id;
    if (!campaignId) return null;
    const rows = await db<{ character_id: string; name: string; target_id: string }>`
      select character_id, name, target_id from campaign_seats
      where campaign_id = ${campaignId} and character_id <> ${data.characterId}
      order by seated_at
    `;
    const mates: TableMate[] = rows.map((r) => ({
      characterId: r.character_id,
      name: r.name || "Unnamed",
      targetId: r.target_id ?? "",
      kind: "character",
    }));
    const owner = await db<{ owner_user_id: string }>`
      select owner_user_id from campaigns where id = ${campaignId} limit 1
    `;
    const ownerId = owner[0]?.owner_user_id;
    if (ownerId) {
      const holds = await db<{ payload: unknown }>`
        select payload from holds where user_id = ${ownerId}
      `;
      const hold = asPayload(holds[0]?.payload);
      const table = hold?.tables?.find((item) => item.id === campaignId);
      if (table) {
        for (const mob of standingMobTargets(table.encounter ?? [], hold?.mobs ?? [])) {
          mates.push({ characterId: mob.id, name: mob.name, targetId: "", kind: "mob" });
        }
      }
    }
    return { campaignId, mates };
  });

export const exchangeStrike = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { campaignId: string; attackerId: string; weaponId: string }) => {
    if (!input?.campaignId || !input.attackerId || !input.weaponId) {
      throw new Error("That attack is missing a table, character, or weapon.");
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    const db = await sql();
    const allowed = await db<{ ok: number }>`
      select 1 as ok from campaigns where id = ${data.campaignId} and owner_user_id = ${context.userId}
      union
      select 1 as ok from campaign_seats where campaign_id = ${data.campaignId} and user_id = ${context.userId}
    `;
    if (!allowed.length) return { exchanged: false as const };

    const { migrateCharacter } = await import("@/lib/op20/normalize");
    const { derive } = await import("@/lib/op20/compute");
    const { resolveStrike } = await import("@/lib/op20/resolve");

    const mine = await db<{ payload: unknown }>`
      select payload from holds where user_id = ${context.userId}
    `;
    const myHold = asPayload(mine[0]?.payload);
    const attackerRaw = myHold?.characters?.find((c) => c.id === data.attackerId);
    if (!attackerRaw) return { exchanged: false as const };
    const attacker = migrateCharacter(attackerRaw as Character);
    const targetId = attacker.tracker.targetId ?? "";
    if (!targetId) return { exchanged: false as const };

    const seats = await db<{ user_id: string; character_id: string }>`
      select user_id, character_id from campaign_seats where campaign_id = ${data.campaignId}
    `;
    const defenderSeat = seats.find((s) => s.character_id === targetId);
    if (!defenderSeat) return { exchanged: false as const };
    const theirs = await db<{ payload: unknown }>`
      select payload from holds where user_id = ${defenderSeat.user_id}
    `;
    const theirHold = asPayload(theirs[0]?.payload);
    const defenderRaw = theirHold?.characters?.find((c) => c.id === targetId);
    if (!defenderRaw) return { exchanged: false as const };
    const defender = migrateCharacter(defenderRaw as Character);
    if ((defender.tracker.targetId ?? "") !== attacker.id) return { exchanged: false as const };

    const weapon = attacker.items.find((i) => i.id === data.weaponId && i.kind === "weapon");
    if (!weapon) return { exchanged: false as const };

    const report = resolveStrike(attacker, defender, weapon);
    const attackerNext = { ...attacker, tracker: report.attackerTracker, updatedAt: new Date().toISOString() };
    const defenderNext = { ...defender, tracker: report.defenderTracker, updatedAt: new Date().toISOString() };

    async function writeBack(userId: string, hold: CampaignExport, next: Character) {
      const characters = hold.characters.map((c) => (c.id === next.id ? next : c));
      const payload = JSON.stringify({ ...hold, characters });
      await db`
        update holds set payload = ${payload}::jsonb, updated_at = now() where user_id = ${userId}
      `;
      const stats = derive(next);
      const sheet = JSON.stringify(next);
      await db`
        update campaign_seats
        set health = ${next.tracker.currentHealth ?? 0},
            health_max = ${stats.healthMax},
            dp = ${next.tracker.currentDp ?? 0},
            dp_max = ${stats.dpMax},
            target_id = ${next.tracker.targetId ?? ""},
            sheet = ${sheet}::jsonb,
            name = ${next.name || "Unnamed"}
        where campaign_id = ${data.campaignId} and user_id = ${userId} and character_id = ${next.id}
      `;
    }

    if (myHold) await writeBack(context.userId, myHold, attackerNext);
    if (theirHold) await writeBack(defenderSeat.user_id, theirHold, defenderNext);

    return {
      exchanged: true as const,
      report: {
        hit: report.hit,
        attack: report.attack,
        defense: report.defense,
        testResult: report.testResult,
        damage: report.damage,
        lines: report.lines,
      },
      attackerTracker: report.attackerTracker,
    };
  });

