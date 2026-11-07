import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getEngineersTeam } from '@/lib/actions/engineers';
import { PageHeader } from '@/components/shared/page-header';
import { StaffEngineerTeamView } from '@/components/team/staff-engineer-team-view';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { UsersRound } from 'lucide-react';
import { hasRole } from '@/lib/auth/rbac';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function EngineeringTeamPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const t = await getTranslations('team');
  const teamRes = await getEngineersTeam();
  const members = teamRes.data || [];
  const userRoles = (session.user as any).roles || [];
  const isBiomedOrAdmin = hasRole(userRoles, 'BIOMED_ENG', 'BIOMED_TECH', 'BIOMED_MGR', 'SYS_ADMIN', 'ORG_ADMIN');

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
      >
        {isBiomedOrAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link href="/team">
              <UsersRound className="w-4 h-4 me-2" />
              {t('dutySchedule')}
            </Link>
          </Button>
        )}
      </PageHeader>
      <StaffEngineerTeamView engineers={members} />
    </div>
  );
}
