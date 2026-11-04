/**
 * BEMMS AI Knowledge Service — Scope Resolution
 *
 * Resolves the authenticated user's access scopes for knowledge retrieval.
 * The knowledge service uses these scopes to filter maintenance records,
 * ensuring organizational and operational-scope isolation.
 *
 * Rules:
 * - SYS_ADMIN: unrestricted within the platform
 * - Other roles: restricted to their assigned access scopes
 * - Organization ID is always resolved server-side, never from client input
 */

import { db } from '@/lib/db';
import { userAccessScopes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { SessionUser } from '@/lib/auth/types';

export type ResolvedScope = {
  organizationId: string;
  hospitalIds: string[];
  departmentIds: string[];
  locationIds: string[];
  isUnrestricted: boolean;
};

/**
 * Resolve the effective data scope for a knowledge service query.
 *
 * @param user - The authenticated BEMMS session user
 * @returns The resolved scope for filtering records
 */
export async function resolveUserKnowledgeScope(user: SessionUser): Promise<ResolvedScope> {
  // SYS_ADMIN gets organization-wide access (but still needs an org context)
  if (user.roles.includes('SYS_ADMIN')) {
    return {
      organizationId: user.organizationId || '',
      hospitalIds: [],
      departmentIds: [],
      locationIds: [],
      isUnrestricted: true,
    };
  }

  if (!user.organizationId) {
    return {
      organizationId: '',
      hospitalIds: [],
      departmentIds: [],
      locationIds: [],
      isUnrestricted: false,
    };
  }

  // Load the user's active access scopes from the database
  const scopes = await db.query.userAccessScopes.findMany({
    where: and(
      eq(userAccessScopes.userId, user.id),
      eq(userAccessScopes.status, 'active'),
    ),
  });

  const hospitalIds = new Set<string>();
  const departmentIds = new Set<string>();
  const locationIds = new Set<string>();
  let hasOrgScope = false;

  for (const scope of scopes) {
    // Organization-level scope = full access within the org
    if (scope.scopeType === 'organization') {
      hasOrgScope = true;
    }
    if (scope.hospitalId) hospitalIds.add(scope.hospitalId);
    if (scope.departmentId) departmentIds.add(scope.departmentId);
    if (scope.locationId) locationIds.add(scope.locationId);
  }

  return {
    organizationId: user.organizationId,
    hospitalIds: Array.from(hospitalIds),
    departmentIds: Array.from(departmentIds),
    locationIds: Array.from(locationIds),
    isUnrestricted: hasOrgScope,
  };
}
