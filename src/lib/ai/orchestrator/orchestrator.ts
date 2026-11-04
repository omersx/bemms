/**
 * BEMMS AI — Orchestrator
 *
 * The core agent loop. Receives a user message, resolves context,
 * calls the knowledge service, optionally calls a model provider,
 * and returns a cited response.
 *
 * Current implementation: knowledge-only mode (no model required).
 * When a model provider is configured, it will use the model to
 * summarize and reason about the retrieved evidence.
 *
 * Design rules:
 * - The orchestrator never calls the database directly — it uses tools.
 * - Every response includes source citations from the knowledge service.
 * - The model never invents sources or chooses scopes.
 * - If no model is available, the orchestrator returns structured evidence directly.
 */

import { db } from '@/lib/db';
import { agentSessions, agentMessages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { SessionUser } from '@/lib/auth/types';
import { searchHistoricalMaintenanceCases } from '../knowledge/service';
import { createAgentAuditEvent } from '../audit';
import { getDefaultProvider } from '../providers/registry';
import type {
  CopilotRequest,
  CopilotResponse,
  CopilotMessage,
  CopilotSource,
} from './types';
import type { HistoricalMaintenanceCase } from '../knowledge/types';
import type { ModelMessage } from '../providers/types';
import { getLogger } from '@/lib/logger';

const log = getLogger('ai:orchestrator');

const SYSTEM_PROMPT = `You are the BEMMS Engineering Copilot — a biomedical engineering assistant embedded inside a hospital equipment management system.

Your role:
- Help biomedical engineers find relevant historical maintenance experience from BEMMS records.
- Answer questions about equipment, maintenance history, failure patterns, and past repairs.
- Always cite your sources — every claim must reference a specific BEMMS maintenance record.

Rules:
1. ONLY use information from the retrieved BEMMS records provided to you. Never fabricate data.
2. Clearly distinguish between:
   - KNOWN FACTS: data directly from BEMMS records
   - INFERENCE: your reasoning based on the evidence
   - RECOMMENDATIONS: your suggestions for next steps
3. If the retrieved records do not contain enough information to answer, say so clearly.
4. Never claim a maintenance procedure is manufacturer-approved unless the source explicitly states it.
5. Never invent equipment IDs, maintenance records, or failure histories.
6. Present source record numbers and links for every substantive claim.
7. When data quality is limited (missing diagnosis, root cause, etc.), note the gaps.

You are an assistant, not a replacement for the engineer's judgment.`;

/**
 * Process a copilot request: retrieve evidence, optionally call the model, return cited response.
 */
export async function processCopilotRequest(
  actor: SessionUser,
  request: CopilotRequest,
): Promise<CopilotResponse> {
  const startTime = Date.now();

  if (!actor.organizationId) {
    throw new Error('User has no organization — cannot use the copilot.');
  }

  // 1. Resolve or create session
  const sessionId = await resolveSession(actor, request);

  // 2. Store the user message
  await storeMessage(sessionId, 'user', request.message);

  // 3. Retrieve evidence from the knowledge service
  const evidence = await searchHistoricalMaintenanceCases(actor, {
    context: {
      currentDeviceId: request.context?.type === 'device' ? request.context.id : undefined,
      currentTicketId: request.context?.type === 'ticket' ? request.context.id : undefined,
      currentMaintenanceTaskId: request.context?.type === 'maintenance_task' ? request.context.id : undefined,
    },
    query: {
      text: request.message,
      limit: 5,
    },
  });

  // 4. Build sources for citation
  const sources = buildSources(evidence.cases);

  // 5. Collect all limitations
  const allLimitations = new Set<string>();
  for (const c of evidence.cases) {
    for (const l of c.quality.limitations) {
      allLimitations.add(l);
    }
  }

  // 6. Try to use a model provider, or fall back to structured evidence
  let responseContent: string;
  let modelId: string | undefined;

  const provider = getDefaultProvider();

  if (provider) {
    // Model is available — use it to summarize evidence
    try {
      const modelMessages = buildModelMessages(request.message, evidence.cases, request.context);
      const modelResponse = await provider.generate({
        messages: modelMessages,
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 1500,
      });

      responseContent = modelResponse.content;
      modelId = modelResponse.modelId;

      // Audit the model call
      await createAgentAuditEvent({
        organizationId: actor.organizationId,
        userId: actor.id,
        sessionId,
        eventType: 'model_call',
        modelId: modelResponse.modelId,
        sourceRecordIds: evidence.cases.map((c) => c.source.maintenanceRecordId),
        latencyMs: Date.now() - startTime,
        metadata: {
          tokensUsed: modelResponse.usage?.totalTokens,
          casesProvided: evidence.cases.length,
        },
      });
    } catch (err: any) {
      log.error('Model call failed — falling back to structured evidence', err);
      responseContent = formatStructuredEvidence(evidence.cases, request.message);
    }
  } else {
    // No model available — return structured evidence directly
    responseContent = formatStructuredEvidence(evidence.cases, request.message);
  }

  const latencyMs = Date.now() - startTime;

  // 7. Store the assistant response
  await storeMessage(sessionId, 'assistant', responseContent, {
    sourceRecordIds: evidence.cases.map((c) => c.source.maintenanceRecordId),
    modelId,
  });

  // 8. Audit the knowledge search
  await createAgentAuditEvent({
    organizationId: actor.organizationId,
    userId: actor.id,
    sessionId,
    eventType: 'knowledge_search',
    contextType: request.context?.type,
    contextId: request.context?.id,
    sourceRecordIds: evidence.cases.map((c) => c.source.maintenanceRecordId),
    latencyMs,
    metadata: {
      query: request.message.substring(0, 200), // Truncate for audit
      casesFound: evidence.cases.length,
    },
  });

  return {
    sessionId,
    message: {
      content: responseContent,
      sources,
      limitations: Array.from(allLimitations),
      modelId,
      latencyMs,
    },
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function resolveSession(actor: SessionUser, request: CopilotRequest): Promise<string> {
  if (request.sessionId) {
    // Verify the session belongs to this user and organization
    const existing = await db.query.agentSessions.findFirst({
      where: eq(agentSessions.id, request.sessionId),
    });

    if (existing && existing.userId === actor.id && existing.organizationId === actor.organizationId) {
      // Update the session timestamp
      await db.update(agentSessions)
        .set({ updatedAt: new Date() })
        .where(eq(agentSessions.id, request.sessionId));
      return request.sessionId;
    }
    // Session not found or not owned — create new
    log.warn('Session not found or not authorized — creating new session', {
      requestedSessionId: request.sessionId,
      userId: actor.id,
    });
  }

  // Create a new session
  const [newSession] = await db.insert(agentSessions).values({
    organizationId: actor.organizationId!,
    userId: actor.id,
    title: request.message.substring(0, 100),
    contextType: (request.context?.type as any) || 'general',
    contextId: request.context?.id || null,
    status: 'active',
  }).returning();

  await createAgentAuditEvent({
    organizationId: actor.organizationId!,
    userId: actor.id,
    sessionId: newSession.id,
    eventType: 'session_created',
    contextType: request.context?.type,
    contextId: request.context?.id,
  });

  return newSession.id;
}

async function storeMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string,
  extra?: { sourceRecordIds?: string[]; modelId?: string; tokenCount?: number },
): Promise<void> {
  await db.insert(agentMessages).values({
    sessionId,
    role,
    content,
    sourceRecordIds: extra?.sourceRecordIds || null,
    modelId: extra?.modelId || null,
    tokenCount: extra?.tokenCount || null,
  });
}

function buildSources(cases: HistoricalMaintenanceCase[]): CopilotSource[] {
  const sources: CopilotSource[] = [];

  for (const c of cases) {
    sources.push({
      type: 'maintenance_record',
      id: c.source.maintenanceRecordId,
      label: `${c.source.maintenanceRecordNumber} — ${c.device.name}`,
      url: c.source.sourceUrl,
    });
  }

  return sources;
}

function buildModelMessages(
  userMessage: string,
  cases: HistoricalMaintenanceCase[],
  context?: CopilotRequest['context'],
): ModelMessage[] {
  const messages: ModelMessage[] = [];

  // Build context message with retrieved evidence
  if (cases.length > 0) {
    let evidenceText = '## Retrieved BEMMS Records\n\n';

    if (context?.type && context.id) {
      evidenceText += `Current page context: ${context.type} (${context.label || context.id})\n\n`;
    }

    for (const c of cases) {
      evidenceText += `### Record: ${c.source.maintenanceRecordNumber}\n`;
      evidenceText += `- **Device:** ${c.device.name} (${c.device.internalCode})`;
      if (c.device.manufacturer) evidenceText += ` — ${c.device.manufacturer}`;
      if (c.device.model) evidenceText += ` ${c.device.model}`;
      evidenceText += '\n';
      evidenceText += `- **Maintenance type:** ${c.engineering.maintenanceType}\n`;
      if (c.engineering.technicalCategory) evidenceText += `- **Technical category:** ${c.engineering.technicalCategory}\n`;
      if (c.engineering.diagnosis) evidenceText += `- **Diagnosis:** ${c.engineering.diagnosis}\n`;
      if (c.engineering.rootCause) evidenceText += `- **Root cause:** ${c.engineering.rootCause}\n`;
      if (c.engineering.findings) evidenceText += `- **Findings:** ${c.engineering.findings}\n`;
      if (c.engineering.workPerformed) evidenceText += `- **Work performed:** ${c.engineering.workPerformed}\n`;
      if (c.engineering.recommendations) evidenceText += `- **Recommendations:** ${c.engineering.recommendations}\n`;
      evidenceText += `- **Final result:** ${c.verification.finalResult} → Device: ${c.verification.finalDeviceStatus}\n`;

      if (c.parts.length > 0) {
        evidenceText += `- **Parts used:** ${c.parts.map((p) => `${p.partName} (${p.partNumber}) ×${p.quantity}`).join(', ')}\n`;
      }

      if (c.verification.checklistResults.length > 0) {
        evidenceText += `- **Checklist:** ${c.verification.checklistResults.length} items verified\n`;
      }

      if (c.quality.limitations.length > 0) {
        evidenceText += `- **⚠ Data gaps:** ${c.quality.limitations.join('; ')}\n`;
      }

      if (c.report) {
        evidenceText += `- **Original report:** ${c.report.title || 'N/A'}`;
        if (c.report.reportedProblemCategory) evidenceText += ` (${c.report.reportedProblemCategory})`;
        evidenceText += '\n';
      }

      evidenceText += `- **Link:** [${c.source.maintenanceRecordNumber}](${c.source.sourceUrl})\n\n`;
    }

    messages.push({ role: 'system', content: evidenceText });
  } else {
    messages.push({
      role: 'system',
      content: 'No historical maintenance cases matched the search. Tell the user no relevant records were found and suggest refining their query.',
    });
  }

  messages.push({ role: 'user', content: userMessage });

  return messages;
}

/**
 * Format evidence as structured text when no model is available.
 * This provides useful results even without an LLM.
 */
function formatStructuredEvidence(
  cases: HistoricalMaintenanceCase[],
  query: string,
): string {
  if (cases.length === 0) {
    return `No historical maintenance cases matched your query: "${query}"\n\nTry broadening your search or checking different terms.`;
  }

  let output = `Found **${cases.length} historical maintenance case${cases.length > 1 ? 's' : ''}** matching your query.\n\n`;

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    output += `---\n\n`;
    output += `### ${i + 1}. ${c.source.maintenanceRecordNumber}\n\n`;
    output += `**Device:** ${c.device.name} (${c.device.internalCode})`;
    if (c.device.manufacturer) output += ` — ${c.device.manufacturer}`;
    if (c.device.model) output += ` ${c.device.model}`;
    output += '\n\n';

    output += `**Type:** ${c.engineering.maintenanceType}`;
    if (c.engineering.technicalCategory) output += ` | **Category:** ${c.engineering.technicalCategory}`;
    output += '\n\n';

    if (c.engineering.diagnosis) output += `**Diagnosis:** ${c.engineering.diagnosis}\n\n`;
    if (c.engineering.rootCause) output += `**Root cause:** ${c.engineering.rootCause}\n\n`;
    if (c.engineering.workPerformed) output += `**Work performed:** ${c.engineering.workPerformed}\n\n`;
    if (c.engineering.findings) output += `**Findings:** ${c.engineering.findings}\n\n`;
    if (c.engineering.recommendations) output += `**Recommendations:** ${c.engineering.recommendations}\n\n`;

    if (c.parts.length > 0) {
      output += `**Parts used:** ${c.parts.map((p) => `${p.partName} ×${p.quantity}`).join(', ')}\n\n`;
    }

    output += `**Result:** ${c.verification.finalResult} → Device status: ${c.verification.finalDeviceStatus}\n\n`;

    if (c.quality.limitations.length > 0) {
      output += `⚠ **Data gaps:** ${c.quality.limitations.join(' | ')}\n\n`;
    }

    output += `📎 [View record](${c.source.sourceUrl})\n\n`;
  }

  return output;
}
