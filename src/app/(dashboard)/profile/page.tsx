import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/actions/users';
import { PageHeader } from '@/components/shared/page-header';
import { UserProfileView } from '@/components/profile/user-profile-view';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const t = await getTranslations('profile');
  const profileRes = await getCurrentUserProfile();
  if (!profileRes.success || !profileRes.data) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
      />
      <UserProfileView profile={profileRes.data} />
    </div>
  );
}
