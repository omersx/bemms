import { getDevices } from "@/lib/actions/devices"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/shared/data-table"
import { DeviceStatusBadge, CriticalityBadge } from "@/components/devices/device-badges"
import { Button } from "@/components/ui/button"
import { Plus, QrCode } from "lucide-react"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

export const dynamic = 'force-dynamic'

export default async function DevicesPage() {
  const result = await getDevices()
  const devicesList = (result?.success && Array.isArray(result.data)) ? result.data : []
  const t = await getTranslations("devices")
  const tc = await getTranslations("common")

  const columns = [
    { key: "internalCode", header: t("columns.code"), render: (item: any) => (
      <Link href={`/devices/${item.id}`} className="text-primary hover:underline font-mono text-sm">
        {item.internalCode}
      </Link>
    )},
    { key: "name", header: t("columns.name"), render: (item: any) => (
      <Link href={`/devices/${item.id}`} className="font-medium hover:underline">
        {item.name}
      </Link>
    )},
    { key: "assetNumber", header: t("columns.assetNumber") },
    { key: "category", header: t("columns.category"), render: (item: any) => item.deviceCategory?.name || "—" },
    { key: "manufacturer", header: t("columns.manufacturer"), render: (item: any) => item.manufacturer?.name || "—" },
    { key: "department", header: t("columns.department"), render: (item: any) => (
      <span className="text-sm">
        {[item.hospital?.name, item.department?.name].filter(Boolean).join(" / ") || "—"}
      </span>
    )},
    { key: "location", header: t("columns.location"), render: (item: any) => item.location?.name || item.exactLocationDescription || "—" },
    { key: "status", header: t("columns.status"), render: (item: any) => <DeviceStatusBadge status={item.currentStatusCode} /> },
    { key: "criticality", header: t("columns.criticality"), render: (item: any) => <CriticalityBadge level={item.criticalityLevel} /> },
    { key: "actions", header: "", render: (item: any) => (
      <div className="flex gap-1">
        <Button asChild variant="ghost" size="sm" title={t("qr.printQr")}>
          <Link href={`/devices/${item.id}/qr`}>
            <QrCode className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("inventoryTitle")}
        description={t("inventorySubtitle")}
      >
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/scan">
              <QrCode className="w-4 h-4 me-2" />
              {t("qr.scanQr")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/devices/new">
              <Plus className="w-4 h-4 me-2" />
              {t("addDevice")}
            </Link>
          </Button>
        </div>
      </PageHeader>

      <DataTable
        data={devicesList}
        columns={columns}
        searchKey="name"
        searchPlaceholder={t("searchPlaceholder")}
      />
    </div>
  )
}


