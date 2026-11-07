"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { changeDeviceStatus } from "@/lib/actions/devices"
import { DeviceStatusBadge } from "./device-badges"
import { useTranslations } from "next-intl"

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  deviceName: string;
  currentStatus: string;
  onSuccess: () => void;
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  deviceId,
  deviceName,
  currentStatus,
  onSuccess
}: ChangeStatusDialogProps) {
  const router = useRouter()
  const t = useTranslations('devices')
  const tCommon = useTranslations('common')
  const [loading, setLoading] = useState(false)
  
  const [status, setStatus] = useState("")
  const [reason, setReason] = useState("")
  const [limitationsNote, setLimitationsNote] = useState("")
  const [notes, setNotes] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!status || !reason) {
      toast.error(tCommon('validation.required'))
      return
    }

    setLoading(true)
    try {
      await changeDeviceStatus(deviceId, {
        newStatusCode: status as any,
        reason,
        notes,
        limitationsNote: status === 'operational_with_limitations' ? limitationsNote : undefined,
      })
      toast.success(t('toast.statusChanged'))
      onSuccess()
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(t('toast.updateFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('changeStatus.title')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">{tCommon('labels.status')}:</span>
              <DeviceStatusBadge status={currentStatus} />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">{t('changeStatus.newStatus')} *</Label>
              <Select value={status} onValueChange={setStatus} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('form.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">{t('status.operational')}</SelectItem>
                  <SelectItem value="operational_with_limitations">{t('status.operational')} (مقيّد)</SelectItem>
                  <SelectItem value="under_maintenance">{t('status.underMaintenance')}</SelectItem>
                  <SelectItem value="under_repair">{t('status.underMaintenance')}</SelectItem>
                  <SelectItem value="waiting_for_parts">{tCommon('status.waitingForParts')}</SelectItem>
                  <SelectItem value="awaiting_release">{t('status.pendingInstallation')}</SelectItem>
                  <SelectItem value="out_of_service">{t('status.outOfService')}</SelectItem>
                  <SelectItem value="standby">{t('status.inStorage')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">{t('changeStatus.reason')} *</Label>
              <Input
                id="reason"
                placeholder={t('changeStatus.reason')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </div>

            {status === 'operational_with_limitations' && (
              <div className="grid gap-2">
                <Label htmlFor="limitations">Limitations Note *</Label>
                <Textarea
                  id="limitations"
                  placeholder="Describe the operational limitations"
                  value={limitationsNote}
                  onChange={(e) => setLimitationsNote(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">{t('form.notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('form.notes')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('buttons.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('form.updating') : t('changeStatus.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
