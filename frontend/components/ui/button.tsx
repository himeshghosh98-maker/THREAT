import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6BFF]/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#4F6BFF] to-[#7C8CFF] text-white shadow-[0_4px_16px_rgba(79,107,255,0.35)] hover:shadow-[0_8px_24px_rgba(79,107,255,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
        destructive:
          "bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-sm hover:from-rose-600 hover:to-rose-700 active:scale-[0.99]",
        outline:
          "border border-white/80 bg-white/70 text-[#0F1E4A] shadow-[0_4px_12px_rgba(79,107,255,0.06)] hover:bg-white hover:shadow-[0_6px_20px_rgba(79,107,255,0.12)] hover:-translate-y-0.5 backdrop-blur-sm",
        secondary:
          "bg-[#F0F4FF] text-[#4F6BFF] shadow-sm hover:bg-[#E3EBFF] hover:text-[#3B54E0]",
        ghost: "hover:bg-[#F0F4FF] hover:text-[#4F6BFF] text-[#526085]",
        link: "text-[#4F6BFF] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
