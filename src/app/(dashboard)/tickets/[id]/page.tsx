import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/auth/rbac"
import { getTicketById, getTicketComments, getTicketTimeline, getTicketSignatures } from "@/lib/actions/tickets"
import { getUsers } from "@/lib/actions/users"
import { db } from "@/lib/db"
import { engineerProfiles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TicketStatusBadge, TicketPriorityBadge, TicketImpactBadge } from "@/components/tickets/ticket-badges"
import { TicketSlaBadge, TicketSlaCard } from "@/components/tickets/ticket-sla-badge"
import { StaffStatusLabel } from "@/components/tickets/staff-status-label"
import { StaffTicketProgressTracker } from "@/components/tickets/staff-ticket-progress-tracker"
import { DeviceStatusBadge } from "@/components/devices/device-badges"
import { TicketTimeline } from "@/components/tickets/ticket-timeline"
import { TicketCommentSection } from "@/components/tickets/ticket-comment-section"
import { TicketTriagePanel } from "@/components/tickets/ticket-triage-panel"
import { TicketActionButtons, ResumeWorkButton } from "@/components/tickets/ticket-action-buttons"
import { TicketSignaturesPanel } from "@/components/tickets/ticket-signatures-panel"
import { TicketReporterProfile } from "@/components/tickets/ticket-reporter-profile"
import { WaitingForEngineerBanner, AcceptedByEngineerBanner } from "@/components/tickets/ticket-dispatch-status"
import { TicketAutoRefresh } from "@/components/tickets/ticket-auto-refresh"
import { TicketTimeDisplay } from "@/components/tickets/ticket-time-display"
import { TicketDetailTabs } from "@/components/tickets/ticket-detail-tabs"
import { MapPin, Phone, User as UserIcon, Monitor, Clock, AlertTriangle, CheckCircle, ShieldCheck, AlertOctagon, Package, Info, Mail, MessageCircle } from "lucide-react"
import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"

export const dynamic = 'force-dynamic'

function formatProblemCategory(category?: string | null, t?: any): string {
  if (!category) return t ? t("categories.notSpecified") : "Not specified"
  if (t) {
    try {
      const val = t(`categories.${category}`)
      if (val && !val.startsWith("categories.")) return val
    } catch {
      // fallback
    }
  }
  const map: Record<string, string> = {
    power_issue: "Power Issue",
    device_not_starting: "Device Not Starting",
    display_interface: "Display / Screen Issue",
    alarm_problem: "Alarm / Safety System",
    physical_damage: "Physical Damage / Casework",
    sensor_probe_failure: "Sensor / Cable Failure",
    software_error: "Software / System Error",
    calibration_drift: "Calibration / Accuracy Drift",
    fluid_leak: "Fluid / Pneumatic Leak",
    battery_failure: "Battery / Charging Failure",
    accessory_missing: "Accessory Missing / Faulty",
    other: "Other Technical Issue",
  }
  return map[category] || category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TicketDetailContent ticketId={id} />
}

async function TicketDetailContent({ ticketId }: { ticketId: string }) {
  const t = await getTranslations("tickets")
  const tCommon = await getTranslations("common")
  const locale = await getLocale()

  const [ticketRes, commentsRes, timelineRes, usersRes, signaturesRes] = await Promise.all([
    getTicketById(ticketId),
    getTicketComments(ticketId),
    getTicketTimeline(ticketId),
    getUsers(),
    getTicketSignatures(ticketId),
  ])

  const ticket = ticketRes?.success ? ticketRes.data : null
  const comments = (commentsRes?.success && Array.isArray(commentsRes.data)) ? commentsRes.data : []
  const timeline = (timelineRes?.success && Array.isArray(timelineRes.data)) ? timelineRes.data : []
  const engineers = (usersRes?.success && Array.isArray(usersRes.data)) ? usersRes.data : []
  const signatures = (signaturesRes?.success && Array.isArray(signaturesRes.data?.signatures)) ? signaturesRes.data.signatures : []

  if (!ticket) return <div className="p-8 text-center text-muted-foreground">{t('noTickets')}</div>

  // Role checking
  const session = await auth()
  const currentUser = session?.user as { roles?: string[] } | undefined
  const userRoles = currentUser?.roles || []
  const isBiomed = hasRole(userRoles, 'BIOMED_ENG', 'BIOMED_TECH', 'BIOMED_MGR', 'SYS_ADMIN', 'ORG_ADMIN', 'HOSP_ADMIN')
  const isStaffOnly = hasRole(userRoles, 'STAFF', 'DEPT_MGR') && !isBiomed

  let engineerProfile: any = null
  if (ticket.assignedEngineerUserId) {
    engineerProfile = await db.query.engineerProfiles.findFirst({
      where: eq(engineerProfiles.userId, ticket.assignedEngineerUserId),
    })
  }

  const visibleTimeline = isStaffOnly
    ? timeline.filter((e: any) => e.visibility !== 'internal')
    : timeline

  // ── Construct Modular Sections ───────────────────────────────────────────

  // 1. Overview Content: Problem Description, Hold Card, Resolution Card, Signatures, Triage
  const overviewContent = (
    <div className="space-y-3.5 sm:space-y-4 md:space-y-6">
      {/* Problem Description Card */}
      <Card className="shadow-xs border-border">
        <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold">{t('detail.problemDescription')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 sm:p-5 pt-0 space-y-3">
          <p className="whitespace-pre-wrap text-xs sm:text-sm text-foreground/90 leading-relaxed">
            {ticket.description}
          </p>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-3 border-t border-border/60">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground font-medium text-[11px] uppercase">{t('detail.impact')}:</span>
              <TicketImpactBadge impact={ticket.reportedImpact} />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground font-medium text-[11px] uppercase">{t('detail.category')}:</span>
              <span className="font-semibold text-foreground">{formatProblemCategory(ticket.reportedProblemCategory, t)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Waiting for Spare Parts Card */}
      {['in_progress', 'waiting_parts_vendor', 'in_triage', 'acknowledged'].includes(ticket.statusCode) &&
        (ticket.statusCode === 'waiting_parts_vendor' || ticket.device?.currentStatusCode === 'waiting_for_parts' || ticket.waitingReason) && (
          <Card className="border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs overflow-hidden">
            <CardHeader className="p-3.5 sm:p-4 pb-3 border-b border-amber-200/80 dark:border-amber-800/60 bg-amber-100/40 dark:bg-amber-900/20">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-amber-500/10 dark:bg-amber-400/10 rounded-md border border-amber-300/60 dark:border-amber-700/60">
                    <Package className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base text-amber-950 dark:text-amber-100">
                      {t('detail.equipmentOnHold')}
                    </CardTitle>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 hidden sm:block">
                      {t('detail.onHoldDesc')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 border-0 shadow-xs text-[11px]">
                    <Clock className="w-3 h-3" />
                    {t('detail.partsOnOrder')}
                  </Badge>
                  <ResumeWorkButton ticketId={ticketId} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 pt-3 space-y-3">
              <div className="grid sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                <div className="p-2.5 bg-white/80 dark:bg-zinc-900/70 rounded-lg border border-amber-200/70 dark:border-amber-800/50 space-y-0.5">
                  <span className="text-[10px] font-semibold uppercase text-amber-800 dark:text-amber-300 tracking-wider">
                    {t('detail.requiredPart')}
                  </span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {ticket.waitingReason || "Spare parts ordered"}
                  </p>
                </div>

                {ticket.waitingDependencyType ? (
                  <div className="p-2.5 bg-white/80 dark:bg-zinc-900/70 rounded-lg border border-amber-200/70 dark:border-amber-800/50 space-y-0.5">
                    <span className="text-[10px] font-semibold uppercase text-amber-800 dark:text-amber-300 tracking-wider">
                      {t('detail.supplierPo')}
                    </span>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {ticket.waitingDependencyType}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-white/80 dark:bg-zinc-900/70 rounded-lg border border-amber-200/70 dark:border-amber-800/50 space-y-0.5">
                    <span className="text-[10px] font-semibold uppercase text-amber-800 dark:text-amber-300 tracking-wider">
                      {t('detail.equipmentStatus')}
                    </span>
                    <div>
                      <DeviceStatusBadge status={ticket.device?.currentStatusCode || 'waiting_for_parts'} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-100/60 dark:bg-amber-900/30 p-2.5 text-[11px] sm:text-xs text-amber-900 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800/50">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {t('detail.partsNotice')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Resolution / Disposition Details Card */}
      {ticket.resolutionSummary && ['resolved', 'closed'].includes(ticket.statusCode) && (
        (() => {
          const status = ticket.finalDeviceStatusCode || ''
          const isOutOfService = ['out_of_service', 'decommissioned'].includes(status)
          const isLimited = status === 'operational_with_limitations'
          const isAwaitingRelease = status === 'awaiting_release'
          const isStandby = status === 'standby'
          const isConflict = ['under_repair', 'waiting_for_parts', 'under_maintenance'].includes(status)

          let cardStyle = "border-emerald-200 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10"
          let headerBorder = "border-emerald-100 dark:border-emerald-900/40"
          let titleColor = "text-emerald-950 dark:text-emerald-200"
          let icon = <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          let title = t('detail.resolutionFullyOperational')

          if (isOutOfService) {
            cardStyle = "border-rose-300 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20"
            headerBorder = "border-rose-200 dark:border-rose-900/50"
            titleColor = "text-rose-950 dark:text-rose-200"
            icon = <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
            title = status === 'decommissioned'
              ? t('detail.dispositionDecommissioned')
              : t('detail.dispositionOutOfService')
          } else if (isLimited) {
            cardStyle = "border-amber-300 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/20"
            headerBorder = "border-amber-200 dark:border-amber-900/50"
            titleColor = "text-amber-950 dark:text-amber-200"
            icon = <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            title = t('detail.resolutionLimitations')
          } else if (isAwaitingRelease) {
            cardStyle = "border-purple-300 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20"
            headerBorder = "border-purple-200 dark:border-purple-900/50"
            titleColor = "text-purple-950 dark:text-purple-200"
            icon = <Clock className="w-4 h-4 text-purple-600 shrink-0" />
            title = t('detail.resolutionSummary')
          } else if (isStandby) {
            cardStyle = "border-blue-300 dark:border-blue-900 bg-blue-50/25 dark:bg-blue-950/20"
            headerBorder = "border-blue-200 dark:border-blue-900/50"
            titleColor = "text-blue-950 dark:text-blue-200"
            icon = <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            title = t('detail.resolutionSummary')
          } else if (isConflict) {
            cardStyle = "border-amber-400 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30"
            headerBorder = "border-amber-300 dark:border-amber-800/60"
            titleColor = "text-amber-950 dark:text-amber-200"
            icon = <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            title = t('detail.resolutionSummary')
          }

          return (
            <Card className={`${cardStyle} shadow-xs`}>
              <CardHeader className={`p-3.5 sm:p-4 pb-2.5 border-b ${headerBorder}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {icon}
                    <CardTitle className={`text-sm sm:text-base ${titleColor}`}>
                      {title}
                    </CardTitle>
                  </div>
                  {ticket.finalDeviceStatusCode && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Final Device Status:</span>
                      <DeviceStatusBadge status={ticket.finalDeviceStatusCode} />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 pt-3 space-y-2.5">
                {isConflict && (
                  <div className="rounded-lg bg-amber-100/80 dark:bg-amber-900/40 p-2.5 text-xs text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                    ⚠️ <strong>Workflow Notice:</strong> Ticket marked resolved, but device is <em>Under Repair</em>. Click <strong>Resume Work</strong> to track repair.
                  </div>
                )}
                {isOutOfService && (
                  <div className="rounded-lg bg-rose-100/80 dark:bg-rose-950/60 p-2.5 text-xs text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                    🚫 <strong>Non-Clinical Disposition:</strong> Flagged out of clinical service and barred from patient use.
                  </div>
                )}
                {isAwaitingRelease && (
                  <div className="rounded-lg bg-purple-100/80 dark:bg-purple-950/60 p-2.5 text-xs text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
                    ⏳ <strong>QA Release Required:</strong> Must be inspected and released by Biomedical QA before deployment.
                  </div>
                )}
                {isStandby && (
                  <div className="rounded-lg bg-blue-100/80 dark:bg-blue-950/60 p-2.5 text-xs text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-800">
                    💤 <strong>Reserve Pool:</strong> Unit operational and stored as backup inventory.
                  </div>
                )}
                {isLimited && ticket.device?.statusLimitationsNote && (
                  <div className="rounded-lg bg-amber-100/90 dark:bg-amber-950/60 p-2.5 text-xs text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 space-y-1">
                    <span className="font-semibold block uppercase tracking-wider text-[11px] text-amber-800 dark:text-amber-300">
                      Clinical Limitations:
                    </span>
                    <p className="font-medium">{ticket.device.statusLimitationsNote}</p>
                  </div>
                )}
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{ticket.resolutionSummary}</p>
                {ticket.resolvedAt && (
                  <p className="text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                    Resolved {new Date(ticket.resolvedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    {(ticket as any).resolvedByUser?.fullName ? ` by ${(ticket as any).resolvedByUser.fullName}` : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })()
      )}

      {/* Electronic Signatures Panel */}
      {!isStaffOnly && <TicketSignaturesPanel signatures={signatures} />}

      {/* Biomedical Triage Panel (Shown for eligible statuses) */}
      {isBiomed && ['new', 'acknowledged', 'in_triage', 'waiting_requester'].includes(ticket.statusCode) && (
        <TicketTriagePanel
          ticketId={ticketId}
          currentPriority={ticket.priorityCode}
          engineers={engineers}
        />
      )}
    </div>
  )

  // ── Determine Chat Counterpart & Availability Status ────────────────────────
  let counterpartName = "Biomedical Engineering"
  let counterpartRole = "Biomedical Engineer"
  let contactAvailability: {
    isOnline: boolean
    statusText: string
    variant: "online" | "on_call" | "in_maintenance" | "offline" | "unassigned"
  } = {
    isOnline: true,
    statusText: "Active",
    variant: "online",
  }

  if (isStaffOnly) {
    // Clinical staff viewing the ticket -> chatting with assigned engineer
    if (!ticket.assignedEngineerUserId) {
      counterpartName = "Biomedical Engineering"
      counterpartRole = "Triage & Dispatch Desk"
      contactAvailability = {
        isOnline: false,
        statusText: "Unassigned · Queue pending",
        variant: "unassigned",
      }
    } else {
      counterpartName = (ticket as any).assignedEngineer?.fullName || "Biomedical Engineer"
      counterpartRole = engineerProfile?.jobTitle || "Biomedical Engineer"
      const duty = engineerProfile?.dutyStatus || "on_duty"
      if (duty === "on_duty") {
        contactAvailability = {
          isOnline: true,
          statusText: "On Duty · Available",
          variant: "online",
        }
      } else if (duty === "on_call") {
        contactAvailability = {
          isOnline: true,
          statusText: "On Call · Dispatch",
          variant: "on_call",
        }
      } else if (duty === "in_maintenance") {
        contactAvailability = {
          isOnline: true,
          statusText: "In Maintenance · Active Task",
          variant: "in_maintenance",
        }
      } else if (duty === "off_duty") {
        contactAvailability = {
          isOnline: false,
          statusText: "Off Duty · Unavailable",
          variant: "offline",
        }
      }
    }
  } else {
    // Biomedical Engineer or Administrator viewing ticket -> chatting with reporter
    const reporter = (ticket as any).reportedByUser
    counterpartName = reporter?.fullName || ticket.requesterContactName || "Department Clinical Staff"

    // Derive accurate counterpart role
    if (reporter?.jobTitle) {
      counterpartRole = reporter.jobTitle
    } else if (reporter?.fullName?.toLowerCase().includes("admin")) {
      counterpartRole = "System Administrator"
    } else if ((ticket as any).department?.name) {
      counterpartRole = `${(ticket as any).department.name} Staff`
    } else {
      counterpartRole = "Clinical Staff"
    }

    if (reporter?.accountStatus === "suspended" || reporter?.accountStatus === "deactivated") {
      contactAvailability = {
        isOnline: false,
        statusText: `Inactive · ${counterpartRole}`,
        variant: "offline",
      }
    } else {
      contactAvailability = {
        isOnline: true,
        statusText: `Active · ${counterpartRole}`,
        variant: "online",
      }
    }
  }

  // 2. Chat Content
  const chatContent = (
    <TicketCommentSection
      ticketId={ticketId}
      comments={comments as any}
      canAddInternal={isBiomed}
      currentUserId={session?.user?.id}
      assignedEngineerUserId={ticket.assignedEngineerUserId}
      assignedEngineerName={(ticket as any).assignedEngineer?.fullName}
      reporterName={counterpartName}
      reporterRole={counterpartRole}
      isBiomed={isBiomed}
      contactAvailability={contactAvailability}
    />
  )

  // 3. Timeline Content
  const timelineContent = (
    <Card className="shadow-xs border-border">
      <CardHeader className="p-3.5 sm:p-5 pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base font-semibold">Timeline</CardTitle>
      </CardHeader>
      <CardContent className="p-3.5 sm:p-5 pt-0">
        <TicketTimeline entries={visibleTimeline as any} />
      </CardContent>
    </Card>
  )

  // 4. Desktop Sidebar Content (Context card + prominent assignee for staff)
  const sidebarContent = (
    <>
      <Card className="hidden md:block shadow-xs border-border">
        <CardHeader><CardTitle>Context</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2"><Monitor className="w-4 h-4" /> Device</h4>
            {ticket.device ? (
              <div className="pl-6 space-y-1">
                <Link href={`/devices/${ticket.deviceId}`} className="text-primary hover:underline font-medium block">
                  {ticket.device.name}
                </Link>
                <p className="text-muted-foreground">Asset: {ticket.device.assetNumber}</p>
              </div>
            ) : (
              <p className="pl-6 text-muted-foreground">No device linked.</p>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</h4>
            <div className="pl-6 space-y-1">
              <p>{(ticket as any).hospital?.name}</p>
              <p>{(ticket as any).department?.name}</p>
              <p className="text-muted-foreground">{ticket.reportedLocationCorrection || (ticket as any).location?.name || "No specific room"}</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-primary" />
              Reported By
            </h4>
            <TicketReporterProfile
              reporter={{
                id: ticket.reportedByUserId || undefined,
                fullName: (ticket as any).reportedByUser?.fullName || ticket.requesterContactName,
                email: (ticket as any).reportedByUser?.email,
                phone: ticket.requesterContactPhone || (ticket as any).reportedByUser?.phone,
                jobTitle: (ticket as any).reportedByUser?.jobTitle,
                employeeIdentifier: (ticket as any).reportedByUser?.employeeIdentifier,
                departmentName: (ticket as any).department?.name,
                hospitalName: (ticket as any).hospital?.name,
                reportedLocationCorrection: ticket.reportedLocationCorrection,
                requesterContactName: ticket.requesterContactName,
                requesterContactPhone: ticket.requesterContactPhone,
              }}
              isBiomedOrAdmin={isBiomed}
            />
          </div>

          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> {t('detail.assignment')}</h4>
            <div className="ps-6 space-y-1">
              {ticket.assignedEngineerUserId ? (
                <p>{(ticket as any).assignedEngineer?.fullName}</p>
              ) : (
                <p className="text-muted-foreground italic">{t('detail.unassigned')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA Target Tracking Card */}
      <TicketSlaCard
        responseTargetAt={ticket.responseTargetAt}
        resolutionTargetAt={ticket.resolutionTargetAt}
        acknowledgedAt={ticket.acceptedAt || ticket.assignedAt}
        resolvedAt={ticket.resolvedAt}
        priorityCode={ticket.priorityCode}
      />

      {/* Assigned Engineer - prominent for staff */}
      {isStaffOnly && ticket.assignedEngineerUserId && (
        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs">
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-2">
              {t('detail.assignedEngineer')}
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                {(ticket as any).assignedEngineer?.fullName?.substring(0, 2)?.toUpperCase() || '??'}
              </div>
              <div>
                <p className="font-semibold text-sm">{(ticket as any).assignedEngineer?.fullName}</p>
                <p className="text-xs text-muted-foreground">Biomedical Engineer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )

  return (
    <div className="space-y-3.5 sm:space-y-5 md:space-y-6">
      <TicketAutoRefresh
        ticketId={ticketId}
        initialUpdatedAt={ticket.updatedAt}
        initialStatusCode={ticket.statusCode}
        initialCommentCount={comments.length}
        initialAssignedEngineerUserId={ticket.assignedEngineerUserId}
      />
      <PageHeader
        title={ticket.title}
        description={
          <span className="flex items-center gap-1.5 flex-wrap text-xs sm:text-sm text-muted-foreground">
            <span>{t('ticketDetails')} #{ticket.ticketNumber}</span>
            {ticket.reportedAt && (
              <>
                <span>·</span>
                <TicketTimeDisplay reportedAt={ticket.reportedAt} />
              </>
            )}
          </span>
        }
      >
        <div className="flex gap-1.5 sm:gap-2 items-center flex-wrap">
          <TicketPriorityBadge priority={ticket.priorityCode} />
          {ticket.responseTargetAt && !['resolved', 'closed', 'cancelled'].includes(ticket.statusCode) && (
            <TicketSlaBadge
              targetAt={ticket.responseTargetAt}
              completedAt={ticket.acceptedAt || ticket.assignedAt}
              type="response"
            />
          )}
          {isStaffOnly ? (
            <StaffStatusLabel statusCode={ticket.statusCode} />
          ) : (
            <TicketStatusBadge status={ticket.statusCode} />
          )}
          {!isStaffOnly && (ticket.statusCode !== 'new' || ticket.assignedEngineerUserId) && (
            <TicketActionButtons
              ticketId={ticketId}
              statusCode={ticket.statusCode}
              hasDevice={!!ticket.deviceId}
              ticketNumber={ticket.ticketNumber}
              currentDeviceStatus={ticket.device?.currentStatusCode}
            />
          )}
        </div>
      </PageHeader>

      {/* Staff Visual Progress Stepper & Guidance */}
      {isStaffOnly && (
        <StaffTicketProgressTracker
          ticket={ticket}
          engineerContact={engineerProfile}
        />
      )}

      {/* Dispatch Status: Waiting for Engineer / Accepted */}
      {ticket.statusCode === 'new' && !ticket.assignedEngineerUserId && (
        <WaitingForEngineerBanner
          reportedAt={ticket.reportedAt}
          reportedImpact={ticket.reportedImpact}
        >
          {!isStaffOnly && (
            <TicketActionButtons
              ticketId={ticketId}
              statusCode={ticket.statusCode}
              hasDevice={!!ticket.deviceId}
              ticketNumber={ticket.ticketNumber}
              currentDeviceStatus={ticket.device?.currentStatusCode}
            />
          )}
        </WaitingForEngineerBanner>
      )}
      {ticket.acceptedAt && ticket.assignedEngineer && isStaffOnly && (
        <AcceptedByEngineerBanner
          engineerName={(ticket as any).assignedEngineer as any ? (ticket.assignedEngineer as any).fullName || 'Biomedical Engineer' : 'Biomedical Engineer'}
          acceptedAt={ticket.acceptedAt}
        />
      )}

      {/* Mobile Quick Equipment & Location Context (Sticky / Visible on mobile) */}
      <div className="block md:hidden">
        <Card className="border-border bg-card shadow-xs">
          <CardContent className="p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Monitor className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-foreground truncate block">
                    {ticket.device?.name || t('detail.noLinkedDevice')}
                  </span>
                  {ticket.device?.assetNumber && (
                    <span className="text-muted-foreground font-mono text-[11px]">
                      Asset: {ticket.device.assetNumber}
                    </span>
                  )}
                </div>
              </div>
              {ticket.deviceId && (
                <Link
                  href={`/devices/${ticket.deviceId}`}
                  className="text-primary hover:underline font-medium shrink-0 text-xs"
                >
                  {t('detail.viewDevice')}
                </Link>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-medium text-foreground block truncate">
                    {(ticket as any).department?.name || "Department"} · {(ticket as any).hospital?.name || "Hospital"}
                  </span>
                  <span className="text-muted-foreground block text-[11px] truncate">
                    {ticket.reportedLocationCorrection || (ticket as any).location?.name || "No specific room"}
                  </span>
                </div>
              </div>
              {(ticket.requesterContactPhone || (ticket as any).reportedByUser?.phone) && (
                <a
                  href={`tel:${ticket.requesterContactPhone || (ticket as any).reportedByUser?.phone}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium text-xs shrink-0 shadow-xs transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{t('detail.call')}</span>
                </a>
              )}
            </div>

            {/* Reporter & Assignment summary line for mobile */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 min-w-0">
                <UserIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">
                  By <strong className="text-foreground">{(ticket as any).reportedByUser?.fullName || ticket.requesterContactName || "Staff"}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>
                  {ticket.assignedEngineerUserId ? (
                    <strong className="text-foreground">{(ticket as any).assignedEngineer?.fullName || "Assigned"}</strong>
                  ) : (
                    <span className="italic">{t('detail.unassigned')}</span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Responsive Multi-Tab / Multi-Column Container ── */}
      <TicketDetailTabs
        overviewNode={overviewContent}
        chatNode={chatContent}
        timelineNode={timelineContent}
        sidebarNode={sidebarContent}
        commentCount={comments.length}
      />
    </div>
  )
}
