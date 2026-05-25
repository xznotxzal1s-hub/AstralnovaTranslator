import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  children: ReactNode;
  className?: string;
  status: string;
  withPill?: boolean;
};

export function StatusBadge({ children, className, status, withPill = true }: StatusBadgeProps) {
  return <span className={cn(withPill && "pill", "status-pill", status, className)}>{children}</span>;
}
