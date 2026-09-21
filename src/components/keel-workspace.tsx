import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { HoldMark } from "@/components/mark";
import { Panel, StatChip } from "@/components/panel";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import {
  AIRSHIP_POD_META,
  airshipFreeHardpoints,
  airshipMaxPods,
  airshipSpend,
  airshipWarnings,
} from "@/lib/op20/campaign";
import { AIRSHIP_SIZE_ESSENCE } from "@/lib/op20/formulas";
import { nextTierCost } from "@/lib/op20/compute";
import type { Airship, AirshipPodType } from "@/lib/op20/types";
import { AIRSHIP_POD_TYPES } from "@/lib/op20/types";
import { uid } from "@/lib/utils";
import { useCharacters } from "@/store/characters";

export function KeelWorkspace({ ship: a }: { ship: Airship }) {
  const updateAirship = useCharacters((s) => s.updateAirship);
  const patch = (fn: (cur: Airship) => Airship) => updateAirship(a.id, fn);
  const s = airshipSpend(a);
  const warns = airshipWarnings(a);
  const size = Math.max(1, Math.min(5, a.size));
  const free = airshipFreeHardpoints(size);
  const maxPods = airshipMaxPods(size);
  const coast = a.thrust * 2;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-leather-2/20 bg-leather text-parchment">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-6">
          <Link
            to="/"
            search={{ desk: "keels" }}
            className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10"
            aria-label="Back to keels"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <HoldMark className="hidden size-7 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">{a.name || "Unnamed keel"}</p>
            <p className="truncate text-xs text-parchment/70">
              Size {size} · {s.spent} Essence · band {AIRSHIP_SIZE_ESSENCE[size]}
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px] sm:px-6 sm:py-8">
        <div className="space-y-5">
          <Panel title="Identity">
            <div className="grid gap-3">
              <Input
                placeholder="Name"
                value={a.name}
                onChange={(e) => patch((x) => ({ ...x, name: e.target.value }))}
              />
              <Textarea
                rows={2}
                placeholder="Yard notes"
                value={a.bio}
                onChange={(e) => patch((x) => ({ ...x, bio: e.target.value }))}
              />
            </div>
          </Panel>

          <Panel title="Size" action={<span>1=500 · 2=2500 · 3=5000 · 4=10000 · 5=25000</span>}>
            <Row label="Size">
              <Stepper
                value={a.size}
                min={1}
                max={5}
                onChange={(v) =>
                  patch((x) => ({
                    ...x,
                    size: v,
                    hardpoints: Math.max(airshipFreeHardpoints(v), Math.min(x.hardpoints, airshipMaxPods(v))),
                  }))
                }
              />
            </Row>
            <p className="mt-2 text-sm text-muted">
              Free hardpoints {free}. Max pods {maxPods} (2 per size). Thrust step is 20ST × Size. Maneuver
              step is 10ST × Size. Coast speed is 2 × Thrust.
            </p>
          </Panel>

          <Panel title="Structure">
            <div className="grid gap-3 sm:grid-cols-2">
              <Row label="Crew Quarters">
                <Stepper
                  value={a.crew}
                  max={20}
                  nextCost={nextTierCost(10, a.crew)}
                  onChange={(v) => patch((x) => ({ ...x, crew: v }))}
                />
              </Row>
              <Row label="Hull">
                <Stepper
                  value={a.hull}
                  max={40}
                  nextCost={nextTierCost(1, a.hull)}
                  onChange={(v) => patch((x) => ({ ...x, hull: v }))}
                />
              </Row>
              <Row label="Carapace">
                <Stepper
                  value={a.carapace}
                  max={40}
                  nextCost={nextTierCost(1, a.carapace)}
                  onChange={(v) => patch((x) => ({ ...x, carapace: v }))}
                />
              </Row>
              <Row label="Armor">
                <Stepper
                  value={a.armor}
                  max={15}
                  nextCost={nextTierCost(5, a.armor)}
                  onChange={(v) => patch((x) => ({ ...x, armor: v }))}
                />
              </Row>
              <Row label="Demesne Resist">
                <Stepper
                  value={a.demesneResist}
                  max={15}
                  nextCost={nextTierCost(5, a.demesneResist)}
                  onChange={(v) => patch((x) => ({ ...x, demesneResist: v }))}
                />
              </Row>
              <Row label="Hardpoints">
                <Stepper
                  value={a.hardpoints}
                  min={free}
                  max={maxPods}
                  onChange={(v) => patch((x) => ({ ...x, hardpoints: v }))}
                />
              </Row>
            </div>
            <p className="mt-2 text-xs text-muted">Armor and Demesne Resist: any +10 penetrates.</p>
          </Panel>

          <Panel title="Motion">
            <div className="grid gap-3 sm:grid-cols-2">
              <Row label="Thrust">
                <Stepper
                  value={a.thrust}
                  max={10}
                  nextCost={nextTierCost(20 * size, a.thrust)}
                  onChange={(v) => patch((x) => ({ ...x, thrust: v }))}
                />
              </Row>
              <Row label="Maneuver">
                <Stepper
                  value={a.maneuver}
                  max={10}
                  nextCost={nextTierCost(10 * size, a.maneuver)}
                  onChange={(v) => patch((x) => ({ ...x, maneuver: v }))}
                />
              </Row>
            </div>
          </Panel>

          <Panel title="Pods" action={<span>{a.pods.length}/{a.hardpoints} hardpoints</span>}>
            <div className="space-y-2">
              {a.pods.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-2xl bg-cream p-3">
                  <NativeSelect
                    value={p.type}
                    onChange={(e) =>
                      patch((x) => ({
                        ...x,
                        pods: x.pods.map((y) =>
                          y.id === p.id ? { ...y, type: e.target.value as AirshipPodType } : y,
                        ),
                      }))
                    }
                  >
                    {AIRSHIP_POD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {AIRSHIP_POD_META[t].name}
                      </option>
                    ))}
                  </NativeSelect>
                  <p className="hidden flex-1 text-sm text-muted sm:block">{AIRSHIP_POD_META[p.type].text}</p>
                  <span className="tabular-nums text-sm">{AIRSHIP_POD_META[p.type].cost(size)}</span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => patch((x) => ({ ...x, pods: x.pods.filter((y) => y.id !== p.id) }))}
                  >
                    <X />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={a.pods.length >= a.hardpoints}
                onClick={() =>
                  patch((x) => ({
                    ...x,
                    pods: [...x.pods, { id: uid(), type: "cargo" }],
                  }))
                }
              >
                <Plus /> Pod
              </Button>
            </div>
          </Panel>

          <Panel title="Notes">
            <Textarea rows={3} value={a.notes} onChange={(e) => patch((x) => ({ ...x, notes: e.target.value }))} />
          </Panel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel title="Yard total">
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted">Essence</span>
              <span className={`font-display text-3xl tabular-nums ${s.spent > s.budget ? "text-warn" : "text-ink"}`}>
                {s.spent}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">Size {size} band {s.budget}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <StatChip label="Crew" value={a.crew} hint="1 per tier" />
              <StatChip label="Coast" value={coast} hint="2 × Thrust" />
              <StatChip label="Turns" value={a.maneuver} hint="1-square turns" />
              <StatChip label="Hull" value={a.hull} />
            </div>
            <dl className="mt-3 max-h-56 space-y-1 overflow-auto text-sm">
              {s.lines.map((l) => (
                <div key={l.key} className="flex justify-between gap-2">
                  <dt className="text-muted">{l.label}</dt>
                  <dd className="tabular-nums">{l.essence}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          {warns.length > 0 ? (
            <Panel title="Flags">
              <ul className="space-y-1 text-sm text-warn">
                {warns.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </aside>
      </main>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ink-soft">{label}</span>
      {children}
    </div>
  );
}
