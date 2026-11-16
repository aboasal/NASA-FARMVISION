import type { ClimateProfile, MonthlyClimate, NasaPowerResponse, RiskLevel } from "@/types/farm";
import type { ClimatologyResult, TrendResult } from "./nasaPower";

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS_IN_MONTH = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** Ordinary least-squares slope (y per unit x) */
function slope(xs: number[], ys: number[]): number {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function level(value: number, medium: number, high: number): RiskLevel {
  return value >= high ? "high" : value >= medium ? "medium" : "low";
}

/**
 * Turns raw NASA POWER responses into a farmer-friendly climate &
 * resilience profile: rainfall pattern, dry/hot/frost months, how much
 * rain swings year to year, drought years and warming trend.
 */
export function buildClimateProfile(
  lat: number,
  lng: number,
  clim: ClimatologyResult,
  trends: TrendResult,
  recent: NasaPowerResponse
): ClimateProfile {
  const monthly: MonthlyClimate[] = MONTH_LABELS.map((month, i) => ({
    month,
    rainMm: Math.round(clim.rainMmPerDay[i] * DAYS_IN_MONTH[i]),
    tMeanC: Math.round(clim.t2m[i] * 10) / 10,
    tMaxC: Math.round(clim.t2mMax[i] * 10) / 10,
    tMinC: Math.round(clim.t2mMin[i] * 10) / 10,
    rootZoneWetness: clim.rootWetness[i],
    solarKwh: clim.solar[i],
  }));

  const annualRainMm = monthly.reduce((s, m) => s + m.rainMm, 0);
  const meanTempC = Math.round(mean(monthly.map((m) => m.tMeanC)) * 10) / 10;

  // Hargreaves-Samani / radiation-adjusted reference evapotranspiration (ET0)
  // NASA POWER ALLSKY_SFC_SW_DWN is MJ/m²/day in climatology (typically 8..28); convert if kWh
  const monthlyEt0Mm = monthly.map((m, i) => {
    const tRange = Math.max(2, m.tMaxC - m.tMinC);
    const rawSolar = m.solarKwh ?? 17;
    const rsMj = rawSolar <= 9 ? rawSolar * 3.6 : rawSolar;
    const et0Day = clamp(
      0.0085 * Math.max(4, m.tMeanC + 17.8) * (rsMj / 2.45) * clamp(Math.sqrt(tRange / 11), 0.78, 1.22),
      0.9,
      8.5
    );
    return Math.round(et0Day * DAYS_IN_MONTH[i]);
  });
  const annualEt0Mm = monthlyEt0Mm.reduce((a, b) => a + b, 0);

  // Dry month: little rain AND warm enough that crops are actively drinking
  const dryMonths = monthly
    .filter((m) => m.rainMm < 25 && m.tMeanC > 8)
    .map((m) => m.month);
  const hotMonths = monthly.filter((m) => m.tMaxC >= 35).map((m) => m.month);
  const frostMonths = monthly.filter((m) => m.tMinC <= 2).map((m) => m.month);

  // ---- Year-to-year variability & trends (10 years NASA monthly data) ----
  let rainVariabilityPct: number | null = null;
  let droughtYears: number | null = null;
  let driestYear: number | null = null;
  let driestYearRainMm: number | null = null;
  let warmingPerDecadeC: number | null = null;
  const years = trends.years;

  if (years.length >= 5) {
    const rains = years.map((y) => y.rainMm);
    const avg = mean(rains);
    const sd = Math.sqrt(mean(rains.map((r) => (r - avg) ** 2)));
    rainVariabilityPct = avg > 0 ? Math.round((sd / avg) * 100) : null;
    droughtYears = years.filter((y) => y.rainMm < avg * 0.8).length;
    const driest = years.reduce((a, b) => (b.rainMm < a.rainMm ? b : a));
    driestYear = driest.year;
    driestYearRainMm = driest.rainMm;
    warmingPerDecadeC =
      Math.round(
        slope(
          years.map((y) => y.year),
          years.map((y) => y.meanMaxTempC)
        ) * 10 * 100
      ) / 100;
  }

  // ---- Recent 30 days vs normal ----
  const recs = recent.records;
  const rain30 = recs.reduce((s, r) => s + (r.precipMm ?? 0), 0);
  const temps = recs.map((r) => r.tempC).filter((v): v is number => v !== null);
  const wet = recs.map((r) => r.soilWetness).filter((v): v is number => v !== null);
  const rootWet = recs
    .map((r) => (r as { rootWetness?: number | null }).rootWetness ?? null)
    .filter((v): v is number => v !== null);

  const nowMonth = new Date().getUTCMonth();
  const normalRain30 = monthly[nowMonth].rainMm;
  const tempAnomalyC = temps.length
    ? Math.round((mean(temps) - monthly[nowMonth].tMeanC) * 10) / 10
    : null;
  const rainAnomalyPct =
    normalRain30 >= 5 ? Math.round(((rain30 - normalRain30) / normalRain30) * 100) : null;

  // ---- Risk levels ----
  const droughtScore =
    (annualRainMm < 250 ? 2 : annualRainMm < 550 ? 1 : 0) +
    (dryMonths.length >= 6 ? 1 : 0) +
    ((droughtYears ?? 0) >= 3 ? 1 : 0);
  const risks = {
    drought: level(droughtScore, 1, 3),
    heat: level(hotMonths.length + ((warmingPerDecadeC ?? 0) > 0.3 ? 1 : 0), 1, 3),
    frost: level(frostMonths.length, 1, 3),
    rainfallSwings: level(rainVariabilityPct ?? 0, 18, 30),
  } as const;

  const zoneLabel =
    (meanTempC >= 22 ? "Hot" : meanTempC >= 14 ? "Warm" : meanTempC >= 6 ? "Mild" : "Cold") +
    " & " +
    (annualRainMm < 250
      ? "very dry"
      : annualRainMm < 550
        ? "semi-dry"
        : annualRainMm < 1000
          ? "moderately wet"
          : "wet");

  return {
    location: { lat, lng },
    zoneLabel,
    annualRainMm,
    annualEt0Mm,
    meanTempC,
    monthly,
    dryMonths,
    hotMonths,
    frostMonths,
    rainVariabilityPct,
    droughtYears,
    yearsAnalyzed: years.length || null,
    firstYear: years[0]?.year ?? null,
    lastYear: years[years.length - 1]?.year ?? null,
    driestYear,
    driestYearRainMm,
    warmingPerDecadeC,
    recent: {
      rain30dMm: recs.length ? Math.round(rain30) : null,
      topsoilWetnessPct: wet.length ? Math.round(wet[wet.length - 1] * 100) : null,
      rootZoneWetnessPct: rootWet.length
        ? Math.round(rootWet[rootWet.length - 1] * 100)
        : null,
      tempAnomalyC,
      rainAnomalyPct,
    },
    risks: { ...risks },
    sources: {
      climatology: clim.source,
      trends: trends.source,
      recent: recent.source === "nasa-power" ? "nasa-power" : "estimated",
    },
  };
}
