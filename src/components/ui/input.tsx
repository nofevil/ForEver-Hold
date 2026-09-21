import * as React from "react";
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

export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-11 w-full appearance-none rounded-[10px] bg-cream bg-[length:12px] bg-[right_12px_center] bg-no-repeat px-3 pr-9 text-base text-ink shadow-[inset_0_0_0_1px_rgba(42,28,20,0.16)]",
        "focus-visible:shadow-[inset_0_0_0_2px_#7c2d22] focus-visible:outline-none",
        className,
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='%232a1c14' d='M1 1l5 5 5-5'/></svg>")`,
      }}
      {...props}
    >
      {children}
    </select>
  );
}
