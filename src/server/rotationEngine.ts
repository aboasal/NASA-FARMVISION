import type {
  ClimateProfile,
  CropCyclePlan,
  CropCycleStage,
  FarmerGroundInputs,
  PlanPriority,
  PreviousCropType,
  RiskLevel,
} from "@/types/farm";
import { MONTH_LABELS } from "./climateProfile";

/**
 * Crop-rotation engine.
 *
 * Builds 3-season (12-month) rotation options for a field from:
 *  - NASA POWER long-term climate (monthly temperature & rainfall),
 *  - NASA 10-year variability (driest year, rain swings, warming),
 *  - the farmer's ground truth (water supply, last crop, goal).
 *
 * Each option is scored for Soil Health, Weather & Water Resilience and
 * Income, then ranked by the farmer's goal. Values are indicative and meant
 * to help farmers *explore* options — not to replace local agronomy advice.
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
  waterMm: number; // seasonal crop water use
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
  wheat: { key: "wheat", name: "Wheat", family: "cereal", legume: false, cover: false, waterMm: 450, tMin: 6, tMax: 22, heatTol: 0.3, droughtTol: 0.55, frostTol: 0.9, nFix: 0, nUse: 120, residue: 0.8, revenue: 1300, role: "Reliable grain that uses the nitrogen left by beans." },
  barley: { key: "barley", name: "Barley", family: "cereal", legume: false, cover: false, waterMm: 380, tMin: 5, tMax: 22, heatTol: 0.4, droughtTol: 0.7, frostTol: 0.9, nFix: 0, nUse: 90, residue: 0.7, revenue: 1100, role: "Hardy grain that needs less water than wheat." },
  corn: { key: "corn", name: "Corn (Maize)", family: "cereal", legume: false, cover: false, waterMm: 600, tMin: 18, tMax: 32, heatTol: 0.6, droughtTol: 0.35, frostTol: 0, nFix: 0, nUse: 180, residue: 0.9, revenue: 1900, role: "High-yield grain and fodder for the warm season." },
  sorghum: { key: "sorghum", name: "Grain Sorghum", family: "cereal", legume: false, cover: false, waterMm: 450, tMin: 20, tMax: 36, heatTol: 0.9, droughtTol: 0.85, frostTol: 0, nFix: 0, nUse: 100, residue: 0.8, revenue: 1200, role: "Tough grain that keeps growing through heat and dry spells." },
  millet: { key: "millet", name: "Pearl Millet", family: "cereal", legume: false, cover: false, waterMm: 330, tMin: 22, tMax: 38, heatTol: 0.95, droughtTol: 0.9, frostTol: 0, nFix: 0, nUse: 70, residue: 0.6, revenue: 900, role: "One of the most drought-proof grains — safe in hot, dry years." },
  rye: { key: "rye", name: "Winter Rye Cover", family: "cover-grass", legume: false, cover: true, waterMm: 200, tMin: -2, tMax: 18, heatTol: 0.1, droughtTol: 0.6, frostTol: 1, nFix: 0, nUse: 20, residue: 1, revenue: 150, role: "Covers bare winter soil, holds it against wind & rain, adds organic matter." },
  faba: { key: "faba", name: "Faba Beans", family: "legume", legume: true, cover: false, waterMm: 400, tMin: 6, tMax: 22, heatTol: 0.3, droughtTol: 0.5, frostTol: 0.7, nFix: 110, nUse: 0, residue: 0.5, revenue: 1500, role: "Cool-season beans that put natural nitrogen back in the soil." },
  chickpea: { key: "chickpea", name: "Chickpeas", family: "legume", legume: true, cover: false, waterMm: 330, tMin: 12, tMax: 28, heatTol: 0.6, droughtTol: 0.85, frostTol: 0.4, nFix: 60, nUse: 0, residue: 0.4, revenue: 1600, role: "Drought-hardy pulse that feeds the soil and sells well." },
  lentil: { key: "lentil", name: "Lentils", family: "legume", legume: true, cover: false, waterMm: 300, tMin: 6, tMax: 22, heatTol: 0.4, droughtTol: 0.75, frostTol: 0.6, nFix: 70, nUse: 0, residue: 0.4, revenue: 1500, role: "Low-water pulse that adds nitrogen for the next crop." },
  soybean: { key: "soybean", name: "Soybeans", family: "legume", legume: true, cover: false, waterMm: 500, tMin: 18, tMax: 32, heatTol: 0.6, droughtTol: 0.45, frostTol: 0, nFix: 130, nUse: 0, residue: 0.5, revenue: 1400, role: "Warm-season beans that fix a lot of nitrogen." },
  cowpea: { key: "cowpea", name: "Cowpeas", family: "legume", legume: true, cover: false, waterMm: 350, tMin: 20, tMax: 36, heatTol: 0.9, droughtTol: 0.85, frostTol: 0, nFix: 80, nUse: 0, residue: 0.6, revenue: 1000, role: "Heat-loving beans that shade the soil and add nitrogen." },
  mung: { key: "mung", name: "Mung Beans", family: "legume", legume: true, cover: false, waterMm: 320, tMin: 22, tMax: 36, heatTol: 0.85, droughtTol: 0.75, frostTol: 0, nFix: 60, nUse: 0, residue: 0.4, revenue: 1100, role: "Short, quick bean crop that fits between main seasons." },
  sunflower: { key: "sunflower", name: "Sunflower", family: "oilseed", legume: false, cover: false, waterMm: 480, tMin: 16, tMax: 30, heatTol: 0.7, droughtTol: 0.7, frostTol: 0.1, nFix: 0, nUse: 80, residue: 0.6, revenue: 1300, role: "Deep roots break hard soil layers and reach deep moisture." },
  sesame: { key: "sesame", name: "Sesame", family: "oilseed", legume: false, cover: false, waterMm: 380, tMin: 22, tMax: 36, heatTol: 0.9, droughtTol: 0.85, frostTol: 0, nFix: 0, nUse: 50, residue: 0.4, revenue: 1500, role: "High-value oilseed that copes with heat and little water." },
  canola: { key: "canola", name: "Canola (Rapeseed)", family: "brassica", legume: false, cover: false, waterMm: 420, tMin: 6, tMax: 20, heatTol: 0.2, droughtTol: 0.5, frostTol: 0.8, nFix: 0, nUse: 130, residue: 0.6, revenue: 1300, role: "Cool-season oilseed that breaks cereal disease cycles." },
  tomato: { key: "tomato", name: "Tomatoes", family: "solanaceae", legume: false, cover: false, waterMm: 600, tMin: 16, tMax: 28, heatTol: 0.4, droughtTol: 0.2, frostTol: 0, nFix: 0, nUse: 160, residue: 0.2, revenue: 6000, role: "High-value market crop for quick cash." },
  potato: { key: "potato", name: "Potatoes", family: "solanaceae", legume: false, cover: false, waterMm: 500, tMin: 10, tMax: 24, heatTol: 0.2, droughtTol: 0.3, frostTol: 0.2, nFix: 0, nUse: 150, residue: 0.2, revenue: 4500, role: "High-earning tuber crop for local markets." },
  cotton: { key: "cotton", name: "Cotton", family: "malvaceae", legume: false, cover: false, waterMm: 700, tMin: 20, tMax: 34, heatTol: 0.8, droughtTol: 0.6, frostTol: 0, nFix: 0, nUse: 130, residue: 0.5, revenue: 2200, role: "Cash fibre crop for hot summers." },
  berseem: { key: "berseem", name: "Berseem Clover", family: "legume", legume: true, cover: true, waterMm: 450, tMin: 8, tMax: 24, heatTol: 0.3, droughtTol: 0.4, frostTol: 0.6, nFix: 150, nUse: 0, residue: 0.9, revenue: 700, role: "Animal fodder that adds lots of nitrogen and organic matter." },
  vetchOat: { key: "vetchOat", name: "Vetch & Oat Cover Mix", family: "cover-mix", legume: true, cover: true, waterMm: 250, tMin: 4, tMax: 22, heatTol: 0.3, droughtTol: 0.6, frostTol: 0.85, nFix: 70, nUse: 0, residue: 1, revenue: 250, role: "Living cover that protects soil and adds nitrogen + organic matter." },
  sudangrass: { key: "sudangrass", name: "Sorghum-Sudangrass Cover", family: "cover-grass", legume: false, cover: true, waterMm: 350, tMin: 20, tMax: 38, heatTol: 0.95, droughtTol: 0.85, frostTol: 0, nFix: 0, nUse: 30, residue: 1, revenue: 350, role: "Fast summer cover with deep roots that builds soil structure." },
  fallow: { key: "fallow", name: "Rest Period + Straw Mulch", family: "fallow", legume: false, cover: true, waterMm: 0, tMin: -40, tMax: 50, heatTol: 1, droughtTol: 1, frostTol: 1, nFix: 0, nUse: 0, residue: 0.5, revenue: 0, role: "Too cold/hot to grow — cover the soil with straw to protect it." },
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
    tagline: "Earns the most from market crops, with a bean crop to keep the soil fed",
    focus: "profit",
    badge: "Best for More Money",
    bias: "profit",
    slots: [
      ["tomato", "potato", "cotton", "corn", "sesame", "sunflower", "canola"],
      ["soybean", "mung", "chickpea", "faba", "cowpea", "lentil"],
      ["wheat", "barley", "corn", "sorghum", "millet", "rye"],
    ],
  },
  {
    id: "plan-soil-builder",
    name: "Soil-Builder Rotation",
    tagline: "Beans + grain + living cover — rebuilds soil nitrogen and organic matter",
    focus: "sustainability",
    badge: "Best for Healthy Soil",
    bias: "soil",
    slots: [
      ["faba", "chickpea", "lentil", "soybean", "cowpea", "mung"],
      ["wheat", "barley", "sorghum", "millet", "corn"],
      ["berseem", "vetchOat", "sudangrass", "cowpea", "rye"],
    ],
  },
  {
    id: "plan-weather-ready",
    name: "Weather-Ready Rotation",
    tagline: "Hardy crops that handle heat, dry spells and uncertain water",
    focus: "water-saving",
    badge: "Best for Weather & Water",
    bias: "resilience",
    slots: [
      ["sorghum", "millet", "barley", "chickpea", "sesame"],
      ["cowpea", "chickpea", "lentil", "mung"],
      ["vetchOat", "sudangrass", "barley", "rye"],
    ],
  },
  {
    id: "plan-balanced",
    name: "Balanced 3-Family Rotation",
    tagline: "Oilseed → grain → beans: three plant families to break pests and spread risk",
    focus: "sustainability",
    badge: "Balanced Choice",
    bias: "balanced",
    slots: [
      ["canola", "sunflower", "sesame", "potato"],
      ["wheat", "barley", "sorghum", "corn", "millet"],
      ["lentil", "chickpea", "faba", "soybean", "cowpea", "berseem"],
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
  dryFactor: number
): SlotEval {
  const ms = months.map((m) => climate.monthly[m]);
  const fitCount = ms.filter((m) => m.tMeanC >= crop.tMin && m.tMeanC <= crop.tMax).length;
  const rainMm = ms.reduce((s, m) => s + m.rainMm, 0);
  const needMm = Math.max(0, crop.waterMm - 0.75 * rainMm);
  const dryNeedMm = Math.max(0, crop.waterMm - 0.75 * rainMm * dryFactor);
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
  const lastFamily = LAST_CROP_FAMILY[inputs.lastCrop];
  const rD = RISK_NUM[climate.risks.drought];
  const rH = RISK_NUM[climate.risks.heat];
  const rF = RISK_NUM[climate.risks.frost];
  const rS = RISK_NUM[climate.risks.rainfallSwings];

  const built = TEMPLATES.map((tpl) => {
    const picks: SlotEval[] = [];
    let prevFamily: string = lastFamily;

    tpl.slots.forEach((keys, slotIdx) => {
      const months = windowMonths(startMonth, slotIdx);
      let best: { score: number; ev: SlotEval } | null = null;

      for (const key of keys) {
        const crop = CROPS[key];
        if (!crop) continue;
        if (picks.some((p) => p.crop.key === key)) continue;
        const ev = evalCrop(crop, months, climate, dryFactor);
        if (ev.tempFit < 0.5) continue;

        const ms = months.map((m) => climate.monthly[m]);
        const frostHit = ms.some((m) => m.tMinC <= 0) && crop.frostTol < 0.5;
        const heatHit = ms.some((m) => m.tMaxC >= 36) && crop.heatTol < 0.6;

        let score = ev.tempFit * 40;
        if (frostHit) score -= 25;
        if (heatHit) score -= 15;
        if (crop.family === prevFamily) score -= 25;
        if (crop.legume && prevFamily === "legume") score -= 10;

        const needM3 = ev.needMm * 10;
        const share = supplyM3 / 3;
        const overM3 = Math.max(0, needM3 - share);
        const waterWeight = tpl.bias === "resilience" ? 0.012 : tpl.bias === "profit" ? 0.004 : 0.008;
        score -= overM3 * waterWeight;

        if (tpl.bias === "profit") score += crop.revenue / 150;
        if (tpl.bias === "soil") score += crop.nFix / 4 + crop.residue * 12;
        if (tpl.bias === "resilience")
          score += crop.droughtTol * (20 + rD * 6) + crop.heatTol * (8 + rH * 6) + crop.frostTol * rF * 5;
        if (tpl.bias === "balanced")
          score += crop.revenue / 400 + crop.nFix / 8 + crop.droughtTol * 10;

        if (!best || score > best.score) best = { score, ev };
      }

      const chosen = best?.ev ?? evalCrop(CROPS.fallow, months, climate, dryFactor);
      picks.push(chosen);
      prevFamily = chosen.crop.family;
    });

    return { tpl, picks };
  });

  // Remove duplicate rotations (same crops in same order)
  const unique = built.filter(
    (b, i) =>
      built.findIndex(
        (o) => o.picks.map((p) => p.crop.key).join(">") === b.picks.map((p) => p.crop.key).join(">")
      ) === i
  );

  const revenues = unique.map((u) => u.picks.reduce((s, p) => s + p.crop.revenue, 0));
  const maxRev = Math.max(...revenues);
  const minRev = Math.min(...revenues);

  const plans: CropCyclePlan[] = unique.map(({ tpl, picks }, idx) => {
    const crops = picks.map((p) => p.crop);
    const families = new Set(crops.map((c) => c.family).filter((f) => f !== "fallow"));
    const legumes = crops.filter((c) => c.legume);
    const hasCover = crops.some((c) => c.cover && c.key !== "fallow");
    const nBalance = crops.reduce((s, c) => s + c.nFix - 0.5 * c.nUse, 0);
    const residue = crops.reduce((s, c) => s + c.residue, 0);
    const breaksLast = crops[0].family !== lastFamily;

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

    // ---- Water need (normal vs dry year) ----
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
    if (waterStatus === "deficit") match -= 15;
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
        `Starts with ${crops[0].name}, a different plant family from your last crop (${inputs.lastCrop}) — this breaks pest and disease cycles.`
      );
    } else if (!breaksLast) {
      why.push(
        `Note: ${crops[0].name} is the same plant family as your last crop (${inputs.lastCrop}) — watch for carried-over pests.`
      );
    }
    why.push(
      `NASA data: about ${climate.annualRainMm.toLocaleString()} mm of rain a year here, with ${
        climate.dryMonths.length
      } dry month${climate.dryMonths.length === 1 ? "" : "s"}${
        climate.dryMonths.length ? ` (${listMonths(climate.dryMonths)})` : ""
      }. ${picks[1].crop.name} fits ${windowLabel(picks[1].months)} temperatures (avg ${Math.round(
        picks[1].avgTemp
      )}°C).`
    );
    if (climate.driestYear && climate.driestYearRainMm !== null) {
      why.push(
        `In a dry year like ${climate.driestYear} (${climate.driestYearRainMm.toLocaleString()} mm rain), this plan needs about ${dryNeedM3.toLocaleString()} m³/ha of irrigation — ${
          dryNeedM3 <= supplyM3 ? "still within your water supply." : "more than your water supply."
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
        `Rain here changes a lot from year to year (about ±${climate.rainVariabilityPct}%) — keep seed of a low-water backup crop.`
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
        `NASA shows your topsoil is dry right now (${climate.recent.topsoilWetnessPct}% wetness) — water before sowing ${crops[0].name}.`
      );
    }
    if (legumes.length) {
      actions.push("Ask your seed shop for bean “inoculant” powder — it helps beans make more free fertilizer.");
    }
    if (hasCover || residue >= 2) {
      actions.push("Don't burn crop leftovers — chop them and leave them on top of the soil to feed it and hold moisture.");
    }
    if (rD >= 1 || rH >= 1) {
      actions.push("Water early morning or evening, and spread straw mulch between rows to cut water loss.");
    }
    actions.push("Check the NASA soil-moisture layer on the 2D map each week before you irrigate.");

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
    };
  });

  plans.sort((a, b) => b.matchScore - a.matchScore);
  return plans;
}
