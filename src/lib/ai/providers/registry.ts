/**
 * BEMMS AI — Model Provider Registry
 *
 * Manages available model providers. The orchestrator selects a provider
 * based on configuration. No provider is hard-coded.
 *
 * Providers will be registered when their implementation is added.
 * For now this establishes the registry pattern.
 */

import type { ModelProvider } from './types';
import { getLogger } from '@/lib/logger';

const log = getLogger('ai:providers');

const providers = new Map<string, ModelProvider>();

/**
 * Register a model provider.
 */
export function registerProvider(provider: ModelProvider): void {
  if (providers.has(provider.id)) {
    log.warn(`Provider "${provider.id}" is already registered — overwriting`);
  }
  providers.set(provider.id, provider);
  log.info(`Model provider registered: ${provider.name} (${provider.id})`);
}

/**
 * Get a provider by ID.
 */
export function getProvider(id: string): ModelProvider | undefined {
  return providers.get(id);
}

/**
 * Get the configured default provider, or undefined if none is configured.
 */
export function getDefaultProvider(): ModelProvider | undefined {
  const defaultId = process.env.COPILOT_PROVIDER;
  if (defaultId) {
    return providers.get(defaultId);
  }
  // Return the first registered provider as fallback
  const first = providers.values().next();
  return first.done ? undefined : first.value;
}

/**
 * List all registered providers.
 */
export function listProviders(): Array<{ id: string; name: string }> {
  return Array.from(providers.values()).map((p) => ({ id: p.id, name: p.name }));
}
