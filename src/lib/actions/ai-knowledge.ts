'use server';

/**
 * BEMMS AI — Knowledge Server Actions
 *
 * Server actions for AI knowledge retrieval and copilot interaction.
 * Follows the same patterns as all other BEMMS server actions:
 * requireAuth() → Zod validate → scope check → execute → audit.
 */

import { requireAuth } from '@/lib/auth/rbac';
import { searchHistoricalMaintenanceCases } from '@/lib/ai/knowledge/service';
import { processCopilotRequest } from '@/lib/ai/orchestrator/orchestrator';
import { knowledgeSearchSchema, copilotMessageSchema } from '@/lib/validators/ai';
import { createAgentAuditEvent } from '@/lib/ai/audit';
import { db } from '@/lib/db';
import { agentSessions, agentMessages } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

// ── Knowledge Search ──────────────────────────────────────────────────────────

/**
 * Search finalized historical maintenance cases.
 * Returns structured cases with source links. No model involved.
 */
export async function searchKnowledgeCases(input: z.infer<typeof knowledgeSearchSchema>) {
  const user = await requireAuth();

  try {
    const data = knowledgeSearchSchema.parse(input);

    const result = await searchHistoricalMaintenanceCases(user, {
      context: data.context,
      query: data.query,
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Knowledge search failed:', error);
    return { success: false, error: error.message };
  }
}

// ── Copilot Chat ──────────────────────────────────────────────────────────────

/**
 * Send a message to the Engineering Copilot.
 * Retrieves evidence, optionally calls a model, returns a cited response.
 */
export async function sendCopilotMessage(input: z.infer<typeof copilotMessageSchema>) {
  const user = await requireAuth();

  try {
    const data = copilotMessageSchema.parse(input);

    const response = await processCopilotRequest(user, {
      message: data.message,
      sessionId: data.sessionId,
      context: data.context,
    });

    return { success: true, data: response };
  } catch (error: any) {
    console.error('Copilot message failed:', error);
    return { success: false, error: error.message };
  }
}

// ── Session Management ────────────────────────────────────────────────────────

/**
 * Get the user's active copilot sessions.
 */
export async function getCopilotSessions() {
  const user = await requireAuth();

  try {
    const sessions = await db.query.agentSessions.findMany({
      where: and(
        eq(agentSessions.userId, user.id),
        eq(agentSessions.status, 'active'),
      ),
      orderBy: [desc(agentSessions.updatedAt)],
      columns: {
        id: true,
        title: true,
        contextType: true,
        contextId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return { success: true, data: sessions };
  } catch (error: any) {
    console.error('Failed to get copilot sessions:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get messages for a specific copilot session.
 */
export async function getCopilotSessionMessages(sessionId: string) {
  const user = await requireAuth();

  try {
    // Verify session ownership
    const session = await db.query.agentSessions.findFirst({
      where: and(
        eq(agentSessions.id, sessionId),
        eq(agentSessions.userId, user.id),
      ),
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const messages = await db.query.agentMessages.findMany({
      where: eq(agentMessages.sessionId, sessionId),
      orderBy: [agentMessages.createdAt],
      columns: {
        id: true,
        role: true,
        content: true,
        sourceRecordIds: true,
        modelId: true,
        createdAt: true,
      },
    });

    return { success: true, data: { session, messages } };
  } catch (error: any) {
    console.error('Failed to get session messages:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Archive a copilot session.
 */
export async function archiveCopilotSession(sessionId: string) {
  const user = await requireAuth();

  try {
    // Verify session ownership
    const session = await db.query.agentSessions.findFirst({
      where: and(
        eq(agentSessions.id, sessionId),
        eq(agentSessions.userId, user.id),
      ),
    });

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    await db.update(agentSessions)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(agentSessions.id, sessionId));

    await createAgentAuditEvent({
      organizationId: session.organizationId,
      userId: user.id,
      sessionId,
      eventType: 'session_archived',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to archive copilot session:', error);
    return { success: false, error: error.message };
  }
}
