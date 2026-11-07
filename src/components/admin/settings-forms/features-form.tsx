'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sliders, Route, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { updateOrganizationSettings } from '@/lib/actions/system-settings';
import type { FeaturesSettings } from '@/lib/validators/system-settings';
import { useTranslations } from 'next-intl';

interface FeaturesFormProps {
  initialData?: FeaturesSettings;
  organizationId: string;
}

export function FeaturesForm({ initialData, organizationId }: FeaturesFormProps) {
  const t = useTranslations('admin');
  const [formData, setFormData] = useState<FeaturesSettings>(
    initialData || { engineerRoundEnabled: false, copilotEnabled: false }
  );
  const [changeReason, setChangeReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await updateOrganizationSettings({
        organizationId,
        section: 'features',
        settings: formData,
        changeReason: changeReason.trim() || 'Updated optional feature toggles',
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
            <Sliders className="h-5 w-5 text-primary" />
            {t('settings.features.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.features.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="rounded-lg border p-4 transition-colors hover:bg-muted/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="mt-1 rounded-md bg-primary/10 p-2 text-primary">
                  <Route className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="engineerRoundEnabled" className="text-base font-semibold cursor-pointer">
                    {t('settings.features.engineerRound')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.features.engineerRoundHelp')}
                  </p>
                </div>
              </div>

              <Switch
                id="engineerRoundEnabled"
                checked={formData.engineerRoundEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, engineerRoundEnabled: checked }))
                }
              />
            </div>
          </div>

          <div className="rounded-lg border p-4 transition-colors hover:bg-muted/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="mt-1 rounded-md bg-primary/10 p-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="copilotEnabled" className="text-base font-semibold cursor-pointer">
                    {t('settings.features.copilot')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.features.copilotHelp')}
                  </p>
                </div>
              </div>

              <Switch
                id="copilotEnabled"
                checked={formData.copilotEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, copilotEnabled: checked }))
                }
              />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label htmlFor="changeReasonFeatures">{t('changeReason')}</Label>
            <Input
              id="changeReasonFeatures"
              placeholder={t('changeReasonPlaceholder')}
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('settings.features.saveFeatures')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
