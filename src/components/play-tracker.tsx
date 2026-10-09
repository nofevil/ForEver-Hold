import { Minus, Plus, RotateCcw } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { STATUS_PRESETS } from "@/lib/op20/catalogs";
import { derive, fillResources, imbueTier, itemDpCurrent } from "@/lib/op20/compute";
import { activeChannels, channelLabel, stopChannel } from "@/lib/op20/sustain";
import type { Character, GearItem } from "@/lib/op20/types";
import { useCharacters } from "@/store/characters";

export function HealthBar({ character: c }: { character: Character }) {
  const d = derive(c);
  const t = c.tracker;
  return (
    <PoolBar
      label="Health"
      current={t.currentHealth}
      max={d.healthMax}
      danger={t.currentHealth <= 0}
      hint={t.currentHealth <= 0 ? `Unconscious · death at −${d.edgeOfDeath}` : undefined}
      onAdj={(n) => adjTracker(c, "currentHealth", n, d.healthMax, -d.edgeOfDeath)}
    />
  );
}

export function CombatPoolBar({ character: c }: { character: Character }) {
  const d = derive(c);
  if (d.combatPool <= 0) return null;
  const current = Math.min(c.tracker.currentCp, d.combatPool);
  return (
    <PoolBar
      label="Combat Pool"
      current={current}
      max={d.combatPool}
      onAdj={(n) => adjTracker(c, "currentCp", n, d.combatPool, 0)}
    />
  );
}

export function SocialPoolBar({ character: c }: { character: Character }) {
  const d = derive(c);
  if (d.socialPool <= 0) return null;
  const current = Math.min(c.tracker.currentSp, d.socialPool);
  return (
    <PoolBar
      label="Social Pool"
      current={current}
      max={d.socialPool}
      onAdj={(n) => adjTracker(c, "currentSp", n, d.socialPool, 0)}
    />
  );
}

export function DemesnePoolBar({ character: c }: { character: Character }) {
  const d = derive(c);
  if (d.dpPool <= 0) return null;
  return (
    <PoolBar
      label="Demesne Points"
      current={c.tracker.currentDp}
      max={d.dpPool}
      hint={d.boundDp ? `${d.boundDp} bound · ${c.tracker.currentDp} free` : "Your Demesne pool"}
      trailing={
        <div className="flex h-9 items-center gap-2 rounded-lg bg-parchment px-3 shadow-[inset_0_0_0_1px_rgba(42,28,20,0.16)]">
          <span className="text-[10px] font-medium tracking-[0.14em] text-burgundy uppercase">Bound DP</span>
          <span className="font-display text-lg leading-none tabular-nums text-ink">{d.boundDp}</span>
        </div>
      }
      onAdj={(n) => adjTracker(c, "currentDp", n, d.dpMax, 0)}
    />
  );
}

export function ItemDpChip({ character: c, item }: { character: Character; item: GearItem }) {
  const update = useCharacters((s) => s.update);
  const max = item.dp ?? 0;
  const current = itemDpCurrent(item);
  const tier = imbueTier(c);
  const [amount, setAmount] = useState<number | null>(null);
  if (max <= 0) return null;
  const space = Math.max(0, max - current);
  const fromSelf = Math.max(0, c.tracker.currentDp ?? 0);
  const maxMove = Math.min(5 * tier, space, fromSelf);
  const n = amount == null ? maxMove : Math.max(0, Math.min(amount, maxMove));
  const spend = (delta: number) =>
    update(c.id, (cur) => ({
      ...cur,
      items: cur.items.map((i) => {
        if (i.id !== item.id) return i;
        const cap = i.dp ?? 0;
        return { ...i, currentDp: Math.max(0, Math.min(cap, itemDpCurrent(i) + delta)) };
      }),
    }));
  const pour = () => {
    if (n <= 0) return;
    update(c.id, (cur) => {
      const self = cur.tracker.currentDp ?? 0;
      const target = cur.items.find((i) => i.id === item.id);
      if (!target) return cur;
      const room = Math.max(0, (target.dp ?? 0) - itemDpCurrent(target));
      const move = Math.max(0, Math.min(n, 5 * imbueTier(cur), room, self));
      if (move <= 0) return cur;
      return {
        ...cur,
        tracker: { ...cur.tracker, currentDp: self - move },
        items: cur.items.map((i) =>
          i.id === target.id ? { ...i, currentDp: itemDpCurrent(i) + move } : i,
        ),
      };
    });
    setAmount(null);
  };
  return (
    <div className="mt-2 rounded-xl bg-cream px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(42,28,20,0.08)]">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[10px] font-medium tracking-[0.14em] text-burgundy uppercase">DP</span>
        <span className="font-display text-base leading-none tabular-nums text-ink">
          {current}
          <span className="text-xs text-muted">/{max}</span>
        </span>
        <div className="flex gap-1">
          {[-5, -1, 1, 5].map((step) => (
            <Button
              key={step}
              size="sm"
              variant="outline"
              className="h-7 min-w-7 px-1.5 text-xs"
              onClick={() => spend(step)}
            >
              {step > 0 ? `+${step}` : step}
            </Button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">Only Imbue puts DP back into an item.</p>
      {tier > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            className="size-7"
            disabled={n <= 0}
            onClick={() => setAmount(Math.max(0, n - 1))}
            aria-label="Less DP"
          >
            <Minus />
          </Button>
          <span className="w-6 text-center text-sm tabular-nums">{n}</span>
          <Button
            size="icon-sm"
            variant="outline"
            className="size-7"
            disabled={n >= maxMove}
            onClick={() => setAmount(Math.min(maxMove, n + 1))}
            aria-label="More DP"
          >
            <Plus />
          </Button>
          <Button size="sm" className="h-7 px-2" disabled={n <= 0} onClick={pour}>
            Imbue
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ChannelBanner({ character: c }: { character: Character }) {
  const update = useCharacters((s) => s.update);
  const channels = activeChannels(c);
  if (!channels.length) return null;
  return (
    <div className="space-y-2">
      {channels.map((channel) => (
        <div
          key={`${channel.treeId}:${channel.pickTier}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-3 shadow-[inset_0_0_0_1px_rgba(42,28,20,0.08)]"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-[0.16em] text-burgundy uppercase">Channeling</p>
            <p className="text-sm">
              {channelLabel(channel)}
              {` · ${channel.dpPerRound > 0 ? `${channel.dpPerRound} DP/round` : "free"}`}
            </p>
            <p className="text-sm text-muted">{channel.effect}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => update(c.id, (cur) => stopChannel(cur, channel.treeId, channel.pickTier))}
          >
            Stop Channel
          </Button>
        </div>
      ))}
    </div>
  );
}

function adjTracker(
  c: Character,
  key: "currentHealth" | "currentDp" | "currentCp" | "currentSp",
  delta: number,
  max: number,
  min: number,
) {
  useCharacters.getState().update(c.id, (cur) => ({
    ...cur,
    tracker: { ...cur.tracker, [key]: clamp((cur.tracker[key] ?? 0) + delta, min, max) },
  }));
}

export function RestStatus({ character: c }: { character: Character }) {
  const update = useCharacters((s) => s.update);
  const d = derive(c);
  const t = c.tracker;

  const setTracker = (patch: Partial<Character["tracker"]>) =>
    update(c.id, (cur) => ({ ...cur, tracker: { ...cur.tracker, ...patch } }));

  const adj = (key: "currentHealth" | "currentDp" | "currentCp" | "currentSp", delta: number, max: number) =>
    setTracker({ [key]: clamp(t[key] + delta, key === "currentHealth" ? -d.edgeOfDeath : 0, max) });

  return (
    <Panel title="Rest & status">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => update(c.id, fillResources)}>
            <RotateCcw /> Fill to max
          </Button>
          {d.combatPool > 0 ? (
            <Button size="sm" variant="outline" onClick={() => adj("currentCp", 1, d.combatPool)}>
              Center +1 CP
            </Button>
          ) : null}
          {d.socialPool > 0 ? (
            <Button size="sm" variant="outline" onClick={() => adj("currentSp", 1, d.socialPool)}>
              Center +1 SP
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => adj("currentHealth", Math.max(1, c.attributes.end), d.healthMax)}
          >
            Rest: Health
          </Button>
          {d.dpPool > 0 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const tree = c.demesnes.find((x) => (x.picks?.length || x.tier) > 0);
                const lead = tree?.picks?.find((p) => p.element)?.element;
                const attr = lead
                  ? lead === "water"
                    ? c.attributes.str
                    : lead === "fire"
                      ? c.attributes.pres
                      : lead === "air"
                        ? c.attributes.intel
                        : c.attributes.end
                  : 0;
                adj("currentDp", 2 * Math.max(1, attr), d.dpMax);
              }}
            >
              Rest: DP
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTracker({ fatigue: Math.max(0, t.fatigue - 1) })}
          >
            Recover fatigue
          </Button>
        </div>
        <div className="mb-3 flex items-center justify-between rounded-2xl bg-cream px-3 py-2">
          <span>Fatigue</span>
          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setTracker({ fatigue: Math.max(0, t.fatigue - 1) })}
            >
              <Minus />
            </Button>
            <span className="w-8 text-center font-display text-xl tabular-nums">{t.fatigue}</span>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => setTracker({ fatigue: t.fatigue + 1 })}
            >
              <Plus />
            </Button>
          </div>
        </div>
        <p className="mb-2 text-xs tracking-wide text-muted uppercase">Statuses</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_PRESETS.map((st) => {
            const on = t.statuses.includes(st);
            return (
              <button
                key={st}
                type="button"
                onClick={() =>
                  setTracker({
                    statuses: on ? t.statuses.filter((x) => x !== st) : [...t.statuses, st],
                  })
                }
                className={`h-9 rounded-full px-3 text-sm ${on ? "bg-burgundy text-parchment" : "bg-cream text-ink-soft shadow-[inset_0_0_0_1px_rgba(42,28,20,0.12)]"}`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </Panel>
    );
}

function PoolBar({
  label,
  current,
  max,
  onAdj,
  danger,
  hint,
  trailing,
  mode = "both",
}: {
  label: string;
  current: number;
  max: number;
  onAdj: (n: number) => void;
  danger?: boolean;
  hint?: string;
  trailing?: ReactNode;
  mode?: "both" | "spend";
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (current / max) * 100));
  const steps = mode === "spend" ? [-5, -1] : [-5, -1, 1, 5];
  return (
    <div className="rounded-2xl bg-cream px-4 py-3 shadow-[inset_0_0_0_1px_rgba(42,28,20,0.1)]">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[10px] font-medium tracking-[0.16em] text-burgundy uppercase">{label}</h3>
          {hint ? <p className="text-sm text-muted">{hint}</p> : null}
        </div>
        <div className={`shrink-0 font-display text-3xl leading-none tabular-nums ${danger ? "text-danger" : "text-ink"}`}>
          {current}
          <span className="text-base text-muted">/{max}</span>
        </div>
      </div>
      <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-parchment-2">
        <div
          className={`resource-fill h-full rounded-full ${danger ? "bg-danger" : "bg-burgundy"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {steps.map((n) => (
            <Button key={n} size="sm" variant="outline" className="h-8 min-w-8 px-2" onClick={() => onAdj(n)}>
              {n > 0 ? `+${n}` : n}
            </Button>
          ))}
        </div>
        {trailing}
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}