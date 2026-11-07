import {
  getDeviceProfile,
  getDeviceStatusHistory,
  getDeviceLocationHistory,
  getDeviceMaintenanceHistory,
  getDeviceSignatures,
  getDeviceDocuments,
} from "@/lib/actions/devices"
import { getActiveQrLabel } from "@/lib/actions/qr"
import { getDeviceActiveTickets, getDeviceTicketHistory } from "@/lib/actions/tickets"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DeviceStatusBadge, CriticalityBadge, RiskClassBadge } from "@/components/devices/device-badges"
import { DeviceAvailabilityBanner } from "@/components/devices/device-availability-banner"
import { DeviceStatusTimeline, DeviceLocationTimeline } from "@/components/devices/device-timelines"
import { DeviceActionButtons } from "@/components/devices/device-action-buttons"
import { DeviceMaintenanceTab } from "@/components/devices/device-maintenance-tab"
import { DeviceTicketsTab } from "@/components/devices/device-tickets-tab"
import { DeviceSignaturesTab } from "@/components/devices/device-signatures-tab"
import { DeviceDocumentsTab } from "@/components/devices/device-documents-tab"
import { TicketStatusBadge } from "@/components/tickets/ticket-badges"
import { DeviceMiniQr } from "@/components/devices/device-mini-qr"
import { AlertTriangle, Wrench, ShieldCheck, FileText, Activity, MapPin, Ticket } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getLocale, getTranslations } from "next-intl/server"

export default async function DeviceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (id === 'scan') {
    redirect('/scan')
  }
  return <DeviceDetailContent deviceId={id} />
}

async function DeviceDetailContent({ deviceId }: { deviceId: string }) {
  const t = await getTranslations("devices")
  const locale = await getLocale()
  const isArabic = locale === "ar"

  const [
    profileResult,
    statusResult,
    locationResult,
    qrResult,
    ticketsResult,
    ticketHistoryResult,
    maintenanceResult,
    signaturesResult,
    documentsResult,
  ] = await Promise.all([
    getDeviceProfile(deviceId),
    getDeviceStatusHistory(deviceId),
    getDeviceLocationHistory(deviceId),
    getActiveQrLabel(deviceId),
    getDeviceActiveTickets(deviceId),
    getDeviceTicketHistory(deviceId),
    getDeviceMaintenanceHistory(deviceId),
    getDeviceSignatures(deviceId),
    getDeviceDocuments(deviceId),
  ])

  const profile = profileResult?.success ? profileResult.data : null
  const device = profile?.device
  const statusHistory = (statusResult?.success && Array.isArray(statusResult.data)) ? statusResult.data : []
  const locationHistory = (locationResult?.success && Array.isArray(locationResult.data)) ? locationResult.data : []
  const qrLabel = qrResult?.success ? qrResult.data : null
  const activeTickets = (ticketsResult?.success && Array.isArray(ticketsResult.data)) ? ticketsResult.data : []
  const allTickets = (ticketHistoryResult?.success && Array.isArray(ticketHistoryResult.data)) ? ticketHistoryResult.data : []
  const maintenanceTasks = maintenanceResult?.success ? (maintenanceResult.data?.tasks || []) : []
  const signatures = signaturesResult?.success ? (signaturesResult.data?.signatures || []) : []
  const signatureEvents = signaturesResult?.success ? (signaturesResult.data?.events || []) : []
  const signedActivitiesCount = new Set(
    signatures.map((s: any) => `${s.sourceType || s.entityType}:${s.entityId}`)
  ).size
  const documents = (documentsResult?.success && Array.isArray(documentsResult.data)) ? documentsResult.data : []

  if (!device) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-semibold mb-2">{t('detail.notFound')}</h2>
        <p className="text-muted-foreground text-sm mb-4">
          {t('detail.notFoundDesc')}
        </p>
        <Link href="/devices">
          <Button variant="outline">{t('detail.backToInventory')}</Button>
        </Link>
      </div>
    )
  }

  const visibleSections = profile?.visibleSections || ["overview"]
  const allowedActions = profile?.allowedActions || ["report_problem", "view_qr"]

  const showTechnical = visibleSections.includes("technical")
  const showMaintenance = visibleSections.includes("maintenance")
  const showSignatures = visibleSections.includes("signatures")
  const showStatusHistory = visibleSections.includes("status-history")
  const showLocationHistory = visibleSections.includes("location-history")
  const showDocuments = visibleSections.includes("documents")

  return (
    <div className="space-y-6">
      {/* Role-shaped Header with Action Buttons */}
      <PageHeader
        title={device.name}
        description={`${device.internalCode} — ${t('columns.assetNumber')} ${device.assetNumber}`}
      >
        <DeviceActionButtons
          deviceId={device.id}
          deviceName={device.name}
          currentHospital={(device as any).hospital?.name || "Hospital"}
          currentDepartment={(device as any).department?.name || "Department"}
          currentLocation={(device as any).location?.name || device.exactLocationDescription || undefined}
          currentStatus={device.currentStatusCode}
          allowedActions={allowedActions}
        />
      </PageHeader>

      {/* Safety & Availability Banner */}
      <DeviceAvailabilityBanner
        status={device.currentStatusCode}
        limitationsNote={device.statusLimitationsNote}
      />

      {/* Tabbed Navigation */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto p-1 gap-1">
          <TabsTrigger value="overview">{t('detail.overview')}</TabsTrigger>
          {showTechnical && <TabsTrigger value="technical">{t('detail.technicalSpecs')}</TabsTrigger>}
          <TabsTrigger value="tickets" className="gap-1.5">
            <Ticket className="w-3.5 h-3.5" />
            {t('detail.tickets')} ({allTickets.length})
          </TabsTrigger>
          {showMaintenance && (
            <TabsTrigger value="maintenance" className="gap-1.5">
              <Wrench className="w-3.5 h-3.5" />
              {t('detail.maintenance')} ({maintenanceTasks.length})
            </TabsTrigger>
          )}
          {showSignatures && (
            <TabsTrigger value="signatures" className="gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('detail.signatures')} ({signedActivitiesCount})
            </TabsTrigger>
          )}
          {showStatusHistory && <TabsTrigger value="status-history">{t('detail.statusHistory')}</TabsTrigger>}
          {showLocationHistory && <TabsTrigger value="location-history">{t('detail.locationHistory')}</TabsTrigger>}
          {showDocuments && (
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {t('detail.documents')} ({documents.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* 1. Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Identity Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('detail.identity')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {qrLabel && (
                  <DeviceMiniQr
                    deviceId={device.id}
                    opaqueReference={qrLabel.opaqueReference}
                    assetNumber={device.assetNumber}
                    deviceName={device.name}
                  />
                )}

                <div className="grid gap-3 pt-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('detail.internalCode')}</span>
                    <span className="font-mono font-medium">{device.internalCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('detail.assetNumber')}</span>
                    <span className="font-mono font-medium">{device.assetNumber}</span>
                  </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.serialNumber')}</span>
                  <span>{device.serialNumber || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.category')}</span>
                  <span>{(device as any).deviceCategory?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.manufacturer')}</span>
                  <span>{(device as any).manufacturer?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.model')}</span>
                  <span>{(device as any).deviceModel?.modelName || device.modelNameFree || "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('detail.status')}</span>
                  <DeviceStatusBadge status={device.currentStatusCode} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('detail.criticality')}</span>
                  <CriticalityBadge level={device.criticalityLevel} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('detail.riskClass')}</span>
                  <RiskClassBadge classification={device.riskClassification} />
                </div>
              </div>
            </CardContent>
            </Card>

            {/* Location & Assignment Card */}
            <Card>
              <CardHeader><CardTitle className="text-base">{t('detail.locationAssignment')}</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.organization')}</span>
                  <span>{(device as any).organization?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.hospital')}</span>
                  <span>{(device as any).hospital?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.department')}</span>
                  <span>{(device as any).department?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.locationRoom')}</span>
                  <span>{(device as any).location?.name || device.exactLocationDescription || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.assignedEngineer')}</span>
                  <span>{(device as any).assignedEngineer?.fullName || t('detail.unassigned')}</span>
                </div>
                {qrLabel && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{t('detail.qrReference')}</span>
                    <Link
                      href={`/devices/${device.id}/qr`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {qrLabel.opaqueReference}
                    </Link>
                  </div>
                )}
                {device.nextPmDueDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('detail.nextPmDue')}</span>
                    <span className="font-medium">{new Date(device.nextPmDueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase & Warranty Card */}
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base">{t('detail.purchaseWarranty')}</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">{t('detail.purchaseDate')}</span>
                  <span>{device.purchaseDate ? new Date(device.purchaseDate).toLocaleDateString() : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">{t('detail.purchaseCost')}</span>
                  <span>{device.purchaseCost ? `${device.currency || "USD"} ${device.purchaseCost}` : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">{t('detail.installationDate')}</span>
                  <span>{device.installationDate ? new Date(device.installationDate).toLocaleDateString() : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">{t('detail.warrantyStart')}</span>
                  <span>{device.warrantyStartDate ? new Date(device.warrantyStartDate).toLocaleDateString() : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">{t('detail.warrantyEnd')}</span>
                  <span>{device.warrantyEndDate ? new Date(device.warrantyEndDate).toLocaleDateString() : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">{t('detail.lifecycleStatus')}</span>
                  <span className="capitalize font-medium">{device.lifecycleStatus}</span>
                </div>
              </CardContent>
            </Card>

            {/* Active Tickets Display */}
            {activeTickets.length > 0 && (
              <Card className="md:col-span-2 border-amber-200 dark:border-amber-900/50">
                <CardHeader className="bg-amber-50/60 dark:bg-amber-950/20 pb-4 border-b border-amber-100 dark:border-amber-900/40">
                  <CardTitle className="text-amber-900 dark:text-amber-300 text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    {t('detail.activeTickets')} ({activeTickets.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-3">
                  {activeTickets.map((tItem: any) => (
                    <div
                      key={tItem.id}
                      className="flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-lg border bg-card gap-4"
                    >
                      <div className="space-y-1">
                        <Link
                          href={`/tickets/${tItem.id}`}
                          className="font-medium hover:underline text-primary flex items-center gap-2"
                        >
                          <span className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">
                            {tItem.ticketNumber}
                          </span>
                          {tItem.title}
                        </Link>
                        <p className="text-xs text-muted-foreground line-clamp-1">{tItem.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <TicketStatusBadge status={tItem.statusCode} />
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/tickets/${tItem.id}`}>{t('detail.viewTicket')}</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 2. Technical Specifications Tab */}
        {showTechnical && (
          <TabsContent value="technical">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('detail.technicalSpecs')}</CardTitle></CardHeader>
              <CardContent>
                {device.technicalSpecifications ? (
                  <pre className="bg-muted p-4 rounded-md text-xs font-mono overflow-auto max-h-96">
                    {JSON.stringify(device.technicalSpecifications, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-sm">{t('detail.noSpecs')}</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* 3. Service Tickets History Tab */}
        <TabsContent value="tickets">
          <DeviceTicketsTab
            tickets={allTickets}
            deviceId={device.id}
            deviceName={device.name}
          />
        </TabsContent>

        {/* 4. Maintenance Tab */}
        {showMaintenance && (
          <TabsContent value="maintenance">
            <DeviceMaintenanceTab
              maintenanceTasks={maintenanceTasks}
              deviceId={device.id}
            />
          </TabsContent>
        )}

        {/* 4. Signatures & Approvals Tab */}
        {showSignatures && (
          <TabsContent value="signatures">
            <DeviceSignaturesTab
              signatures={signatures}
              signatureEvents={signatureEvents}
            />
          </TabsContent>
        )}

        {/* 5. Status History Tab */}
        {showStatusHistory && (
          <TabsContent value="status-history">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('detail.statusHistory')}</CardTitle></CardHeader>
              <CardContent>
                <DeviceStatusTimeline entries={statusHistory as any} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* 6. Location Transfer History Tab */}
        {showLocationHistory && (
          <TabsContent value="location-history">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('detail.locationHistory')}</CardTitle></CardHeader>
              <CardContent>
                <DeviceLocationTimeline entries={locationHistory as any} />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* 7. Documents Tab */}
        {showDocuments && (
          <TabsContent value="documents">
            <DeviceDocumentsTab
              documents={documents}
              deviceId={device.id}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
