import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { AbilityDef } from "@/lib/op20/catalogs";
import { BANE_TARGETS } from "@/lib/op20/catalogs";
import { fillQualityTier } from "@/lib/op20/formulas";
import { playedAbilityText } from "@/lib/op20/sustain";
import { cn } from "@/lib/utils";
import { AbilityProse } from "@/components/ability-prose";

export function AbilitySelect({
  list,
  value,
  onChange,
  placeholder = "Choose ability",
  tier,
  quality,
  disabled,
}: {
  list: AbilityDef[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** Resolve N/Tier to this tier’s number, the way Demesne abilities do. */
  tier?: number;
  /** Resolve N/Quality Tier from the equipped armor or shield. */
  quality?: { gear: "armor" | "shield"; essence: number | null };
  disabled?: boolean;
}) {
  const textOf = (text: string) => {
    const scaled = tier != null && tier > 0 ? playedAbilityText(text, tier) : text;
    return quality ? fillQualityTier(scaled, quality.essence, quality.gear) : scaled;
  };
  return (
    <MenuSelect
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      options={list.map((a) => ({ value: a.id, label: a.name, text: textOf(a.text) }))}
    />
  );
}

export function BaneAgainst({ value, onChange }: { value?: string; onChange: (id: string) => void }) {
  const custom = value === "custom" || value?.startsWith("custom:");
  const typed = value?.startsWith("custom:") ? value.slice("custom:".length) : "";
  return (
    <div className="mt-2 space-y-2">
      <div className="text-xs tracking-wide text-muted uppercase">Against</div>
      <MenuSelect
        value={custom ? "custom" : (value ?? "")}
        onChange={(id) => onChange(id === "custom" ? "custom:" : id)}
        placeholder="Demesne or creature"
        options={[
          ...BANE_TARGETS.map((t) => ({ value: t.id, label: t.label, text: t.group })),
          { value: "custom", label: "Custom", text: "Type a name that is not on this list" },
        ]}
      />
      {custom ? (
        <input
          aria-label="Custom type"
          className="flex h-11 w-full rounded-[10px] bg-cream px-3 text-base text-ink shadow-[inset_0_0_0_1px_rgba(42,28,20,0.16)] placeholder:text-muted focus-visible:shadow-[inset_0_0_0_2px_#7c2d22] focus-visible:outline-none"
          value={typed}
          placeholder="Type a type"
          onChange={(e) => onChange(`custom:${e.target.value}`)}
        />
      ) : null}
    </div>
  );
}

export type MenuOption = { value: string; label: string; text?: string; onDelete?: () => void };

export function MenuSelect({
  value,
  onChange,
  options,
  placeholder = "Choose",
  disabled,
  allowEmpty = true,
  className,
  fit,
}: {
  value: string;
  onChange: (value: string) => void;
  options: MenuOption[];
  placeholder?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  className?: string;
  /** Hug the longest option label instead of stretching full width. */
  fit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const chosen = useMemo(() => options.find((a) => a.value === value), [options, value]);
  const sizerLabels = options.length ? options.map((o) => o.label) : [placeholder];

  return (
    <div className={cn(fit ? "inline-flex max-w-full flex-col items-stretch" : "space-y-1.5", className)}>
      <Popover.Root open={open} onOpenChange={(next) => !disabled && setOpen(next)}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-11 items-center justify-between gap-2 rounded-[10px] bg-cream px-3 text-left text-base text-ink shadow-[inset_0_0_0_1px_rgba(42,28,20,0.16)]",
              "focus-visible:shadow-[inset_0_0_0_2px_#7c2d22] focus-visible:outline-none disabled:opacity-50",
              fit ? "w-auto max-w-full shrink-0 overflow-hidden" : "w-full",
            )}
            aria-label={chosen?.label ?? placeholder}
          >
            <span
              className={cn(
                fit ? "inline-grid justify-items-start" : "min-w-0 truncate",
                chosen ? "text-ink" : "text-muted",
              )}
            >
              {fit ? (
                <>
                  {sizerLabels.map((label, i) => (
                    <span
                      key={`${label}-${i}`}
                      className="invisible col-start-1 row-start-1 whitespace-nowrap"
                      aria-hidden
                    >
                      {label}
                    </span>
                  ))}
                  <span className="col-start-1 row-start-1 min-w-0 truncate whitespace-nowrap">
                    {chosen?.label ?? placeholder}
                  </span>
                </>
              ) : (
                (chosen?.label ?? placeholder)
              )}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted" />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className={cn(
              "z-50 max-h-80 overflow-auto rounded-[14px] bg-parchment p-1 shadow-[0_18px_40px_-16px_rgba(42,28,20,0.45),inset_0_0_0_1px_rgba(42,28,20,0.12)]",
              fit
                ? "w-max max-w-md min-w-[var(--radix-popover-trigger-width)]"
                : "w-[var(--radix-popover-trigger-width)]",
            )}
          >
            {allowEmpty ? (
              <button
                type="button"
                className="flex min-h-11 w-full items-center rounded-[10px] px-3 text-left text-sm text-muted hover:bg-cream"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                {placeholder}
              </button>
            ) : null}
            {options.map((a) => {
              const selected = a.value === value;
              return (
                <div
                  key={a.value}
                  className={cn(
                    "flex w-full items-center rounded-[10px] hover:bg-cream",
                    selected ? "bg-cream" : "",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-left"
                    onClick={() => {
                      onChange(a.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        selected ? "text-burgundy" : "text-transparent",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">{a.label}</span>
                      {a.text ? (
                        <AbilityProse text={a.text} className="mt-1 text-sm leading-snug" />
                      ) : null}
                    </span>
                  </button>
                  {a.onDelete ? (
                    <button
                      type="button"
                      aria-label={`Delete ${a.label}`}
                      className="mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-parchment-2 hover:text-ink"
                      onClick={() => a.onDelete?.()}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      {!fit && chosen?.text ? (
        <AbilityProse text={chosen.text} className="text-sm leading-snug" />
      ) : null}
    </div>
  );
}
