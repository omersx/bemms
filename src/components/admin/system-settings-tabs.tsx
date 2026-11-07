'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, ShieldCheck, Database, Activity, Sliders } from 'lucide-react';
import { LocalizationForm } from './settings-forms/localization-form';
import { SecurityForm } from './settings-forms/security-form';
import { RetentionForm } from './settings-forms/retention-form';
import { HealthPanel } from './settings-forms/health-panel';
import { FeaturesForm } from './settings-forms/features-form';
import type { SystemSettings } from '@/lib/validators/system-settings';
import type { SystemHealthData } from '@/lib/actions/system-settings';
import { useLocale, useTranslations } from 'next-intl';

interface SystemSettingsTabsProps {
  settings: SystemSettings;
  organizationId: string;
  organizationName?: string;
  healthData: SystemHealthData;
}

export function SystemSettingsTabs({
  settings,
  organizationId,
  organizationName,
  healthData,
}: SystemSettingsTabsProps) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {isArabic
              ? `إعداد سياسات النظام، التوطين واللغة، معايير الأمان، وقواعد استبقاء البيانات${organizationName ? ` لـ ${organizationName}` : ''}.`
              : `Configure system policies, localization, security rules, and data retention${organizationName ? ` for ${organizationName}` : ''}.`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="localization" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto p-1 gap-1">
          <TabsTrigger value="localization" className="flex items-center gap-2 py-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{isArabic ? "اللغة والتوطين" : "Localization"}</span>
            <span className="sm:hidden">{isArabic ? "اللغة" : "Locale"}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 py-2">
            <ShieldCheck className="h-4 w-4" />
            <span>{isArabic ? "الأمان والمطابقة" : "Security"}</span>
          </TabsTrigger>
          <TabsTrigger value="retention" className="flex items-center gap-2 py-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{isArabic ? "استبقاء البيانات" : "Data Retention"}</span>
            <span className="sm:hidden">{isArabic ? "الاستبقاء" : "Retention"}</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2 py-2">
            <Sliders className="h-4 w-4" />
            <span>{isArabic ? "الميزات والوحدات" : "Features"}</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2 py-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t("settings.health.title")}</span>
            <span className="sm:hidden">{isArabic ? "الصحة" : "Health"}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="localization" className="space-y-4">
          <LocalizationForm initialData={settings.localization} organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityForm initialData={settings.security} organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <RetentionForm initialData={settings.retention} organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <FeaturesForm initialData={settings.features} organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <HealthPanel initialData={healthData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

