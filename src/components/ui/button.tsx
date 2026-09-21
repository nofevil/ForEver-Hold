import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,box-shadow,transform,opacity] duration-150 ease-out disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-burgundy text-parchment shadow-[0_1px_0_rgba(42,28,20,0.2)] hover:bg-burgundy-deep",
        leather: "bg-leather text-parchment hover:bg-leather-2",
        outline:
          "bg-cream text-ink shadow-[inset_0_0_0_1px_rgba(42,28,20,0.16)] hover:bg-parchment-2",
        ghost: "text-ink-soft hover:bg-parchment-2 hover:text-ink",
        danger: "bg-danger text-parchment hover:opacity-90",
        link: "text-burgundy underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 rounded-[10px] px-4 text-sm",
        sm: "h-9 rounded-lg px-3 text-sm",
        lg: "h-12 rounded-xl px-5 text-base",
        icon: "size-11 rounded-[10px]",
        "icon-sm": "size-9 rounded-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
