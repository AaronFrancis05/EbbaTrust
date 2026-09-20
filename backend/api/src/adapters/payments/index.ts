/**
 * Payments adapter — mobile money collection and disbursement.
 *
 * Money is **integers in UGX minor units**, never a float. AGENTS.md 5.4.
 *
 * Every call carries an `idempotencyKey`. A retried collection that charges twice is the
 * worst failure this adapter can have, and network retries on a Ugandan mobile connection are
 * routine rather than exceptional. The key is the caller's protection against its own retry.
 */
import type { AdapterMode } from '../../config.js';
import { createMockPaymentsAdapter } from './mock.js';
import { createLivePaymentsAdapter } from './mobile-money.js';

export type PaymentState = 'pending' | 'succeeded' | 'failed';

export interface CollectionRequest {
  /** UGX minor units. Integer. */
  readonly amountMinor: number;
  /** E.164, e.g. +256700000000. Never logged in plaintext. */
  readonly payerMsisdn: string;
  readonly reference: string;
  readonly idempotencyKey: string;
}

export interface DisbursementRequest {
  readonly amountMinor: number;
  readonly payeeMsisdn: string;
  readonly reference: string;
  readonly idempotencyKey: string;
}

export interface PaymentResult {
  readonly providerTransactionId: string;
  readonly state: PaymentState;
  /** Present only when `state` is `failed`. Safe to show a user — never a raw provider dump. */
  readonly failureReason: string | null;
  readonly isDemoData: boolean;
  readonly updatedAt: string;
}

export interface PaymentsAdapter {
  collect(request: CollectionRequest): Promise<PaymentResult>;
  disburse(request: DisbursementRequest): Promise<PaymentResult>;
  getStatus(providerTransactionId: string): Promise<PaymentResult>;
}

export function createPaymentsAdapter(mode: AdapterMode): PaymentsAdapter {
  return mode === 'live' ? createLivePaymentsAdapter() : createMockPaymentsAdapter();
}
