'use client';

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"

const statusStyles: Record<string, { key: string; defaultLabel: string; className: string }> = {
  new: { key: "status.new", defaultLabel: "New", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" },
  acknowledged: { key: "status.acknowledged", defaultLabel: "Acknowledged", className: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800" },
  in_triage: { key: "triage.triageAction", defaultLabel: "Under Assessment", className: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800" },
  in_progress: { key: "status.inProgress", defaultLabel: "In Progress", className: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800" },
  waiting_requester: { key: "status.attentionNeeded", defaultLabel: "Info Needed", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800" },
  waiting_parts_vendor: { key: "status.waitingForParts", defaultLabel: "Waiting Parts", className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800" },
  resolved: { key: "status.resolved", defaultLabel: "Resolved", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800" },
  closed: { key: "status.closed", defaultLabel: "Closed", className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800" },
  cancelled: { key: "status.cancelled", defaultLabel: "Cancelled", className: "bg-gray-100 text-gray-500 border-gray-200 line-through dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800" },
}

const priorityStyles: Record<string, { key: string; defaultLabel: string; className: string }> = {
  p1_critical: { key: "priority.critical", defaultLabel: "P1 Critical", className: "bg-red-100 text-red-800 border-red-300 font-bold dark:bg-red-950 dark:text-red-300 dark:border-red-800" },
  p2_high: { key: "priority.high", defaultLabel: "P2 High", className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800" },
  p3_normal: { key: "priority.medium", defaultLabel: "P3 Normal", className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800" },
  p4_low: { key: "priority.low", defaultLabel: "P4 Low", className: "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" },
}

const impactStyles: Record<string, { key: string; defaultLabel: string; className: string }> = {
  device_usable: { key: "impact.usable", defaultLabel: "Device Usable", className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800" },
  device_not_usable: { key: "impact.notUsable", defaultLabel: "Device Not Usable", className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800" },
  patient_care_affected: { key: "impact.patientAffected", defaultLabel: "Patient Care Affected", className: "bg-red-50 text-red-800 border-red-300 font-bold dark:bg-red-950 dark:text-red-300 dark:border-red-800" },
}

export function TicketStatusBadge({ status }: { status?: string | null }) {
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');
  const config = statusStyles[status || ''];
  if (!config) {
    return <Badge variant="outline" className="font-medium bg-muted text-muted-foreground">{status || 'Unknown'}</Badge>;
  }

  let label = config.defaultLabel;
  try {
    label = t(config.key as any) || tCommon(config.key as any) || config.defaultLabel;
  } catch {
    label = config.defaultLabel;
  }

  return <Badge variant="outline" className={cn("font-medium", config.className)}>{label}</Badge>;
}

export function TicketPriorityBadge({ priority }: { priority?: string | null }) {
  const t = useTranslations('tickets');
  const config = priorityStyles[priority || ''];
  if (!config) {
    return <Badge variant="outline" className="font-medium text-xs bg-muted text-muted-foreground">{priority || 'N/A'}</Badge>;
  }

  let label = config.defaultLabel;
  try {
    label = t(config.key as any) || config.defaultLabel;
  } catch {
    label = config.defaultLabel;
  }

  return <Badge variant="outline" className={cn("font-medium text-xs", config.className)}>{label}</Badge>;
}

export function TicketImpactBadge({ impact }: { impact?: string | null }) {
  const t = useTranslations('tickets');
  const config = impactStyles[impact || ''];
  if (!config) {
    return <Badge variant="outline" className="font-medium text-xs bg-muted text-muted-foreground">{impact || 'N/A'}</Badge>;
  }

  let label = config.defaultLabel;
  try {
    label = t(config.key as any) || config.defaultLabel;
  } catch {
    label = config.defaultLabel;
  }

  return <Badge variant="outline" className={cn("font-medium text-xs", config.className)}>{label}</Badge>;
}
