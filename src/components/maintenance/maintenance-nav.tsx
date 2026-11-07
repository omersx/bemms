"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Wrench,
  ClipboardList,
  Calendar,
  CheckSquare,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

interface MaintenanceNavProps {
  className?: string
  showNewTaskButton?: boolean
}

export function MaintenanceNav({
  className,
  showNewTaskButton = true,
}: MaintenanceNavProps) {
  const pathname = usePathname()
  const t = useTranslations("maintenance")

  const tabs = [
    {
      href: "/maintenance",
      label: t("nav.overview"),
      icon: Wrench,
      exact: true,
    },
    {
      href: "/maintenance/tasks",
      label: t("nav.tasks"),
      icon: ClipboardList,
      exact: false,
    },
    {
      href: "/maintenance/plans",
      label: t("nav.plans"),
      icon: Calendar,
      exact: false,
    },
    {
      href: "/maintenance/checklists",
      label: t("nav.checklists"),
      icon: CheckSquare,
      exact: false,
    },
  ]

  const isTabActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href
    }
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3 mb-6",
        className
      )}
    >
      {/* Navigation Tabs */}
      <nav
        aria-label="Maintenance navigation"
        className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5"
      >
        {tabs.map((tab) => {
          const active = isTabActive(tab.href, tab.exact)
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 shrink-0 select-none",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className={cn("w-4 h-4", active ? "text-primary-foreground" : "text-muted-foreground")} />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Action button */}
      {showNewTaskButton && (
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/maintenance/tasks/new">
            <Button size="sm" className="gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" />
              <span>{t("tasks.create")}</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
