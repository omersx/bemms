/**
 * BEMMS AI — Knowledge Search API Route
 *
 * POST /api/ai/knowledge/search-cases
 *
 * Private BEMMS endpoint for knowledge retrieval.
 * Validates with Zod, enforces auth and scope, returns structured cases.
 *
 * Response rules:
 * - Maximum result count: 5-10
 * - Cache-Control: private, no-store (user-scoped results)
 * - Returns no model-generated prose from this endpoint
 * - Returns empty list for no match, not an invented answer
 * - Returns authorization error without disclosing whether inaccessible records exist
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchHistoricalMaintenanceCases } from '@/lib/ai/knowledge/service';
import { knowledgeSearchSchema } from '@/lib/validators/ai';
import { createAgentAuditEvent } from '@/lib/ai/audit';
import type { SessionUser } from '@/lib/auth/types';
import { getLogger } from '@/lib/logger';

const log = getLogger('api:ai:knowledge');

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await auth();
    const user = session?.user as SessionUser | undefined;

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'Organization required' },
        { status: 403 },
      );
    }

    // 2. Parse and validate input
    const body = await request.json();
    const parseResult = knowledgeSearchSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    // 3. Execute scoped search
    const startTime = Date.now();
    const result = await searchHistoricalMaintenanceCases(user, parseResult.data);
    const latencyMs = Date.now() - startTime;

    // 4. Audit the API call
    await createAgentAuditEvent({
      organizationId: user.organizationId,
      userId: user.id,
      eventType: 'knowledge_search',
      sourceRecordIds: result.cases.map((c) => c.source.maintenanceRecordId),
      latencyMs,
      metadata: {
        source: 'api',
        casesFound: result.cases.length,
      },
    });

    // 5. Return with cache control
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: any) {
    log.error('Knowledge search API error', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
