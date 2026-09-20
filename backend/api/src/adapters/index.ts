/**
 * The adapter layer, assembled once at boot.
 *
 * Everything outside this directory receives this object and knows only the interfaces on it.
 * No route, no domain rule and no line of the mobile app names a provider. AGENTS.md 4.3.
 */
import type { AdapterMode } from '../config.js';
import { createIdentityAdapter, type IdentityAdapter } from './identity/index.js';
import { createPaymentsAdapter, type PaymentsAdapter } from './payments/index.js';
import { createRegistryAdapter, type RegistryAdapter } from './registry/index.js';

export interface Adapters {
  readonly mode: AdapterMode;
  readonly registry: RegistryAdapter;
  readonly identity: IdentityAdapter;
  readonly payments: PaymentsAdapter;
}

export function createAdapters(mode: AdapterMode): Adapters {
  return {
    mode,
    registry: createRegistryAdapter(mode),
    identity: createIdentityAdapter(mode),
    payments: createPaymentsAdapter(mode),
  };
}

export { NotImplementedError, AdapterUnavailableError } from './errors.js';
