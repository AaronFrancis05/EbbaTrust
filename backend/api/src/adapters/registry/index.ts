/**
 * Registry adapter — the national land registry.
 *
 * The rest of the system knows this interface and nothing else. No route, no domain rule and
 * no line of the mobile app names the provider behind it. AGENTS.md 4.3.
 */
import type { AdapterMode } from '../../config.js';
import { createMockRegistryAdapter } from './mock.js';
import { createLiveRegistryAdapter } from './ugnlis.js';

/** What a title search can conclude. Never invent a fifth value — the UI maps these exactly. */
export type TitleStatus = 'valid' | 'flagged' | 'not_found';

export interface Encumbrance {
  readonly kind: 'caveat' | 'mortgage' | 'lien' | 'dispute';
  readonly lodgedAt: string;
  readonly description: string;
  /** Whether this alone prevents a transfer completing. */
  readonly blocksTransfer: boolean;
}

export interface TransferRecord {
  readonly registeredAt: string;
  readonly fromName: string;
  readonly toName: string;
  readonly instrumentNumber: string;
}

export interface TitleSearchResult {
  readonly titleNumber: string;
  readonly status: TitleStatus;
  readonly registeredOwner: string | null;
  readonly district: string | null;
  readonly tenure: 'mailo' | 'freehold' | 'leasehold' | 'customary' | null;
  readonly areaHectares: number | null;
  readonly encumbrances: readonly Encumbrance[];
  /**
   * True whenever the result came from a mock. It travels with the result all the way to the
   * card the buyer reads, which is what makes the "Demo data" notice impossible to forget.
   * AGENTS.md 5.3.
   */
  readonly isDemoData: boolean;
  readonly checkedAt: string;
}

export interface RegistryAdapter {
  searchTitle(titleNumber: string): Promise<TitleSearchResult>;
  getParcelHistory(parcelId: string): Promise<readonly TransferRecord[]>;
}

/**
 * The go-live switch. Changing `ADAPTER_MODE` to `live` is the entire migration from demo to
 * production for this integration — there is no other code path to rewrite.
 */
export function createRegistryAdapter(mode: AdapterMode): RegistryAdapter {
  return mode === 'live' ? createLiveRegistryAdapter() : createMockRegistryAdapter();
}
