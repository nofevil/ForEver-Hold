import { cn } from "@/lib/utils";

type MarkProps = {
  className?: string;
  /** Cream lockup for dark leather bars. */
  light?: boolean;
  decorative?: boolean;
};

export function HoldMark({ className, light = false, decorative = true }: MarkProps) {
  return (
    <img
      src={light ? "/brand/op20-mark-light.webp" : "/brand/op20-mark.webp"}
      alt={decorative ? "" : "OP20"}
      aria-hidden={decorative ? true : undefined}
      className={cn("h-8 w-auto max-w-none object-contain object-center select-none", className)}
      draggable={false}
    />
  );
}
