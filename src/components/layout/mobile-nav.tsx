'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, QrCode, PlusCircle, Menu, TicketCheck, Route, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NavBadge, type NavBadgeConfig } from './nav-badge'
import { useNavCounts } from '@/components/providers/nav-counts-provider'
import { useTranslations } from 'next-intl'

interface MobileTab {
  href: string;
  labelKey: string;
  defaultLabel: string;
  icon: any;
  badgeKey?: 'notifications' | 'triage' | 'tickets' | 'maintenance' | 'workOrders' | 'pmPlans' | string;
  badgeConfig?: Partial<NavBadgeConfig>;
}

interface MobileNavProps {
  roles?: string[];
}

export function MobileNav({ roles = [] }: MobileNavProps) {
  const pathname = usePathname()
  const t = useTranslations('common')
  const { resolveBadge } = useNavCounts()

  const staffRoles = ['STAFF', 'DEPT_MGR'];
  const engineerRoles = ['BIOMED_ENG', 'BIOMED_TECH'];
  const adminManagerRoles = ['SYS_ADMIN', 'ORG_ADMIN', 'HOSP_ADMIN', 'BIOMED_MGR', 'AUDITOR'];

  const hasStaff = roles.some(r => staffRoles.includes(r));
  const hasEngineer = roles.some(r => engineerRoles.includes(r));
  const hasAdminManager = roles.some(r => adminManagerRoles.includes(r));
  const isStaffOnly = hasStaff && !hasEngineer && !hasAdminManager;

  const staffTabs: MobileTab[] = [
    { href: '/dashboard', labelKey: 'nav.home', defaultLabel: 'Home', icon: Home },
    { href: '/scan', labelKey: 'nav.scan', defaultLabel: 'Scan', icon: QrCode },
    { href: '/tickets/create', labelKey: 'nav.report', defaultLabel: 'Report', icon: PlusCircle },
    { href: '/tickets', labelKey: 'nav.tickets', defaultLabel: 'Tickets', icon: TicketCheck, badgeKey: 'tickets' },
    { href: '/more', labelKey: 'nav.more', defaultLabel: 'More', icon: Menu, badgeKey: 'notifications' },
  ]

  const engineerTabs: MobileTab[] = [
    { href: '/dashboard', labelKey: 'nav.home', defaultLabel: 'Home', icon: Home },
    { href: '/rounds', labelKey: 'nav.round', defaultLabel: 'Round', icon: Route },
    { href: '/scan', labelKey: 'nav.scan', defaultLabel: 'Scan', icon: QrCode },
    { href: '/tickets', labelKey: 'nav.tickets', defaultLabel: 'Tickets', icon: TicketCheck, badgeKey: 'tickets' },
    { href: '/more', labelKey: 'nav.more', defaultLabel: 'More', icon: Menu, badgeKey: 'notifications' },
  ]

  const fullTabs: MobileTab[] = [
    { href: '/dashboard', labelKey: 'nav.home', defaultLabel: 'Home', icon: Home },
    { href: '/scan', labelKey: 'nav.scan', defaultLabel: 'Scan', icon: QrCode },
    { href: '/tickets/create', labelKey: 'nav.report', defaultLabel: 'Report', icon: PlusCircle },
    { href: '/maintenance', labelKey: 'nav.maintenance', defaultLabel: 'Maintenance', icon: Wrench, badgeKey: 'maintenance' },
    { href: '/more', labelKey: 'nav.more', defaultLabel: 'More', icon: Menu, badgeKey: 'notifications' },
  ]

  const tabs = isStaffOnly ? staffTabs : hasEngineer && !hasAdminManager ? engineerTabs : fullTabs;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (pathname.startsWith(tab.href + '/') && tab.href !== '/dashboard')
          const badge = resolveBadge(tab.badgeKey, tab.badgeConfig, { isCollapsed: true })
          const label = t(tab.labelKey as any) || tab.defaultLabel

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full min-w-[44px] min-h-[44px] gap-1 relative",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <tab.icon className={cn("h-5 w-5", active && "fill-primary/20")} />
                {badge && (
                  <NavBadge {...badge} position="icon-corner" />
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
