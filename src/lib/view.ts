/** Globe altitude (in Earth radii) below which we hand off to the 2D Leaflet map. */
export const GLOBE_TO_MAP_ALTITUDE = 0.08;

/** Leaflet zoom at or below which we hand back to the 3D globe. */
export const MAP_TO_GLOBE_ZOOM = 4;

/** Convert globe camera altitude -> approximate Leaflet zoom for a ~1000px viewport. */
export function altitudeToZoom(altitude: number): number {
  return Math.max(3, Math.min(18, Math.round(Math.log2(27 / Math.max(altitude, 0.0005)))));
}

/** Convert Leaflet zoom -> approximate globe camera altitude. */
export function zoomToAltitude(zoom: number): number {
  return 27 / Math.pow(2, zoom);
}
