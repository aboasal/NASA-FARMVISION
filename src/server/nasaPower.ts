import type { DataSource, NasaDailyRecord, NasaPowerResponse } from "@/types/farm";
import { cached, DAY, HOUR } from "./cache";

/**
 * Server-side client for the NASA POWER API (Prediction Of Worldwide Energy
 * Resources) — https://power.larc.nasa.gov/docs/services/api/
 *
 * Endpoints used (Agroclimatology "AG" community, no API key required):
 *  - temporal/daily/point        → last ~30 days of weather & soil wetness
 *  - temporal/climatology/point  → long-term monthly averages (normals)
 *  - temporal/monthly/point      → 10 years of monthly values (trends & variability)
 */

const POWER_BASE = "https://power.larc.nasa.gov/api/temporal";
const TIMEOUT_MS = 15000;
export const MONTH_KEYS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

type ParamTable = Record<string, Record<string, number>>;

function clean(v: number | undefined | null): number | null {
  if (v === undefined || v === null || !Number.isFinite(v) || v <= -900) return null;
  return v;
}

function round(v: number | null, digits = 2): number | null {
  if (v === null) return null;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function getPowerParameters(url: string): Promise<ParamTable> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`NASA POWER HTTP ${res.status}`);
  const json = await res.json();
  const parameter = json?.properties?.parameter as ParamTable | undefined;
  if (!parameter || Object.keys(parameter).length === 0) {
    throw new Error("NASA POWER returned no parameters");
  }
  return parameter;
}

function coordKey(lat: number, lng: number) {
  // POWER resolution is ~0.5° — 2 decimals is plenty for caching
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

/* ------------------------------------------------------------------ */
/* 1. Recent daily weather (last ~30 days)                              */
/* ------------------------------------------------------------------ */

export function getRecentDaily(lat: number, lng: number): Promise<NasaPowerResponse> {
  return cached(`daily:${coordKey(lat, lng)}`, 6 * HOUR, async () => {
    const params = new URLSearchParams({
      parameters: "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,GWETTOP,GWETROOT",
      community: "AG",
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      start: isoDaysAgo(33).replace(/-/g, ""),
      end: isoDaysAgo(3).replace(/-/g, ""),
      format: "JSON",
    });
    try {
      const p = await getPowerParameters(`${POWER_BASE}/daily/point?${params}`);
      const dates = Object.keys(p.T2M ?? {}).sort();
      const records: (NasaDailyRecord & { rootWetness: number | null })[] = dates
        .map((d) => ({
          date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
          tempC: round(clean(p.T2M?.[d])),
          tempMaxC: round(clean(p.T2M_MAX?.[d])),
          tempMinC: round(clean(p.T2M_MIN?.[d])),
          precipMm: round(clean(p.PRECTOTCORR?.[d])),
          solarKwh: round(clean(p.ALLSKY_SFC_SW_DWN?.[d])),
          humidityPct: round(clean(p.RH2M?.[d])),
          soilWetness: round(clean(p.GWETTOP?.[d])),
          rootWetness: round(clean(p.GWETROOT?.[d])),
        }))
        .filter((r) => r.tempC !== null || r.precipMm !== null);
      if (records.length === 0) throw new Error("No valid daily records");
      return {
        records,
        source: "nasa-power" as const,
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      return {
        records: estimateDaily(lat, lng),
        source: "fallback" as const,
        fetchedAt: new Date().toISOString(),
      };
    }
  });
}

/* ------------------------------------------------------------------ */
/* 2. Long-term climatology (monthly normals)                           */
/* ------------------------------------------------------------------ */

export interface ClimatologyResult {
  source: DataSource;
  /** per month JAN..DEC */
  t2m: number[];
  t2mMax: number[];
  t2mMin: number[];
  rainMmPerDay: number[];
  rootWetness: (number | null)[];
  solar: (number | null)[];
}

export function getClimatology(lat: number, lng: number): Promise<ClimatologyResult> {
  return cached(`clim:${coordKey(lat, lng)}`, 30 * DAY, async () => {
    const params = new URLSearchParams({
      parameters: "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,GWETROOT,ALLSKY_SFC_SW_DWN",
      community: "AG",
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      format: "JSON",
    });
    try {
      const p = await getPowerParameters(`${POWER_BASE}/climatology/point?${params}`);
      const pick = (name: string) => MONTH_KEYS.map((m) => clean(p[name]?.[m]));
      const t2m = pick("T2M");
      const rain = pick("PRECTOTCORR");
      if (t2m.some((v) => v === null) || rain.some((v) => v === null)) {
        throw new Error("Incomplete climatology");
      }
      const fill = (arr: (number | null)[], fallback: number[]) =>
        arr.map((v, i) => (v === null ? fallback[i] : v));
      const t2mVals = t2m as number[];
      return {
        source: "nasa-power" as const,
        t2m: t2mVals,
        t2mMax: fill(pick("T2M_MAX"), t2mVals.map((v) => v + 6)),
        t2mMin: fill(pick("T2M_MIN"), t2mVals.map((v) => v - 6)),
        rainMmPerDay: rain as number[],
        rootWetness: pick("GWETROOT"),
        solar: pick("ALLSKY_SFC_SW_DWN"),
      };
    } catch {
      return estimateClimatology(lat);
    }
  });
}

/* ------------------------------------------------------------------ */
/* 3. Ten years of monthly data (variability & warming trend)           */
/* ------------------------------------------------------------------ */

export interface YearlyStat {
  year: number;
  rainMm: number;
  meanMaxTempC: number;
  hotMonths: number; // months with avg max ≥ 35°C
}

export interface TrendResult {
  source: DataSource;
  years: YearlyStat[];
}

const DAYS_IN_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function getMonthlyTrends(lat: number, lng: number): Promise<TrendResult> {
  const endYear = new Date().getUTCFullYear() - 1;
  const startYear = endYear - 9;
  return cached(`trend:${coordKey(lat, lng)}:${endYear}`, 7 * DAY, async () => {
    const params = new URLSearchParams({
      parameters: "PRECTOTCORR,T2M_MAX",
      community: "AG",
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      start: String(startYear),
      end: String(endYear),
      format: "JSON",
    });
    try {
      const p = await getPowerParameters(`${POWER_BASE}/monthly/point?${params}`);
      const years: YearlyStat[] = [];
      for (let y = startYear; y <= endYear; y++) {
        let rain = 0;
        let tmaxSum = 0;
        let hot = 0;
        let okMonths = 0;
        for (let m = 1; m <= 12; m++) {
          const key = `${y}${String(m).padStart(2, "0")}`;
          const r = clean(p.PRECTOTCORR?.[key]);
          const t = clean(p.T2M_MAX?.[key]);
          if (r === null || t === null) continue;
          okMonths++;
          rain += r * DAYS_IN_MONTH[m - 1];
          tmaxSum += t;
          if (t >= 35) hot++;
        }
        if (okMonths >= 10) {
          years.push({
            year: y,
            rainMm: Math.round((rain * 12) / okMonths),
            meanMaxTempC: Math.round((tmaxSum / okMonths) * 10) / 10,
            hotMonths: hot,
          });
        }
      }
      if (years.length < 5) throw new Error("Not enough yearly data");
      return { source: "nasa-power" as const, years };
    } catch {
      return { source: "estimated" as const, years: [] };
    }
  });
}

/* ------------------------------------------------------------------ */
/* Offline estimates (used only when NASA POWER is unreachable)         */
/* ------------------------------------------------------------------ */

function estimateClimatology(lat: number): ClimatologyResult {
  const absLat = Math.abs(lat);
  const annualMean = Math.max(2, 28 - absLat * 0.42);
  const amplitude = Math.min(14, 2 + absLat * 0.28);
  const southern = lat < 0;
  const t2m = MONTH_KEYS.map((_, i) => {
    const phase = ((i - (southern ? 0 : 6)) / 12) * 2 * Math.PI;
    return Math.round((annualMean - amplitude * Math.cos(phase)) * 10) / 10;
  });
  const wetBase = absLat < 12 ? 4 : absLat < 35 ? 1.2 : 2.2;
  const rain = MONTH_KEYS.map((_, i) => {
    const phase = ((i - (southern ? 0 : 6)) / 12) * 2 * Math.PI;
    return Math.max(0.05, Math.round((wetBase + wetBase * 0.6 * Math.cos(phase)) * 100) / 100);
  });
  return {
    source: "estimated",
    t2m,
    t2mMax: t2m.map((v) => v + 6.5),
    t2mMin: t2m.map((v) => v - 6.5),
    rainMmPerDay: rain,
    rootWetness: MONTH_KEYS.map(() => null),
    solar: MONTH_KEYS.map(() => null),
  };
}

function estimateDaily(lat: number, lng: number): (NasaDailyRecord & { rootWetness: number | null })[] {
  const absLat = Math.abs(lat);
  const baseTemp = Math.max(6, 30 - absLat * 0.45);
  const seed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233));
  return Array.from({ length: 30 }, (_, idx) => {
    const wave = Math.sin((idx + seed * 10) * 0.6);
    const tempC = Math.round((baseTemp + wave * 2.4) * 10) / 10;
    const precipMm = idx % 6 === 2 ? Math.round((2 + seed * 6) * 10) / 10 : 0.2;
    return {
      date: isoDaysAgo(33 - idx),
      tempC,
      tempMaxC: Math.round((tempC + 5.5) * 10) / 10,
      tempMinC: Math.round((tempC - 5.2) * 10) / 10,
      precipMm,
      solarKwh: Math.round((4.6 + (1 - absLat / 90) * 1.8) * 100) / 100,
      humidityPct: Math.round(48 + seed * 28),
      soilWetness: Math.round((0.3 + seed * 0.25) * 100) / 100,
      rootWetness: Math.round((0.35 + seed * 0.2) * 100) / 100,
    };
  });
}
