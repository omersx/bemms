'use client';

import { useState, useTransition, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoundCalendar } from './round-calendar';
import { getRoundCalendarData } from '@/lib/actions/engineer-rounds';
import {
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  Loader2,
  AlertTriangle,
  FileText,
  Calendar as CalendarIcon,
  Search,
  Building2,
  Users,
  ChevronRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface EngineerOption {
  id: string;
  name: string;
  hospitalName: string;
}

interface RoundHistoryClientProps {
  initialHistory: any[];
  initialCalendar: any;
  initialCompliance: any;
  isManager: boolean;
  currentUserId: string;
  pagination: any;
  engineersList?: EngineerOption[];
  selectedEngineerId?: string;
}

export function RoundHistoryClient({
  initialHistory,
  initialCalendar,
  initialCompliance,
  isManager,
  currentUserId,
  pagination,
  engineersList = [],
  selectedEngineerId: initialSelectedEngineerId,
}: RoundHistoryClientProps) {
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>(
    initialSelectedEngineerId || (isManager ? 'all' : currentUserId)
  );
  const [calendarData, setCalendarData] = useState(initialCalendar);
  const [isPending, startTransition] = useTransition();

  // Filters for recent rounds list
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Selected engineer object
  const currentEngineer = useMemo(() => {
    if (selectedEngineerId === 'all') return null;
    return engineersList.find((e) => e.id === selectedEngineerId);
  }, [engineersList, selectedEngineerId]);

  // Handle engineer selection change
  const handleEngineerChange = (newEngineerId: string) => {
    setSelectedEngineerId(newEngineerId);
    startTransition(async () => {
      const result = await getRoundCalendarData({
        engineerId: newEngineerId,
        month: calendarData?.month || new Date().getMonth() + 1,
        year: calendarData?.year || new Date().getFullYear(),
      });
      if (result.success) {
        setCalendarData(result.data);
      }
    });
  };

  // Handle month change
  const handleMonthChange = (month: number, year: number) => {
    startTransition(async () => {
      const result = await getRoundCalendarData({
        engineerId: selectedEngineerId,
        month,
        year,
      });
      if (result.success) {
        setCalendarData(result.data);
      }
    });
  };

  // Handle clicking a specific day on the calendar
  const handleDayClick = (dateStr: string) => {
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  };

  // Filtered rounds history
  const filteredHistory = useMemo(() => {
    return initialHistory.filter((round: any) => {
      // Engineer filter (when a specific engineer is chosen)
      if (selectedEngineerId !== 'all' && round.engineerId && round.engineerId !== selectedEngineerId) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && round.status !== statusFilter) {
        return false;
      }
      // Date filter
      if (selectedDate && round.roundDate !== selectedDate) {
        return false;
      }
      // Search query (engineer name or hospital name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const engineerName = (round.engineer?.fullName || '').toLowerCase();
        const hospitalName = (round.hospital?.name || '').toLowerCase();
        return engineerName.includes(query) || hospitalName.includes(query);
      }
      return true;
    });
  }, [initialHistory, selectedEngineerId, statusFilter, selectedDate, searchQuery]);

  const statusIcons: Record<string, any> = {
    completed: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
    in_progress: <Clock className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />,
    missed: <XCircle className="h-4 w-4 text-rose-500 shrink-0" />,
    scheduled: <Clock className="h-4 w-4 text-muted-foreground shrink-0" />,
    cancelled: <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />,
  };

  const summary = calendarData?.summary || {
    totalWorkingDays: 0,
    completed: 0,
    missed: 0,
    complianceRate: 0,
  };

  const isAllEngineers = selectedEngineerId === 'all';

  return (
    <div className="space-y-6">
      {/* Supervisor Control: Engineer Selection */}
      {isManager && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-semibold">Viewing Engineer:</span>
                <Select
                  value={selectedEngineerId}
                  onValueChange={handleEngineerChange}
                >
                  <SelectTrigger className="w-[240px] sm:w-[280px] h-9 text-xs font-medium bg-background">
                    <SelectValue placeholder="Select engineer or all" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-semibold text-primary">
                      👥 All Engineers (Team Overview)
                    </SelectItem>
                    {engineersList.map((eng) => (
                      <SelectItem key={eng.id} value={eng.id} className="text-xs">
                        {eng.name} {eng.hospitalName ? `(${eng.hospitalName})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>
                  Assigned Hospital:{' '}
                  <strong className="text-foreground">
                    {isAllEngineers
                      ? `All Facilities (${engineersList.length} Active Engineers)`
                      : currentEngineer?.hospitalName || 'General Facility'}
                  </strong>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards: Monthly Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {isAllEngineers ? 'Team Compliance' : 'Monthly Compliance'}
              </p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={cn(
                  'text-2xl sm:text-3xl font-bold tracking-tight',
                  summary.complianceRate >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : summary.complianceRate >= 50
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {summary.complianceRate}%
              </span>
              <span className="text-xs text-muted-foreground">rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Completed Rounds</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {summary.completed}
              </span>
              <span className="text-xs text-muted-foreground">
                of {summary.totalWorkingDays} {isAllEngineers ? 'shifts' : 'days'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Missed Rounds</p>
              <XCircle className="h-4 w-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                {summary.missed}
              </span>
              <span className="text-xs text-muted-foreground">
                {isAllEngineers ? 'missed shifts' : 'days'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {isAllEngineers ? 'Total Scheduled Shifts' : 'Scheduled Duty Days'}
              </p>
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {summary.totalWorkingDays}
              </span>
              <span className="text-xs text-muted-foreground">
                {isAllEngineers ? 'engineer shifts' : 'working days'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main View Tabs */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:inline-flex">
            <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm">
              <CalendarIcon className="h-4 w-4" />
              Monthly Calendar
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              Recent Rounds ({filteredHistory.length})
            </TabsTrigger>
            {isManager && initialCompliance && (
              <TabsTrigger value="compliance" className="gap-1.5 text-xs sm:text-sm col-span-2 sm:col-span-1">
                <Users className="h-4 w-4" />
                Team Today
              </TabsTrigger>
            )}
          </TabsList>

          {selectedDate && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="gap-1 text-xs">
                <span>Filtering date: {selectedDate}</span>
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setSelectedDate(null)}
                />
              </Badge>
            </div>
          )}
        </div>

        {/* Tab 1: Monthly Calendar */}
        <TabsContent value="calendar" className="space-y-4">
          {calendarData ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                  <span>
                    {isAllEngineers ? 'Team Inspection Calendar' : 'Engineer Inspection Calendar'}
                  </span>
                  {isPending && (
                    <span className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Loading...
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isAllEngineers
                    ? 'Facility-wide overview of daily department inspection rounds conducted by all biomedical engineers.'
                    : 'Inspect completed daily rounds, missed days, and working schedules for this biomedical engineer.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                {isPending && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-lg">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                )}
                <RoundCalendar
                  month={calendarData.month}
                  year={calendarData.year}
                  calendarDays={calendarData.calendarDays}
                  summary={calendarData.summary}
                  engineerName={calendarData.engineerName || (isAllEngineers ? 'All Engineers (Team Overview)' : currentEngineer?.name)}
                  hospitalName={calendarData.hospitalName || (isAllEngineers ? `${engineersList.length} Active Engineers` : currentEngineer?.hospitalName)}
                  onMonthChange={handleMonthChange}
                  onDayClick={handleDayClick}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No calendar data available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Recent Rounds List */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <span>Recent Rounds</span>
                    {!isAllEngineers && currentEngineer && (
                      <Badge variant="outline" className="text-xs font-normal">
                        Filtered: {currentEngineer.name}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Chronological audit trail of executed inspection rounds with findings and notes.
                  </CardDescription>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search engineer or hospital..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs w-full sm:w-[220px]"
                    />
                  </div>

                  {/* Status Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {['all', 'completed', 'in_progress', 'missed'].map((st) => (
                      <Button
                        key={st}
                        type="button"
                        variant={statusFilter === st ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(st)}
                        className="h-8 text-xs capitalize px-2.5"
                      >
                        {st.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredHistory.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm font-medium text-foreground">No inspection rounds found</p>
                  <p className="text-xs text-muted-foreground">
                    Try adjusting your status filter, keyword search, or engineer selection.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredHistory.map((round: any) => (
                    <Link
                      key={round.id}
                      href={`/rounds/${round.id}`}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 hover:border-primary/40 transition-all duration-150 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5">
                          {statusIcons[round.status] || statusIcons.scheduled}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                              {round.engineer?.fullName || 'Biomedical Engineer'}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                              {round.shiftType} shift
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] px-1.5 py-0 capitalize',
                                round.status === 'completed' && 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
                                round.status === 'in_progress' && 'border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 animate-pulse',
                                round.status === 'missed' && 'border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/10',
                              )}
                            >
                              {round.status?.replace('_', ' ')}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>
                              {new Date(round.roundDate + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {round.hospital?.name && (
                              <>
                                <span>·</span>
                                <span>{round.hospital.name}</span>
                              </>
                            )}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                            <span className="font-medium text-foreground">
                              {round.completedDepartments}/{round.totalDepartments} departments
                            </span>
                            {round.totalIssuesReported > 0 && (
                              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                <AlertTriangle className="h-3 w-3" />
                                {round.totalIssuesReported} {round.totalIssuesReported === 1 ? 'issue' : 'issues'}
                              </span>
                            )}
                            {round.totalNotes > 0 && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {round.totalNotes} {round.totalNotes === 1 ? 'note' : 'notes'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-3" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Team Compliance Today (Managers Only) */}
        {isManager && initialCompliance && (
          <TabsContent value="compliance" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Team Compliance Today</CardTitle>
                <CardDescription className="text-xs">
                  Real-time status overview for all scheduled engineers in the biomedical department.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Team summary statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {initialCompliance.summary.completed}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">Completed</p>
                  </div>
                  <div className="rounded-xl border bg-blue-500/10 border-blue-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {initialCompliance.summary.inProgress}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">In Progress</p>
                  </div>
                  <div className="rounded-xl border bg-rose-500/10 border-rose-500/20 p-3 text-center">
                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                      {initialCompliance.summary.missed}
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">Missed</p>
                  </div>
                  <div className="rounded-xl border bg-card p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {initialCompliance.summary.complianceRate}%
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">Team Compliance</p>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="space-y-2 pt-2">
                  {initialCompliance.team.map((member: any) => (
                    <div
                      key={member.engineerId}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {member.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : member.status === 'in_progress' ? (
                          <Clock className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
                        ) : member.status === 'missed' ? (
                          <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                        ) : member.status === 'off_duty' ? (
                          <UserX className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{member.engineerName}</p>
                          <p className="text-xs text-muted-foreground">{member.hospitalName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs capitalize',
                            member.status === 'completed' && 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
                            member.status === 'in_progress' && 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10',
                            member.status === 'missed' && 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10',
                            member.status === 'off_duty' && 'text-muted-foreground',
                          )}
                        >
                          {member.status?.replace(/_/g, ' ')}
                        </Badge>

                        {member.round ? (
                          <Link href={`/rounds/${member.round.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              View Round
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              handleEngineerChange(member.engineerId);
                            }}
                          >
                            View Calendar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
