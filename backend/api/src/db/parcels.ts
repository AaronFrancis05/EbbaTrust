/**
 * Parcel reads.
 *
 * SQL lives here and nowhere else — routes stay thin, and the shape a route returns is a
 * decision made in one file rather than assembled from string fragments across the service.
 *
 * Everything is a parameterised query. No identifier and no value is ever concatenated in.
 */
import type { Database } from './pool.js';

export type Tenure = 'mailo' | 'freehold' | 'leasehold' | 'customary';

/** [west, south, east, north] in WGS84 degrees — the order the map hands us. */
export type BoundingBox = readonly [number, number, number, number];

/** GeoJSON Polygon, exactly as react-native-maps and any GIS tool expect it. */
export interface PolygonGeoJson {
  readonly type: 'Polygon';
  readonly coordinates: readonly (readonly (readonly [number, number])[])[];
}

export interface Parcel {
  readonly id: string;
  readonly titleNumber: string | null;
  readonly district: string;
  readonly county: string | null;
  readonly subcounty: string | null;
  readonly tenure: Tenure | null;
  readonly areaHectares: number | null;
  /**
   * Where the shape came from. Never 'survey' for anything we hold today, and the UI may not
   * describe a boundary as surveyed unless it says so. AGENTS.md 5.3.
   */
  readonly boundarySource: string;
  readonly boundary: PolygonGeoJson;
  readonly centroid: { readonly latitude: number; readonly longitude: number };
}

export interface ListParcelsQuery {
  readonly district?: string | undefined;
  readonly bbox?: BoundingBox | undefined;
  readonly limit: number;
  readonly offset: number;
}

interface ParcelRow {
  id: string;
  title_number: string | null;
  district: string;
  county: string | null;
  subcounty: string | null;
  tenure: Tenure | null;
  /** numeric arrives as a string; see toNumber below. */
  area_hectares: string | null;
  boundary_source: string;
  boundary: PolygonGeoJson;
  centroid_lat: number;
  centroid_lon: number;
}

/**
 * numeric comes back as a string so no precision is lost in transit. Area is a display value
 * measured in hectares, so a float is the right destination — unlike money, which stays an
 * integer all the way to the screen (AGENTS.md 5.4).
 */
function toNumber(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toParcel(row: ParcelRow): Parcel {
  return {
    id: row.id,
    titleNumber: row.title_number,
    district: row.district,
    county: row.county,
    subcounty: row.subcounty,
    tenure: row.tenure,
    areaHectares: toNumber(row.area_hectares),
    boundarySource: row.boundary_source,
    boundary: row.boundary,
    centroid: { latitude: row.centroid_lat, longitude: row.centroid_lon },
  };
}

/**
 * `boundary && st_makeenvelope(...)` is the indexed operator: it consults the GiST index in
 * parcels_boundary_gix rather than testing every polygon. Written this way on purpose —
 * st_intersects(st_transform(...)) around the column would silently discard the index.
 */
const LIST_PARCELS_SQL = `
  select
    id,
    title_number,
    district,
    county,
    subcounty,
    tenure,
    area_hectares,
    boundary_source,
    st_asgeojson(boundary)::json as boundary,
    st_y(st_centroid(boundary)) as centroid_lat,
    st_x(st_centroid(boundary)) as centroid_lon
  from public.parcels
  where ($1::text is null or district = $1::text)
    and (
      $2::float8 is null
      or boundary && st_makeenvelope($2::float8, $3::float8, $4::float8, $5::float8, 4326)
    )
  order by district asc, created_at desc
  limit $6::int offset $7::int
`;

export async function listParcels(db: Database, query: ListParcelsQuery): Promise<readonly Parcel[]> {
  const bbox = query.bbox ?? null;
  const result = await db.query<ParcelRow>(LIST_PARCELS_SQL, [
    query.district ?? null,
    bbox?.[0] ?? null,
    bbox?.[1] ?? null,
    bbox?.[2] ?? null,
    bbox?.[3] ?? null,
    query.limit,
    query.offset,
  ]);
  return result.rows.map(toParcel);
}

const GET_PARCEL_SQL = `
  select
    id,
    title_number,
    district,
    county,
    subcounty,
    tenure,
    area_hectares,
    boundary_source,
    st_asgeojson(boundary)::json as boundary,
    st_y(st_centroid(boundary)) as centroid_lat,
    st_x(st_centroid(boundary)) as centroid_lon
  from public.parcels
  where id = $1::uuid
`;

export async function getParcel(db: Database, id: string): Promise<Parcel | null> {
  const result = await db.query<ParcelRow>(GET_PARCEL_SQL, [id]);
  const row = result.rows[0];
  return row === undefined ? null : toParcel(row);
}
