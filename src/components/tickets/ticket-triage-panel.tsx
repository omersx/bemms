"use client"

import { triageTicket, assignTicket } from "@/lib/actions/tickets"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CheckCircle, Stethoscope, AlertTriangle, Loader2, Sparkles } from "lucide-react"

export function TicketTriagePanel({
  ticketId,
  currentPriority,
  engineers,
}: {
  ticketId: string
  currentPriority: string
  engineers: any[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedPriority, setSelectedPriority] = useState(currentPriority)

  const isPriorityChanged = selectedPriority !== currentPriority

  const handleTriage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    const fd = new FormData(e.currentTarget)
    const data: any = {
      priorityCode: selectedPriority || currentPriority,
      priorityReason: fd.get("priorityReason") || undefined,
      selectedMaintenanceType: fd.get("selectedMaintenanceType") || undefined,
      selectedTechnicalCategory: fd.get("selectedTechnicalCategory") || undefined,
      assignedEngineerUserId: fd.get("assignedEngineerUserId") || undefined,
      internalTriageNote: fd.get("internalTriageNote") || undefined,
    }

    const result = await triageTicket(ticketId, data)
    if (result?.success) {
      const assigned = !!data.assignedEngineerUserId
      toast.success(
        assigned
          ? "Triage complete — ticket is now In Progress"
          : "Triage saved — assign an engineer to start work"
      )
      router.refresh()
    } else {
      const errMsg = (result as any)?.error || "Failed to triage ticket"
      setError(errMsg)
      toast.error(errMsg)
    }
    setLoading(false)
  }

  return (
    <Card className="border-indigo-200/80 dark:border-indigo-800/60 shadow-xs overflow-hidden">
      <CardHeader className="bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 shrink-0">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base font-semibold text-indigo-950 dark:text-indigo-200 truncate">
                Biomedical Triage
              </CardTitle>
              <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 hidden sm:block">
                Classify technical priority, maintenance scope, and assign engineer
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] sm:text-xs text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 bg-white/60 dark:bg-zinc-900/60 shrink-0"
          >
            Needs Triage
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-5 pt-3 sm:pt-4">
        {error && (
          <div className="bg-destructive/10 text-destructive p-2.5 rounded-lg text-xs mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleTriage} className="space-y-3 sm:space-y-3.5">
          {/* Row 1: Priority & Maintenance Type (2 columns on mobile) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <Label htmlFor="priorityCode" className="text-xs font-medium text-foreground">
                Priority
              </Label>
              <select
                id="priorityCode"
                name="priorityCode"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full rounded-lg border border-input bg-card px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-foreground h-9"
              >
                <option value="p1_critical">🔴 P1 Critical</option>
                <option value="p2_high">🟠 P2 High</option>
                <option value="p3_normal">🔵 P3 Normal</option>
                <option value="p4_low">⚪ P4 Low</option>
              </select>
            </div>

            <div>
              <Label htmlFor="selectedMaintenanceType" className="text-xs font-medium text-foreground">
                Maintenance Type
              </Label>
              <select
                id="selectedMaintenanceType"
                name="selectedMaintenanceType"
                className="w-full rounded-lg border border-input bg-card px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-foreground h-9"
              >
                <option value="">Select type...</option>
                <option value="corrective_maintenance">Corrective Maint.</option>
                <option value="preventive_maintenance">Preventive Maint.</option>
                <option value="troubleshooting">Troubleshooting</option>
                <option value="inspection">Inspection</option>
                <option value="calibration">Calibration</option>
                <option value="software_configuration">Software / Config</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Conditional Priority Justification - Only shown when priority is changed */}
          {isPriorityChanged && (
            <div className="rounded-lg bg-amber-50/70 dark:bg-amber-950/30 p-2.5 border border-amber-200 dark:border-amber-800/60 animate-in fade-in slide-in-from-top-1 duration-150 space-y-1">
              <Label
                htmlFor="priorityReason"
                className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Priority Justification (Required)
              </Label>
              <Textarea
                id="priorityReason"
                name="priorityReason"
                placeholder="Explain why priority is being changed from original report..."
                rows={2}
                className="resize-none text-xs sm:text-sm bg-white dark:bg-zinc-900 border-amber-300 dark:border-amber-700"
                required
              />
            </div>
          )}

          {/* Row 2: Technical Category & Assign To (2 columns on mobile) */}
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <Label htmlFor="selectedTechnicalCategory" className="text-xs font-medium text-foreground">
                Technical Category
              </Label>
              <select
                id="selectedTechnicalCategory"
                name="selectedTechnicalCategory"
                className="w-full rounded-lg border border-input bg-card px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-foreground h-9"
              >
                <option value="">Select category...</option>
                <option value="electrical_power">Electrical / Power</option>
                <option value="display_user_interface">Display / UI</option>
                <option value="alarm_safety">Alarm / Safety</option>
                <option value="mechanical">Mechanical</option>
                <option value="software_configuration">Software</option>
                <option value="no_fault_found">No Fault Found</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <Label htmlFor="assignedEngineerUserId" className="text-xs font-medium text-foreground">
                Assign To
              </Label>
              <select
                id="assignedEngineerUserId"
                name="assignedEngineerUserId"
                className="w-full rounded-lg border border-input bg-card px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-foreground h-9"
              >
                <option value="">Leave unassigned</option>
                {engineers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Internal Triage Note: Compact 1-row textarea on mobile */}
          <div>
            <Label htmlFor="internalTriageNote" className="text-xs font-medium text-foreground">
              Internal Triage Note <span className="text-[11px] text-muted-foreground font-normal">(visible only to biomedical)</span>
            </Label>
            <Textarea
              id="internalTriageNote"
              name="internalTriageNote"
              placeholder="e.g. Initial triage check: power cord tested, suspect PCB failure..."
              rows={1}
              className="mt-1 text-xs sm:text-sm resize-none min-h-[38px] sm:min-h-[48px]"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-1">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm h-9 sm:h-10 gap-1.5 shadow-xs transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Triage...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete Triage &amp; Save</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
