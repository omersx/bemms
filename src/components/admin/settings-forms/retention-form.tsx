'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Database, HardDrive, CalendarClock, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { updateOrganizationSettings } from '@/lib/actions/system-settings';
import type { RetentionSettings } from '@/lib/validators/system-settings';
import { useTranslations } from 'next-intl';

interface RetentionFormProps {
  initialData: RetentionSettings;
  organizationId: string;
}

export function RetentionForm({ initialData, organizationId }: RetentionFormProps) {
  const t = useTranslations('admin');
  const [formData, setFormData] = useState<RetentionSettings>(initialData);
  const [changeReason, setChangeReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await updateOrganizationSettings({
        organizationId,
        section: 'retention',
        settings: formData,
        changeReason: changeReason.trim() || 'Updated data retention and operational thresholds',
      });

      if (res.success) {
        toast.success(t('saved'));
        setChangeReason('');
      } else {
        toast.error(res.error || t('saveFailed'));
      }
    } catch {
      toast.error(t('unexpectedError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Database className="h-5 w-5 text-primary" />
            {t('settings.retention.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.retention.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Audit Log Retention */}
            <div className="space-y-2">
              <Label htmlFor="auditRetention" className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                {t('settings.retention.auditLogRetention')}
              </Label>
              <Input
                id="auditRetention"
                type="number"
                min={30}
                max={3650}
                value={formData.auditLogRetentionDays}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, auditLogRetentionDays: parseInt(e.target.value) || 365 }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.retention.auditLogRetentionHelp')}
              </p>
            </div>

            {/* PM Alert Window */}
            <div className="space-y-2">
              <Label htmlFor="pmAlertWindow" className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                {t('settings.retention.pmAlertWindow')}
              </Label>
              <Input
                id="pmAlertWindow"
                type="number"
                min={1}
                max={90}
                value={formData.pmAlertWindowDays}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pmAlertWindowDays: parseInt(e.target.value) || 14 }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.retention.pmAlertWindowHelp')}
              </p>
            </div>

            {/* Attachment Quota */}
            <div className="space-y-2">
              <Label htmlFor="attachmentQuota" className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                {t('settings.retention.attachmentQuota')}
              </Label>
              <Input
                id="attachmentQuota"
                type="number"
                min={100}
                max={100000}
                value={formData.attachmentQuotaMb}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, attachmentQuotaMb: parseInt(e.target.value) || 5000 }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t('settings.retention.attachmentQuotaHelp')}
              </p>
            </div>
          </div>

          {/* Audit Trace Reason */}
          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="changeReason" className="text-sm font-medium">
              {t('changeReason')}
            </Label>
            <Input
              id="changeReason"
              placeholder={t('changeReasonPlaceholder')}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="max-w-xl"
            />
            <p className="text-xs text-muted-foreground">
              {t('changeReasonHelp')}
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t('settings.retention.saveRetention')}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

