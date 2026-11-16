import type {
  CropCyclePlan,
  CropType,
  FarmAdvisory,
  FarmField,
  FarmerGroundInputs,
  NasaDailyRecord,
  NasaGibsLayerId,
  NasaPowerResponse,
  PlanPriority,
  PlanRequestBody,
  PlanResponse,
  PreviousCropType,
  SavedFieldRecord,
  WaterSupplyTier,
} from "@/types/farm";

export interface NasaGibsLayerConfig {
  id: NasaGibsLayerId;
  label: string;
  shortLabel: string;
  description: string;
  tileUrlTemplate?: string;
  maxNativeZoom?: number;
  legend?: {
    low: string;
    high: string;
    gradient: string;
  };
}

/**
 * Computes a recent date string (YYYY-MM-DD) offset by `daysAgo`.
 * NASA GIBS and POWER products typically lag 2-8 days behind real-time.
 */
export function getPastDateISO(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function getNasaGibsLayers(dateStr: string): NasaGibsLayerConfig[] {
  // Clamp date to at least 8 days ago for 8-day NDVI composite if user picks today
  const safeDate = dateStr || getPastDateISO(8);

  return [
    {
      id: "none",
      label: "No Satellite Overlay",
      shortLabel: "Off",
      description: "Show base imagery only for clear field boundary marking.",
    },
    {
      id: "ndvi",
      label: "NASA MODIS NDVI (Vegetation Health)",
      shortLabel: "NDVI Health",
      description:
        "8-day Terra MODIS Normalized Difference Vegetation Index. Greener = denser, healthier crop canopy.",
      tileUrlTemplate: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_NDVI_8Day/default/${safeDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`,
      maxNativeZoom: 9,
      legend: {
        low: "Bare / Stressed",
        high: "Lush Canopy",
        gradient: "linear-gradient(to right, #d97706, #eab308, #84cc16, #15803d)",
      },
    },
    {
      id: "soil-moisture",
      label: "NASA SMAP Soil Moisture",
      shortLabel: "Soil Moisture",
      description:
        "Root-zone soil moisture analysis from NASA SMAP satellite. Helps plan irrigation schedules.",
      tileUrlTemplate: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Analyzed_Root_Zone_Soil_Moisture/default/${safeDate}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,
      maxNativeZoom: 6,
      legend: {
        low: "Dry Soil",
        high: "Saturated",
        gradient: "linear-gradient(to right, #b45309, #fde68a, #38bdf8, #1d4ed8)",
      },
    },
    {
      id: "lst-day",
      label: "NASA Land Surface Temp (Day)",
      shortLabel: "Surface Temp",
      description:
        "Daytime land surface temperature from MODIS Terra. Spot heat-stress zones across your region.",
      tileUrlTemplate: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/${safeDate}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
      maxNativeZoom: 7,
      legend: {
        low: "Cool",
        high: "Hot",
        gradient: "linear-gradient(to right, #2563eb, #22c55e, #facc15, #dc2626)",
      },
    },
    {
      id: "true-color",
      label: "NASA MODIS True Color",
      shortLabel: "True Color",
      description:
        "Daily Terra MODIS corrected reflectance satellite pass.",
      tileUrlTemplate: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${safeDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
      maxNativeZoom: 9,
    },
  ];
}

function cleanNasaValue(val: number | undefined): number | null {
  if (val === undefined || val === null || val <= -900) return null;
  return Number(val.toFixed(2));
}

function formatPowerDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/**
 * Fetches 7 days of recent daily agroclimatology data from the public NASA POWER API.
 * Falls back to deterministic regional estimates if offline or rate-limited.
 */
const POWER_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // NASA POWER updates daily
const memoryCache = new Map<string, NasaPowerResponse>();
const inflight = new Map<string, Promise<NasaPowerResponse>>();

function powerCacheKey(lat: number, lng: number): string {
  // ~1 km grid; POWER resolution is 0.5° so this is more than precise enough
  return `power:${lat.toFixed(2)}:${lng.toFixed(2)}`;
}

function readCache(key: string): NasaPowerResponse | null {
  const mem = memoryCache.get(key);
  if (mem && Date.now() - Date.parse(mem.fetchedAt) < POWER_CACHE_TTL_MS) return mem;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as NasaPowerResponse;
      if (Date.now() - Date.parse(parsed.fetchedAt) < POWER_CACHE_TTL_MS) {
        memoryCache.set(key, parsed);
        return parsed;
      }
    }
  } catch {
    // sessionStorage unavailable
  }
  return null;
}

/**
 * Cached + de-duplicated wrapper around the NASA POWER API.
 * Re-selecting a field (or two fields in the same area) never re-hits the network.
 */
export function fetchNasaPowerData(
  lat: number,
  lng: number
): Promise<NasaPowerResponse> {
  const key = powerCacheKey(lat, lng);
  const cached = readCache(key);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = fetchNasaPowerUncached(lat, lng)
    .then((res) => {
      // Only cache real NASA data, so fallbacks are retried next time
      if (res.source === "nasa-power") {
        memoryCache.set(key, res);
        try {
          sessionStorage.setItem(key, JSON.stringify(res));
        } catch {
          // ignore quota errors
        }
      }
      return res;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
}

async function fetchNasaPowerUncached(
  lat: number,
  lng: number
): Promise<NasaPowerResponse> {
  // 1. Prefer our Next.js backend route (cached + avoids browser CORS/rate limits)
  try {
    const apiRes = await fetch(
      `/api/nasa/power?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`,
      { signal: AbortSignal.timeout(12000) }
    );
    if (apiRes.ok) {
      const data = (await apiRes.json()) as NasaPowerResponse;
      if (Array.isArray(data.records) && data.records.length > 0) {
        return {
          ...data,
          records: data.records.slice(-7),
        };
      }
    }
  } catch {
    // Fall through to direct NASA POWER or local estimate
  }

  // 2. Fallback: direct NASA POWER daily endpoint (lags ~3 days behind today)
  const endDate = getPastDateISO(3).replace(/-/g, "");
  const startDate = getPastDateISO(10).replace(/-/g, "");

  const params = new URLSearchParams({
    parameters:
      "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,GWETTOP",
    community: "AG",
    longitude: lng.toFixed(4),
    latitude: lat.toFixed(4),
    start: startDate,
    end: endDate,
    format: "JSON",
  });

  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?${params.toString()}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      throw new Error(`NASA POWER HTTP ${res.status}`);
    }

    const json = await res.json();
    const parameter = json?.properties?.parameter;
    if (!parameter || !parameter.T2M) {
      throw new Error("Invalid NASA POWER payload");
    }

    const dates = Object.keys(parameter.T2M).sort();
    const records: NasaDailyRecord[] = dates
      .map((d) => ({
        date: formatPowerDate(d),
        tempC: cleanNasaValue(parameter.T2M?.[d]),
        tempMaxC: cleanNasaValue(parameter.T2M_MAX?.[d]),
        tempMinC: cleanNasaValue(parameter.T2M_MIN?.[d]),
        precipMm: cleanNasaValue(parameter.PRECTOTCORR?.[d]),
        solarKwh: cleanNasaValue(parameter.ALLSKY_SFC_SW_DWN?.[d]),
        humidityPct: cleanNasaValue(parameter.RH2M?.[d]),
        soilWetness: cleanNasaValue(parameter.GWETTOP?.[d]),
      }))
      .filter((r) => r.tempC !== null || r.precipMm !== null)
      .slice(-7);

    if (records.length === 0) {
      throw new Error("No valid NASA POWER records returned");
    }

    return {
      records,
      source: "nasa-power",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return {
      records: buildFallbackRecords(lat, lng),
      source: "fallback",
      fetchedAt: new Date().toISOString(),
    };
  }
}

function buildFallbackRecords(lat: number, lng: number): NasaDailyRecord[] {
  const absLat = Math.abs(lat);
  const baseTemp = Math.max(6, 30 - absLat * 0.45);
  const seed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233));

  return Array.from({ length: 7 }, (_, idx) => {
    const daysAgo = 9 - idx;
    const wave = Math.sin((idx + seed * 10) * 0.9);
    const tempC = Number((baseTemp + wave * 2.4).toFixed(1));
    const precipMm = idx === 2 || idx === 5 ? Number((3.2 + seed * 6).toFixed(1)) : 0.2;
    const soilWetness = Number(
      Math.min(0.85, Math.max(0.18, 0.36 + seed * 0.25 + (precipMm > 1 ? 0.08 : 0))).toFixed(2)
    );

    return {
      date: getPastDateISO(daysAgo),
      tempC,
      tempMaxC: Number((tempC + 5.5).toFixed(1)),
      tempMinC: Number((tempC - 5.2).toFixed(1)),
      precipMm,
      solarKwh: Number((4.6 + (1 - absLat / 90) * 1.8 - (precipMm > 1 ? 1.1 : 0)).toFixed(2)),
      humidityPct: Number((48 + seed * 28 + (precipMm > 1 ? 12 : 0)).toFixed(1)),
      soilWetness,
    };
  });
}

/**
 * Translates raw NASA POWER metrics into actionable farmer advisories.
 */
export function generateFarmAdvisories(
  records: NasaDailyRecord[],
  crop: CropType
): FarmAdvisory[] {
  if (records.length === 0) return [];

  const validTemps = records.map((r) => r.tempMaxC).filter((v): v is number => v !== null);
  const validMinTemps = records.map((r) => r.tempMinC).filter((v): v is number => v !== null);
  const totalRain = records.reduce((acc, r) => acc + (r.precipMm ?? 0), 0);
  const validWetness = records.map((r) => r.soilWetness).filter((v): v is number => v !== null);
  const validHumidity = records.map((r) => r.humidityPct).filter((v): v is number => v !== null);
  const validSolar = records.map((r) => r.solarKwh).filter((v): v is number => v !== null);

  const latestWetness =
    validWetness.length > 0 ? validWetness[validWetness.length - 1] : null;
  const maxTemp = validTemps.length > 0 ? Math.max(...validTemps) : null;
  const minTemp = validMinTemps.length > 0 ? Math.min(...validMinTemps) : null;
  const avgHumidity =
    validHumidity.length > 0
      ? validHumidity.reduce((a, b) => a + b, 0) / validHumidity.length
      : null;
  const avgSolar =
    validSolar.length > 0
      ? validSolar.reduce((a, b) => a + b, 0) / validSolar.length
      : null;

  const advisories: FarmAdvisory[] = [];

  // 1. Irrigation & Soil Moisture Advisory
  if (latestWetness !== null) {
    const pct = Math.round(latestWetness * 100);
    if (latestWetness < 0.35 && totalRain < 8) {
      advisories.push({
        id: "irrigation-low",
        title: "Irrigation Recommended",
        detail: `Topsoil wetness is low (${pct}%) with only ${totalRain.toFixed(1)} mm rainfall over 7 days. Schedule irrigation for your ${crop.toLowerCase()}.`,
        severity: "warning",
        metric: `${pct}% Soil Wetness`,
      });
    } else if (latestWetness > 0.75) {
      advisories.push({
        id: "irrigation-high",
        title: "High Soil Saturation",
        detail: `Surface soil wetness is ${pct}%. Hold off on irrigation and check field drainage to prevent root waterlogging.`,
        severity: "info",
        metric: `${pct}% Soil Wetness`,
      });
    } else {
      advisories.push({
        id: "irrigation-good",
        title: "Balanced Soil Moisture",
        detail: `Topsoil moisture (${pct}%) is in a healthy range for ${crop.toLowerCase()} root uptake.`,
        severity: "good",
        metric: `${pct}% Soil Wetness`,
      });
    }
  }

  // 2. Heat or Frost Stress Advisory
  if (maxTemp !== null && maxTemp >= 35) {
    advisories.push({
      id: "heat-stress",
      title: "Heat Stress Watch",
      detail: `Peak temperature reached ${maxTemp.toFixed(1)}°C. Irrigate early morning or evening to reduce evaporation loss.`,
      severity: "alert",
      metric: `Peak ${maxTemp.toFixed(1)}°C`,
    });
  } else if (minTemp !== null && minTemp <= 2) {
    advisories.push({
      id: "frost-risk",
      title: "Cold / Frost Risk",
      detail: `Minimum temperature dropped to ${minTemp.toFixed(1)}°C. Protect sensitive ${crop.toLowerCase()} seedlings overnight.`,
      severity: "alert",
      metric: `Low ${minTemp.toFixed(1)}°C`,
    });
  }

  // 3. Fungal / Humidity Advisory
  if (avgHumidity !== null && avgHumidity >= 78) {
    advisories.push({
      id: "humidity-fungal",
      title: "Monitor for Fungal Pressure",
      detail: `7-day average humidity is ${Math.round(avgHumidity)}%. Inspect lower leaves for rust, mildew, or blight.`,
      severity: "warning",
      metric: `${Math.round(avgHumidity)}% RH`,
    });
  }

  // 4. Solar Irradiance Advisory
  if (avgSolar !== null) {
    advisories.push({
      id: "solar-growth",
      title:
        avgSolar >= 4.5
          ? "Strong Solar Growing Energy"
          : "Moderate Solar Irradiance",
      detail: `Averaging ${avgSolar.toFixed(1)} kWh/m²/day of sunlight, supporting steady ${crop.toLowerCase()} photosynthesis.`,
      severity: avgSolar >= 4.5 ? "good" : "info",
      metric: `${avgSolar.toFixed(1)} kWh/m²`,
    });
  }

  return advisories;
}

export const PREVIOUS_CROP_INFO: Record<
  PreviousCropType,
  {
    label: string;
    soilEffect: string;
    nitrogenImpact:
      | "depletes-heavy"
      | "depletes-moderate"
      | "fixes-nitrogen"
      | "neutral";
  }
> = {
  Wheat: {
    label: "Wheat / Barley",
    soilEffect:
      "Used up moderate soil food (nitrogen). Best to plant beans, peas, or a different crop next so wheat pests don't return.",
    nitrogenImpact: "depletes-moderate",
  },
  Corn: {
    label: "Corn (Maize)",
    soilEffect:
      "Heavy feeder that took a lot of plant food from the soil. Planting beans or clover next will put free fertilizer back.",
    nitrogenImpact: "depletes-heavy",
  },
  Rice: {
    label: "Rice / Paddy",
    soilEffect:
      "Wet soil that needs airing out and fresh nutrients. Deep-root or bean crops work great next.",
    nitrogenImpact: "depletes-heavy",
  },
  Cotton: {
    label: "Cotton",
    soilEffect:
      "Took deep soil nutrients. Rotate to grains or beans to stop cotton pests from carrying over.",
    nitrogenImpact: "depletes-heavy",
  },
  Vegetables: {
    label: "Vegetables / Tomatoes",
    soilEffect:
      "Used the top layer of soil heavily. Needs a grain or bean crop next to stop root sickness.",
    nitrogenImpact: "depletes-moderate",
  },
  Soybeans: {
    label: "Soybeans / Legumes",
    soilEffect:
      "Left natural plant food (nitrogen) in the soil! Your land is ready for a strong cash crop.",
    nitrogenImpact: "fixes-nitrogen",
  },
  Orchard: {
    label: "Orchard / Perennial",
    soilEffect:
      "Tree land with steady soil. Good for planting cover crops or vegetables between rows.",
    nitrogenImpact: "neutral",
  },
  Fallow: {
    label: "Fallow / Unplanted",
    soilEffect:
      "Rested land with saved moisture. Ready for planting as soon as weeds are cleared.",
    nitrogenImpact: "neutral",
  },
};

export const WATER_TIER_PRESETS: Record<
  WaterSupplyTier,
  { label: string; defaultM3PerHa: number; desc: string }
> = {
  low: {
    label: "Little Water (Rain Only)",
    defaultM3PerHa: 1500,
    desc: "Mostly rain or a small water tank (~1,500 m³/ha).",
  },
  moderate: {
    label: "Medium Water (Well or Canal)",
    defaultM3PerHa: 4000,
    desc: "Regular canal turn or well pump (~4,000 m³/ha).",
  },
  high: {
    label: "Plenty of Water (Drip / River / Pump)",
    defaultM3PerHa: 7500,
    desc: "Steady water whenever crops need it (~7,500 m³/ha).",
  },
};

function meanOrNull(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * Generates 3 ranked multi-season crop cycle plans by combining NASA POWER
 * satellite observations (temp, rain, soil wetness, sunlight), field area,
 * and non-NASA farmer inputs (water quota, last crop, and strategic priority).
 */
export function generateCropCyclePlans(
  field: FarmField,
  inputs: FarmerGroundInputs,
  nasaData: NasaPowerResponse | null
): CropCyclePlan[] {
  const records =
    nasaData?.records ??
    buildFallbackRecords(field.centroid[0], field.centroid[1]);
  const avgTempC = meanOrNull(records.map((r) => r.tempC)) ?? 22;
  const totalRainMm = records.reduce((acc, r) => acc + (r.precipMm ?? 0), 0);
  const validWetness = records
    .map((r) => r.soilWetness)
    .filter((v): v is number => v !== null);
  const soilWetnessPct = Math.round(
    (validWetness.length > 0 ? validWetness[validWetness.length - 1] : 0.35) *
      100
  );

  const isWarmClimate = avgTempC >= 20;
  const isDryTopsoil = soilWetnessPct < 35 && totalRainMm < 10;
  const prevInfo = PREVIOUS_CROP_INFO[inputs.lastCrop];
  const needsNitrogenRecovery =
    prevInfo.nitrogenImpact === "depletes-heavy" ||
    prevInfo.nitrogenImpact === "depletes-moderate";
  const hasNitrogenCredit = prevInfo.nitrogenImpact === "fixes-nitrogen";
  const availableWater = Math.max(inputs.waterM3PerHa, 0);
  const isLowWater = availableWater <= 2200 || inputs.waterTier === "low";
  const effectiveAreaHa = Math.max(field.areaHectares, 0.1);

  type CandidateSpec = Omit<
    CropCyclePlan,
    "matchScore" | "waterStatus" | "estimatedTotalRevenueUsd" | "badge"
  >;

  const avoidRepeatVeg = inputs.lastCrop === "Vegetables";
  const avoidRepeatCorn = inputs.lastCrop === "Corn";
  const avoidRepeatWheat = inputs.lastCrop === "Wheat";
  const avoidRepeatRice = inputs.lastCrop === "Rice";

  const marketCrop1 = isLowWater
    ? "Sesame"
    : avoidRepeatVeg
      ? isWarmClimate
        ? "Sunflower"
        : "Canola (Rapeseed)"
      : hasNitrogenCredit || inputs.priority === "profit"
        ? "Tomatoes"
        : "Potatoes";
  const marketCrop2 = isLowWater
    ? "Chickpeas"
    : avoidRepeatCorn
      ? "Soybeans"
      : isWarmClimate
        ? "Corn (Maize)"
        : "Faba Beans";
  const marketCrop3 =
    inputs.priority === "sustainability"
      ? "Berseem Clover"
      : isLowWater
        ? "Grain Sorghum"
        : "Barley";

  const soilCrop1 = hasNitrogenCredit
    ? avoidRepeatWheat
      ? "Barley"
      : "Wheat"
    : avoidRepeatCorn || avoidRepeatRice
      ? "Lentils"
      : "Faba Beans";
  const soilCrop2 = isLowWater
    ? "Grain Sorghum"
    : avoidRepeatWheat
      ? "Sunflower"
      : "Wheat";
  const soilCrop3 = isLowWater ? "Cowpeas" : "Berseem Clover";

  const balancedCrop1 =
    inputs.lastCrop === "Cotton"
      ? "Wheat"
      : inputs.priority === "profit" && !isLowWater
        ? "Potatoes"
        : "Sunflower";
  const balancedCrop2 = avoidRepeatCorn ? "Barley" : "Grain Sorghum";
  const balancedCrop3 = hasNitrogenCredit ? "Winter Rye Cover" : "Chickpeas";

  const candidates: CandidateSpec[] = [
    {
      id: "plan-market-cash",
      name: "Market Cash Rotation",
      tagline: isLowWater
        ? "Targets highest-value dryland cash crops suited to tight irrigation"
        : "Maximizes harvest cash income while rotating plant families",
      recommendedFor: "profit",
      waterNeededM3PerHa: isLowWater ? 2100 : isWarmClimate ? 5200 : 4600,
      dryYearWaterNeedM3PerHa: isLowWater ? 2500 : 6100,
      estimatedRevenuePerHaUsd: isLowWater ? 4650 : 8400,
      soilHealthScore: hasNitrogenCredit ? 76 : 64,
      profitScore: 95,
      waterEfficiencyScore: isLowWater ? 82 : 56,
      resilienceScore: isLowWater ? 80 : 58,
      stages: [
        {
          season: "1st Planting",
          crop: marketCrop1,
          durationMonths: "Months 1–4",
          role: "Top-earning harvest tailored to your water & last crop.",
        },
        {
          season: "2nd Planting",
          crop: marketCrop2,
          durationMonths: "Months 5–8",
          role: "Complementary legume or summer crop restoring nitrogen.",
        },
        {
          season: "3rd Planting",
          crop: marketCrop3,
          durationMonths: "Months 9–12",
          role: "Breaks pest cycles and protects soil structure.",
        },
      ],
      threeYearCycle: [
        {
          year: 1,
          title: "Year 1 • Immediate Action",
          crops: [marketCrop1, marketCrop2, marketCrop3],
          soilHealthScore: hasNitrogenCredit ? 76 : 64,
          estimatedRevenuePerHaUsd: isLowWater ? 4650 : 8400,
          summary: `Starts with ${marketCrop1} after your ${inputs.lastCrop.toLowerCase()} harvest.`,
        },
        {
          year: 2,
          title: "Year 2 • Break Pests & Rebuild Soil",
          crops: ["Faba Beans", "Grain Sorghum", "Cowpeas"],
          soilHealthScore: hasNitrogenCredit ? 84 : 74,
          estimatedRevenuePerHaUsd: isLowWater ? 4850 : 8750,
          summary: "Rotates to deep-root legumes so nutrients recharge naturally.",
        },
        {
          year: 3,
          title: "Year 3 • Peak Fertility & Resilience",
          crops: [isLowWater ? "Chickpeas" : "Potatoes", "Soybeans", "Barley"],
          soilHealthScore: hasNitrogenCredit ? 90 : 82,
          estimatedRevenuePerHaUsd: isLowWater ? 5050 : 9100,
          summary: "Combines built-up organic matter with high-value rotation.",
        },
      ],
      whyItFits: [
        `Selects ${marketCrop1} after ${inputs.lastCrop} so pests and diseases don't carry over.`,
        `Weather (~${avgTempC.toFixed(0)}°C avg) matches this planting schedule.`,
      ],
      actionSteps: [
        "Use drip or furrow timing early morning to minimize evaporation loss.",
        "Monitor soil moisture in the NASA 2D layer before fertilizing.",
      ],
    },
    {
      id: "plan-soil-builder",
      name: "Soil-Builder Rotation",
      tagline: "Beans + grain + living cover — rebuilds organic matter naturally",
      recommendedFor: "sustainability",
      waterNeededM3PerHa: isLowWater ? 2000 : 3400,
      dryYearWaterNeedM3PerHa: isLowWater ? 2350 : 4100,
      estimatedRevenuePerHaUsd: 3580,
      soilHealthScore: 95,
      profitScore: 76,
      waterEfficiencyScore: 84,
      resilienceScore: 84,
      stages: [
        {
          season: "1st Planting",
          crop: soilCrop1,
          durationMonths: "Months 1–4",
          role: "Rebuilds soil nitrogen and loosens topsoil after harvest.",
        },
        {
          season: "2nd Planting",
          crop: soilCrop2,
          durationMonths: "Months 5–8",
          role: "Converts free legume nitrogen into dependable grain.",
        },
        {
          season: "3rd Planting",
          crop: soilCrop3,
          durationMonths: "Months 9–12",
          role: "Living cover protecting moisture and topsoil.",
        },
      ],
      threeYearCycle: [
        {
          year: 1,
          title: "Year 1 • Immediate Action",
          crops: [soilCrop1, soilCrop2, soilCrop3],
          soilHealthScore: 95,
          estimatedRevenuePerHaUsd: 3580,
          summary: `Rebuilds organic matter right after ${inputs.lastCrop.toLowerCase()}.`,
        },
        {
          year: 2,
          title: "Year 2 • Break Pests & Rebuild Soil",
          crops: ["Sunflower", "Chickpeas", "Vetch & Oat Cover Mix"],
          soilHealthScore: 97,
          estimatedRevenuePerHaUsd: 3720,
          summary: "Alternates deep-taproot oilseeds and pulses.",
        },
        {
          year: 3,
          title: "Year 3 • Peak Fertility & Resilience",
          crops: ["Soybeans", "Barley", "Winter Rye Cover"],
          soilHealthScore: 99,
          estimatedRevenuePerHaUsd: 3860,
          summary: "Sustains peak soil carbon and low fertilizer costs.",
        },
      ],
      whyItFits: [
        `Directly helps your land recover after ${inputs.lastCrop}: ${prevInfo.soilEffect}`,
        `NASA data shows ${soilWetnessPct}% soil moisture and ${totalRainMm.toFixed(0)} mm recent rain.`,
      ],
      actionSteps: [
        "Use legume inoculant at planting for maximum natural nitrogen.",
        "Leave chopped stalks as mulch instead of burning them.",
      ],
    },
    {
      id: "plan-weather-ready",
      name: "Weather & Water-Smart Rotation",
      tagline: "Drought- and heat-hardy crops built for tight water and hot weather",
      recommendedFor: "water-saving",
      waterNeededM3PerHa: 1750,
      dryYearWaterNeedM3PerHa: 2100,
      estimatedRevenuePerHaUsd: 3900,
      soilHealthScore: 86,
      profitScore: 72,
      waterEfficiencyScore: 96,
      resilienceScore: 96,
      stages: [
        {
          season: "1st Planting",
          crop: inputs.lastCrop === "Wheat" ? "Chickpeas" : "Barley",
          durationMonths: "Months 1–4",
          role: "Thrives on light moisture and establishes quickly.",
        },
        {
          season: "2nd Planting",
          crop: isWarmClimate ? "Sesame" : "Lentils",
          durationMonths: "Months 5–8",
          role: "Heat-hardy cash crop that copes with dry spells.",
        },
        {
          season: "3rd Planting",
          crop: "Pearl Millet",
          durationMonths: "Months 9–12",
          role: "Ultra-hardy grain with deep roots and low irrigation need.",
        },
      ],
      threeYearCycle: [
        {
          year: 1,
          title: "Year 1 • Immediate Action",
          crops: [inputs.lastCrop === "Wheat" ? "Chickpeas" : "Barley", isWarmClimate ? "Sesame" : "Lentils", "Pearl Millet"],
          soilHealthScore: 86,
          estimatedRevenuePerHaUsd: 3900,
          summary: "Low-water starter rotation tailored for weather safety.",
        },
        {
          year: 2,
          title: "Year 2 • Break Pests & Rebuild Soil",
          crops: ["Lentils", "Grain Sorghum", "Cowpeas"],
          soilHealthScore: 91,
          estimatedRevenuePerHaUsd: 4060,
          summary: "Alternates legumes and drought-tolerant cereals.",
        },
        {
          year: 3,
          title: "Year 3 • Peak Fertility & Resilience",
          crops: ["Sesame", "Chickpeas", "Sorghum-Sudangrass Cover"],
          soilHealthScore: 95,
          estimatedRevenuePerHaUsd: 4210,
          summary: "Long-term resilience even in repeated dry seasons.",
        },
      ],
      whyItFits: [
        isDryTopsoil
          ? `Dry soil reading (${soilWetnessPct}%) makes low-water hardy crops safest.`
          : `Keeps water demand low (~1,750 m³/ha) across all seasons.`,
      ],
      actionSteps: [
        "Save irrigation turns for flowering and seed-filling stages.",
        "Cover bare rows with straw mulch to slow sun evaporation.",
      ],
    },
    {
      id: "plan-balanced",
      name: "Balanced 3-Family Rotation",
      tagline: "Three plant families across the year to break pests and spread risk",
      recommendedFor: "sustainability",
      waterNeededM3PerHa: isLowWater ? 2050 : 3200,
      dryYearWaterNeedM3PerHa: isLowWater ? 2400 : 3850,
      estimatedRevenuePerHaUsd: 4350,
      soilHealthScore: 89,
      profitScore: 82,
      waterEfficiencyScore: 86,
      resilienceScore: 86,
      stages: [
        {
          season: "1st Planting",
          crop: balancedCrop1,
          durationMonths: "Months 1–4",
          role: "Distinct family opening crop to interrupt field pests.",
        },
        {
          season: "2nd Planting",
          crop: balancedCrop2,
          durationMonths: "Months 5–8",
          role: "Steady grain crop leveraging deep root structure.",
        },
        {
          season: "3rd Planting",
          crop: balancedCrop3,
          durationMonths: "Months 9–12",
          role: "Restores soil organic matter and nitrogen balance.",
        },
      ],
      threeYearCycle: [
        {
          year: 1,
          title: "Year 1 • Immediate Action",
          crops: [balancedCrop1, balancedCrop2, balancedCrop3],
          soilHealthScore: 89,
          estimatedRevenuePerHaUsd: 4350,
          summary: "Balanced oilseed, grain, and legume diversity.",
        },
        {
          year: 2,
          title: "Year 2 • Break Pests & Rebuild Soil",
          crops: ["Faba Beans", "Wheat", "Vetch & Oat Cover Mix"],
          soilHealthScore: 94,
          estimatedRevenuePerHaUsd: 4520,
          summary: "Swaps plant families again in Year 2.",
        },
        {
          year: 3,
          title: "Year 3 • Peak Fertility & Resilience",
          crops: ["Canola (Rapeseed)", "Chickpeas", "Barley"],
          soilHealthScore: 97,
          estimatedRevenuePerHaUsd: 4690,
          summary: "Sustains balanced revenue and resilient soil.",
        },
      ],
      whyItFits: [
        `Uses 3 different plant families after ${inputs.lastCrop} to avoid monoculture stress.`,
      ],
      actionSteps: [
        "Rotate planting dates slightly if early heat is forecast.",
        "Track each family sequence across Years 1–3.",
      ],
    },
  ];

  const priorityWeights: Record<
    PlanPriority,
    { profit: number; soil: number; water: number }
  > = {
    profit: { profit: 0.56, soil: 0.22, water: 0.22 },
    sustainability: { profit: 0.2, soil: 0.58, water: 0.22 },
    "water-saving": { profit: 0.2, soil: 0.25, water: 0.55 },
  };

  const w = priorityWeights[inputs.priority];

  const scored: CropCyclePlan[] = candidates.map((plan) => {
    const waterRatio =
      plan.waterNeededM3PerHa > 0
        ? availableWater / plan.waterNeededM3PerHa
        : 2;

    const waterStatus: CropCyclePlan["waterStatus"] =
      waterRatio >= 1 ? "optimal" : waterRatio >= 0.72 ? "tight" : "deficit";

    let score =
      plan.profitScore * w.profit +
      plan.soilHealthScore * w.soil +
      plan.waterEfficiencyScore * w.water;

    if (waterStatus === "deficit") {
      score -= 18;
    } else if (waterStatus === "tight") {
      score -= 6;
    }

    if (needsNitrogenRecovery && plan.id === "plan-soil-builder") {
      score += 4;
    }

    const matchScore = Math.max(42, Math.min(99, Math.round(score)));
    const estimatedTotalRevenueUsd = Math.round(
      plan.estimatedRevenuePerHaUsd * effectiveAreaHa
    );

    const badge =
      plan.recommendedFor === "profit"
        ? "Best for More Money"
        : plan.recommendedFor === "sustainability"
          ? "Best for Soil Health"
          : "Best for Saving Water";

    return {
      ...plan,
      badge,
      matchScore,
      waterStatus,
      estimatedTotalRevenueUsd,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  if (scored.length > 0) {
    scored[0] = {
      ...scored[0],
      badge: `Recommended • ${scored[0].badge}`,
    };
  }
  return scored;
}

/* ------------------------------------------------------------------ */
/*  Next.js Backend API helpers (/api/crop-plan & /api/fields)         */
/* ------------------------------------------------------------------ */

const planCache = new Map<string, PlanResponse>();
const planInflight = new Map<string, Promise<PlanResponse>>();

function planKey(field: FarmField, inputs: FarmerGroundInputs): string {
  return [
    field.centroid[0].toFixed(2),
    field.centroid[1].toFixed(2),
    field.areaHectares.toFixed(2),
    inputs.waterTier,
    inputs.waterM3PerHa,
    inputs.lastCrop,
    inputs.priority,
  ].join(":");
}

export async function fetchCropPlanFromBackend(
  field: FarmField,
  inputs: FarmerGroundInputs
): Promise<PlanResponse> {
  const key = planKey(field, inputs);
  const cached = planCache.get(key);
  if (cached) return cached;

  const existing = planInflight.get(key);
  if (existing) return existing;

  const body: PlanRequestBody = {
    field: {
      centroid: field.centroid,
      areaHectares: field.areaHectares,
    },
    inputs,
  };

  const req = fetch("/api/crop-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`Crop plan API HTTP ${res.status}`);
      }
      const data = (await res.json()) as PlanResponse;
      planCache.set(key, data);
      return data;
    })
    .finally(() => planInflight.delete(key));

  planInflight.set(key, req);
  return req;
}

export async function saveFieldToBackend(
  field: FarmField,
  inputs: FarmerGroundInputs
): Promise<void> {
  try {
    await fetch("/api/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, inputs }),
    });
  } catch {
    // Non-blocking persistence: ignore offline errors
  }
}

export async function loadSavedFieldsFromBackend(): Promise<SavedFieldRecord[]> {
  try {
    const res = await fetch("/api/fields");
    if (!res.ok) return [];
    const json = (await res.json()) as { records?: SavedFieldRecord[] };
    return Array.isArray(json.records) ? json.records : [];
  } catch {
    return [];
  }
}
