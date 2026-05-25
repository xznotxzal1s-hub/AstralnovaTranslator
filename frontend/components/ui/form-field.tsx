import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  children: ReactNode;
  className?: string;
  errorText?: string;
  helpText?: string;
  htmlFor: string;
  label: string;
};

export function FormField({ children, className, errorText, helpText, htmlFor, label }: FormFieldProps) {
  return (
    <div className={cn("field", className)}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {helpText ? <p className="muted">{helpText}</p> : null}
      {errorText ? <p className="feedback error">{errorText}</p> : null}
    </div>
  );
}
