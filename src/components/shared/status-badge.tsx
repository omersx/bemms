'use client';

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export type Status = "active" | "inactive" | "archived" | "invited" | "suspended" | "deactivated" | string | null | undefined;

interface StatusBadgeProps {
  status?: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations('common');
  const displayStatus = status || "unknown";
  const normalizedStatus = displayStatus.toLowerCase();

  let variant: "default" | "secondary" | "destructive" | "outline" = "default";

  switch (normalizedStatus) {
    case "active":
      variant = "default";
      break;
    case "inactive":
    case "invited":
      variant = "secondary";
      break;
    case "archived":
      variant = "outline";
      break;
    case "suspended":
    case "deactivated":
      variant = "destructive";
      break;
    default:
      variant = "secondary";
  }

  let localizedLabel = displayStatus;
  try {
    const key = `status.${normalizedStatus}`;
    const translated = t(key as any);
    if (translated && !translated.startsWith('status.')) {
      localizedLabel = translated;
    }
  } catch {
    localizedLabel = displayStatus;
  }

  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {localizedLabel}
    </Badge>
  );
}
