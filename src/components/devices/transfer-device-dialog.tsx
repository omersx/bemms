"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getHospitals } from "@/lib/actions/hospitals"
import { getDepartments } from "@/lib/actions/departments"
import { transferDeviceLocation } from "@/lib/actions/devices"
import { useTranslations } from "next-intl"

interface TransferDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string;
  deviceName: string;
  currentHospital: string;
  currentDepartment: string;
  currentLocation?: string;
  onSuccess: () => void;
}

export function TransferDeviceDialog({
  open,
  onOpenChange,
  deviceId,
  deviceName,
  currentHospital,
  currentDepartment,
  currentLocation,
  onSuccess
}: TransferDeviceDialogProps) {
  const router = useRouter()
  const t = useTranslations('devices')
  const tCommon = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [hospitals, setHospitals] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  
  const [hospitalId, setHospitalId] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [locationDescription, setLocationDescription] = useState("")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (open) {
      getHospitals().then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setHospitals(res.data)
        }
      }).catch(console.error)
    }
  }, [open])

  useEffect(() => {
    if (hospitalId) {
      getDepartments(hospitalId).then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setDepartments(res.data)
        }
      }).catch(console.error)
      setDepartmentId("")
    }
  }, [hospitalId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hospitalId || !departmentId || !reason) {
      toast.error(tCommon('validation.required'))
      return
    }

    setLoading(true)
    try {
      await transferDeviceLocation(deviceId, {
        destinationHospitalId: hospitalId,
        destinationDepartmentId: departmentId,
        exactLocationDescription: locationDescription,
        transferReason: reason as any,
        notes
      })
      toast.success(t('toast.transferred'))
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
            <DialogTitle>{t('transfer.title')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm bg-muted p-3 rounded-md">
              <p><strong>{t('form.name')}:</strong> {deviceName}</p>
              <p><strong>{t('detail.overview')}:</strong> {currentHospital} - {currentDepartment} {currentLocation ? `(${currentLocation})` : ""}</p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="hospital">{t('form.department')} *</Label>
              <Select value={hospitalId} onValueChange={setHospitalId} required>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستشفى / Hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">{t('transfer.toDepartment')} *</Label>
              <Select value={departmentId} onValueChange={setDepartmentId} disabled={!hospitalId} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('form.selectDepartment')} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">{t('form.location')}</Label>
              <Input
                id="location"
                placeholder="e.g. Room 101, Bed 3"
                value={locationDescription}
                onChange={(e) => setLocationDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">{t('transfer.reason')} *</Label>
              <Select value={reason} onValueChange={setReason} required>
                <SelectTrigger>
                  <SelectValue placeholder={t('transfer.reason')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relocation">نقل موقع (Relocation)</SelectItem>
                  <SelectItem value="temporary_loan">إعارة مؤقتة (Temporary Loan)</SelectItem>
                  <SelectItem value="department_change">تغيير القسم (Department Change)</SelectItem>
                  <SelectItem value="correction">تصحيح بيانات (Correction)</SelectItem>
                  <SelectItem value="replacement">استبدال بديل (Replacement)</SelectItem>
                  <SelectItem value="workshop">ورشة الصيانة (Workshop)</SelectItem>
                  <SelectItem value="storage">المستودع (Storage)</SelectItem>
                  <SelectItem value="other">{tCommon('labels.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              {loading ? t('transfer.transferring') : t('transfer.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
