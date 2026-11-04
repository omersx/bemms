/**
 * BEMMS AI — Model Provider Types
 *
 * Abstracts the model runtime so BEMMS is not locked to any single provider.
 * All AI model interactions go through this interface.
 *
 * Supported future providers: OpenAI, Anthropic, Google, OpenRouter, Ollama, local models.
 */

// ── Message types ─────────────────────────────────────────────────────────────

export type ModelMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ModelMessage {
  role: ModelMessageRole;
  content: string;
  /** Tool call ID — set when role is 'tool' to match a previous tool_call */
  toolCallId?: string;
}

// ── Tool call ─────────────────────────────────────────────────────────────────

export interface ModelToolCall {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

// ── Model response ────────────────────────────────────────────────────────────

export interface ModelResponse {
  content: string;
  toolCalls: ModelToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  modelId: string;
}

// ── Model provider interface ──────────────────────────────────────────────────

export interface ModelProvider {
  /** Provider identifier, e.g. 'openai', 'anthropic', 'ollama' */
  id: string;

  /** Human-readable name */
  name: string;

  /** Generate a response from the model */
  generate(params: ModelGenerateParams): Promise<ModelResponse>;

  /** Stream a response from the model (optional — not all providers support it) */
  stream?(params: ModelGenerateParams): AsyncIterable<ModelStreamEvent>;
}

export interface ModelGenerateParams {
  messages: ModelMessage[];
  tools?: ModelToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  /** System prompt — prepended as a system message if not already in messages */
  systemPrompt?: string;
}

export interface ModelToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ── Streaming events ──────────────────────────────────────────────────────────

export type ModelStreamEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'tool_call_start'; toolCall: ModelToolCall }
  | { type: 'tool_call_end'; toolCallId: string }
  | { type: 'done'; response: ModelResponse };
