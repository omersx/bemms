/**
 * BEMMS AI — Zod validators for knowledge search
 */

import { z } from 'zod';

export const knowledgeSearchContextSchema = z.object({
  currentDeviceId: z.string().uuid().optional(),
  currentTicketId: z.string().uuid().optional(),
  currentMaintenanceTaskId: z.string().uuid().optional(),
}).default({});

export const knowledgeSearchQuerySchema = z.object({
  text: z.string().max(500).optional(),
  manufacturerId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
  deviceCategoryId: z.string().uuid().optional(),
  technicalCategory: z.string().max(100).optional(),
  maintenanceType: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(10).default(5),
}).default({});

export const knowledgeSearchSchema = z.object({
  context: knowledgeSearchContextSchema,
  query: knowledgeSearchQuerySchema,
});

export const copilotMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid().optional(),
  context: z.object({
    type: z.enum(['device', 'ticket', 'maintenance_task', 'department', 'general']),
    id: z.string().uuid().optional(),
    label: z.string().max(200).optional(),
  }).optional(),
});
