/**
 * BEMMS AI Knowledge Service
 *
 * Server-side service that searches finalized maintenance records and returns
 * structured historical cases with source links. This is the reusable boundary
 * between BEMMS records and any AI integration.
 *
 * Design principles:
 * 1. BEMMS remains the system of record — this is a read model.
 * 2. Authorization happens before retrieval — scope is resolved server-side.
 * 3. Read-only — it can search, summarize, compare, and cite. It must not
 *    change ticket state, device state, maintenance records, or signatures.
 * 4. Evidence must be traceable — every result includes record IDs and links.
 * 5. No direct database access from an agent — agents use this service.
 * 6. Unknown remains unknown — missing fields are not fabricated.
 *
 * The same service can be used by:
 * - the in-app copilot
 * - a future MCP connector
 * - a REST API for internal integrations
 * - ordinary BEMMS search screens
 */

import { db } from '@/lib/db';
import {
  maintenanceRecords,
  maintenanceTasks,
  serviceTickets,
  devices,
  manufacturers,
  deviceModels,
  deviceCategories,
  maintenanceParts,
  maintenanceChecklistResults,
} from '@/lib/db/schema';
import { eq, and, or, ilike, desc, inArray, sql } from 'drizzle-orm';
import type { SessionUser } from '@/lib/auth/types';
import { resolveUserKnowledgeScope, type ResolvedScope } from './scope';
import type {
  HistoricalMaintenanceCase,
  KnowledgeSearchParams,
  KnowledgeSearchResult,
  ChecklistResultSummary,
  PartSummary,
} from './types';
import { getLogger } from '@/lib/logger';

const log = getLogger('ai:knowledge');

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;

/**
 * Search historical finalized maintenance cases within the user's authorized scope.
 *
 * @param actor - The authenticated BEMMS session user. Scope is resolved from this.
 * @param params - Search context (current page) and query filters.
 * @returns Structured historical cases with source links, or empty list on no match.
 */
export async function searchHistoricalMaintenanceCases(
  actor: SessionUser,
  params: KnowledgeSearchParams,
): Promise<KnowledgeSearchResult> {
  const startTime = Date.now();
  const { context, query } = params;
  const limit = Math.min(Math.max(query.limit || DEFAULT_LIMIT, 1), MAX_LIMIT);

  // 1. Resolve the actor's authorized scope — never trust client input
  const scope = await resolveUserKnowledgeScope(actor);

  if (!scope.organizationId) {
    log.warn('Knowledge search denied: user has no organization', { userId: actor.id });
    return { cases: [], totalMatched: 0, searchedAt: new Date().toISOString() };
  }

  // 2. Build scope-restricted query conditions
  const conditions = buildScopeConditions(scope, context, query);

  // 3. Execute the scoped query
  const records = await db
    .select({
      // Maintenance record fields
      recordId: maintenanceRecords.id,
      recordNumber: maintenanceRecords.recordNumber,
      maintenanceType: maintenanceRecords.maintenanceType,
      technicalCategory: maintenanceRecords.technicalCategory,
      diagnosis: maintenanceRecords.diagnosis,
      rootCause: maintenanceRecords.rootCause,
      workPerformed: maintenanceRecords.workPerformed,
      findings: maintenanceRecords.findings,
      recommendations: maintenanceRecords.recommendations,
      finalResultCode: maintenanceRecords.finalResultCode,
      finalDeviceStatusCode: maintenanceRecords.finalDeviceStatusCode,
      completedAt: maintenanceRecords.completedAt,
      // Maintenance task fields
      taskId: maintenanceTasks.id,
      taskNumber: maintenanceTasks.taskNumber,
      taskTitle: maintenanceTasks.title,
      taskDescription: maintenanceTasks.description,
      ticketId: maintenanceTasks.serviceTicketId,
      // Device fields
      deviceId: devices.id,
      deviceName: devices.name,
      deviceInternalCode: devices.internalCode,
      deviceAssetNumber: devices.assetNumber,
      deviceCriticality: devices.criticalityLevel,
      deviceRiskClassification: devices.riskClassification,
      // Manufacturer fields
      manufacturerName: manufacturers.name,
      // Device model fields
      modelName: deviceModels.modelName,
      modelNumber: deviceModels.modelNumber,
      // Category fields
      categoryName: deviceCategories.name,
    })
    .from(maintenanceRecords)
    .innerJoin(maintenanceTasks, eq(maintenanceRecords.maintenanceTaskId, maintenanceTasks.id))
    .innerJoin(devices, eq(maintenanceRecords.deviceId, devices.id))
    .leftJoin(manufacturers, eq(devices.manufacturerId, manufacturers.id))
    .leftJoin(deviceModels, eq(devices.deviceModelId, deviceModels.id))
    .leftJoin(deviceCategories, eq(devices.deviceCategoryId, deviceCategories.id))
    .where(and(...conditions))
    .orderBy(desc(maintenanceRecords.completedAt))
    .limit(limit);

  // 4. Enrich each record with parts and checklist results
  const cases: HistoricalMaintenanceCase[] = await Promise.all(
    records.map(async (row) => {
      const [parts, checklistResults, ticket] = await Promise.all([
        loadParts(row.recordId),
        loadChecklistResults(row.taskId),
        row.ticketId ? loadTicketSummary(row.ticketId) : Promise.resolve(null),
      ]);

      return mapToCase(row, parts, checklistResults, ticket);
    })
  );

  const latencyMs = Date.now() - startTime;
  log.info('Knowledge search completed', {
    userId: actor.id,
    organizationId: scope.organizationId,
    resultsCount: cases.length,
    latencyMs,
  });

  return {
    cases,
    totalMatched: cases.length,
    searchedAt: new Date().toISOString(),
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function buildScopeConditions(
  scope: ResolvedScope,
  context: KnowledgeSearchParams['context'],
  query: KnowledgeSearchParams['query'],
) {
  const conditions: ReturnType<typeof eq>[] = [];

  // ALWAYS filter by organization — non-negotiable
  conditions.push(eq(maintenanceRecords.organizationId, scope.organizationId));

  // ALWAYS filter to finalized records only
  conditions.push(eq(maintenanceRecords.isFinalized, true));

  // Apply hospital/department scope restrictions (unless unrestricted)
  if (!scope.isUnrestricted) {
    const scopeFilters: ReturnType<typeof eq>[] = [];

    if (scope.hospitalIds.length > 0) {
      scopeFilters.push(inArray(maintenanceTasks.hospitalId, scope.hospitalIds));
    }
    if (scope.departmentIds.length > 0) {
      scopeFilters.push(inArray(maintenanceTasks.departmentId, scope.departmentIds));
    }

    // If user has specific scopes, apply them; if none, deny access
    if (scopeFilters.length > 0) {
      conditions.push(or(...scopeFilters)!);
    } else {
      // User has no scopes — return no results (push an always-false condition)
      conditions.push(sql`false`);
    }
  }

  // Context filters — narrow to current page entity
  if (context.currentDeviceId) {
    conditions.push(eq(maintenanceRecords.deviceId, context.currentDeviceId));
  }

  // Query filters
  if (query.manufacturerId) {
    conditions.push(eq(devices.manufacturerId, query.manufacturerId));
  }
  if (query.modelId) {
    conditions.push(eq(devices.deviceModelId, query.modelId));
  }
  if (query.deviceCategoryId) {
    conditions.push(eq(devices.deviceCategoryId, query.deviceCategoryId));
  }
  if (query.technicalCategory) {
    conditions.push(eq(maintenanceRecords.technicalCategory, query.technicalCategory as any));
  }
  if (query.maintenanceType) {
    conditions.push(eq(maintenanceRecords.maintenanceType, query.maintenanceType as any));
  }

  // Text search across diagnostic/description fields
  if (query.text && query.text.trim().length > 0) {
    const searchTerm = `%${query.text.trim()}%`;
    conditions.push(
      or(
        ilike(maintenanceRecords.diagnosis, searchTerm),
        ilike(maintenanceRecords.rootCause, searchTerm),
        ilike(maintenanceRecords.findings, searchTerm),
        ilike(maintenanceRecords.workPerformed, searchTerm),
        ilike(maintenanceRecords.recommendations, searchTerm),
        ilike(maintenanceTasks.title, searchTerm),
        ilike(maintenanceTasks.description, searchTerm),
      )!,
    );
  }

  return conditions;
}

async function loadParts(maintenanceRecordId: string): Promise<PartSummary[]> {
  const parts = await db
    .select({
      partNumber: maintenanceParts.partNumber,
      partName: maintenanceParts.partName,
      quantity: maintenanceParts.quantity,
    })
    .from(maintenanceParts)
    .where(eq(maintenanceParts.maintenanceRecordId, maintenanceRecordId));

  return parts;
}

async function loadChecklistResults(maintenanceTaskId: string): Promise<ChecklistResultSummary[]> {
  const results = await db
    .select({
      label: maintenanceChecklistResults.itemLabelSnapshot,
      result: maintenanceChecklistResults.resultCode,
      measuredValue: maintenanceChecklistResults.measuredValue,
      unit: maintenanceChecklistResults.unit,
      notes: maintenanceChecklistResults.notes,
    })
    .from(maintenanceChecklistResults)
    .where(eq(maintenanceChecklistResults.maintenanceTaskId, maintenanceTaskId))
    .orderBy(maintenanceChecklistResults.itemOrder);

  return results.map((r) => ({
    label: r.label,
    result: r.result ?? undefined,
    measuredValue: r.measuredValue ?? undefined,
    unit: r.unit ?? undefined,
    notes: r.notes ?? undefined,
  }));
}

async function loadTicketSummary(ticketId: string) {
  const ticket = await db
    .select({
      id: serviceTickets.id,
      ticketNumber: serviceTickets.ticketNumber,
      title: serviceTickets.title,
      description: serviceTickets.description,
      reportedProblemCategory: serviceTickets.reportedProblemCategory,
      reportedImpact: serviceTickets.reportedImpact,
    })
    .from(serviceTickets)
    .where(eq(serviceTickets.id, ticketId))
    .limit(1);

  return ticket[0] || null;
}

function mapToCase(
  row: any,
  parts: PartSummary[],
  checklistResults: ChecklistResultSummary[],
  ticket: any | null,
): HistoricalMaintenanceCase {
  // Detect data quality limitations
  const limitations: string[] = [];
  if (!row.diagnosis) limitations.push('Diagnosis was not recorded.');
  if (!row.rootCause) limitations.push('Root cause was not recorded.');
  if (!row.workPerformed) limitations.push('Work performed was not recorded.');
  if (!row.findings) limitations.push('Findings were not recorded.');
  if (checklistResults.length === 0) limitations.push('No checklist verification results recorded.');

  return {
    source: {
      maintenanceRecordId: row.recordId,
      maintenanceRecordNumber: row.recordNumber,
      maintenanceTaskId: row.taskId,
      maintenanceTaskNumber: row.taskNumber,
      ticketId: ticket?.id,
      ticketNumber: ticket?.ticketNumber,
      sourceUrl: `/maintenance/tasks/${row.taskId}`,
      finalizedAt: row.completedAt?.toISOString(),
    },
    device: {
      id: row.deviceId,
      name: row.deviceName,
      internalCode: row.deviceInternalCode,
      assetNumber: row.deviceAssetNumber,
      manufacturer: row.manufacturerName ?? undefined,
      model: row.modelName ?? undefined,
      modelNumber: row.modelNumber ?? undefined,
      category: row.categoryName ?? undefined,
      criticality: row.deviceCriticality ?? undefined,
      riskClassification: row.deviceRiskClassification ?? undefined,
    },
    report: ticket
      ? {
          title: ticket.title ?? undefined,
          description: ticket.description ?? undefined,
          reportedProblemCategory: ticket.reportedProblemCategory ?? undefined,
          reportedImpact: ticket.reportedImpact ?? undefined,
        }
      : undefined,
    engineering: {
      maintenanceType: row.maintenanceType,
      technicalCategory: row.technicalCategory ?? undefined,
      diagnosis: row.diagnosis ?? undefined,
      rootCause: row.rootCause ?? undefined,
      findings: row.findings ?? undefined,
      workPerformed: row.workPerformed ?? undefined,
      recommendations: row.recommendations ?? undefined,
    },
    verification: {
      checklistResults,
      finalResult: row.finalResultCode,
      finalDeviceStatus: row.finalDeviceStatusCode,
    },
    parts,
    quality: {
      state: 'historical_finalized',
      limitations,
    },
  };
}
