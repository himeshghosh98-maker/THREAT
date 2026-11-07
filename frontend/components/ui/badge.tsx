import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-cyan-600/20 text-cyan-300 border-cyan-500/30",
        secondary:
          "border-transparent bg-zinc-800 text-zinc-300 border-zinc-700",
        destructive:
          "border-transparent bg-red-900/30 text-red-400 border-red-700/40",
        outline: "text-zinc-300 border-zinc-700",
        success:
          "border-emerald-700/40 bg-emerald-950/40 text-emerald-400",
        warning:
          "border-amber-700/40 bg-amber-950/40 text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
