/**
 * Identity adapter — national ID verification.
 *
 * Confirms that a NIN exists and matches the name and date of birth given. It never returns
 * personal data the caller did not already have: this interface answers "does this match?",
 * not "who is this?". AGENTS.md 5.2 — a NIN is never logged in plaintext.
 */
import type { AdapterMode } from '../../config.js';
import { createMockIdentityAdapter } from './mock.js';
import { createLiveIdentityAdapter } from './nira.js';

export type IdentityMatch = 'match' | 'mismatch' | 'not_found';

export interface IdentityCheckInput {
  readonly nin: string;
  readonly givenName: string;
  readonly surname: string;
  /** ISO-8601 date, UTC. */
  readonly dateOfBirth: string;
}

export interface IdentityCheckResult {
  readonly result: IdentityMatch;
  /** Which supplied fields disagreed. Empty unless `result` is `mismatch`. */
  readonly mismatchedFields: readonly ('givenName' | 'surname' | 'dateOfBirth')[];
  readonly isDemoData: boolean;
  readonly checkedAt: string;
}

export interface IdentityAdapter {
  verifyNin(input: IdentityCheckInput): Promise<IdentityCheckResult>;
}

export function createIdentityAdapter(mode: AdapterMode): IdentityAdapter {
  return mode === 'live' ? createLiveIdentityAdapter() : createMockIdentityAdapter();
}
