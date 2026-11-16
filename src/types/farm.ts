export type LatLngPoint = [number, number]; // [lat, lng]

export type CropType =
  | "Wheat"
  | "Corn"
  | "Rice"
  | "Soybeans"
  | "Cotton"
  | "Vegetables"
  | "Orchard"
  | "Pasture";

export interface FarmField {
  id: string;
  name: string;
  crop: CropType;
  coordinates: LatLngPoint[];
  areaHectares: number;
  areaAcres: number;
  perimeterMeters: number;
  centroid: LatLngPoint;
  color: string;
  createdAt: string;
}

export interface NasaDailyRecord {
  date: string;
  tempC: number | null;
  tempMaxC: number | null;
  tempMinC: number | null;
  precipMm: number | null;
  solarKwh: number | null;
  humidityPct: number | null;
  soilWetness: number | null; // 0 to 1
}

export interface NasaPowerResponse {
  records: NasaDailyRecord[];
  source: "nasa-power" | "fallback";
  fetchedAt: string;
}

export type BaseMapId = "satellite" | "street";

export type NasaGibsLayerId =
  | "none"
  | "ndvi"
  | "soil-moisture"
  | "lst-day"
  | "true-color";

export interface FarmAdvisory {
  id: string;
  title: string;
  detail: string;
  severity: "good" | "info" | "warning" | "alert";
  metric: string;
}

export type PreviousCropType =
  | "Wheat"
  | "Corn"
  | "Rice"
  | "Cotton"
  | "Vegetables"
  | "Soybeans"
  | "Orchard"
  | "Fallow";

export type WaterSupplyTier = "low" | "moderate" | "high";

export type PlanPriority = "profit" | "sustainability" | "water-saving";

export interface FarmerGroundInputs {
  waterTier: WaterSupplyTier;
  waterM3PerHa: number;
  lastCrop: PreviousCropType;
  priority: PlanPriority;
}

export interface CropCycleStage {
  season: string;
  crop: string;
  durationMonths: string;
  role: string;
}

export interface YearRotationPlan {
  year: 1 | 2 | 3;
  title: string;
  crops: [string, string, string];
  soilHealthScore: number;
  estimatedRevenuePerHaUsd: number;
  summary: string;
}

export interface CropCyclePlan {
  id: string;
  name: string;
  tagline: string;
  badge: string;
  recommendedFor: PlanPriority;
  matchScore: number; // 0-100
  waterNeededM3PerHa: number;
  waterStatus: "optimal" | "tight" | "deficit";
  estimatedRevenuePerHaUsd: number;
  estimatedTotalRevenueUsd: number;
  soilHealthScore: number; // 0-100
  profitScore: number; // 0-100
  waterEfficiencyScore: number; // 0-100
  stages: [CropCycleStage, CropCycleStage, CropCycleStage];
  whyItFits: string[];
  actionSteps: string[];
  /** 0-100: how well the rotation copes with drought, heat, frost & rain swings (server engine) */
  resilienceScore?: number;
  /** Irrigation needed in a dry year (based on NASA's driest recent year) */
  dryYearWaterNeedM3PerHa?: number;
  /** Plain-language warnings (heat months, frost, water shortfall) */
  cautions?: string[];
  /** Dedicated 3-year multi-year crop rotation progression */
  threeYearCycle?: [YearRotationPlan, YearRotationPlan, YearRotationPlan];
}

/* ------------------------------------------------------------------ */
/*  Backend (Next.js Route Handlers) — NASA POWER climate & plan API   */
/* ------------------------------------------------------------------ */

export type RiskLevel = "low" | "medium" | "high";

export type DataSource = "nasa-power" | "estimated";

export interface MonthlyClimate {
  month: string; // "Jan".."Dec"
  rainMm: number; // long-term average monthly rainfall
  tMeanC: number;
  tMaxC: number;
  tMinC: number;
  rootZoneWetness: number | null; // 0..1
  solarKwh: number | null; // kWh/m²/day
}

export interface ClimateProfile {
  location: { lat: number; lng: number };
  zoneLabel: string;
  annualRainMm: number;
  /** Annual FAO-style reference evapotranspiration estimated from NASA temperature & solar */
  annualEt0Mm?: number;
  meanTempC: number;
  monthly: MonthlyClimate[];
  dryMonths: string[];
  hotMonths: string[];
  frostMonths: string[];
  /** Year-to-year rainfall variability (coefficient of variation, %) */
  rainVariabilityPct: number | null;
  droughtYears: number | null;
  yearsAnalyzed: number | null;
  firstYear: number | null;
  lastYear: number | null;
  driestYear: number | null;
  driestYearRainMm: number | null;
  /** Trend in yearly average max temperature (°C per decade) */
  warmingPerDecadeC: number | null;
  recent: {
    rain30dMm: number | null;
    topsoilWetnessPct: number | null;
    rootZoneWetnessPct: number | null;
    tempAnomalyC: number | null;
    rainAnomalyPct: number | null;
  };
  risks: {
    drought: RiskLevel;
    heat: RiskLevel;
    frost: RiskLevel;
    rainfallSwings: RiskLevel;
  };
  sources: {
    climatology: DataSource;
    trends: DataSource;
    recent: DataSource;
  };
}

export interface PlanRequestBody {
  field: {
    centroid: LatLngPoint;
    areaHectares: number;
  };
  inputs: FarmerGroundInputs;
}

export interface PlanResponse {
  climate: ClimateProfile;
  plans: CropCyclePlan[];
  generatedAt: string;
  disclaimer: string;
}

export interface SavedFieldRecord extends FarmField {
  updatedAt: string;
  inputs?: FarmerGroundInputs;
}
