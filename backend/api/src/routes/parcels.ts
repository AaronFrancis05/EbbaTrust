/**
 * Parcel routes — the first real data path in this service.
 *
 * Thin by design: parse and validate the query, call the repository, shape the response.
 * No SQL, no rules. Anything that decides something belongs in ../domain/ (AGENTS.md 4.6).
 *
 * Input is validated rather than trusted. An unbounded `limit` or a malformed bbox reaching
 * Postgres is a denial of service with extra steps.
 */
import type { FastifyInstance } from 'fastify';

import type { Database } from '../db/pool.js';
import { getParcel, listParcels, type BoundingBox } from '../db/parcels.js';

interface ParcelRouteOptions {
  readonly db: Database;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** Thrown for bad input, carrying the 400 with it. Never a 500 — this is the caller's error. */
class BadRequestError extends Error {
  readonly statusCode = 400;
  readonly code = 'invalid_query';
}

function parseLimit(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_LIMIT;
  const limit = Number.parseInt(raw, 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new BadRequestError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return limit;
}

function parseOffset(raw: string | undefined): number {
  if (raw === undefined) return 0;
  const offset = Number.parseInt(raw, 10);
  if (!Number.isInteger(offset) || offset < 0) {
    throw new BadRequestError('offset must be an integer of 0 or more');
  }
  return offset;
}

/**
 * "west,south,east,north" in WGS84 degrees.
 *
 * The ordering check matters more than it looks: a map that sends north and south the wrong
 * way round produces an empty rectangle, and an empty result reads to a user as "there is no
 * land here" rather than "your request was malformed". AGENTS.md 4.5.
 */
function parseBbox(raw: string | undefined): BoundingBox | undefined {
  if (raw === undefined) return undefined;

  const parts = raw.split(',').map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new BadRequestError('bbox must be four numbers: west,south,east,north');
  }

  const [west, south, east, north] = parts as [number, number, number, number];
  if (west < -180 || east > 180 || south < -90 || north > 90) {
    throw new BadRequestError('bbox is outside the range of valid WGS84 coordinates');
  }
  if (west >= east || south >= north) {
    throw new BadRequestError('bbox must be ordered west,south,east,north with west < east and south < north');
  }
  return [west, south, east, north];
}

function parseDistrict(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const district = raw.trim();
  if (district.length === 0 || district.length > 100) {
    throw new BadRequestError('district must be between 1 and 100 characters');
  }
  return district;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ListQuerystring {
  district?: string;
  bbox?: string;
  limit?: string;
  offset?: string;
}

export async function registerParcelRoutes(
  app: FastifyInstance,
  { db }: ParcelRouteOptions
): Promise<void> {
  /**
   * GET /parcels — the map and browse query.
   *
   * Each parcel carries `boundarySource`. Nothing downstream may describe a boundary as a
   * survey unless that value says 'survey', which no row we hold today does. AGENTS.md 5.3.
   */
  app.get<{ Querystring: ListQuerystring }>('/parcels', async (request) => {
    const parcels = await listParcels(db, {
      district: parseDistrict(request.query.district),
      bbox: parseBbox(request.query.bbox),
      limit: parseLimit(request.query.limit),
      offset: parseOffset(request.query.offset),
    });

    return { parcels, count: parcels.length };
  });

  app.get<{ Params: { id: string } }>('/parcels/:id', async (request, reply) => {
    if (!UUID_RE.test(request.params.id)) {
      throw new BadRequestError('parcel id must be a UUID');
    }

    const parcel = await getParcel(db, request.params.id);
    if (parcel === null) {
      // A missing parcel is a 404, not an empty object. An empty shape on a screen that says
      // "this land is verified" is the failure mode this whole app exists to avoid.
      return reply.code(404).send({ error: 'not_found', message: 'No parcel with that id.' });
    }

    return parcel;
  });
}
