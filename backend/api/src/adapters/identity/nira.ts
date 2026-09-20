/**
 * Live identity provider — NIRA.
 *
 * A stub. There is no NIRA integration and no credential for one. It throws rather than
 * returning `match`, because an optimistic default here would let an unverified person pass
 * KYC and enter an escrow. AGENTS.md 4.3 and 4.5.
 */
import { NotImplementedError } from '../errors.js';
import type { IdentityAdapter, IdentityCheckInput, IdentityCheckResult } from './index.js';

const PROVIDER = 'NIRA';

export function createLiveIdentityAdapter(): IdentityAdapter {
  return {
    async verifyNin(_input: IdentityCheckInput): Promise<IdentityCheckResult> {
      throw new NotImplementedError(PROVIDER, 'verifyNin');
    },
  };
}
