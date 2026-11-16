"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { FarmField, LatLngPoint } from "@/types/farm";
import type { FlyToTarget } from "@/components/FarmMap";
import { altitudeToZoom, GLOBE_TO_MAP_ALTITUDE } from "@/lib/view";

export interface GlobePovTarget {
  center: LatLngPoint;
  altitude: number;
  durationMs?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  key: number;
}

interface Globe3DProps {
  isActive: boolean;
  fields: FarmField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  initialView: { center: LatLngPoint; altitude: number };
  flyToTarget: FlyToTarget | null;
  povTarget?: GlobePovTarget | null;
  /** Called when the user zooms close enough to switch to the 2D map. */
  onZoomIntoMap: (center: LatLngPoint, zoom: number) => void;
  /** Reports the camera position on every zoom/pan (store in a ref, not state). */
  onViewChange?: (center: LatLngPoint, altitude: number) => void;
}

interface FieldFeature {
  type: "Feature";
  properties: { id: string; name: string; color: string; selected: boolean };
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

/**
 * d3-geo spherical polygons require clockwise winding in [lng, lat].
 * Counter-clockwise rings are interpreted as the complement covering the whole Earth.
 */
function ensureClockwiseRing(ring: [number, number][]): [number, number][] {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += (x2 - x1) * (y2 + y1);
  }
  return sum < 0 ? [...ring].reverse() : ring;
}

function Globe3D({
  isActive,
  fields,
  selectedFieldId,
  onSelectField,
  initialView,
  flyToTarget,
  povTarget,
  onZoomIntoMap,
  onViewChange,
}: Globe3DProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const handedOffRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const prevActiveRef = useRef(isActive);
  const povTargetRef = useRef(povTarget);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    povTargetRef.current = povTarget;
  }, [povTarget]);

  // Track container size synchronously on mount + via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      setSize({
        width: Math.round(el.clientWidth),
        height: Math.round(el.clientHeight),
      });
    }
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ width: Math.round(width), height: Math.round(height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Initial camera + gentle auto-rotation that stops on first interaction
  const handleGlobeReady = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    globe.pointOfView(
      {
        lat: initialView.center[0],
        lng: initialView.center[1],
        altitude: initialView.altitude,
      },
      0
    );
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.zoomSpeed = 1.4;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When switching back from 2D Map -> 3D Globe, animate a smooth orbital pull-back
  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = isActive;

    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls();
    if (!isActive) {
      if (controls) controls.autoRotate = false;
      return;
    }
    if (wasActive) return;

    // Avoid overwriting a fresh orbital povTarget transition triggered right alongside view switch
    if (povTargetRef.current && Date.now() - povTargetRef.current.key < 300) {
      handedOffRef.current = false;
      if (controls) controls.autoRotate = true;
      return;
    }

    // Lock handoff during the pull-back transition so handleZoom doesn't bounce back to 2D
    handedOffRef.current = true;
    const targetAltitude = Math.max(initialView.altitude, 1.35);
    globe.pointOfView(
      {
        lat: initialView.center[0],
        lng: initialView.center[1],
        altitude: 0.14,
      },
      0
    );
    const raf = window.requestAnimationFrame(() => {
      globe.pointOfView(
        {
          lat: initialView.center[0],
          lng: initialView.center[1],
          altitude: targetAltitude,
        },
        1100
      );
    });
    const timer = window.setTimeout(() => {
      handedOffRef.current = false;
      if (controls) controls.autoRotate = true;
    }, 1150);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [isActive, initialView]);

  // Smooth camera transition for welcome <-> interactive globe views
  useEffect(() => {
    if (!povTarget || !globeRef.current) return;
    const controls = globeRef.current.controls();
    if (controls) {
      if (typeof povTarget.autoRotate === "boolean") {
        controls.autoRotate = povTarget.autoRotate;
      }
      controls.autoRotateSpeed =
        typeof povTarget.autoRotateSpeed === "number"
          ? povTarget.autoRotateSpeed
          : 0.55;
    }
    handedOffRef.current = false;
    globeRef.current.pointOfView(
      {
        lat: povTarget.center[0],
        lng: povTarget.center[1],
        altitude: povTarget.altitude,
      },
      povTarget.durationMs ?? 1400
    );
  }, [povTarget]);

  // Fly to selected field / search result — the zoom handler hands off to the map at the end
  useEffect(() => {
    if (!flyToTarget || !globeRef.current || !isActiveRef.current) return;
    const controls = globeRef.current.controls();
    if (controls) controls.autoRotate = false;
    handedOffRef.current = false;
    globeRef.current.pointOfView(
      {
        lat: flyToTarget.center[0],
        lng: flyToTarget.center[1],
        altitude: GLOBE_TO_MAP_ALTITUDE * 0.7,
      },
      1600
    );
  }, [flyToTarget]);

  const handleZoom = useCallback(
    (pov: { lat: number; lng: number; altitude: number }) => {
      if (!isActiveRef.current) return;
      onViewChange?.([pov.lat, pov.lng], pov.altitude);
      if (handedOffRef.current) return;
      if (pov.altitude < GLOBE_TO_MAP_ALTITUDE) {
        handedOffRef.current = true;
        onZoomIntoMap([pov.lat, pov.lng], altitudeToZoom(pov.altitude));
      }
    },
    [onZoomIntoMap, onViewChange]
  );

  const polygons = useMemo<FieldFeature[]>(
    () =>
      fields
        .filter((f) => f.coordinates.length >= 3)
        .map((f) => {
          const rawRing: [number, number][] = f.coordinates.map(([lat, lng]) => [
            lng,
            lat,
          ]);
          rawRing.push([...rawRing[0]]);
          const ring = ensureClockwiseRing(rawRing);
          return {
            type: "Feature",
            properties: {
              id: f.id,
              name: f.name,
              color: f.color,
              selected: f.id === selectedFieldId,
            },
            geometry: { type: "Polygon", coordinates: [ring] },
          };
        }),
    [fields, selectedFieldId]
  );

  const selected = fields.find((f) => f.id === selectedFieldId);
  const rings = useMemo(
    () =>
      selected
        ? [
            {
              lat: selected.centroid[0],
              lng: selected.centroid[1],
              color: selected.color,
            },
          ]
        : [],
    [selected]
  );

  return (
    <div ref={containerRef} className="absolute inset-0 bg-[#070B0E]">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="#070B0E"
          backgroundImageUrl="/textures/night-sky.png"
          globeImageUrl="/textures/earth-blue-marble.jpg"
          bumpImageUrl="/textures/earth-topology.png"
          showAtmosphere
          atmosphereColor="#86efac"
          atmosphereAltitude={0.15}
          onGlobeReady={handleGlobeReady}
          onZoom={handleZoom}
          // Field boundaries draped on the sphere (elevated above 0 to prevent z-fighting)
          polygonsData={polygons}
          polygonCapColor={(d) => {
            const p = (d as FieldFeature).properties;
            return `${p.color}${p.selected ? "b3" : "80"}`;
          }}
          polygonSideColor={(d) => `${(d as FieldFeature).properties.color}cc`}
          polygonStrokeColor={(d) =>
            (d as FieldFeature).properties.selected
              ? "#ffffff"
              : (d as FieldFeature).properties.color
          }
          polygonAltitude={(d) =>
            (d as FieldFeature).properties.selected ? 0.002 : 0.001
          }
          polygonLabel={(d) => `<b>${(d as FieldFeature).properties.name}</b>`}
          onPolygonClick={(d) =>
            onSelectField((d as FieldFeature).properties.id)
          }
          // Pins so small fields stay visible from orbit
          pointsData={fields}
          pointLat={(d) => (d as FarmField).centroid[0]}
          pointLng={(d) => (d as FarmField).centroid[1]}
          pointColor={(d) => (d as FarmField).color}
          pointAltitude={(d) =>
            (d as FarmField).id === selectedFieldId ? 0.05 : 0.03
          }
          pointRadius={0.32}
          pointLabel={(d) => {
            const f = d as FarmField;
            return `<div style="font:600 12px sans-serif"><b>${f.name}</b><br/>${f.crop} • ${f.areaHectares.toFixed(2)} ha</div>`;
          }}
          onPointClick={(d) => onSelectField((d as FarmField).id)}
          // Pulsing ring on the selected field
          ringsData={rings}
          ringColor={(d: object) => (d as { color: string }).color}
          ringMaxRadius={2.5}
          ringPropagationSpeed={1.5}
          ringRepeatPeriod={1200}
        />
      )}
    </div>
  );
}

export default memo(Globe3D);
