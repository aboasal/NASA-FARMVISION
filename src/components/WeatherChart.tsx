"use client";

import React, { memo } from "react";
import type { NasaDailyRecord } from "@/types/farm";

interface WeatherChartProps {
  records: NasaDailyRecord[];
}

function WeatherChart({ records }: WeatherChartProps) {
  if (records.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-xs text-[#8A9B93] border border-dashed border-white/10 rounded-2xl bg-[#111920]">
        No agro-weather data available
      </div>
    );
  }

  const maxPrecip = Math.max(10, ...records.map((r) => r.precipMm ?? 0));
  const temps = records
    .map((r) => r.tempC)
    .filter((v): v is number => v !== null);
  const minTemp = temps.length > 0 ? Math.min(...temps) - 2 : 0;
  const maxTemp = temps.length > 0 ? Math.max(...temps) + 2 : 40;
  const tempSpan = Math.max(1, maxTemp - minTemp);

  return (
    <div className="bg-[#111920] border border-white/[0.08] rounded-2xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#F2F7F4]">
          7-Day NASA POWER
        </span>
        <div className="flex items-center gap-3 text-[10px] text-[#8A9B93]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Temp
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-sky-400" />
            Rain
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#A3E4B7]" />
            Soil %
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 items-end h-28 pt-3">
        {records.map((rec) => {
          const rainHeight = Math.round(((rec.precipMm ?? 0) / maxPrecip) * 52);
          const tempPct =
            rec.tempC !== null
              ? Math.round(((rec.tempC - minTemp) / tempSpan) * 100)
              : 50;
          const soilPct =
            rec.soilWetness !== null ? Math.round(rec.soilWetness * 100) : null;
          const shortDate = rec.date.slice(5); // MM-DD

          return (
            <div
              key={rec.date}
              className="flex flex-col items-center justify-end h-full group relative"
            >
              {/* Temperature value */}
              <span className="text-[10px] font-semibold text-amber-300 mb-auto">
                {rec.tempC !== null ? `${rec.tempC.toFixed(0)}°` : "–"}
              </span>

              {/* Visual bar stack */}
              <div className="w-full flex items-end justify-center gap-0.5 h-14 relative">
                {/* Temp indicator dot */}
                <div
                  className="w-2 h-2 rounded-full bg-amber-400 border border-[#0D1318] shadow-sm absolute left-1/2 -translate-x-1/2 transition-all"
                  style={{ bottom: `${Math.max(4, Math.min(88, tempPct))}%` }}
                  title={`Avg Temp: ${rec.tempC ?? "N/A"}°C`}
                />
                {/* Rain bar */}
                <div
                  className="w-3 rounded-t bg-sky-400/80 transition-all"
                  style={{ height: `${Math.max(2, rainHeight)}px` }}
                  title={`Rain: ${rec.precipMm ?? 0} mm`}
                />
              </div>

              {/* Soil wetness pill */}
              <span className="text-[9px] font-medium text-[#A3E4B7] mt-1">
                {soilPct !== null ? `${soilPct}%` : "–"}
              </span>

              {/* Date label */}
              <span className="text-[9px] text-[#8A9B93] mt-0.5">
                {shortDate}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(WeatherChart);
