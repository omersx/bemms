'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadCloud, Download, AlertTriangle } from 'lucide-react';
import { ImportWizard } from './import-wizard';
import { ExportCenter } from './export-center';
import { DangerZone } from './danger-zone';
import { useLocale, useTranslations } from 'next-intl';

interface DataManagementTabsProps {
  summary: {
    devices: number;
    departments: number;
    categories: number;
    manufacturers: number;
    tickets: number;
    auditLogs: number;
  };
}

export function DataManagementTabs({ summary }: DataManagementTabsProps) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const isArabic = locale === 'ar';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dataManagement.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {isArabic
            ? "استيراد الأجهزة الطبية والأقسام السريرية دفعة واحدة، وتصدير قواعد البيانات بصيغة Excel أو CSV، وإدارة دورة حياة البيانات."
            : "Bulk import medical equipment and departments, export datasets in Excel or CSV, and manage data lifecycle."}
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md h-auto p-1 gap-1">
          <TabsTrigger value="import" className="flex items-center gap-2 py-2">
            <UploadCloud className="h-4 w-4" />
            <span>{t("dataManagement.import.title")}</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2 py-2">
            <Download className="h-4 w-4" />
            <span>{t("dataManagement.export.title")}</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="flex items-center gap-2 py-2 text-destructive data-[state=active]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>{t("dataManagement.dangerZone.title")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <ImportWizard />
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <ExportCenter summary={summary} />
        </TabsContent>

        <TabsContent value="danger" className="space-y-4">
          <DangerZone />
        </TabsContent>
      </Tabs>
    </div>
  );
}

