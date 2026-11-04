/**
 * BEMMS AI Tool — Knowledge Search Cases
 *
 * Wraps the knowledge service as a typed AI tool.
 * Read-only, no approval required, scope-enforced.
 */

import { z } from 'zod';
import { registerTool } from '../registry';
import { searchHistoricalMaintenanceCases } from '../../knowledge/service';
import type { ToolDefinition, ToolResult } from '../types';
import type { KnowledgeSearchResult } from '../../knowledge/types';

const inputSchema = z.object({
  context: z.object({
    currentDeviceId: z.string().uuid().optional(),
    currentTicketId: z.string().uuid().optional(),
    currentMaintenanceTaskId: z.string().uuid().optional(),
  }).default({}),
  query: z.object({
    text: z.string().max(500).optional(),
    manufacturerId: z.string().uuid().optional(),
    modelId: z.string().uuid().optional(),
    deviceCategoryId: z.string().uuid().optional(),
    technicalCategory: z.string().optional(),
    maintenanceType: z.string().optional(),
    limit: z.number().int().min(1).max(10).default(5),
  }).default({}),
});

const searchCasesTool: ToolDefinition<z.infer<typeof inputSchema>, KnowledgeSearchResult> = {
  name: 'knowledge.searchCases',
  description:
    'Search finalized historical maintenance cases within the user\'s authorized scope. ' +
    'Returns structured cases with device info, diagnosis, work performed, parts, verification results, and source links. ' +
    'Use this to find similar past repairs, failure patterns, and maintenance history.',
  category: 'read',
  inputSchema,
  requiresApproval: false,

  async execute(input, actor): Promise<ToolResult<KnowledgeSearchResult>> {
    try {
      const result = await searchHistoricalMaintenanceCases(actor, {
        context: input.context,
        query: input.query,
      });

      const sourceRecordIds = result.cases.map((c) => c.source.maintenanceRecordId);

      return {
        success: true,
        data: result,
        sourceRecordIds,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Knowledge search failed',
      };
    }
  },
};

// Self-register on import
registerTool(searchCasesTool);

export { searchCasesTool };
