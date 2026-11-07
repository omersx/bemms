import { getTriageQueue } from "@/lib/actions/tickets"
import { PageHeader } from "@/components/shared/page-header"
import { TicketsNav } from "@/components/tickets/tickets-nav"
import { TriageQueueView } from "@/components/tickets/triage-queue-view"
import { Card } from "@/components/ui/card"
import { TicketListAutoRefresh } from "@/components/tickets/ticket-list-auto-refresh"
import { AlertTriangle, Clock, Inbox, Timer } from "lucide-react"
import { getTranslations } from "next-intl/server"

export default async function TriageQueuePage() {
  const result = await getTriageQueue()
  const tickets = (result?.success && Array.isArray(result.data)) ? result.data : []
  const t = await getTranslations("tickets")

  // Queue metrics
  const newCount = tickets.filter((t: any) => t.statusCode === 'new').length
  const criticalCount = tickets.filter((t: any) =>
    t.reportedImpact === 'patient_care_affected' && t.statusCode === 'new'
  ).length
  const unacceptedCount = tickets.filter((t: any) =>
    !t.assignedEngineerUserId && t.statusCode === 'new'
  ).length

  // Calculate average wait time for new tickets
  const newTickets = tickets.filter((t: any) => t.statusCode === 'new')
  const avgWaitMinutes = newTickets.length > 0
    ? Math.round(newTickets.reduce((sum: number, t: any) => {
        return sum + Math.max(0, (Date.now() - new Date(t.reportedAt).getTime()) / (1000 * 60))
      }, 0) / newTickets.length)
    : 0

  function formatWaitTime(mins: number): string {
    if (mins <= 0) return "< 1m"
    if (mins < 60) return `${mins}m`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m === 0 ? `${h}h` : `${h}h ${m}m`
  }

  return (
    <div className="space-y-5">
      <TicketListAutoRefresh />
      <PageHeader
        title={t("triage.title")}
        description={t("triage.subtitle")}
      />

      <TicketsNav />

      {/* Queue Metrics */}
      <div className="grid gap-2.5 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-1 pb-1">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t("triage.awaitingTriage")}</span>
            <Inbox className="h-4 w-4 text-blue-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">{newCount}</div>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">{t("triage.newTicketsReview")}</p>
        </Card>

        <Card className={`p-3 sm:p-4 shadow-xs ${criticalCount > 0 ? 'border-red-300 dark:border-red-800 bg-red-50/20 dark:bg-red-950/10' : ''}`}>
          <div className="flex items-center justify-between gap-1 pb-1">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t("triage.critical")}</span>
            <AlertTriangle className={`h-4 w-4 shrink-0 ${criticalCount > 0 ? 'text-red-600 animate-pulse' : 'text-muted-foreground'}`} />
          </div>
          <div className={`text-xl sm:text-2xl font-bold ${criticalCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
            {criticalCount}
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">{t("triage.patientCareAffected")}</p>
        </Card>

        <Card className={`p-3 sm:p-4 shadow-xs ${unacceptedCount > 0 ? 'border-amber-200 dark:border-amber-800/60' : ''}`}>
          <div className="flex items-center justify-between gap-1 pb-1">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t("triage.unaccepted")}</span>
            <Timer className="h-4 w-4 text-amber-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">{unacceptedCount}</div>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">{t("triage.noEngineerAssigned")}</p>
        </Card>

        <Card className="p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between gap-1 pb-1">
            <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{t("triage.avgWait")}</span>
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <div className={`text-xl sm:text-2xl font-bold ${avgWaitMinutes > 24 * 60 ? 'text-red-600' : avgWaitMinutes > 4 * 60 ? 'text-amber-600' : 'text-foreground'}`}>
            {formatWaitTime(avgWaitMinutes)}
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate mt-0.5">{t("triage.avgQueueTime")}</p>
        </Card>
      </div>

      {/* Critical Alert */}
      {criticalCount > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-3.5 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0 animate-pulse" />
          <div>
            <h3 className="font-semibold text-sm text-red-800 dark:text-red-200">
              {criticalCount} {t("triage.criticalAlertTitle")}
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
              {t("triage.criticalAlertDesc")}
            </p>
          </div>
        </div>
      )}

      {/* Triage Queue Client View (Adaptive Mobile Cards & Desktop Table) */}
      <TriageQueueView tickets={tickets as any} />
    </div>
  )
}
