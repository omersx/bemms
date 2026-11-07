'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { evaluateSla, SLA_CONFIG, SlaStatus } from '@/lib/utils/sla';
import { cn } from '@/lib/utils';

interface TicketSlaBadgeProps {
  targetAt?: Date | string | null;
  completedAt?: Date | string | null;
  type?: 'response' | 'resolution';
  className?: string;
  showIcon?: boolean;
}

export function TicketSlaBadge({
  targetAt,
  completedAt,
  type = 'response',
  className,
  showIcon = true,
}: TicketSlaBadgeProps) {
  const sla = evaluateSla(targetAt, completedAt);

  if (sla.status === 'unknown') {
    return null;
  }

  const prefix = type === 'response' ? 'Resp' : 'Res';

  const badgeStyles: Record<SlaStatus, string> = {
    met: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    on_track: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    due_soon: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse',
    breached: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-semibold',
    unknown: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200',
  };

  const icons: Record<SlaStatus, React.ReactNode> = {
    met: <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    on_track: <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400 shrink-0" />,
    due_soon: <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />,
    breached: <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />,
    unknown: null,
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 whitespace-nowrap shadow-xs',
        badgeStyles[sla.status],
        className
      )}
      title={`${type === 'response' ? 'Response SLA' : 'Resolution SLA'}: ${sla.formattedRemaining}`}
    >
      {showIcon && icons[sla.status]}
      <span>{prefix}: {sla.formattedRemaining}</span>
    </Badge>
  );
}

interface TicketSlaCardProps {
  responseTargetAt?: Date | string | null;
  resolutionTargetAt?: Date | string | null;
  acknowledgedAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  priorityCode?: string | null;
  className?: string;
}

export function TicketSlaCard({
  responseTargetAt,
  resolutionTargetAt,
  acknowledgedAt,
  resolvedAt,
  priorityCode,
  className,
}: TicketSlaCardProps) {
  const respSla = evaluateSla(responseTargetAt, acknowledgedAt);
  const resSla = evaluateSla(resolutionTargetAt, resolvedAt);
  const priorityInfo = SLA_CONFIG[priorityCode || 'p3_normal'] || SLA_CONFIG.p3_normal;

  if (respSla.status === 'unknown' && resSla.status === 'unknown') {
    return null;
  }

  const isAnyBreached = respSla.isBreached || resSla.isBreached;
  const isAnyDueSoon = respSla.status === 'due_soon' || resSla.status === 'due_soon';

  const cardBorder = isAnyBreached
    ? 'border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/10'
    : isAnyDueSoon
    ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10'
    : 'border-border';

  return (
    <Card className={cn('shadow-xs', cardBorder, className)}>
      <CardHeader className="p-3.5 sm:p-4 pb-2 border-b border-border/60">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span>SLA Targets ({priorityInfo.label})</span>
          </CardTitle>
          {isAnyBreached && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              SLA Breached
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-4 pt-2.5 space-y-2.5 text-xs">
        {/* Response Target */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
          <div>
            <div className="font-medium text-foreground">Response Target</div>
            <div className="text-[11px] text-muted-foreground">
              Target: {priorityInfo.responseMinutes >= 60 ? `${priorityInfo.responseMinutes / 60}h` : `${priorityInfo.responseMinutes}m`}
              {responseTargetAt && ` (${new Date(responseTargetAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
            </div>
          </div>
          <TicketSlaBadge
            targetAt={responseTargetAt}
            completedAt={acknowledgedAt}
            type="response"
          />
        </div>

        {/* Resolution Target */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="font-medium text-foreground">Resolution Target</div>
            <div className="text-[11px] text-muted-foreground">
              Target: {priorityInfo.resolutionMinutes >= 1440 ? `${priorityInfo.resolutionMinutes / 1440}d` : `${priorityInfo.resolutionMinutes / 60}h`}
              {resolutionTargetAt && ` (${new Date(resolutionTargetAt).toLocaleDateString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })})`}
            </div>
          </div>
          <TicketSlaBadge
            targetAt={resolutionTargetAt}
            completedAt={resolvedAt}
            type="resolution"
          />
        </div>
      </CardContent>
    </Card>
  );
}
