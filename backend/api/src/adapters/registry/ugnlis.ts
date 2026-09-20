/**
 * Live registry provider — UgNLIS.
 *
 * A stub, deliberately. EbbaTrust has no data-sharing agreement with MLHUD, so there is no
 * endpoint to call and no credential to call it with. It throws rather than returning an
 * empty or optimistic result, because a silent no-op here would surface to a buyer as a
 * title that raised no concerns. AGENTS.md 4.3 and 4.5.
 *
 * When the agreement exists, this file is the only one that changes.
 */
import { NotImplementedError } from '../errors.js';
import type { RegistryAdapter, TitleSearchResult, TransferRecord } from './index.js';

const PROVIDER = 'UgNLIS';

export function createLiveRegistryAdapter(): RegistryAdapter {
  return {
    async searchTitle(_titleNumber: string): Promise<TitleSearchResult> {
      throw new NotImplementedError(PROVIDER, 'searchTitle');
    },

    async getParcelHistory(_parcelId: string): Promise<readonly TransferRecord[]> {
      throw new NotImplementedError(PROVIDER, 'getParcelHistory');
    },
  };
}
