/**
 * Deterministic identity mock.
 *
 * The outcome is derived from the NIN itself rather than a random draw, so a demo can be
 * rehearsed and a test cannot flake:
 *
 *   - a NIN that is not 14 characters  -> not_found
 *   - a NIN ending in 9                -> mismatch (surname)
 *   - anything else                    -> match
 *
 * Every result carries `isDemoData: true`. No NIN is logged anywhere in this file.
 */
import type { IdentityAdapter, IdentityCheckInput, IdentityCheckResult } from './index.js';

const NIN_LENGTH = 14;

export function createMockIdentityAdapter(): IdentityAdapter {
  return {
    async verifyNin(input: IdentityCheckInput): Promise<IdentityCheckResult> {
      const nin = input.nin.trim().toUpperCase();
      const checkedAt = new Date().toISOString();

      if (nin.length !== NIN_LENGTH) {
        return { result: 'not_found', mismatchedFields: [], isDemoData: true, checkedAt };
      }

      if (nin.endsWith('9')) {
        return {
          result: 'mismatch',
          mismatchedFields: ['surname'],
          isDemoData: true,
          checkedAt,
        };
      }

      return { result: 'match', mismatchedFields: [], isDemoData: true, checkedAt };
    },
  };
}
