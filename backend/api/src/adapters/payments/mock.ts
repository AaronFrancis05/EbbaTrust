/**
 * Deterministic payments mock — sandbox behaviour with no money involved.
 *
 * Rules, all derived from the request so a demo is repeatable:
 *   - an MSISDN ending in 0000  -> failed ("insufficient balance")
 *   - a non-integer or non-positive amount -> rejected outright
 *   - anything else             -> succeeded
 *
 * Idempotency is honoured: the same `idempotencyKey` returns the original result and does not
 * produce a second transaction. This is not mock decoration — the escrow state machine is
 * built against that guarantee, so the mock has to hold it too or the tests prove nothing.
 */
import type {
  CollectionRequest,
  DisbursementRequest,
  PaymentResult,
  PaymentsAdapter,
} from './index.js';

/** Process-local. A real provider is the source of truth; this stands in for one in demos. */
const ledger = new Map<string, PaymentResult>();
const byTransactionId = new Map<string, PaymentResult>();

let counter = 0;

function assertValidAmount(amountMinor: number): void {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new RangeError(
      `amountMinor must be a positive integer in UGX minor units, received: ${amountMinor}`
    );
  }
}

function settle(
  idempotencyKey: string,
  amountMinor: number,
  msisdn: string
): PaymentResult {
  const existing = ledger.get(idempotencyKey);
  if (existing) return existing;

  assertValidAmount(amountMinor);

  counter += 1;
  const failed = msisdn.endsWith('0000');
  const result: PaymentResult = {
    providerTransactionId: `demo-${String(counter).padStart(6, '0')}`,
    state: failed ? 'failed' : 'succeeded',
    failureReason: failed ? 'Insufficient balance on the payer account.' : null,
    isDemoData: true,
    updatedAt: new Date().toISOString(),
  };

  ledger.set(idempotencyKey, result);
  byTransactionId.set(result.providerTransactionId, result);
  return result;
}

export function createMockPaymentsAdapter(): PaymentsAdapter {
  return {
    async collect(request: CollectionRequest): Promise<PaymentResult> {
      return settle(request.idempotencyKey, request.amountMinor, request.payerMsisdn);
    },

    async disburse(request: DisbursementRequest): Promise<PaymentResult> {
      return settle(request.idempotencyKey, request.amountMinor, request.payeeMsisdn);
    },

    async getStatus(providerTransactionId: string): Promise<PaymentResult> {
      const found = byTransactionId.get(providerTransactionId);
      if (!found) {
        throw new Error(`Unknown transaction: ${providerTransactionId}`);
      }
      return found;
    },
  };
}
