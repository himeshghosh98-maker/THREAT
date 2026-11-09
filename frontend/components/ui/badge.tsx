import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#4F6BFF]/10 text-[#4F6BFF]",
        secondary:
          "border-transparent bg-[#F0F4FF] text-[#526085]",
        destructive:
          "border-rose-200 bg-rose-50 text-rose-700 shadow-xs",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800 shadow-xs",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-xs",
        outline: "border-[#E2E8F8] text-[#526085] bg-white/70",
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
