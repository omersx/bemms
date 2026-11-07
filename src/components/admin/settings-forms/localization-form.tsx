'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Clock, Calendar, Languages, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { updateOrganizationSettings } from '@/lib/actions/system-settings';
import type { LocalizationSettings } from '@/lib/validators/system-settings';
import { setUserLocale } from '@/i18n/locale';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface LocalizationFormProps {
  initialData: LocalizationSettings;
  organizationId: string;
}

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (UTC+2 / UTC+3)' },
  { value: 'Asia/Riyadh', label: 'Asia/Riyadh (UTC+3)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0 / UTC+1)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5 / UTC-4)' },
];

export function LocalizationForm({ initialData, organizationId }: LocalizationFormProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [formData, setFormData] = useState<LocalizationSettings>(initialData);
  const [changeReason, setChangeReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await updateOrganizationSettings({
        organizationId,
        section: 'localization',
        settings: formData,
        changeReason: changeReason.trim() || 'Updated localization and regional settings',
      });

      if (res.success) {
        await setUserLocale(formData.language);
        toast.success(t('saved'));
        setChangeReason('');
        router.refresh();
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
            <Globe className="h-5 w-5 text-primary" />
            {t('settings.localization.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.localization.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t('settings.localization.timezone')}
              </Label>
              <Select
                value={formData.timezone}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, timezone: val }))}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder={t('settings.localization.selectTimezone')} />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('settings.localization.timezoneHelp')}
              </p>
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label htmlFor="language" className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                {t('settings.localization.language')}
              </Label>
              <Select
                value={formData.language}
                onValueChange={(val: 'en' | 'ar') => setFormData((prev) => ({ ...prev, language: val }))}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder={t('settings.localization.selectLanguage')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('settings.localization.english')}</SelectItem>
                  <SelectItem value="ar">{t('settings.localization.arabic')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('settings.localization.languageHelp')}
              </p>
            </div>

            {/* Date Format */}
            <div className="space-y-2">
              <Label htmlFor="dateFormat" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {t('settings.localization.dateFormat')}
              </Label>
              <Select
                value={formData.dateFormat}
                onValueChange={(val: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY') =>
                  setFormData((prev) => ({ ...prev, dateFormat: val }))
                }
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601 - Recommended)</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK / EU)</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Format */}
            <div className="space-y-2">
              <Label htmlFor="timeFormat" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t('settings.localization.timeFormat')}
              </Label>
              <Select
                value={formData.timeFormat}
                onValueChange={(val: '24h' | '12h') => setFormData((prev) => ({ ...prev, timeFormat: val }))}
              >
                <SelectTrigger id="timeFormat">
                  <SelectValue placeholder="Select time format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">{t('settings.localization.time24h')}</SelectItem>
                  <SelectItem value="12h">{t('settings.localization.time12h')}</SelectItem>
                </SelectContent>
              </Select>
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
                {t('settings.localization.saveLocalization')}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
