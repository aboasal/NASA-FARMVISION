"use client";

import React, { memo, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Check, RotateCcw, Trash2, X } from "lucide-react";
import { computePolygonMetrics } from "@/lib/geo";
import { getNasaGibsLayers } from "@/lib/nasa";
import { MAP_TO_GLOBE_ZOOM } from "@/lib/view";
import type {
  BaseMapId,
  FarmField,
  LatLngPoint,
  NasaGibsLayerId,
} from "@/types/farm";

export interface FlyToTarget {
  center: LatLngPoint;
  zoom?: number;
  key: number;
}

interface FarmMapProps {
  isActive: boolean;
  fields: FarmField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  isDrawing: boolean;
  draftPoints: LatLngPoint[];
  onAddDraftPoint: (point: LatLngPoint) => void;
  onUndoDraftPoint: () => void;
  onClearDraft: () => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  baseMap: BaseMapId;
  gibsLayer: NasaGibsLayerId;
  gibsDate: string;
  gibsOpacity: number;
  flyToTarget: FlyToTarget | null;
  initialView: { center: LatLngPoint; zoom: number };
  /** Called when the user zooms far enough out to return to the 3D globe. */
  onZoomOutToGlobe: (center: LatLngPoint, zoom: number) => void;
}

function MapController({
  isActive,
  initialView,
  flyToTarget,
  isDrawing,
  onAddPoint,
  onHoverPoint,
  onZoomOutToGlobe,
}: {
  isActive: boolean;
  initialView: { center: LatLngPoint; zoom: number };
  flyToTarget: FlyToTarget | null;
  isDrawing: boolean;
  onAddPoint: (pt: LatLngPoint) => void;
  onHoverPoint: (pt: LatLngPoint | null) => void;
  onZoomOutToGlobe: (center: LatLngPoint, zoom: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!isActive) return;
    map.invalidateSize();
    if (!flyToTarget) {
      map.setView(initialView.center, Math.max(initialView.zoom, MAP_TO_GLOBE_ZOOM + 1), {
        animate: false,
      });
    }
  }, [isActive, initialView, flyToTarget, map]);

  useEffect(() => {
    if (!isActive || !flyToTarget) return;
    map.flyTo(flyToTarget.center, flyToTarget.zoom ?? 15, {
      duration: 1.2,
    });
  }, [isActive, flyToTarget, map]);

  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = isDrawing ? "crosshair" : "";
    return () => {
      container.style.cursor = "";
    };
  }, [isDrawing, map]);

  useMapEvents({
    click(e) {
      if (!isActive || !isDrawing) return;
      onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
    mousemove(e) {
      if (!isActive || !isDrawing) return;
      onHoverPoint([e.latlng.lat, e.latlng.lng]);
    },
    mouseout() {
      onHoverPoint(null);
    },
    zoomend() {
      // Never yank the user out of the map mid-drawing or when map is hidden
      if (!isActive || isDrawing) return;
      const z = map.getZoom();
      if (z <= MAP_TO_GLOBE_ZOOM) {
        const c = map.getCenter();
        onZoomOutToGlobe([c.lat, c.lng], z);
      }
    },
  });

  return null;
}

function FarmMap({
  isActive,
  fields,
  selectedFieldId,
  onSelectField,
  isDrawing,
  draftPoints,
  onAddDraftPoint,
  onUndoDraftPoint,
  onClearDraft,
  onFinishDrawing,
  onCancelDrawing,
  baseMap,
  gibsLayer,
  gibsDate,
  gibsOpacity,
  flyToTarget,
  initialView,
  onZoomOutToGlobe,
}: FarmMapProps) {
  const [hoverPoint, setHoverPoint] = useState<LatLngPoint | null>(null);

  const gibsConfig = useMemo(() => {
    const layers = getNasaGibsLayers(gibsDate);
    return layers.find((l) => l.id === gibsLayer) ?? layers[0];
  }, [gibsLayer, gibsDate]);

  const liveMetrics = useMemo(
    () => computePolygonMetrics(draftPoints),
    [draftPoints]
  );

  // Build rubber-band preview lines while drawing
  const previewLine = useMemo(() => {
    if (!isDrawing || draftPoints.length === 0 || !hoverPoint) return null;
    const last = draftPoints[draftPoints.length - 1];
    if (draftPoints.length >= 2) {
      return [last, hoverPoint, draftPoints[0]];
    }
    return [last, hoverPoint];
  }, [isDrawing, draftPoints, hoverPoint]);

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={initialView.center}
        zoom={initialView.zoom}
        minZoom={3}
        maxZoom={20}
        worldCopyJump
        className="w-full h-full z-0"
        zoomControl={true}
      >
        {baseMap === "satellite" ? (
          <TileLayer
            attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={20}
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}

        {/* NASA GIBS Satellite Overlay */}
        {gibsConfig.id !== "none" && gibsConfig.tileUrlTemplate && (
          <TileLayer
            key={`${gibsConfig.id}-${gibsDate}`}
            attribution="NASA GIBS / EOSDIS"
            url={gibsConfig.tileUrlTemplate}
            opacity={gibsOpacity}
            maxNativeZoom={gibsConfig.maxNativeZoom ?? 9}
            maxZoom={20}
          />
        )}

        <MapController
          isActive={isActive}
          initialView={initialView}
          flyToTarget={flyToTarget}
          isDrawing={isDrawing}
          onAddPoint={onAddDraftPoint}
          onHoverPoint={setHoverPoint}
          onZoomOutToGlobe={onZoomOutToGlobe}
        />

        {/* Saved Farmer Fields */}
        {fields.map((field) => {
          const isSelected = field.id === selectedFieldId;
          return (
            <Polygon
              key={field.id}
              positions={field.coordinates}
              pathOptions={{
                color: isSelected ? "#ffffff" : field.color,
                weight: isSelected ? 3 : 2,
                fillColor: field.color,
                fillOpacity: isSelected ? 0.36 : 0.2,
                dashArray: isSelected ? undefined : "4 2",
              }}
              eventHandlers={{
                click: (e) => {
                  if (isDrawing) return;
                  e.originalEvent.stopPropagation();
                  onSelectField(field.id);
                },
              }}
            >
              <Tooltip sticky direction="top">
                <div className="text-xs font-medium">
                  <div className="font-semibold text-slate-900">{field.name}</div>
                  <div className="text-slate-600">
                    {field.crop} &bull; {field.areaHectares.toFixed(2)} ha
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Active Draft Polygon */}
        {isDrawing && draftPoints.length >= 3 && (
          <Polygon
            positions={draftPoints}
            pathOptions={{
              color: "#10b981",
              weight: 2.5,
              fillColor: "#10b981",
              fillOpacity: 0.25,
            }}
          />
        )}

        {isDrawing && draftPoints.length === 2 && (
          <Polyline
            positions={draftPoints}
            pathOptions={{ color: "#10b981", weight: 2.5 }}
          />
        )}

        {previewLine && (
          <Polyline
            positions={previewLine}
            pathOptions={{
              color: "#34d399",
              weight: 2,
              dashArray: "6 6",
            }}
          />
        )}

        {isDrawing &&
          draftPoints.map((pt, idx) => {
            const isFirst = idx === 0;
            const canClose = isFirst && draftPoints.length >= 3;
            return (
              <CircleMarker
                key={`${pt[0]}-${pt[1]}-${idx}`}
                center={pt}
                radius={canClose ? 8 : 5.5}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: canClose ? "#f59e0b" : "#10b981",
                  fillOpacity: 1,
                }}
                eventHandlers={{
                  click: (e) => {
                    if (canClose) {
                      e.originalEvent.stopPropagation();
                      onFinishDrawing();
                    }
                  },
                }}
              >
                {canClose && (
                  <Tooltip permanent direction="top" offset={[0, -8]}>
                    <span className="text-[11px] font-semibold">
                      Click to close land
                    </span>
                  </Tooltip>
                )}
              </CircleMarker>
            );
          })}
      </MapContainer>

      {/* NASA Layer Legend (Bottom Left) */}
      {gibsConfig.id !== "none" && gibsConfig.legend && (
        <div className="absolute bottom-5 left-4 z-[400] bg-[#0D1318]/90 backdrop-blur-md border border-white/10 rounded-2xl px-3.5 py-2.5 shadow-xl max-w-[230px]">
          <div className="text-[11px] font-semibold text-[#F2F7F4] mb-1.5">
            {gibsConfig.shortLabel} ({gibsDate})
          </div>
          <div
            className="h-2.5 w-full rounded-full"
            style={{ background: gibsConfig.legend.gradient }}
          />
          <div className="flex justify-between text-[10px] text-[#8A9B93] mt-1 font-medium">
            <span>{gibsConfig.legend.low}</span>
            <span>{gibsConfig.legend.high}</span>
          </div>
        </div>
      )}

      {/* Interactive Land Drawing HUD (Bottom Center) */}
      {isDrawing && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[500] bg-[#0D1318]/95 text-[#F2F7F4] backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-3 shadow-2xl flex flex-wrap items-center gap-3 max-w-[95vw]">
          <div className="flex flex-col pr-2 border-r border-white/10">
            <span className="text-[11px] uppercase tracking-wider text-[#A3E4B7] font-semibold">
              Marking Land Boundary
            </span>
            <span className="text-xs text-[#8A9B93]">
              {draftPoints.length < 3
                ? `Click map to place corners (${draftPoints.length}/3 min)`
                : `${draftPoints.length} corners • ${liveMetrics.areaHectares.toFixed(
                    2
                  )} ha (${liveMetrics.areaAcres.toFixed(2)} ac)`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onUndoDraftPoint}
              disabled={draftPoints.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-[#162028] border border-white/10 hover:bg-[#1E2B35] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Undo
            </button>
            <button
              type="button"
              onClick={onClearDraft}
              disabled={draftPoints.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-[#162028] border border-white/10 hover:bg-[#1E2B35] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              type="button"
              onClick={onFinishDrawing}
              disabled={draftPoints.length < 3}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-[#A3E4B7] text-[#070B0E] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Check className="w-3.5 h-3.5" />
              Finish Land
            </button>
            <button
              type="button"
              onClick={onCancelDrawing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-[#162028] border border-white/10 hover:bg-rose-600/80 transition"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(FarmMap);
