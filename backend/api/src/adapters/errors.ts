/**
 * Errors shared by every adapter.
 *
 * These exist so a caller can tell "this integration does not exist yet" apart from "the
 * integration exists and said no". Conflating the two is how a demo build starts looking
 * like a real registry check. AGENTS.md 4.5 and 5.3.
 */

/** A provider that has no agreement, licence or credentials yet. Always a bug if reached. */
export class NotImplementedError extends Error {
  constructor(provider: string, capability: string) {
    super(
      `${provider} has no live integration yet: ${capability}. ` +
        `Set ADAPTER_MODE=mock, or implement the provider. See AGENTS.md 4.3.`
    );
    this.name = 'NotImplementedError';
  }
}

/** The external service was reachable but refused or failed. Retryable at the caller's discretion. */
export class AdapterUnavailableError extends Error {
  readonly retryable: boolean;

  constructor(provider: string, reason: string, retryable = true) {
    super(`${provider} unavailable: ${reason}`);
    this.name = 'AdapterUnavailableError';
    this.retryable = retryable;
  }
}
