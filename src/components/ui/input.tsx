"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-tertiary",
          "border-border-strong transition-colors duration-150 outline-none",
          "focus:border-accent/50 focus:ring-2 focus:ring-accent/20",
          invalid && "border-neg/50 focus:border-neg/60 focus:ring-neg/20",
          "disabled:opacity-50 disabled:pointer-events-none",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-md border bg-bg-elevated px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary",
          "border-border-strong transition-colors duration-150 outline-none resize-none",
          "focus:border-accent/50 focus:ring-2 focus:ring-accent/20",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-[13px] font-medium text-text-secondary mb-1.5 block", className)} {...props} />
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md border bg-bg-elevated px-3 text-sm text-text-primary",
          "border-border-strong transition-colors duration-150 outline-none appearance-none",
          "focus:border-accent/50 focus:ring-2 focus:ring-accent/20",
          "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path d=%22M1 1l4 4 4-4%22 stroke=%22%239aa1ac%22 stroke-width=%221.4%22 fill=%22none%22 stroke-linecap=%22round%22/></svg>')] bg-no-repeat bg-[right_0.9rem_center] pr-8",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";
