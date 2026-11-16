import area from "@turf/area";
import centroid from "@turf/centroid";
import length from "@turf/length";
import { lineString, polygon } from "@turf/helpers";
import type { CropType, FarmField, LatLngPoint } from "@/types/farm";

export const CROP_TYPES: CropType[] = [
  "Wheat",
  "Corn",
  "Rice",
  "Soybeans",
  "Cotton",
  "Vegetables",
  "Orchard",
  "Pasture",
];

export const FIELD_COLORS = [
  "#10b981", // emerald
  "#f59e0b", // amber
  "#0ea5e9", // sky
  "#84cc16", // lime
  "#f97316", // orange
  "#14b8a6", // teal
];

function segmentsIntersect(
  a: LatLngPoint,
  b: LatLngPoint,
  c: LatLngPoint,
  d: LatLngPoint
): boolean {
  const ccw = (p1: LatLngPoint, p2: LatLngPoint, p3: LatLngPoint) =>
    (p3[0] - p1[0]) * (p2[1] - p1[1]) > (p2[0] - p1[0]) * (p3[1] - p1[1]);
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

export function hasSelfIntersection(points: LatLngPoint[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a1 = points[i];
    const a2 = points[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const b1 = points[j];
      const b2 = points[(j + 1) % n];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

/**
 * Untangles polygon corners (such as 4-pin squares clicked in row-by-row
 * or diagonal Z-order) into a simple perimeter ring without self-intersecting
 * "hourglass" edges, preserving points[0] as the first vertex.
 */
export function orderPolygonVertices(points: LatLngPoint[]): LatLngPoint[] {
  if (points.length < 3) return points;
  if (points.length >= 4 || hasSelfIntersection(points)) {
    const meanLat = points.reduce((s, p) => s + p[0], 0) / points.length;
    const meanLng = points.reduce((s, p) => s + p[1], 0) / points.length;
    const indexed = points.map((pt, idx) => ({
      pt,
      idx,
      angle: Math.atan2(pt[0] - meanLat, pt[1] - meanLng),
    }));
    indexed.sort((a, b) => a.angle - b.angle);
    const firstPos = indexed.findIndex((item) => item.idx === 0);
    const rotated =
      firstPos > 0
        ? [...indexed.slice(firstPos), ...indexed.slice(0, firstPos)]
        : indexed;
    return rotated.map((item) => item.pt);
  }
  return points;
}

/**
 * Computes geodesic area (hectares & acres), perimeter (meters),
 * and centroid [lat, lng] for a polygon defined by [lat, lng] points.
 */
export function computePolygonMetrics(points: LatLngPoint[]): {
  areaHectares: number;
  areaAcres: number;
  perimeterMeters: number;
  centroid: LatLngPoint;
} {
  if (points.length < 3) {
    const fallbackCenter: LatLngPoint =
      points.length > 0 ? points[0] : [30.82, 31.02];
    return {
      areaHectares: 0,
      areaAcres: 0,
      perimeterMeters: 0,
      centroid: fallbackCenter,
    };
  }

  const ordered = orderPolygonVertices(points);

  // GeoJSON uses [lng, lat] and requires a closed ring
  const ring: [number, number][] = ordered.map(([lat, lng]) => [lng, lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([...first]);
  }

  const poly = polygon([ring]);
  const areaSqMeters = area(poly);
  const areaHectares = areaSqMeters / 10_000;
  const areaAcres = areaSqMeters / 4046.8564224;

  const line = lineString(ring);
  const perimeterMeters = length(line, { units: "meters" });

  const center = centroid(poly);
  const [cLng, cLat] = center.geometry.coordinates;

  return {
    areaHectares,
    areaAcres,
    perimeterMeters,
    centroid: [cLat, cLng],
  };
}

export function createFarmField(
  name: string,
  crop: CropType,
  coordinates: LatLngPoint[],
  colorIndex = 0
): FarmField {
  const orderedCoords = orderPolygonVertices(coordinates);
  const metrics = computePolygonMetrics(orderedCoords);
  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    crop,
    coordinates: orderedCoords,
    ...metrics,
    color: FIELD_COLORS[colorIndex % FIELD_COLORS.length],
    createdAt: new Date().toISOString(),
  };
}

export function exportFieldsToGeoJSON(fields: FarmField[]): void {
  const featureCollection = {
    type: "FeatureCollection",
    features: fields.map((field) => {
      const ring = field.coordinates.map(([lat, lng]) => [lng, lat]);
      if (ring.length > 0) {
        ring.push([...ring[0]]);
      }
      return {
        type: "Feature",
        properties: {
          id: field.id,
          name: field.name,
          crop: field.crop,
          areaHectares: Number(field.areaHectares.toFixed(2)),
          areaAcres: Number(field.areaAcres.toFixed(2)),
          perimeterMeters: Math.round(field.perimeterMeters),
          createdAt: field.createdAt,
        },
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      };
    }),
  };

  const blob = new Blob([JSON.stringify(featureCollection, null, 2)], {
    type: "application/geo+json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `nasa-farmvision-fields-${new Date().toISOString().slice(0, 10)}.geojson`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const SAMPLE_FIELDS: FarmField[] = [
  {
    id: "sample-delta-wheat",
    name: "Delta North Wheat Plot",
    crop: "Wheat",
    coordinates: [
      [30.8255, 31.0145],
      [30.8258, 31.0225],
      [30.8195, 31.0228],
      [30.8192, 31.0148],
    ],
    ...computePolygonMetrics([
      [30.8255, 31.0145],
      [30.8258, 31.0225],
      [30.8195, 31.0228],
      [30.8192, 31.0148],
    ]),
    color: "#10b981",
    createdAt: "2026-10-01T08:00:00.000Z",
  },
  {
    id: "sample-california-orchard",
    name: "San Joaquin Almond Block",
    crop: "Orchard",
    coordinates: [
      [36.7462, -119.8655],
      [36.7462, -119.8562],
      [36.7395, -119.8562],
      [36.7395, -119.8655],
    ],
    ...computePolygonMetrics([
      [36.7462, -119.8655],
      [36.7462, -119.8562],
      [36.7395, -119.8562],
      [36.7395, -119.8655],
    ]),
    color: "#f59e0b",
    createdAt: "2026-10-05T10:30:00.000Z",
  },
];
