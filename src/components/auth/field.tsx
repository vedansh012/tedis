import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
 */
export const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, name, error, hint, ...props }, ref) => {
    const errorId = `${name}-error`;
    const hintId = `${name}-hint`;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          name={name}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        />
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
