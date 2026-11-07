'use client';

import Link from "next/link";
import { QrCode, PlusCircle, TicketCheck, Wrench, Users, MonitorSmartphone, Monitor, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface ActionButtonsProps {
  role: string;
  triageCount?: number;
}

export function ActionButtons({ role, triageCount = 0 }: ActionButtonsProps) {
  const t = useTranslations('common');
  const tDash = useTranslations('dashboard');
  const normalizedRole = (role || '').toUpperCase();
  const isStaff = normalizedRole === 'STAFF' || normalizedRole === 'DEPT_MGR';
  const isBiomed = normalizedRole.startsWith('BIOMED') || normalizedRole === 'BME';
  const isAdmin = normalizedRole.includes('ADMIN');

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Button asChild size="lg" className="w-full sm:w-auto min-h-[44px]">
        <Link href="/scan">
          <QrCode className="me-2 h-5 w-5" />
          {tDash('quickActions.scanQr')}
        </Link>
      </Button>

      {isStaff && (
        <>
          <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto min-h-[44px]">
            <Link href="/tickets/create">
              <PlusCircle className="me-2 h-5 w-5" />
              {t('nav.reportProblem')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px]">
            <Link href="/my-department">
              <Building2 className="me-2 h-5 w-5" />
              {t('nav.myDepartment')}
            </Link>
          </Button>
        </>
      )}

      {isBiomed && (
        <>
          <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto min-h-[44px] relative">
            <Link href="/tickets">
              <TicketCheck className="me-2 h-5 w-5" />
              {t('nav.helpdeskTickets')}
              {triageCount > 0 && (
                <Badge variant="destructive" className="ms-2 text-xs">
                  {triageCount} {t('status.new')}
                </Badge>
              )}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px]">
            <Link href="/maintenance">
              <Wrench className="me-2 h-5 w-5" />
              {t('nav.maintenance')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px]">
            <Link href="/devices">
              <Monitor className="me-2 h-5 w-5" />
              {t('nav.devices')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px]">
            <Link href="/departments">
              <Building2 className="me-2 h-5 w-5" />
              {t('nav.departments')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px]">
            <Link href="/team">
              <Users className="me-2 h-5 w-5" />
              {t('nav.engineeringTeam')}
            </Link>
          </Button>
        </>
      )}

      {isAdmin && (
        <>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px]">
            <Link href="/admin/users">
              <Users className="me-2 h-5 w-5" />
              {t('nav.administration')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto min-h-[44px]">
            <Link href="/devices">
              <MonitorSmartphone className="me-2 h-5 w-5" />
              {t('nav.devices')}
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
