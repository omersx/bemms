import { pgTable, uuid, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import {
  agentSessionStatusEnum,
  agentSessionContextTypeEnum,
  agentMessageRoleEnum,
  agentAuditEventTypeEnum,
} from './enums';
import { organizations } from './organizations';
import { users } from './users';

// ── Agent Sessions ────────────────────────────────────────────────────────────

export const agentSessions = pgTable('agent_sessions', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title'),
  contextType: agentSessionContextTypeEnum('context_type').default('general').notNull(),
  contextId: uuid('context_id'),
  status: agentSessionStatusEnum('status').default('active').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  userIdx: index('idx_agent_sessions_user').on(t.userId, t.status),
  orgIdx: index('idx_agent_sessions_org').on(t.organizationId, t.createdAt),
  contextIdx: index('idx_agent_sessions_context').on(t.contextType, t.contextId),
}));

export const agentSessionsRelations = relations(agentSessions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [agentSessions.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [agentSessions.userId],
    references: [users.id],
    relationName: 'agentSessionsForUser',
  }),
  messages: many(agentMessages),
}));

// ── Agent Messages ────────────────────────────────────────────────────────────

export const agentMessages = pgTable('agent_messages', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: uuid('session_id').notNull().references(() => agentSessions.id, { onDelete: 'cascade' }),
  role: agentMessageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  sourceRecordIds: jsonb('source_record_ids').$type<string[]>(),
  tokenCount: integer('token_count'),
  modelId: text('model_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  sessionTimeIdx: index('idx_agent_messages_session').on(t.sessionId, t.createdAt),
}));

export const agentMessagesRelations = relations(agentMessages, ({ one }) => ({
  session: one(agentSessions, {
    fields: [agentMessages.sessionId],
    references: [agentSessions.id],
  }),
}));

// ── Agent Audit Events ────────────────────────────────────────────────────────
// Dedicated AI audit trail — complements the existing audit_logs table.
// Records metadata about AI operations, not raw prompts/answers by default.

export const agentAuditEvents = pgTable('agent_audit_events', {
  id: uuid('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  sessionId: uuid('session_id').references(() => agentSessions.id),
  eventType: agentAuditEventTypeEnum('event_type').notNull(),
  contextType: text('context_type'),
  contextId: text('context_id'),
  toolName: text('tool_name'),
  sourceRecordIds: jsonb('source_record_ids').$type<string[]>(),
  modelId: text('model_id'),
  latencyMs: integer('latency_ms'),
  errorCategory: text('error_category'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  orgTimeIdx: index('idx_agent_audit_org_time').on(t.organizationId, t.createdAt),
  userIdx: index('idx_agent_audit_user').on(t.userId, t.createdAt),
  sessionIdx: index('idx_agent_audit_session').on(t.sessionId),
  eventTypeIdx: index('idx_agent_audit_event_type').on(t.eventType, t.createdAt),
}));

export const agentAuditEventsRelations = relations(agentAuditEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [agentAuditEvents.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [agentAuditEvents.userId],
    references: [users.id],
    relationName: 'agentAuditEventsForUser',
  }),
  session: one(agentSessions, {
    fields: [agentAuditEvents.sessionId],
    references: [agentSessions.id],
  }),
}));
