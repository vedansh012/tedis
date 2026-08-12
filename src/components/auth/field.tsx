"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps extends InputProps {
  label: string;
  name: string;
  error?: string;
  hint?: string;
}

/**
 * Accessible field: label bound via htmlFor, error announced via aria-describedby
 * + role="alert", invalid state wired to aria-invalid. Uses forwardRef so it
 * works directly with React Hook Form's register().
 *
 * When type="password", renders an eye toggle so users can verify what they
 * typed. Managed locally — the field still returns the value via the same ref.
 */
export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, name, error, hint, type, className, ...props }, ref) => {
    const errorId = `${name}-error`;
    const hintId = `${name}-hint`;
    const isPassword = type === "password";
    const [reveal, setReveal] = React.useState(false);
    const effectiveType = isPassword && reveal ? "text" : type;

    return (
      <div className="space-y-1.5">
        <Label htmlFor={name}>{label}</Label>
        <div className={cn(isPassword && "relative")}>
          <Input
            id={name}
            name={name}
            ref={ref}
            type={effectiveType}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(isPassword && "pr-10", className)}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? "Hide password" : "Show password"}
              aria-pressed={reveal}
              tabIndex={-1}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Field.displayName = "Field";
