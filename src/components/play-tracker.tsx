import { Minus, Plus, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { NativeSelect, Textarea } from "@/components/ui/input";
import { STATUS_PRESETS } from "@/lib/op20/catalogs";
import { derive, equippedWeapon, isProficient, signed } from "@/lib/op20/compute";
import type { Character } from "@/lib/op20/types";
import { useCharacters } from "@/store/characters";

export function PlayTracker({ character: c }: { character: Character }) {
  const update = useCharacters((s) => s.update);
  const d = derive(c);
  const t = c.tracker;
  const weapon = equippedWeapon(c);

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
      fatigue: 0,
      statuses: [],
    });

  const restShift = (mode: "health" | "dp") => {
    if (mode === "health") adj("currentHealth", Math.max(1, c.attributes.end), d.healthMax);
    else {
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
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-wide text-burgundy uppercase">At the table</p>
          <h2 className="font-display text-3xl">{c.name || "Unnamed"}</h2>
        </div>
        <Button variant="outline" onClick={fill}>
          <RotateCcw /> Fill to max
        </Button>
      </div>

      <Resource
        label="Health"
        current={t.currentHealth}
        max={d.healthMax}
        danger={t.currentHealth <= 0}
        onAdj={(n) => adj("currentHealth", n, d.healthMax)}
        hint={t.currentHealth <= 0 ? `Unconscious · death at −${d.edgeOfDeath}` : undefined}
      />
      <Resource
        label={d.furyLabel ? "Fury" : "Demesne Points"}
        current={t.currentDp}
        max={d.dpMax}
        onAdj={(n) => adj("currentDp", n, d.dpMax)}
      />
      <Resource
        label="Combat Pool"
        current={t.currentCp}
        max={d.combatPool}
        onAdj={(n) => adj("currentCp", n, d.combatPool)}
      />
      <Resource
        label="Social Pool"
        current={t.currentSp}
        max={d.socialPool}
        onAdj={(n) => adj("currentSp", n, d.socialPool)}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Attack helper">
          <Field label="Equipped weapon">
            <NativeSelect
              value={t.equippedWeaponId ?? ""}
              onChange={(e) => setTracker({ equippedWeaponId: e.target.value || null })}
            >
              <option value="">None</option>
              {c.items
                .filter((i) => i.kind === "weapon")
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                    {i.weaponType ? ` (${i.weaponType})` : ""}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <dl className="mt-4 space-y-2 text-sm">
            <Row k="Prowess" v={signed(d.prowess)} />
            <Row k="Melee / thrown accuracy" v={signed(d.meleeAccuracy)} />
            <Row k="Precision" v={signed(d.precision)} />
            <Row k="Ranged accuracy" v={signed(d.rangedAccuracy)} />
            <Row k="Demesne accuracy" v={signed(d.demesneAccuracy)} />
            <Row k="Dodge" v={signed(d.dodgeWithAthletics)} />
            <Row k="Tic" v={String(d.tic)} />
            <Row k="Attack actions" v={String(d.attackActions)} />
            <Row k="Movement" v={String(d.movement)} />
            {weapon ? <Row k="Weapon WV" v={String(weapon.wv ?? "—")} /> : null}
            {weapon?.weaponType && !isProficient(c, weapon.weaponType) ? (
              <p className="text-warn">Untrained: −2 Accuracy, no WP tier, no WP abilities.</p>
            ) : null}
            {!d.attrMatchMelee ? (
              <p className="text-warn">Melee Attribute Match failed (−2).</p>
            ) : null}
            {!d.attrMatchRanged ? (
              <p className="text-warn">Ranged Attribute Match failed (−2).</p>
            ) : null}
          </dl>
        </Panel>

        <Panel title="Rest & status">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => adj("currentCp", 1, d.combatPool)}>
              Center +1 CP
            </Button>
            <Button size="sm" variant="outline" onClick={() => adj("currentSp", 1, d.socialPool)}>
              Center +1 SP
            </Button>
            <Button size="sm" variant="outline" onClick={() => restShift("health")}>
              Rest: Health
            </Button>
            <Button size="sm" variant="outline" onClick={() => restShift("dp")}>
              Rest: DP
            </Button>
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
          <Field label="Session notes" className="mt-4">
            <Textarea
              rows={4}
              value={t.notes}
              onChange={(e) => setTracker({ notes: e.target.value })}
            />
          </Field>
        </Panel>
      </div>
    </div>
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
    <div className="ornament-frame rounded-[28px] p-5">
      <div className="mb-2 flex items-end justify-between">
        <h3 className="font-display text-xl text-burgundy">{label}</h3>
        <div className={`font-display text-3xl tabular-nums ${danger ? "text-danger" : "text-ink"}`}>
          {current}
          <span className="text-lg text-muted"> / {max}</span>
        </div>
      </div>
      <div className="mb-3 h-3 overflow-hidden rounded-full bg-parchment-2">
        <div
          className={`resource-fill h-full rounded-full ${danger ? "bg-danger" : "bg-burgundy"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint ? <p className="mb-2 text-sm text-warn">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {[-5, -1, 1, 5].map((n) => (
          <Button key={n} size="sm" variant="outline" onClick={() => onAdj(n)}>
            {n > 0 ? `+${n}` : n}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <div className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">{label}</div>
      {children}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
