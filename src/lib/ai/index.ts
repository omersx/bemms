/**
 * BEMMS AI Agent Harness — Public API
 *
 * This is the main entry point for the AI subsystem.
 * Import from '@/lib/ai' to access knowledge, tools, providers, and orchestration.
 *
 * Architecture:
 *
 *   BEMMS UI → Copilot Panel → Server Actions / API Routes
 *                                        ↓
 *                               Orchestrator (this layer)
 *                              ↙          ↓           ↘
 *                    Knowledge      Model Provider      Tools
 *                    Service        (abstracted)        (typed)
 *                        ↓                                ↓
 *                 BEMMS Domain Services (Drizzle → PostgreSQL)
 */

// Knowledge service
export { searchHistoricalMaintenanceCases } from './knowledge/service';
export type {
  HistoricalMaintenanceCase,
  KnowledgeSearchParams,
  KnowledgeSearchResult,
  KnowledgeSearchContext,
  KnowledgeSearchQuery,
} from './knowledge/types';

// Orchestrator
export { processCopilotRequest } from './orchestrator/orchestrator';
export type {
  CopilotRequest,
  CopilotResponse,
  CopilotMessage,
  CopilotSource,
  CopilotPageContext,
} from './orchestrator/types';

// Tools
export type { ToolDefinition, ToolResult, ToolCategory } from './tools/types';
export { registerTool, getTool, getAllTools, getReadTools } from './tools/registry';

// Providers
export type { ModelProvider, ModelResponse, ModelMessage, ModelToolCall } from './providers/types';
export { registerProvider, getProvider, getDefaultProvider, listProviders } from './providers/registry';

// Audit
export { createAgentAuditEvent } from './audit';
export type { AgentAuditEntry } from './audit';

// Register built-in tools (side-effect imports)
import './tools/knowledge/search-cases';
