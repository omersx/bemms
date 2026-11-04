/**
 * BEMMS AI Audit — Agent event logging
 *
 * Records metadata about AI operations into the dedicated agent_audit_events table.
 * Complements the existing audit_logs system with AI-specific fields.
 *
 * Never throws — audit logging must not break the main flow.
 */

import { db } from '@/lib/db';
import { agentAuditEvents } from '@/lib/db/schema';
import { getLogger } from '@/lib/logger';

const log = getLogger('ai:audit');

export interface AgentAuditEntry {
  organizationId: string;
  userId: string;
  sessionId?: string;
  eventType: 'knowledge_search' | 'model_call' | 'tool_call' | 'session_created' | 'session_archived' | 'error';
  contextType?: string;
  contextId?: string;
  toolName?: string;
  sourceRecordIds?: string[];
  modelId?: string;
  latencyMs?: number;
  errorCategory?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an AI audit event. Fails gracefully — never interrupts the calling workflow.
 */
export async function createAgentAuditEvent(entry: AgentAuditEntry): Promise<void> {
  try {
    await db.insert(agentAuditEvents).values({
      organizationId: entry.organizationId,
      userId: entry.userId,
      sessionId: entry.sessionId || null,
      eventType: entry.eventType,
      contextType: entry.contextType || null,
      contextId: entry.contextId || null,
      toolName: entry.toolName || null,
      sourceRecordIds: entry.sourceRecordIds || null,
      modelId: entry.modelId || null,
      latencyMs: entry.latencyMs || null,
      errorCategory: entry.errorCategory || null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
    log.debug('Agent audit event created', { eventType: entry.eventType, userId: entry.userId });
  } catch (err) {
    log.error('Failed to create agent audit event', err, { eventType: entry.eventType });
    // Never throw — audit logging should never break the main flow
  }
}
