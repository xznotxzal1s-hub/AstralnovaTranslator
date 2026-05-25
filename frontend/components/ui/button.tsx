import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "link" | "danger" | "dangerGhost";

const variantClassName: Record<ButtonVariant, string> = {
  primary: "button",
  secondary: "button-secondary",
  link: "button-link",
  danger: "button-danger",
  dangerGhost: "button-danger-ghost",
};

export function buttonClassName(variant: ButtonVariant = "primary", className?: string) {
  return cn(variantClassName[variant], className);
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={buttonClassName(variant, className)} {...props} />;
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
};

export function ButtonLink({ className, variant = "link", ...props }: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
