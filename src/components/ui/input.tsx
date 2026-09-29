import * as React from "react";
import { MenuSelect, type MenuOption } from "@/components/ability-select";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-11 w-full rounded-[10px] bg-cream px-3 text-base text-ink shadow-[inset_0_0_0_1px_rgba(42,28,20,0.16)] placeholder:text-muted",
      "transition-[box-shadow] duration-150 focus-visible:shadow-[inset_0_0_0_2px_#7c2d22] focus-visible:outline-none",
      "disabled:opacity-50",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-24 w-full rounded-xl bg-cream px-3 py-2 text-base text-ink shadow-[inset_0_0_0_1px_rgba(42,28,20,0.16)] placeholder:text-muted",
      "transition-[box-shadow] duration-150 focus-visible:shadow-[inset_0_0_0_2px_#7c2d22] focus-visible:outline-none",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

function collectOptions(children: React.ReactNode): MenuOption[] {
  const out: MenuOption[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { value?: string | number; children?: React.ReactNode };
    if (child.type === "option") {
      out.push({
        value: String(props.value ?? ""),
        label: String(props.children ?? ""),
      });
      return;
    }
    if (props.children) out.push(...collectOptions(props.children));
  });
  return out;
}

export function NativeSelect({
  className,
  children,
  value,
  onChange,
  disabled,
  ...props
}: React.ComponentProps<"select">) {
  const options = collectOptions(children);
  const empty = options.find((o) => o.value === "");
  const rest = options.filter((o) => o.value !== "");
  return (
    <MenuSelect
      className={className}
      value={value == null ? "" : String(value)}
      disabled={disabled}
      allowEmpty={Boolean(empty)}
      placeholder={empty?.label || props["aria-label"] || "Choose"}
      options={rest}
      onChange={(next) => {
        onChange?.({
          target: { value: next },
          currentTarget: { value: next },
        } as React.ChangeEvent<HTMLSelectElement>);
      }}
    />
  );
}
