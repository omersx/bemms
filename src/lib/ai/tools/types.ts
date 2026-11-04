/**
 * BEMMS AI — Tool System Types
 *
 * Defines the typed tool interface that all BEMMS AI tools implement.
 * Every tool has:
 * - Zod-validated input/output schemas
 * - A required permission level
 * - An execution handler that enforces scope
 * - An approval requirement flag for write operations
 */

import { z } from 'zod';
import type { SessionUser } from '@/lib/auth/types';

// ── Tool definition ───────────────────────────────────────────────────────────

export type ToolCategory = 'read' | 'write';

export interface ToolDefinition<TInput = any, TOutput = any> {
  /** Unique tool name, e.g. 'device.search', 'knowledge.searchCases' */
  name: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** Tool category: read tools auto-execute, write tools need approval */
  category: ToolCategory;

  /** Zod schema for input validation (allows ZodDefault wrappers) */
  inputSchema: z.ZodType<TInput, z.ZodTypeDef, any>;

  /** Whether this tool requires explicit human approval before execution */
  requiresApproval: boolean;

  /** Execute the tool. Receives the validated input and authenticated actor. */
  execute: (input: TInput, actor: SessionUser) => Promise<ToolResult<TOutput>>;
}

// ── Tool result ───────────────────────────────────────────────────────────────

export type ToolResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  /** IDs of source records used — for citation tracking */
  sourceRecordIds?: string[];
};

// ── Tool registry ─────────────────────────────────────────────────────────────

export type ToolRegistry = Map<string, ToolDefinition>;
