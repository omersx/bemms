import { isEngineerRoundEnabled, getTodayRound } from '@/lib/actions/engineer-rounds';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Route, CheckCircle2, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { RoundAutoRefresh } from '@/components/rounds/round-auto-refresh';
import { getTranslations } from 'next-intl/server';

export async function RoundWidget() {
  const enabled = await isEngineerRoundEnabled();
  if (!enabled) return null;

  const result = await getTodayRound();
  if (!result.success) return null;

  const t = await getTranslations('rounds');
  const tCommon = await getTranslations('common');

  // Off day
  if (result.isOffDay) {
    return (
      <Card className="border-muted bg-muted/20">
        <CardContent className="pt-4 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-muted p-2 text-muted-foreground">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('title')}</p>
              <p className="text-xs text-muted-foreground">{t('noActiveRound')}</p>
            </div>
          </div>
          <Link href="/rounds/history">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              {t('roundHistory')} <ArrowRight className="h-3 w-3 rtl:rotate-180" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Can start round
  if (result.canStart && !result.data) {
    return (
      <>
        <RoundAutoRefresh showControls={false} pollIntervalMs={5000} />
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <Route className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t('startRound')}</p>
                <p className="text-xs text-muted-foreground">
                  {result.departments?.length || 0} {tCommon('labels.department')} · {result.shiftType}
                </p>
              </div>
            </div>
            <Link href="/rounds">
              <Button size="sm" className="gap-1.5 w-full sm:w-auto">
                <ShieldCheck className="h-4 w-4" />
                {t('startRound')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </>
    );
  }

  // Round in progress or completed
  if (result.data) {
    const round = result.data as any;
    const isCompleted = round.status === 'completed';
    const total = round.totalDepartments || round.departmentVisits?.length || 0;
    const completed = round.completedDepartments || 0;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <>
        <RoundAutoRefresh showControls={false} pollIntervalMs={5000} />
        <Card className={isCompleted ? 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/10' : 'border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-950/10'}>
          <CardContent className="pt-4 pb-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`rounded-md p-1.5 ${isCompleted ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {isCompleted ? t('history.completed') : t('roundInProgress')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('completedDepartments', { completed, total })} ({progress}%)
                  </p>
                </div>
              </div>

              <Link href="/rounds">
                <Button variant={isCompleted ? 'outline' : 'default'} size="sm" className="gap-1 text-xs">
                  {isCompleted ? tCommon('buttons.view') : t('continueRound')}
                  <ArrowRight className="h-3 w-3 rtl:rotate-180" />
                </Button>
              </Link>
            </div>

            {!isCompleted && (
              <Progress value={progress} className="h-1.5" />
            )}
          </CardContent>
        </Card>
      </>
    );
  }

  return null;
}
