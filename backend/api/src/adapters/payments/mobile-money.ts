/**
 * Live payments provider — MTN MoMo and Airtel Money collections and disbursements.
 *
 * A stub. EbbaTrust holds no payment service provider licence and no aggregator agreement, so
 * there is no sandbox credential here yet, let alone a production one.
 *
 * It throws on every call. An optimistic default in a payments adapter would mark an escrow
 * funded when no money moved — the single most damaging failure this product could ship.
 * AGENTS.md 4.3 and 4.5.
 *
 * Two things this file must get right when it becomes real:
 *   1. `idempotencyKey` is passed through to the provider, not regenerated per attempt.
 *   2. A timeout is never treated as a failure. An unknown outcome is resolved with
 *      `getStatus`, because a collection may well have succeeded after the socket closed.
 */
import { NotImplementedError } from '../errors.js';
import type {
  CollectionRequest,
  DisbursementRequest,
  PaymentResult,
  PaymentsAdapter,
} from './index.js';

const PROVIDER = 'Mobile money (MTN / Airtel)';

export function createLivePaymentsAdapter(): PaymentsAdapter {
  return {
    async collect(_request: CollectionRequest): Promise<PaymentResult> {
      throw new NotImplementedError(PROVIDER, 'collect');
    },

    async disburse(_request: DisbursementRequest): Promise<PaymentResult> {
      throw new NotImplementedError(PROVIDER, 'disburse');
    },

    async getStatus(_providerTransactionId: string): Promise<PaymentResult> {
      throw new NotImplementedError(PROVIDER, 'getStatus');
    },
  };
}
