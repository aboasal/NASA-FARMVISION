import type {
  ClimateProfile,
  CropCyclePlan,
  CropCycleStage,
  FarmerGroundInputs,
  PlanPriority,
  PreviousCropType,
  RiskLevel,
  YearRotationPlan,
} from "@/types/farm";
import { MONTH_LABELS } from "./climateProfile";

/**
 * Dynamic crop-rotation & multi-year planning engine.
 *
 * Builds 4 distinct multi-season & 3-year rotation options from:
 *  - NASA POWER long-term climate & FAO-style ET0 water demand,
 *  - NASA 10-year variability (driest year, rain swings, warming),
 *  - Farmer inputs (water quota/tier, previous crop, and strategic priority).
 */

type Family =
  | "cereal"
  | "legume"
  | "oilseed"
  | "brassica"
  | "solanaceae"
  | "malvaceae"
  | "cover-grass"
  | "cover-mix"
  | "fallow";

interface CropSpec {
  key: string;
  name: string;
  family: Family;
  legume: boolean;
  cover: boolean;
  waterMm: number; // seasonal reference crop water use
  tMin: number; // suitable monthly mean temperature range (°C)
  tMax: number;
  heatTol: number; // 0..1
  droughtTol: number; // 0..1
  frostTol: number; // 0..1
  nFix: number; // kg N/ha added
  nUse: number; // kg N/ha removed
  residue: number; // 0..1 organic matter returned
  revenue: number; // indicative gross USD/ha
  role: string;
}

const CROPS: Record<string, CropSpec> = {
  wheat: { key: "wheat", name: "Wheat", family: "cereal", legume: false, cover: false, waterMm: 450, tMin: 6, tMax: 24, heatTol: 0.35, droughtTol: 0.55, frostTol: 0.9, nFix: 0, nUse: 120, residue: 0.8, revenue: 1350, role: "Reliable grain that uses the nitrogen left by beans." },
  barley: { key: "barley", name: "Barley", family: "cereal", legume: false, cover: false, waterMm: 360, tMin: 5, tMax: 24, heatTol: 0.45, droughtTol: 0.72, frostTol: 0.9, nFix: 0, nUse: 90, residue: 0.7, revenue: 1150, role: "Hardy grain that needs less water than wheat." },
  corn: { key: "corn", name: "Corn (Maize)", family: "cereal", legume: false, cover: false, waterMm: 620, tMin: 17, tMax: 33, heatTol: 0.58, droughtTol: 0.35, frostTol: 0, nFix: 0, nUse: 180, residue: 0.9, revenue: 2050, role: "High-yield grain and fodder when irrigation supply is steady." },
  sorghum: { key: "sorghum", name: "Grain Sorghum", family: "cereal", legume: false, cover: false, waterMm: 410, tMin: 18, tMax: 37, heatTol: 0.9, droughtTol: 0.86, frostTol: 0, nFix: 0, nUse: 100, residue: 0.8, revenue: 1250, role: "Tough grain that keeps growing through heat and dry spells." },
  millet: { key: "millet", name: "Pearl Millet", family: "cereal", legume: false, cover: false, waterMm: 310, tMin: 20, tMax: 39, heatTol: 0.95, droughtTol: 0.92, frostTol: 0, nFix: 0, nUse: 70, residue: 0.6, revenue: 950, role: "One of the most drought-proof grains — safe in hot, dry years." },
  rye: { key: "rye", name: "Winter Rye Cover", family: "cover-grass", legume: false, cover: true, waterMm: 200, tMin: -2, tMax: 20, heatTol: 0.15, droughtTol: 0.65, frostTol: 1, nFix: 0, nUse: 20, residue: 1, revenue: 180, role: "Covers winter soil, stops wind/rain erosion, and adds organic matter." },
  faba: { key: "faba", name: "Faba Beans", family: "legume", legume: true, cover: false, waterMm: 400, tMin: 6, tMax: 23, heatTol: 0.3, droughtTol: 0.5, frostTol: 0.72, nFix: 115, nUse: 0, residue: 0.55, revenue: 1580, role: "Cool-season beans that put natural nitrogen back in the soil." },
  chickpea: { key: "chickpea", name: "Chickpeas", family: "legume", legume: true, cover: false, waterMm: 310, tMin: 11, tMax: 29, heatTol: 0.65, droughtTol: 0.86, frostTol: 0.4, nFix: 65, nUse: 0, residue: 0.45, revenue: 1680, role: "Drought-hardy pulse that feeds soil nitrogen and sells well." },
  lentil: { key: "lentil", name: "Lentils", family: "legume", legume: true, cover: false, waterMm: 290, tMin: 6, tMax: 25, heatTol: 0.45, droughtTol: 0.78, frostTol: 0.6, nFix: 75, nUse: 0, residue: 0.45, revenue: 1540, role: "Low-water pulse that adds nitrogen for the next crop." },
  soybean: { key: "soybean", name: "Soybeans", family: "legume", legume: true, cover: false, waterMm: 510, tMin: 17, tMax: 33, heatTol: 0.6, droughtTol: 0.45, frostTol: 0, nFix: 135, nUse: 0, residue: 0.55, revenue: 1520, role: "Warm-season beans that fix substantial free nitrogen." },
  cowpea: { key: "cowpea", name: "Cowpeas", family: "legume", legume: true, cover: false, waterMm: 330, tMin: 19, tMax: 37, heatTol: 0.9, droughtTol: 0.86, frostTol: 0, nFix: 85, nUse: 0, residue: 0.6, revenue: 1080, role: "Heat-loving beans that shade the soil and add nitrogen." },
  mung: { key: "mung", name: "Mung Beans", family: "legume", legume: true, cover: false, waterMm: 320, tMin: 20, tMax: 36, heatTol: 0.85, droughtTol: 0.76, frostTol: 0, nFix: 65, nUse: 0, residue: 0.45, revenue: 1180, role: "Quick warm-season pulse that fits neatly between main crops." },
  sunflower: { key: "sunflower", name: "Sunflower", family: "oilseed", legume: false, cover: false, waterMm: 440, tMin: 15, tMax: 32, heatTol: 0.72, droughtTol: 0.72, frostTol: 0.1, nFix: 0, nUse: 80, residue: 0.6, revenue: 1450, role: "Deep taproots break hardpan soil layers and tap deep moisture." },
  sesame: { key: "sesame", name: "Sesame", family: "oilseed", legume: false, cover: false, waterMm: 340, tMin: 20, tMax: 37, heatTol: 0.92, droughtTol: 0.88, frostTol: 0, nFix: 0, nUse: 50, residue: 0.4, revenue: 1720, role: "High-value cash oilseed built for hot, low-water regions." },
  canola: { key: "canola", name: "Canola (Rapeseed)", family: "brassica", legume: false, cover: false, waterMm: 410, tMin: 6, tMax: 22, heatTol: 0.25, droughtTol: 0.52, frostTol: 0.8, nFix: 0, nUse: 125, residue: 0.6, revenue: 1380, role: "Cool-season broadleaf oilseed that breaks grain pest cycles." },
  tomato: { key: "tomato", name: "Tomatoes", family: "solanaceae", legume: false, cover: false, waterMm: 620, tMin: 15, tMax: 29, heatTol: 0.42, droughtTol: 0.22, frostTol: 0, nFix: 0, nUse: 160, residue: 0.2, revenue: 5800, role: "High-value market crop for maximum income under full irrigation." },
  potato: { key: "potato", name: "Potatoes", family: "solanaceae", legume: false, cover: false, waterMm: 490, tMin: 10, tMax: 25, heatTol: 0.25, droughtTol: 0.32, frostTol: 0.2, nFix: 0, nUse: 150, residue: 0.25, revenue: 4300, role: "Strong-earning tuber crop when medium-to-full water is available." },
  cotton: { key: "cotton", name: "Cotton", family: "malvaceae", legume: false, cover: false, waterMm: 690, tMin: 19, tMax: 35, heatTol: 0.82, droughtTol: 0.6, frostTol: 0, nFix: 0, nUse: 130, residue: 0.5, revenue: 2300, role: "High-return warm-season fibre crop for irrigated plots." },
  berseem: { key: "berseem", name: "Berseem Clover", family: "legume", legume: true, cover: true, waterMm: 450, tMin: 8, tMax: 25, heatTol: 0.35, droughtTol: 0.42, frostTol: 0.6, nFix: 155, nUse: 0, residue: 0.9, revenue: 780, role: "Fodder & green manure that floods the soil with natural nitrogen." },
  vetchOat: { key: "vetchOat", name: "Vetch & Oat Cover Mix", family: "cover-mix", legume: true, cover: true, waterMm: 240, tMin: 4, tMax: 24, heatTol: 0.35, droughtTol: 0.65, frostTol: 0.85, nFix: 75, nUse: 0, residue: 1, revenue: 280, role: "Living cover mix that shields soil and restores organic structure." },
  sudangrass: { key: "sudangrass", name: "Sorghum-Sudangrass Cover", family: "cover-grass", legume: false, cover: true, waterMm: 310, tMin: 19, tMax: 38, heatTol: 0.95, droughtTol: 0.87, frostTol: 0, nFix: 0, nUse: 30, residue: 1, revenue: 360, role: "Fast warm-season cover that smothers weeds and loosens subsoil." },
  fallow: { key: "fallow", name: "Rest Period + Straw Mulch", family: "fallow", legume: false, cover: true, waterMm: 0, tMin: -40, tMax: 50, heatTol: 1, droughtTol: 1, frostTol: 1, nFix: 0, nUse: 0, residue: 0.5, revenue: 0, role: "Too extreme to sow — mulch bare dirt to save moisture until next window." },
};

const LAST_CROP_FAMILY: Record<PreviousCropType, Family | "perennial" | "none"> = {
  Wheat: "cereal",
  Corn: "cereal",
  Rice: "cereal",
  Cotton: "malvaceae",
  Vegetables: "solanaceae",
  Soybeans: "legume",
  Orchard: "perennial",
  Fallow: "none",
};

interface LastCropRule {
  avoidKeys: string[];
  boostKeys: string[];
  secondBoostKeys: string[];
}

/** Crop-specific succession guidance so all 8 previous-crop choices shift crop sequences meaningfully */
const LAST_CROP_RULES: Record<PreviousCropType, LastCropRule> = {
  Wheat: {
    avoidKeys: ["wheat", "barley", "rye"],
    boostKeys: ["chickpea", "faba", "soybean", "sunflower", "tomato", "canola"],
    secondBoostKeys: ["corn", "sorghum", "sesame", "cowpea"],
  },
  Corn: {
    avoidKeys: ["corn", "sorghum", "millet"],
    boostKeys: ["soybean", "faba", "lentil", "chickpea", "potato", "sunflower"],
    secondBoostKeys: ["wheat", "barley", "canola", "berseem"],
  },
  Rice: {
    avoidKeys: ["corn", "wheat", "sudangrass"],
    boostKeys: ["berseem", "lentil", "chickpea", "canola", "potato", "faba"],
    secondBoostKeys: ["mung", "sesame", "sunflower", "sorghum"],
  },
  Cotton: {
    avoidKeys: ["cotton", "tomato", "sunflower"],
    boostKeys: ["wheat", "faba", "barley", "chickpea", "berseem", "lentil"],
    secondBoostKeys: ["soybean", "mung", "corn", "cowpea"],
  },
  Vegetables: {
    avoidKeys: ["tomato", "potato", "cotton"],
    boostKeys: ["faba", "soybean", "wheat", "corn", "sorghum", "sunflower"],
    secondBoostKeys: ["chickpea", "berseem", "barley", "vetchOat"],
  },
  Soybeans: {
    avoidKeys: ["soybean", "faba", "chickpea", "lentil", "cowpea", "mung"],
    boostKeys: ["tomato", "corn", "wheat", "potato", "cotton", "canola"],
    secondBoostKeys: ["sunflower", "sesame", "sorghum", "barley"],
  },
  Orchard: {
    avoidKeys: ["cotton", "sunflower", "corn"],
    boostKeys: ["berseem", "vetchOat", "faba", "chickpea", "lentil", "potato"],
    secondBoostKeys: ["mung", "cowpea", "sesame", "barley"],
  },
  Fallow: {
    avoidKeys: ["fallow", "rye"],
    boostKeys: ["tomato", "canola", "sunflower", "chickpea", "wheat", "cotton"],
    secondBoostKeys: ["soybean", "corn", "sesame", "lentil"],
  },
};

const DEPLETING: PreviousCropType[] = ["Wheat", "Corn", "Rice", "Cotton", "Vegetables"];

interface Template {
  id: string;
  name: string;
  tagline: string;
  focus: PlanPriority;
  badge: string;
  bias: "profit" | "soil" | "resilience" | "balanced";
  slots: [string[], string[], string[]];
}

const TEMPLATES: Template[] = [
  {
    id: "plan-market-cash",
    name: "Market Cash Rotation",
    tagline: "Maximizes harvest cash income while rotating plant families and feeding soil",
    focus: "profit",
    badge: "Best for More Money",
    bias: "profit",
    slots: [
      ["potato", "tomato", "canola", "chickpea", "faba", "cotton", "sesame", "corn", "sunflower"],
      ["tomato", "cotton", "corn", "sesame", "soybean", "mung", "chickpea", "potato"],
      ["wheat", "corn", "cotton", "sesame", "soybean", "barley", "chickpea", "sorghum", "berseem", "rye"],
    ],
  },
  {
    id: "plan-soil-builder",
    name: "Soil-Builder Rotation",
    tagline: "Beans + grain + living cover — rebuilds organic matter and cuts fertilizer bills",
    focus: "sustainability",
    badge: "Best for Healthy Soil",
    bias: "soil",
    slots: [
      ["faba", "chickpea", "lentil", "berseem", "vetchOat", "wheat", "canola"],
      ["soybean", "mung", "cowpea", "sunflower", "sorghum", "corn", "wheat"],
      ["berseem", "vetchOat", "sudangrass", "cowpea", "rye", "lentil"],
    ],
  },
  {
    id: "plan-weather-ready",
    name: "Weather & Water-Smart Rotation",
    tagline: "Drought- and heat-hardy crops tuned to stretch tight irrigation supplies",
    focus: "water-saving",
    badge: "Best for Weather & Water",
    bias: "resilience",
    slots: [
      ["barley", "chickpea", "lentil", "canola", "sesame", "sorghum", "millet"],
      ["sesame", "sorghum", "millet", "cowpea", "chickpea", "sunflower"],
      ["millet", "cowpea", "mung", "sudangrass", "barley", "vetchOat", "rye"],
    ],
  },
  {
    id: "plan-balanced",
    name: "Balanced 3-Family Rotation",
    tagline: "Three distinct plant families across the year to break pests and balance risk",
    focus: "sustainability",
    badge: "Balanced Choice",
    bias: "balanced",
    slots: [
      ["canola", "potato", "wheat", "faba", "sunflower", "chickpea"],
      ["sunflower", "sesame", "soybean", "corn", "sorghum", "cotton"],
      ["lentil", "chickpea", "cowpea", "barley", "berseem", "vetchOat"],
    ],
  },
];

const RISK_NUM: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function windowMonths(startMonth: number, slot: number): number[] {
  return [0, 1, 2, 3].map((k) => (startMonth + slot * 4 + k) % 12);
}

function windowLabel(months: number[]): string {
  return `${MONTH_LABELS[months[0]]} – ${MONTH_LABELS[months[months.length - 1]]}`;
}

function listMonths(names: string[]): string {
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
}

interface SlotEval {
  crop: CropSpec;
  months: number[];
  tempFit: number;
  rainMm: number;
  needMm: number;
  dryNeedMm: number;
  avgTemp: number;
}

function evalCrop(
  crop: CropSpec,
  months: number[],
  climate: ClimateProfile,
  dryFactor: number,
  et0Factor: number
): SlotEval {
  const ms = months.map((m) => climate.monthly[m]);
  const fitCount = ms.filter((m) => m.tMeanC >= crop.tMin && m.tMeanC <= crop.tMax).length;
  const rainMm = ms.reduce((s, m) => s + m.rainMm, 0);
  const adjustedCropMm = crop.waterMm * et0Factor;
  const needMm = Math.max(0, adjustedCropMm - 0.75 * rainMm);
  const dryNeedMm = Math.max(0, adjustedCropMm - 0.75 * rainMm * dryFactor);
  return {
    crop,
    months,
    tempFit: fitCount / months.length,
    rainMm,
    needMm,
    dryNeedMm,
    avgTemp: ms.reduce((s, m) => s + m.tMeanC, 0) / ms.length,
  };
}

function scoreCropForSlot(
  ev: SlotEval,
  slotIdx: number,
  prevFamily: string,
  bias: Template["bias"],
  inputs: FarmerGroundInputs,
  climate: ClimateProfile,
  lastRule: LastCropRule
): number {
  const crop = ev.crop;
  const supplyM3 = Math.max(0, inputs.waterM3PerHa);
  const rD = RISK_NUM[climate.risks.drought];
  const rH = RISK_NUM[climate.risks.heat];
  const rF = RISK_NUM[climate.risks.frost];

  const ms = ev.months.map((m) => climate.monthly[m]);
  const frostHit = ms.some((m) => m.tMinC <= 0) && crop.frostTol < 0.5;
  const heatHit = ms.some((m) => m.tMaxC >= 36) && crop.heatTol < 0.6;

  let score = ev.tempFit * 38;
  if (frostHit) score -= 24;
  if (heatHit) score -= 16;

  // Enforce family diversity across consecutive plantings
  if (crop.family === prevFamily) score -= 32;
  if (crop.legume && prevFamily === "legume") score -= 14;

  // Crop-specific previous-crop succession rules (Wheat vs Corn vs Rice vs Cotton vs Veg...)
  if (slotIdx === 0) {
    if (lastRule.avoidKeys.includes(crop.key)) score -= 55;
    if (lastRule.boostKeys.includes(crop.key)) score += 26;
  } else if (slotIdx === 1) {
    if (lastRule.secondBoostKeys.includes(crop.key)) score += 16;
  }

  // Water supply gating & FAO ET0 demand scaling
  const needM3 = ev.needMm * 10;
  const share = supplyM3 * (slotIdx === 2 ? 0.35 : 0.48);
  const overM3 = Math.max(0, needM3 - share);
  const waterWeight =
    inputs.priority === "water-saving" || bias === "resilience"
      ? 0.009
      : bias === "profit" && inputs.priority === "profit"
        ? 0.004
        : 0.006;
  score -= overM3 * waterWeight;

  if (supplyM3 <= 2200) {
    // Low water mode: gate out heavy water users; prioritize drought-tolerant crops
    if (crop.waterMm >= 460) score -= 75;
    else if (crop.waterMm >= 400) score -= 28;
    score += crop.droughtTol * 38;
  } else if (supplyM3 <= 5500) {
    // Medium water mode: reserve 580mm+ thirsty crops for high water; let potatoes/canola/sesame/faba/wheat shine
    if (crop.waterMm >= 580) score -= 52;
    else if (crop.waterMm >= 500) score -= 18;
    if (crop.waterMm >= 340 && crop.waterMm <= 500) score += 14;
  } else {
    // Plenty of water: unlock high-value irrigated cash crops (tomatoes, cotton, corn, soybeans, potatoes)
    if (crop.waterMm >= 480) score += 30;
    else if (crop.waterMm >= 420) score += 14;
  }

  // Template specialty weight
  if (bias === "profit") score += crop.revenue / 170;
  if (bias === "soil") score += crop.nFix / 3.2 + crop.residue * 16;
  if (bias === "resilience")
    score +=
      crop.droughtTol * (24 + rD * 6) +
      crop.heatTol * (10 + rH * 6) +
      crop.frostTol * rF * 5;
  if (bias === "balanced")
    score += crop.revenue / 360 + crop.nFix / 6 + crop.droughtTol * 12;

  // Directly blend farmer's chosen goal (`inputs.priority`) into crop picks
  if (inputs.priority === "profit") {
    score += crop.revenue / 185;
  } else if (inputs.priority === "sustainability") {
    score += crop.nFix / 3.4 + crop.residue * 18;
  } else {
    score += crop.droughtTol * 34 - crop.waterMm * 0.045;
  }

  return score;
}

function buildMultiYearRoadmap(
  tpl: Template,
  year1Picks: SlotEval[],
  year1Soil: number,
  year1Rev: number,
  climate: ClimateProfile,
  dryFactor: number,
  et0Factor: number,
  inputs: FarmerGroundInputs
): [YearRotationPlan, YearRotationPlan, YearRotationPlan] {
  const startMonth = (new Date().getUTCMonth() + 1) % 12;
  const lastRule: LastCropRule = {
    avoidKeys: [year1Picks[0].crop.key],
    boostKeys: [],
    secondBoostKeys: [],
  };

  const simulateFollowUpYear = (
    year: 2 | 3,
    prevYearFirstCrop: CropSpec,
    prevYearEndFamily: string,
    baseSoil: number
  ): {
    plan: YearRotationPlan;
    firstCrop: CropSpec;
    endFamily: string;
    soil: number;
  } => {
    const chosen: SlotEval[] = [];
    let prevFamily = prevYearEndFamily;
    for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
      const months = windowMonths(startMonth, slotIdx);
      const pool = tpl.slots[slotIdx]
        .map((k) => CROPS[k])
        .filter((c): c is CropSpec => Boolean(c));
      const candidates = pool
        .filter((c) => !chosen.some((p) => p.crop.key === c.key))
        .map((crop) => {
          const ev = evalCrop(crop, months, climate, dryFactor, et0Factor);
          let sc = scoreCropForSlot(
            ev,
            slotIdx,
            prevFamily,
            tpl.bias,
            inputs,
            climate,
            lastRule
          );
          if (slotIdx === 0 && crop.family === prevYearFirstCrop.family) {
            sc -= 38;
          }
          if (year === 2 && slotIdx === 0 && crop.legume) sc += 16;
          if (year === 3 && slotIdx === 0 && !crop.cover) sc += 12;
          return { ev, sc };
        })
        .filter((item) => item.ev.tempFit >= 0.45)
        .sort((a, b) => b.sc - a.sc);

      const pick =
        candidates[0]?.ev ?? evalCrop(CROPS.fallow, months, climate, dryFactor, et0Factor);
      chosen.push(pick);
      prevFamily = pick.crop.family;
    }

    const legumeCount = chosen.filter((c) => c.crop.legume).length;
    const soilGain = legumeCount > 0 ? 5 + legumeCount : 2;
    const nextSoil = Math.round(clamp(baseSoil + soilGain, 25, 99));
    const rawRev = chosen.reduce((s, p) => s + p.crop.revenue, 0);
    // Healthy soil boosts subsequent year yield efficiency (+4% per yr)
    const revAdjusted = Math.round(rawRev * (year === 2 ? 1.04 : 1.08));

    return {
      firstCrop: chosen[0].crop,
      endFamily: prevFamily,
      soil: nextSoil,
      plan: {
        year,
        title:
          year === 2
            ? "Year 2 • Break Pests & Rebuild Soil"
            : "Year 3 • Peak Fertility & Resilience",
        crops: [chosen[0].crop.name, chosen[1].crop.name, chosen[2].crop.name],
        soilHealthScore: nextSoil,
        estimatedRevenuePerHaUsd: revAdjusted,
        summary:
          year === 2
            ? `Rotates away from Year 1's ${prevYearFirstCrop.name} family to ${chosen[0].crop.name} so soil nutrients recover cleanly.`
            : `Builds on 2 years of crop diversity with ${chosen[0].crop.name} → ${chosen[1].crop.name} for peak soil organic matter.`,
      },
    };
  };

  const y1Plan: YearRotationPlan = {
    year: 1,
    title: "Year 1 • Immediate Action",
    crops: [year1Picks[0].crop.name, year1Picks[1].crop.name, year1Picks[2].crop.name],
    soilHealthScore: year1Soil,
    estimatedRevenuePerHaUsd: year1Rev,
    summary: `Tailored immediately after your last ${inputs.lastCrop.toLowerCase()} harvest.`,
  };

  const y2 = simulateFollowUpYear(
    2,
    year1Picks[0].crop,
    year1Picks[2].crop.family,
    year1Soil
  );
  const y3 = simulateFollowUpYear(3, y2.firstCrop, y2.endFamily, y2.soil);

  return [y1Plan, y2.plan, y3.plan];
}

export function generateRotationPlans(
  climate: ClimateProfile,
  inputs: FarmerGroundInputs,
  areaHectares: number
): CropCyclePlan[] {
  const startMonth = (new Date().getUTCMonth() + 1) % 12;
  const supplyM3 = Math.max(0, inputs.waterM3PerHa);
  const area = Math.max(areaHectares, 0.1);
  const dryFactor =
    climate.driestYearRainMm && climate.annualRainMm > 0
      ? clamp(climate.driestYearRainMm / climate.annualRainMm, 0.3, 1)
      : 0.65;
  const et0Factor = clamp((climate.annualEt0Mm ?? 1500) / 1500, 0.85, 1.18);
  const lastFamily = LAST_CROP_FAMILY[inputs.lastCrop];
  const lastRule = LAST_CROP_RULES[inputs.lastCrop];
  const rD = RISK_NUM[climate.risks.drought];
  const rH = RISK_NUM[climate.risks.heat];
  const rF = RISK_NUM[climate.risks.frost];
  const rS = RISK_NUM[climate.risks.rainfallSwings];

  const usedSignatures = new Set<string>();

  const built = TEMPLATES.map((tpl) => {
    const rankedBySlot: Array<Array<{ score: number; ev: SlotEval }>> = [];
    const picks: SlotEval[] = [];
    let prevFamily: string = lastFamily;

    tpl.slots.forEach((keys, slotIdx) => {
      const months = windowMonths(startMonth, slotIdx);
      const slotOptions: Array<{ score: number; ev: SlotEval }> = [];

      for (const key of keys) {
        const crop = CROPS[key];
        if (!crop) continue;
        if (picks.some((p) => p.crop.key === key)) continue;
        const ev = evalCrop(crop, months, climate, dryFactor, et0Factor);
        if (ev.tempFit < 0.45) continue;

        const score = scoreCropForSlot(
          ev,
          slotIdx,
          prevFamily,
          tpl.bias,
          inputs,
          climate,
          lastRule
        );
        slotOptions.push({ score, ev });
      }

      slotOptions.sort((a, b) => b.score - a.score);
      rankedBySlot.push(slotOptions);

      const chosen =
        slotOptions[0]?.ev ??
        evalCrop(CROPS.fallow, months, climate, dryFactor, et0Factor);
      picks.push(chosen);
      prevFamily = chosen.crop.family;
    });

    // Guarantee 4 distinct rotation sequences even under narrow water/temp bounds
    let sig = picks.map((p) => p.crop.key).join(">");
    if (usedSignatures.has(sig)) {
      outer: for (let sIdx = 0; sIdx < 3; sIdx++) {
        for (const alt of rankedBySlot[sIdx]) {
          if (
            picks.some((p, pi) => pi !== sIdx && p.crop.key === alt.ev.crop.key)
          ) {
            continue;
          }
          const candidateSig = picks
            .map((p, pi) => (pi === sIdx ? alt.ev.crop.key : p.crop.key))
            .join(">");
          if (!usedSignatures.has(candidateSig)) {
            picks[sIdx] = alt.ev;
            sig = candidateSig;
            break outer;
          }
        }
      }
    }
    usedSignatures.add(sig);

    return { tpl, picks };
  });

  const revenues = built.map((u) => u.picks.reduce((s, p) => s + p.crop.revenue, 0));
  const maxRev = Math.max(...revenues);
  const minRev = Math.min(...revenues);

  const plans: CropCyclePlan[] = built.map(({ tpl, picks }, idx) => {
    const crops = picks.map((p) => p.crop);
    const families = new Set(crops.map((c) => c.family).filter((f) => f !== "fallow"));
    const legumes = crops.filter((c) => c.legume);
    const hasCover = crops.some((c) => c.cover && c.key !== "fallow");
    const nBalance = crops.reduce((s, c) => s + c.nFix - 0.5 * c.nUse, 0);
    const residue = crops.reduce((s, c) => s + c.residue, 0);
    const breaksLast =
      crops[0].family !== lastFamily && !lastRule.avoidKeys.includes(crops[0].key);

    // ---- Soil Health ----
    let soil =
      42 +
      legumes.length * 11 +
      (hasCover ? 9 : 0) +
      families.size * 4 +
      clamp(nBalance / 10, -10, 14) +
      residue * 3 +
      (lastFamily === "none" || lastFamily === "perennial" ? 0 : breaksLast ? 7 : -12) +
      (DEPLETING.includes(inputs.lastCrop) && crops[0].legume ? 6 : 0);
    soil = Math.round(clamp(soil, 20, 98));

    // ---- Water need (normal vs dry year, scaled by NASA ET0) ----
    const needM3 = Math.round(picks.reduce((s, p) => s + p.needMm, 0) * 10);
    const dryNeedM3 = Math.round(picks.reduce((s, p) => s + p.dryNeedMm, 0) * 10);
    const ratio = needM3 > 0 ? supplyM3 / needM3 : 2;
    const waterStatus: CropCyclePlan["waterStatus"] =
      ratio >= 1 ? "optimal" : ratio >= 0.72 ? "tight" : "deficit";

    // ---- Weather & Water Resilience ----
    const wD = 1 + rD + rS * 0.5;
    const wH = 1 + rH;
    const wF = 0.5 + rF;
    const growing = crops.filter((c) => c.key !== "fallow");
    const tol =
      growing.length > 0
        ? growing.reduce(
            (s, c) => s + (c.droughtTol * wD + c.heatTol * wH + c.frostTol * wF) / (wD + wH + wF),
            0
          ) / growing.length
        : 0.5;
    const dryShortfall = dryNeedM3 > 0 ? clamp((dryNeedM3 - supplyM3) / dryNeedM3, 0, 1) : 0;
    let resilience = 28 + tol * 55 + families.size * 3 + (hasCover ? 4 : 0) - dryShortfall * 28;
    resilience = Math.round(clamp(resilience, 20, 98));

    // ---- Income (indicative) ----
    const revPerHa = revenues[idx];
    const profit =
      maxRev === minRev ? 70 : Math.round(40 + (55 * (revPerHa - minRev)) / (maxRev - minRev));

    // ---- Goal match ----
    const weights: Record<PlanPriority, [number, number, number]> = {
      profit: [0.55, 0.2, 0.25],
      sustainability: [0.2, 0.55, 0.25],
      "water-saving": [0.15, 0.25, 0.6],
    };
    const [wp, ws, wr] = weights[inputs.priority];
    let match = profit * wp + soil * ws + resilience * wr;
    if (waterStatus === "deficit") match -= 16;
    else if (waterStatus === "tight") match -= 5;
    const matchScore = Math.round(clamp(match, 35, 99));

    // ---- Stages ----
    const stageNames = ["1st Planting", "2nd Planting", "3rd Planting"];
    const stages = picks.map((p, i) => ({
      season: stageNames[i],
      crop: p.crop.name,
      durationMonths: windowLabel(p.months),
      role: p.crop.role,
    })) as [CropCycleStage, CropCycleStage, CropCycleStage];

    const threeYearCycle = buildMultiYearRoadmap(
      tpl,
      picks,
      soil,
      revPerHa,
      climate,
      dryFactor,
      et0Factor,
      inputs
    );

    // ---- Plain-language reasons ----
    const why: string[] = [];
    const firstLegume = legumes[0];
    if (firstLegume && firstLegume.nFix > 0) {
      why.push(
        `${firstLegume.name} adds about ${firstLegume.nFix} kg of natural nitrogen per hectare — free fertilizer for the next crop.`
      );
    }
    if (breaksLast && lastFamily !== "none" && lastFamily !== "perennial") {
      why.push(
        `Starts with ${crops[0].name} after ${inputs.lastCrop} — breaking pest and soil disease carry-over.`
      );
    } else if (!breaksLast) {
      why.push(
        `Note: ${crops[0].name} shares traits with your last crop (${inputs.lastCrop}) — scout early for carried-over pests.`
      );
    }
    why.push(
      `NASA climate: ~${climate.annualRainMm.toLocaleString()} mm rain & ~${(
        climate.annualEt0Mm ?? 1350
      ).toLocaleString()} mm crop evaporation/yr, with ${
        climate.dryMonths.length
      } dry month${climate.dryMonths.length === 1 ? "" : "s"}${
        climate.dryMonths.length ? ` (${listMonths(climate.dryMonths)})` : ""
      }.`
    );
    if (climate.driestYear && climate.driestYearRainMm !== null) {
      why.push(
        `In a dry year like ${climate.driestYear} (${climate.driestYearRainMm.toLocaleString()} mm rain), this plan needs ~${dryNeedM3.toLocaleString()} m³/ha — ${
          dryNeedM3 <= supplyM3 ? "within your water supply." : "above your water supply."
        }`
      );
    }

    // ---- Cautions ----
    const cautions: string[] = [];
    picks.forEach((p) => {
      const hot = p.months
        .filter((m) => climate.monthly[m].tMaxC >= 35)
        .map((m) => MONTH_LABELS[m]);
      if (hot.length && p.crop.heatTol < 0.6 && p.crop.key !== "fallow") {
        cautions.push(`${p.crop.name} may struggle in ${hot.join(", ")} heat (35°C+) — sow early and mulch.`);
      }
      const frost = p.months
        .filter((m) => climate.monthly[m].tMinC <= 2)
        .map((m) => MONTH_LABELS[m]);
      if (frost.length && p.crop.frostTol < 0.5 && p.crop.key !== "fallow") {
        cautions.push(`Frost risk in ${frost.join(", ")} — sow ${p.crop.name} after the last frost.`);
      }
    });
    if (waterStatus === "deficit") {
      cautions.push("Your water supply is short for this plan even in normal years — consider irrigating only part of the field.");
    }
    if (climate.risks.rainfallSwings === "high" && climate.rainVariabilityPct !== null) {
      cautions.push(
        `Rain here swings from year to year (±${climate.rainVariabilityPct}%) — keep seed of a low-water backup crop.`
      );
    }

    // ---- Action steps ----
    const actions: string[] = [];
    if (
      climate.recent.topsoilWetnessPct !== null &&
      climate.recent.topsoilWetnessPct < 30 &&
      crops[0].key !== "fallow"
    ) {
      actions.push(
        `NASA shows dry topsoil right now (${climate.recent.topsoilWetnessPct}% wetness) — pre-water before sowing ${crops[0].name}.`
      );
    }
    if (legumes.length) {
      actions.push("Use legume inoculant powder at planting so beans fix maximum free nitrogen.");
    }
    if (hasCover || residue >= 2) {
      actions.push("Chop crop residues instead of burning them to hold moisture and boost topsoil carbon.");
    }
    if (rD >= 1 || rH >= 1) {
      actions.push("Irrigate early morning or dusk and mulch rows to cut sun evaporation.");
    }
    actions.push("Check NASA SMAP soil moisture on the 2D map weekly before scheduling irrigation.");

    return {
      id: tpl.id,
      name: tpl.name,
      tagline: tpl.tagline,
      badge: tpl.badge,
      recommendedFor: tpl.focus,
      matchScore,
      waterNeededM3PerHa: needM3,
      dryYearWaterNeedM3PerHa: dryNeedM3,
      waterStatus,
      estimatedRevenuePerHaUsd: revPerHa,
      estimatedTotalRevenueUsd: Math.round(revPerHa * area),
      soilHealthScore: soil,
      profitScore: profit,
      waterEfficiencyScore: resilience,
      resilienceScore: resilience,
      stages,
      whyItFits: why.slice(0, 4),
      actionSteps: actions.slice(0, 3),
      cautions: cautions.slice(0, 3),
      threeYearCycle,
    };
  });

  plans.sort((a, b) => b.matchScore - a.matchScore);
  return plans;
}
