import { Minus, Plus, RotateCcw } from "lucide-react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { STATUS_PRESETS } from "@/lib/op20/catalogs";
import { derive } from "@/lib/op20/compute";
import { channelLabel, liveChannel, stopChannel } from "@/lib/op20/sustain";
import type { Character } from "@/lib/op20/types";
import { useCharacters } from "@/store/characters";

export function ResourceTrack({ character: c }: { character: Character }) {
  const update = useCharacters((s) => s.update);
  const d = derive(c);
  const t = c.tracker;

  const setTracker = (patch: Partial<Character["tracker"]>) =>
    update(c.id, (cur) => ({ ...cur, tracker: { ...cur.tracker, ...patch } }));

  const adj = (key: "currentHealth" | "currentDp" | "currentCp" | "currentSp", delta: number, max: number) =>
    setTracker({ [key]: clamp(t[key] + delta, key === "currentHealth" ? -d.edgeOfDeath : 0, max) });

  const fill = () =>
    setTracker({
      currentHealth: d.healthMax,
      currentDp: d.dpMax,
      currentCp: d.combatPool,
      currentSp: d.socialPool,
    });

  const channel = c.channel ? liveChannel(c, c.channel) : null;

  const resources = [
    <Resource
      key="health"
      label="Health"
      current={t.currentHealth}
      max={d.healthMax}
      danger={t.currentHealth <= 0}
      onAdj={(n) => adj("currentHealth", n, d.healthMax)}
      hint={t.currentHealth <= 0 ? `Unconscious · death at −${d.edgeOfDeath}` : undefined}
    />,
    d.dpPool > 0 ? (
      <Resource
        key="dp"
        label="Demesne Points"
        current={t.currentDp}
        max={d.dpMax}
        onAdj={(n) => adj("currentDp", n, d.dpMax)}
      />
    ) : null,
    d.combatPool > 0 ? (
      <Resource
        key="cp"
        label="Combat Pool"
        current={Math.min(t.currentCp, d.combatPool)}
        max={d.combatPool}
        onAdj={(n) => adj("currentCp", n, d.combatPool)}
      />
    ) : null,
    d.socialPool > 0 ? (
      <Resource
        key="sp"
        label="Social Pool"
        current={Math.min(t.currentSp, d.socialPool)}
        max={d.socialPool}
        onAdj={(n) => adj("currentSp", n, d.socialPool)}
      />
    ) : null,
  ].filter((node) => node != null);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fill}>
          <RotateCcw /> Fill to max
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {resources.map((node, i) => (
          <div key={i} className={poolSpan(i, resources.length)}>
            {node}
          </div>
        ))}
      </div>

      {channel ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-3 shadow-[inset_0_0_0_1px_rgba(42,28,20,0.08)]">
          <div className="min-w-0">
            <p className="text-[10px] font-medium tracking-[0.16em] text-burgundy uppercase">Channeling</p>
            <p className="text-sm">
              {channelLabel(channel)}
              {channel.dpPerRound ? ` · ${channel.dpPerRound} DP/round` : ""}
            </p>
            <p className="text-sm text-muted">{channel.effect}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => update(c.id, stopChannel)}>
            Stop Channel
          </Button>
        </div>
      ) : null}
    </div>
  );
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

function Resource({
  label,
  current,
  max,
  onAdj,
  danger,
  hint,
}: {
  label: string;
  current: number;
  max: number;
  onAdj: (n: number) => void;
  danger?: boolean;
  hint?: string;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="stat-shield p-3">
      <div className="mb-1 flex items-end justify-between gap-2">
        <h3 className="text-[10px] font-medium tracking-[0.14em] text-burgundy uppercase">{label}</h3>
        <div className={`font-display text-2xl leading-none tabular-nums ${danger ? "text-danger" : "text-ink"}`}>
          {current}
          <span className="text-sm text-muted">/{max}</span>
        </div>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-parchment-2">
        <div
          className={`resource-fill h-full rounded-full ${danger ? "bg-danger" : "bg-burgundy"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? <p className="mb-2 text-xs text-warn">{hint}</p> : null}
      <div className="flex flex-wrap gap-1">
        {[-5, -1, 1, 5].map((n) => (
          <Button key={n} size="sm" variant="outline" className="h-8 min-w-8 px-2" onClick={() => onAdj(n)}>
            {n > 0 ? `+${n}` : n}
          </Button>
        ))}
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Fill a 2-column phone grid and a 4-column desktop grid without a leftover hole. */
function poolSpan(index: number, total: number) {
  const last = index === total - 1;
  if (total === 1) return "col-span-2 lg:col-span-4";
  if (total === 2) return "col-span-1 lg:col-span-2";
  if (total === 3 && last) return "col-span-2";
  return "col-span-1";
}
