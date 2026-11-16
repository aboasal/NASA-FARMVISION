"use client";

import React, { memo, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Download,
  Droplets,
  Info,
  MapPin,
  Satellite,
  Sprout,
  Sun,
  Thermometer,
  Trash2,
} from "lucide-react";
import WeatherChart from "@/components/WeatherChart";
import { CROP_TYPES } from "@/lib/geo";
import { generateFarmAdvisories } from "@/lib/nasa";
import type { CropType, FarmField, NasaPowerResponse } from "@/types/farm";

interface FieldSidebarProps {
  fields: FarmField[];
  selectedField: FarmField | null;
  onSelectField: (id: string) => void;
  onUpdateField: (id: string, patch: Partial<Pick<FarmField, "name" | "crop">>) => void;
  onDeleteField: (id: string) => void;
  onExportGeoJSON: () => void;
  nasaData: NasaPowerResponse | null;
  isLoadingNasa: boolean;
}

function FieldSidebar({
  fields,
  selectedField,
  onSelectField,
  onUpdateField,
  onDeleteField,
  onExportGeoJSON,
  nasaData,
  isLoadingNasa,
}: FieldSidebarProps) {
  const records = nasaData?.records ?? [];
  const latest = records.length > 0 ? records[records.length - 1] : null;
  const totalRain7d = records.reduce((sum, r) => sum + (r.precipMm ?? 0), 0);

  // Average only days that actually have data (NASA POWER solar lags several days)
  const avgOf = (vals: (number | null)[]) => {
    const valid = vals.filter((v): v is number => v !== null);
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };
  const avgTemp = avgOf(records.map((r) => r.tempC));
  const avgSolar = avgOf(records.map((r) => r.solarKwh));

  const advisories = useMemo(
    () => (selectedField ? generateFarmAdvisories(records, selectedField.crop) : []),
    [records, selectedField]
  );

  return (
    <aside className="w-full lg:w-[400px] xl:w-[430px] shrink-0 bg-[#0B1015] text-[#F2F7F4] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col lg:h-full lg:overflow-y-auto scroll-slim">
      {/* Selected Field Overview */}
      {selectedField ? (
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A9B93] mb-0.5">
                Selected Land Parcel
              </label>
              <input
                type="text"
                value={selectedField.name}
                onChange={(e) =>
                  onUpdateField(selectedField.id, { name: e.target.value })
                }
                className="w-full text-base font-bold text-[#F2F7F4] bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#A3E4B7] focus:outline-none py-0.5 transition"
                aria-label="Field name"
              />
            </div>

            <div className="shrink-0">
              <label className="block text-[10px] font-semibold uppercase tracking-widest text-[#8A9B93] mb-0.5">
                Crop
              </label>
              <select
                value={selectedField.crop}
                onChange={(e) =>
                  onUpdateField(selectedField.id, {
                    crop: e.target.value as CropType,
                  })
                }
                className="text-xs font-semibold text-[#A3E4B7] bg-[#111920] border border-[#A3E4B7]/30 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#A3E4B7]/40"
                aria-label="Crop type"
              >
                {CROP_TYPES.map((crop) => (
                  <option key={crop} value={crop} className="bg-[#0D1318] text-[#F2F7F4]">
                    {crop}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Land Geometry Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#111920] rounded-2xl p-2.5 border border-white/[0.08]">
              <div className="text-[10px] text-[#8A9B93] font-medium uppercase tracking-wider">
                Area (ha)
              </div>
              <div className="text-sm font-bold text-[#F2F7F4] mt-0.5">
                {selectedField.areaHectares.toFixed(2)} ha
              </div>
            </div>
            <div className="bg-[#111920] rounded-2xl p-2.5 border border-white/[0.08]">
              <div className="text-[10px] text-[#8A9B93] font-medium uppercase tracking-wider">
                Area (ac)
              </div>
              <div className="text-sm font-bold text-[#F2F7F4] mt-0.5">
                {selectedField.areaAcres.toFixed(2)} ac
              </div>
            </div>
            <div className="bg-[#111920] rounded-2xl p-2.5 border border-white/[0.08]">
              <div className="text-[10px] text-[#8A9B93] font-medium uppercase tracking-wider">
                Perimeter
              </div>
              <div className="text-sm font-bold text-[#F2F7F4] mt-0.5">
                {selectedField.perimeterMeters >= 1000
                  ? `${(selectedField.perimeterMeters / 1000).toFixed(2)} km`
                  : `${Math.round(selectedField.perimeterMeters)} m`}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#8A9B93] pt-0.5">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#A3E4B7]" />
              {selectedField.centroid[0].toFixed(4)}°,{" "}
              {selectedField.centroid[1].toFixed(4)}°
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-[#A3E4B7]">
              <Satellite className="w-3.5 h-3.5 text-sky-400" />
              {isLoadingNasa
                ? "Fetching NASA POWER..."
                : nasaData?.source === "nasa-power"
                ? "Live NASA POWER API"
                : "Regional Estimate"}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center border-b border-white/10">
          <Sprout className="w-8 h-8 text-[#A3E4B7] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#F2F7F4]">
            No Land Selected
          </p>
          <p className="text-xs text-[#8A9B93] mt-1">
            Click &ldquo;Mark My Land&rdquo; on the map to draw your farm boundary and load NASA satellite data.
          </p>
        </div>
      )}

      {/* NASA Telemetry & Advisories */}
      {selectedField && (
        <div className="p-4 border-b border-white/10 space-y-4">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-white/[0.08] bg-[#111920] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                <Thermometer className="w-3.5 h-3.5" />
                7-Day Avg Temp
              </div>
              <div className="text-lg font-bold text-[#F2F7F4] mt-1">
                {isLoadingNasa
                  ? "..."
                  : avgTemp !== null
                  ? `${avgTemp.toFixed(1)}°C`
                  : "N/A"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111920] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                <CloudRain className="w-3.5 h-3.5" />
                7-Day Rainfall
              </div>
              <div className="text-lg font-bold text-[#F2F7F4] mt-1">
                {isLoadingNasa ? "..." : `${totalRain7d.toFixed(1)} mm`}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111920] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#A3E4B7]">
                <Droplets className="w-3.5 h-3.5" />
                Soil Wetness
              </div>
              <div className="text-lg font-bold text-[#F2F7F4] mt-1">
                {isLoadingNasa
                  ? "..."
                  : latest?.soilWetness !== null && latest?.soilWetness !== undefined
                  ? `${Math.round(latest.soilWetness * 100)}%`
                  : "N/A"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#111920] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-300">
                <Sun className="w-3.5 h-3.5" />
                Solar Energy
              </div>
              <div className="text-lg font-bold text-[#F2F7F4] mt-1">
                {isLoadingNasa
                  ? "..."
                  : avgSolar !== null
                  ? `${avgSolar.toFixed(1)} kWh/m²`
                  : "N/A"}
              </div>
            </div>
          </div>

          {/* Weather Chart */}
          <WeatherChart records={records} />

          {/* Farmer Advisories */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8A9B93]">
              Farmer Action Advisories
            </h3>
            {isLoadingNasa ? (
              <div className="text-xs text-[#8A9B93] py-3">
                Analyzing NASA satellite observations...
              </div>
            ) : advisories.length > 0 ? (
              advisories.map((adv) => {
                const styles = {
                  good: "bg-[#111920] border-[#A3E4B7]/30 text-[#E5F7EC]",
                  info: "bg-[#111920] border-sky-400/30 text-sky-100",
                  warning: "bg-[#111920] border-amber-400/35 text-amber-100",
                  alert: "bg-[#111920] border-rose-400/40 text-rose-100",
                }[adv.severity];

                const badgeStyles = {
                  good: "bg-[#A3E4B7]/15 text-[#A3E4B7]",
                  info: "bg-sky-400/15 text-sky-300",
                  warning: "bg-amber-400/15 text-amber-300",
                  alert: "bg-rose-400/15 text-rose-300",
                }[adv.severity];

                const Icon =
                  adv.severity === "good"
                    ? CheckCircle2
                    : adv.severity === "info"
                    ? Info
                    : AlertTriangle;

                return (
                  <div
                    key={adv.id}
                    className={`rounded-2xl border p-3 ${styles}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {adv.title}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeStyles}`}
                      >
                        {adv.metric}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-[#9DB0A7]">
                      {adv.detail}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-[#8A9B93]">
                No advisories available for this location.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved Fields List */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#8A9B93]">
            My Marked Fields ({fields.length})
          </h3>
          {fields.length > 0 && (
            <button
              type="button"
              onClick={onExportGeoJSON}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#A3E4B7] hover:text-white transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export GeoJSON
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {fields.map((field) => {
            const active = field.id === selectedField?.id;
            return (
              <div
                key={field.id}
                onClick={() => onSelectField(field.id)}
                className={`group flex items-center justify-between gap-2 p-2.5 rounded-2xl border cursor-pointer transition ${
                  active
                    ? "bg-[#A3E4B7]/[0.08] border-[#A3E4B7]/50 shadow-sm"
                    : "bg-[#111920] border-white/[0.08] hover:border-white/20 hover:bg-[#151F28]"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-white/30 shadow-sm"
                    style={{ backgroundColor: field.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#F2F7F4] truncate">
                      {field.name}
                    </div>
                    <div className="text-[11px] text-[#8A9B93]">
                      {field.crop} &bull; {field.areaHectares.toFixed(2)} ha
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteField(field.id);
                  }}
                  className="p-1.5 rounded-lg text-[#8A9B93] hover:text-rose-400 hover:bg-rose-500/10 opacity-70 group-hover:opacity-100 transition"
                  title="Delete field"
                  aria-label={`Delete ${field.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export default memo(FieldSidebar);
