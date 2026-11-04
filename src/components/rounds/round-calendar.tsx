'use client';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Building2,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface CalendarDay {
  date: string;
  day: number;
  dayName: string;
  isWorkingDay: boolean;
  status: 'completed' | 'partial' | 'missed' | 'in_progress' | 'scheduled' | 'off_day';
  round: {
    id: string;
    totalDepartments: number;
    completedDepartments: number;
    totalIssuesReported: number;
    totalNotes: number;
    scheduledCount?: number;
    completedCount?: number;
    inProgressCount?: number;
    missedCount?: number;
    teamBreakdown?: {
      id: string;
      name: string;
      hospital: string;
      status: string;
      roundId?: string;
    }[];
  } | null;
}

export interface RoundCalendarProps {
  month: number;
  year: number;
  calendarDays: CalendarDay[];
  summary: {
    totalWorkingDays: number;
    completed: number;
    missed: number;
    complianceRate: number;
  };
  engineerName?: string | null;
  hospitalName?: string | null;
  onMonthChange?: (month: number, year: number) => void;
  onDayClick?: (date: string) => void;
}

const STATUS_BORDER_AND_BG: Record<string, string> = {
  completed: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-950 dark:text-emerald-100',
  partial: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-950 dark:text-amber-100',
  missed: 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 text-rose-950 dark:text-rose-100',
  in_progress: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 animate-pulse text-blue-950 dark:text-blue-100',
  scheduled: 'bg-card border-border/50 hover:border-primary/40 hover:bg-accent/30 text-card-foreground',
  off_day: 'bg-muted/10 border-border/20 text-muted-foreground/35 hover:bg-muted/20',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  partial: 'Partially Completed',
  missed: 'Missed Round',
  in_progress: 'In Progress',
  scheduled: 'Scheduled Working Day',
  off_day: 'Scheduled Off Day',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function RoundCalendar({
  month,
  year,
  calendarDays,
  summary,
  engineerName,
  hospitalName,
  onMonthChange,
  onDayClick,
}: RoundCalendarProps) {
  const router = useRouter();

  // Build calendar grid (weeks × 7)
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const weeks: (CalendarDay | null)[][] = [];

  let currentWeek: (CalendarDay | null)[] = [];
  // Pad start
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push(null);
  }
  for (const day of calendarDays) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  // Pad end
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const handlePrev = () => {
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;
    onMonthChange?.(newMonth, newYear);
  };

  const handleNext = () => {
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;
    onMonthChange?.(newMonth, newYear);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isTeamView = engineerName?.toLowerCase().includes('all engineers');

  return (
    <div className="space-y-4">
      {/* Month Navigation & Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="h-8 w-8 shrink-0"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div>
            <h3 className="font-semibold text-base sm:text-lg tracking-tight">
              {MONTH_NAMES[month - 1]} {year}
            </h3>
            {engineerName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                {isTeamView ? (
                  <Users className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <User className="h-3.5 w-3.5 text-primary" />
                )}
                <span className="font-medium text-foreground">{engineerName}</span>
                {hospitalName && (
                  <>
                    <span>·</span>
                    <Building2 className="h-3 w-3" />
                    <span>{hospitalName}</span>
                  </>
                )}
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8 shrink-0"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Month Compliance Pill */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'px-2.5 py-1 text-xs font-semibold',
              summary.complianceRate >= 80
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : summary.complianceRate >= 50
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
            )}
          >
            {summary.complianceRate}% {isTeamView ? 'Team Compliance' : 'Monthly Compliance'}
          </Badge>
          <span className="text-xs text-muted-foreground hidden md:inline">
            ({summary.completed}/{summary.totalWorkingDays} {isTeamView ? 'shifts' : 'days'})
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border bg-card/60 backdrop-blur-sm p-2 sm:p-4 shadow-sm">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div
              key={d}
              className="text-center text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground py-1.5"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Tiles */}
        <TooltipProvider delayDuration={150}>
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {weeks.flat().map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-16 sm:h-20 lg:h-22 rounded-lg bg-muted/5 border border-dashed border-border/20"
                  />
                );
              }

              const isToday = day.date === todayStr;
              const hasTeamBreakdown = day.round?.scheduledCount !== undefined;

              return (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'h-16 sm:h-20 lg:h-22 w-full p-1.5 sm:p-2 rounded-lg border text-left flex flex-col justify-between transition-all duration-150 relative group',
                        STATUS_BORDER_AND_BG[day.status],
                        isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-background font-semibold',
                        (day.round || onDayClick) ? 'cursor-pointer hover:shadow-sm' : 'cursor-default'
                      )}
                      onClick={() => {
                        if (onDayClick) {
                          onDayClick(day.date);
                        } else if (day.round?.id) {
                          router.push(`/rounds/${day.round.id}`);
                        }
                      }}
                    >
                      {/* Top Row: Date Number and Status Chip */}
                      <div className="flex items-center justify-between w-full">
                        {isToday ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-sm">
                            {day.day}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'text-xs font-semibold',
                              day.status === 'off_day'
                                ? 'text-muted-foreground/35'
                                : 'text-foreground'
                            )}
                          >
                            {day.day}
                          </span>
                        )}

                        {/* Status Badges */}
                        {day.status === 'completed' && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="hidden md:inline">
                              {hasTeamBreakdown ? `${day.round?.completedCount}/${day.round?.scheduledCount} Done` : 'Done'}
                            </span>
                          </span>
                        )}
                        {day.status === 'partial' && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="hidden md:inline">
                              {hasTeamBreakdown ? `${day.round?.completedCount}/${day.round?.scheduledCount} Done` : 'Partial'}
                            </span>
                          </span>
                        )}
                        {day.status === 'in_progress' && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded animate-pulse">
                            <Clock className="h-3 w-3" />
                            <span className="hidden md:inline">
                              {hasTeamBreakdown ? `${day.round?.inProgressCount} Live` : 'Live'}
                            </span>
                          </span>
                        )}
                        {day.status === 'missed' && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded">
                            <XCircle className="h-3 w-3" />
                            <span className="hidden md:inline">
                              {hasTeamBreakdown ? `0/${day.round?.scheduledCount} Missed` : 'Missed'}
                            </span>
                          </span>
                        )}
                        {day.status === 'off_day' && (
                          <span className="hidden sm:inline text-[10px] text-muted-foreground/35 font-medium">
                            Off
                          </span>
                        )}
                        {day.status === 'scheduled' && !day.round && (
                          <span className="hidden sm:inline text-[10px] text-muted-foreground/60 font-medium">
                            Duty
                          </span>
                        )}

                        {/* Mobile Status Dot */}
                        <span className="sm:hidden">
                          {day.status === 'completed' && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                          )}
                          {day.status === 'partial' && (
                            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                          )}
                          {day.status === 'in_progress' && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 inline-block animate-pulse" />
                          )}
                          {day.status === 'missed' && (
                            <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                          )}
                        </span>
                      </div>

                      {/* Bottom Row / Body Details */}
                      {day.round && (day.round.totalDepartments > 0 || day.round.scheduledCount) ? (
                        <div className="mt-auto pt-1 w-full flex items-center justify-between text-[11px] leading-tight text-muted-foreground">
                          <span className="font-medium text-foreground truncate">
                            {day.round.totalDepartments > 0
                              ? `${day.round.completedDepartments}/${day.round.totalDepartments} depts`
                              : `${day.round.scheduledCount} on duty`}
                          </span>
                          {day.round.totalIssuesReported > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5 shrink-0 text-[10px]">
                              <AlertTriangle className="h-3 w-3" />
                              {day.round.totalIssuesReported}
                            </span>
                          )}
                        </div>
                      ) : day.isWorkingDay && day.status === 'scheduled' ? (
                        <div className="mt-auto text-[10px] text-muted-foreground/60 hidden sm:block">
                          Scheduled
                        </div>
                      ) : null}
                    </button>
                  </TooltipTrigger>

                  {/* Rich Tooltip */}
                  <TooltipContent side="top" className="text-xs p-3 max-w-sm shadow-lg">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-sm">
                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="font-medium text-muted-foreground">Status:</span>
                        <span className="font-semibold capitalize text-foreground">
                          {STATUS_LABELS[day.status]}
                        </span>
                      </div>

                      {/* Team Breakdown in All Engineers View */}
                      {day.round?.teamBreakdown && day.round.teamBreakdown.length > 0 && (
                        <div className="pt-2 border-t border-border/40 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                            <span>Biomedical Team on Duty</span>
                            <span className="text-muted-foreground font-normal">
                              {day.round.completedCount} of {day.round.scheduledCount} done
                            </span>
                          </div>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {day.round.teamBreakdown.map((eng) => (
                              <div
                                key={eng.id}
                                className="flex items-center justify-between gap-2 text-[11px] bg-muted/30 px-2 py-1 rounded"
                              >
                                <div className="truncate">
                                  <span className="font-medium text-foreground">{eng.name}</span>
                                  {eng.hospital && (
                                    <span className="text-[10px] text-muted-foreground ml-1">
                                      ({eng.hospital})
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    'text-[10px] font-semibold capitalize shrink-0',
                                    eng.status === 'completed' && 'text-emerald-500',
                                    eng.status === 'in_progress' && 'text-blue-500',
                                    eng.status === 'missed' && 'text-rose-500',
                                    eng.status === 'scheduled' && 'text-muted-foreground'
                                  )}
                                >
                                  {eng.status?.replace('_', ' ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Department inspection metrics */}
                      {day.round && day.round.totalDepartments > 0 && (
                        <div className="pt-1.5 border-t border-border/40 space-y-0.5 text-muted-foreground text-[11px]">
                          <p>
                            <span className="font-medium text-foreground">
                              {day.round.completedDepartments} of {day.round.totalDepartments}
                            </span>{' '}
                            departments completed
                          </p>
                          {day.round.totalIssuesReported > 0 && (
                            <p className="text-amber-500 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {day.round.totalIssuesReported} issue(s) reported
                            </p>
                          )}
                          {day.round.totalNotes > 0 && (
                            <p>{day.round.totalNotes} visit note(s) logged</p>
                          )}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Legend & Summary Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Partial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> In Progress
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Missed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-muted border" /> Off Day
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{summary.totalWorkingDays}</span> {isTeamView ? 'total scheduled engineer shifts' : 'scheduled working days'} for this month
        </div>
      </div>
    </div>
  );
}
