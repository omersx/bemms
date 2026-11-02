import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { engineerRounds, roundDepartmentVisits } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const roundId = searchParams.get('roundId');
  const user = session.user as any;
  const orgId = user.organizationId;

  try {
    // Mode 1: Single Round Detail Sync (/rounds/[id])
    if (roundId) {
      const round = await db.query.engineerRounds.findFirst({
        where: eq(engineerRounds.id, roundId),
        columns: {
          id: true,
          status: true,
          completedDepartments: true,
          totalDepartments: true,
          totalIssuesReported: true,
          totalNotes: true,
          updatedAt: true,
        },
      });

      if (!round) {
        return NextResponse.json({ error: 'Round not found' }, { status: 404 });
      }

      const completedVisits = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(roundDepartmentVisits)
        .where(
          and(
            eq(roundDepartmentVisits.roundId, roundId),
            eq(roundDepartmentVisits.status, 'completed')
          )
        );

      const completedCount = completedVisits[0]?.count ?? round.completedDepartments;
      const roundTimestamp = round.updatedAt ? new Date(round.updatedAt).getTime() : 0;
      const signature = `detail_${round.id}_${round.status}_${completedCount}_${round.totalIssuesReported}_${round.totalNotes}_${roundTimestamp}`;

      return NextResponse.json({
        roundId: round.id,
        status: round.status,
        completedDepartments: completedCount,
        totalDepartments: round.totalDepartments,
        totalIssuesReported: round.totalIssuesReported,
        totalNotes: round.totalNotes,
        updatedAt: round.updatedAt ? new Date(round.updatedAt).toISOString() : null,
        syncSignature: signature,
      });
    }

    // Mode 2: Organization Today's Rounds Sync (/rounds and /dashboard)
    const today = new Date().toISOString().split('T')[0];

    const conditions = [eq(engineerRounds.roundDate, today)];
    if (orgId) {
      conditions.push(eq(engineerRounds.organizationId, orgId));
    }

    const todayRounds = await db.query.engineerRounds.findMany({
      where: and(...conditions),
      columns: {
        id: true,
        engineerId: true,
        status: true,
        completedDepartments: true,
        totalDepartments: true,
        totalIssuesReported: true,
        totalNotes: true,
        updatedAt: true,
      },
    });

    const totalRounds = todayRounds.length;
    const inProgress = todayRounds.filter((r) => r.status === 'in_progress').length;
    const completed = todayRounds.filter((r) => r.status === 'completed').length;
    const totalIssues = todayRounds.reduce((acc, r) => acc + (r.totalIssuesReported || 0), 0);
    const totalDeptsVisited = todayRounds.reduce((acc, r) => acc + (r.completedDepartments || 0), 0);
    const totalNotes = todayRounds.reduce((acc, r) => acc + (r.totalNotes || 0), 0);

    const maxUpdatedAt = todayRounds.reduce((max, r) => {
      const t = r.updatedAt ? new Date(r.updatedAt).getTime() : 0;
      return t > max ? t : max;
    }, 0);

    const myRound = todayRounds.find((r) => r.engineerId === user.id);
    const myRoundSig = myRound
      ? `${myRound.id}_${myRound.status}_${myRound.completedDepartments}`
      : 'none';

    const signature = `today_${today}_${totalRounds}_${inProgress}_${completed}_${totalDeptsVisited}_${totalIssues}_${totalNotes}_${maxUpdatedAt}_my:${myRoundSig}`;

    return NextResponse.json({
      date: today,
      roundsCount: totalRounds,
      inProgressCount: inProgress,
      completedCount: completed,
      totalCompletedDepts: totalDeptsVisited,
      totalIssuesReported: totalIssues,
      totalNotes,
      latestUpdatedAt: maxUpdatedAt ? new Date(maxUpdatedAt).toISOString() : null,
      myRound: myRound
        ? {
            id: myRound.id,
            status: myRound.status,
            completedDepartments: myRound.completedDepartments,
            updatedAt: myRound.updatedAt ? new Date(myRound.updatedAt).toISOString() : null,
          }
        : null,
      syncSignature: signature,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
