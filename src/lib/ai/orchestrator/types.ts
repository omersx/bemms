/**
 * BEMMS AI — Orchestrator Types
 *
 * Defines the session state and agent interaction types used by the orchestrator.
 */

import type { KnowledgeSearchContext } from '../knowledge/types';

// ── Copilot request (from the UI) ─────────────────────────────────────────────

export interface CopilotRequest {
  /** The user's message */
  message: string;

  /** Existing session ID to continue, or undefined to start a new session */
  sessionId?: string;

  /** Page context — automatically set by the UI based on the current page */
  context?: CopilotPageContext;
}

export interface CopilotPageContext {
  type: 'device' | 'ticket' | 'maintenance_task' | 'department' | 'general';
  id?: string;
  /** Additional context data (device name, ticket title, etc.) for display */
  label?: string;
}

// ── Copilot response ──────────────────────────────────────────────────────────

export interface CopilotResponse {
  sessionId: string;
  message: CopilotMessage;
}

export interface CopilotMessage {
  /** The assistant's text response */
  content: string;

  /** Source records referenced in the response */
  sources: CopilotSource[];

  /** Data quality limitations or gaps identified */
  limitations: string[];

  /** Model used (if a model was called) */
  modelId?: string;

  /** Total latency in milliseconds */
  latencyMs: number;
}

export interface CopilotSource {
  type: 'maintenance_record' | 'ticket' | 'device';
  id: string;
  label: string;
  url: string;
}
