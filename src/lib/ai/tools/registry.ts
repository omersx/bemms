/**
 * BEMMS AI — Tool Registry
 *
 * Central registry for all typed BEMMS AI tools.
 * Tools register themselves on import; the orchestrator looks up tools by name.
 */

import type { ToolDefinition, ToolRegistry } from './types';
import { getLogger } from '@/lib/logger';

const log = getLogger('ai:tools');

const registry: ToolRegistry = new Map();

/**
 * Register a tool in the global registry.
 */
export function registerTool(tool: ToolDefinition): void {
  if (registry.has(tool.name)) {
    log.warn(`Tool "${tool.name}" is already registered — overwriting`);
  }
  registry.set(tool.name, tool);
  log.debug(`Tool registered: ${tool.name}`, { category: tool.category, requiresApproval: tool.requiresApproval });
}

/**
 * Get a tool by name.
 */
export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

/**
 * Get all registered tools.
 */
export function getAllTools(): ToolDefinition[] {
  return Array.from(registry.values());
}

/**
 * Get all read-only tools (for model tool definitions).
 */
export function getReadTools(): ToolDefinition[] {
  return getAllTools().filter((t) => t.category === 'read');
}

/**
 * Get tool definitions formatted for a model (name + description + schema).
 */
export function getToolDefinitionsForModel(): Array<{ name: string; description: string; parameters: any }> {
  return getAllTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  }));
}
