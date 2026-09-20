/**
 * Deterministic registry mock.
 *
 * Deterministic on purpose: the same title number always returns the same answer, so a demo
 * is repeatable and a test does not flake. Every result carries `isDemoData: true`.
 *
 * The flagged fixture matters as much as the valid one. A demo that only ever shows a clean
 * title teaches the person watching that the product always says yes.
 */
import type {
  Encumbrance,
  RegistryAdapter,
  TitleSearchResult,
  TransferRecord,
} from './index.js';

const CAVEAT: Encumbrance = {
  kind: 'caveat',
  lodgedAt: '2024-03-12T00:00:00.000Z',
  description: 'Caveat lodged by a third party claiming an interest in the land.',
  blocksTransfer: true,
};

interface Fixture {
  readonly status: TitleSearchResult['status'];
  readonly registeredOwner: string | null;
  readonly district: string | null;
  readonly tenure: TitleSearchResult['tenure'];
  readonly areaHectares: number | null;
  readonly encumbrances: readonly Encumbrance[];
}

/** Keyed by normalised title number. */
const FIXTURES: ReadonlyMap<string, Fixture> = new Map([
  [
    'FRV1234FOLIO5',
    {
      status: 'valid',
      registeredOwner: 'Nakato Sarah Nabirye',
      district: 'Wakiso',
      tenure: 'mailo',
      areaHectares: 0.101,
      encumbrances: [],
    },
  ],
  [
    'FRV9999FOLIO1',
    {
      status: 'flagged',
      registeredOwner: 'Okello James Otim',
      district: 'Mukono',
      tenure: 'freehold',
      areaHectares: 0.405,
      encumbrances: [CAVEAT],
    },
  ],
  [
    'LRV0042FOLIO8',
    {
      status: 'valid',
      registeredOwner: 'Ssemakula Investments Limited',
      district: 'Kampala',
      tenure: 'leasehold',
      areaHectares: 0.052,
      encumbrances: [],
    },
  ],
]);

const HISTORY: ReadonlyMap<string, readonly TransferRecord[]> = new Map([
  [
    'parcel-wakiso-0001',
    [
      {
        registeredAt: '1998-06-04T00:00:00.000Z',
        fromName: 'Kabaka Land Board',
        toName: 'Musoke Henry',
        instrumentNumber: 'INST-1998-004412',
      },
      {
        registeredAt: '2011-11-22T00:00:00.000Z',
        fromName: 'Musoke Henry',
        toName: 'Nabirye Grace',
        instrumentNumber: 'INST-2011-118820',
      },
      {
        registeredAt: '2021-08-08T00:00:00.000Z',
        fromName: 'Nabirye Grace',
        toName: 'Nakato Sarah Nabirye',
        instrumentNumber: 'INST-2021-330915',
      },
    ],
  ],
]);

/** Uppercased, with spaces, dots and hyphens removed, so user typing variance still matches. */
function normalise(titleNumber: string): string {
  return titleNumber.toUpperCase().replace(/[\s.-]/g, '');
}

export function createMockRegistryAdapter(): RegistryAdapter {
  return {
    async searchTitle(titleNumber: string): Promise<TitleSearchResult> {
      const fixture = FIXTURES.get(normalise(titleNumber));
      const checkedAt = new Date().toISOString();

      if (!fixture) {
        return {
          titleNumber,
          status: 'not_found',
          registeredOwner: null,
          district: null,
          tenure: null,
          areaHectares: null,
          encumbrances: [],
          isDemoData: true,
          checkedAt,
        };
      }

      return { titleNumber, ...fixture, isDemoData: true, checkedAt };
    },

    async getParcelHistory(parcelId: string): Promise<readonly TransferRecord[]> {
      return HISTORY.get(parcelId) ?? [];
    },
  };
}
