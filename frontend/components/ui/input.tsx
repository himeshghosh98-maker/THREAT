import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm text-[#0F1E4A] placeholder:text-[#8896B8] backdrop-blur-md shadow-inner transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F6BFF]/40 focus-visible:border-[#4F6BFF]/50 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
