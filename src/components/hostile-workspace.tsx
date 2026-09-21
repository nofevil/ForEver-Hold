import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { HoldMark } from "@/components/mark";
import { Panel, StatChip } from "@/components/panel";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { MOB_PRESETS, mobThreat } from "@/lib/op20/campaign";
import type { Mob, MobKind } from "@/lib/op20/types";
import { useCharacters } from "@/store/characters";

export function HostileWorkspace({ mob: m }: { mob: Mob }) {
  const updateMob = useCharacters((s) => s.updateMob);
  const patch = (fn: (cur: Mob) => Mob) => updateMob(m.id, fn);
  const threat = mobThreat(m);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-leather-2/20 bg-leather text-parchment">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2 sm:px-6">
          <Link
            to="/"
            search={{ desk: "hostiles" }}
            className="flex size-11 items-center justify-center rounded-xl hover:bg-white/10"
            aria-label="Back to hostiles"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <HoldMark className="hidden size-7 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">{m.name || "Unnamed hostile"}</p>
            <p className="truncate text-xs text-parchment/70">
              {m.kind === "named" ? "Named encounter" : `${threat} mob`}
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px] sm:px-6 sm:py-8">
        <div className="space-y-5">
          <Panel title="Identity">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Name"
                value={m.name}
                onChange={(e) => patch((x) => ({ ...x, name: e.target.value }))}
              />
              <NativeSelect
                value={m.kind}
                onChange={(e) => patch((x) => ({ ...x, kind: e.target.value as MobKind }))}
              >
                <option value="mob">Mob — cinematic fodder</option>
                <option value="named">Named — track like an NPC</option>
              </NativeSelect>
              <Textarea
                className="sm:col-span-2"
                rows={2}
                placeholder="Who they are on the table"
                value={m.bio}
                onChange={(e) => patch((x) => ({ ...x, bio: e.target.value }))}
              />
            </div>
          </Panel>

          <Panel title="Three numbers" action={<span>Base +2 Acc, 1 Hit, 3 damage</span>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Row label="Accuracy">
                <Stepper value={m.accuracy} min={0} max={12} onChange={(v) => patch((x) => ({ ...x, accuracy: v }))} />
              </Row>
              <Row label="Hits">
                <Stepper value={m.hits} min={1} max={5} onChange={(v) => patch((x) => ({ ...x, hits: v }))} />
              </Row>
              <Row label="Damage">
                <Stepper value={m.damage} min={0} max={20} onChange={(v) => patch((x) => ({ ...x, damage: v }))} />
              </Row>
              <Row label="Movement">
                <Stepper value={m.movement} min={0} max={12} onChange={(v) => patch((x) => ({ ...x, movement: v }))} />
              </Row>
              <Input
                placeholder="Damage type (Physical, Fire, Venom…)"
                value={m.damageType}
                onChange={(e) => patch((x) => ({ ...x, damageType: e.target.value }))}
              />
              <Row label="Pack size">
                <Stepper
                  value={m.packSize}
                  min={0}
                  max={40}
                  onChange={(v) => patch((x) => ({ ...x, packSize: v }))}
                />
              </Row>
            </div>
            <p className="mt-3 text-sm text-muted">
              Pack 0 means an endless trickle. Extra Hits only if the group is small — 3 Hits is already a
              regular NPC.
            </p>
          </Panel>

          <Panel title="Special">
            <Textarea
              rows={4}
              placeholder="+10 effects, immunities, Swarm rules…"
              value={m.special}
              onChange={(e) => patch((x) => ({ ...x, special: e.target.value }))}
            />
          </Panel>

          <Panel title="Notes">
            <Textarea rows={3} value={m.notes} onChange={(e) => patch((x) => ({ ...x, notes: e.target.value }))} />
          </Panel>

          <Panel title="Presets">
            <div className="flex flex-wrap gap-2">
              {MOB_PRESETS.map((p) => (
                <Button
                  key={p.name}
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    patch((x) => ({
                      ...x,
                      ...p,
                    }))
                  }
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel title="On the table">
            <div className="grid grid-cols-2 gap-2">
              <StatChip label="Accuracy" value={m.accuracy > 0 ? `+${m.accuracy}` : m.accuracy} />
              <StatChip label="Hits" value={m.hits} hint="any hit kills one" />
              <StatChip label="Damage" value={m.damage} hint={m.damageType || "Physical"} />
              <StatChip label="Move" value={m.movement} />
            </div>
            <p className="mt-3 text-sm text-muted">
              {m.packSize === 0
                ? "Endless trickle — they keep coming."
                : `${m.packSize} in the pack. ${m.packSize * m.hits} hits to clear.`}
            </p>
          </Panel>
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
