"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Coins,
  Download,
  Droplets,
  Eye,
  Leaf,
  Loader2,
  PenTool,
  RotateCcw,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sprout,
  Thermometer,
  Wheat,
} from "lucide-react";
import {
  fetchCropPlanFromBackend,
  generateCropCyclePlans,
  PREVIOUS_CROP_INFO,
  WATER_TIER_PRESETS,
} from "@/lib/nasa";
import type {
  ClimateProfile,
  CropCyclePlan,
  FarmField,
  FarmerGroundInputs,
  NasaPowerResponse,
  PlanPriority,
  PreviousCropType,
  RiskLevel,
  WaterSupplyTier,
} from "@/types/farm";

interface FarmPlannerModalProps {
  isOpen: boolean;
  step: "inputs" | "plans";
  field: FarmField;
  inputs: FarmerGroundInputs;
  onChangeInputs: (next: FarmerGroundInputs) => void;
  onUpdateFieldName: (name: string) => void;
  onGeneratePlans: () => void;
  onBackToInputs: () => void;
  onMinimizeToMap: () => void;
  onRedrawField: () => void;
  onExportGeoJSON: () => void;
  nasaData: NasaPowerResponse | null;
  isLoadingNasa: boolean;
}

const PREVIOUS_CROPS: PreviousCropType[] = [
  "Wheat",
  "Corn",
  "Rice",
  "Cotton",
  "Vegetables",
  "Soybeans",
  "Orchard",
  "Fallow",
];

const PRIORITY_OPTIONS: {
  id: PlanPriority;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "profit",
    title: "More Money (Highest Cash Profit)",
    shortTitle: "More Money",
    subtitle: "Pick top-selling crops to bring in the most cash this year.",
    icon: <Coins className="w-4 h-4 text-amber-300" />,
  },
  {
    id: "sustainability",
    title: "Healthy Land for Years",
    shortTitle: "Healthy Land",
    subtitle: "Protect & feed your soil so harvests stay strong for years.",
    icon: <Leaf className="w-4 h-4 text-[#A3E4B7]" />,
  },
  {
    id: "water-saving",
    title: "Save Water (Safe Harvest)",
    shortTitle: "Save Water",
    subtitle: "Grow dependable crops that handle dry weather with less water.",
    icon: <Droplets className="w-4 h-4 text-sky-400" />,
  },
];

const STEP_LABELS = [
  "Step 1: First 4 Months",
  "Step 2: Next 4 Months",
  "Step 3: Final 3–4 Months",
];

function getWaterPill(status: CropCyclePlan["waterStatus"]) {
  if (status === "optimal") {
    return {
      text: "Enough Water for This Plan",
      classes: "bg-[#A3E4B7]/15 border-[#A3E4B7]/45 text-[#A3E4B7]",
    };
  }
  if (status === "tight") {
    return {
      text: "Water Is Tight — Use Drip/Mulch",
      classes: "bg-amber-500/15 border-amber-400/45 text-amber-300",
    };
  }
  return {
    text: "Needs More Water Than You Have",
    classes: "bg-rose-500/15 border-rose-400/45 text-rose-300",
  };
}

function getRiskPillStyle(level: RiskLevel): string {
  if (level === "high") {
    return "bg-rose-500/15 border-rose-400/40 text-rose-300";
  }
  if (level === "medium") {
    return "bg-amber-500/15 border-amber-400/40 text-amber-300";
  }
  return "bg-[#A3E4B7]/12 border-[#A3E4B7]/35 text-[#A3E4B7]";
}

function formatRiskLabel(level: RiskLevel): string {
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  return "Low";
}

function getLandBenefitSummary(plan: CropCyclePlan): {
  title: string;
  detail: string;
} {
  if (plan.recommendedFor === "profit") {
    return {
      title: "High Cash Sale",
      detail: "Balances income with soil recovery",
    };
  }
  if (plan.recommendedFor === "sustainability") {
    return {
      title: "Rebuilds Soil Food",
      detail: "Cuts fertilizer needs next year",
    };
  }
  return {
    title: "Low Water Use",
    detail: "Safer during dry & hot weather",
  };
}

export default function FarmPlannerModal({
  isOpen,
  step,
  field,
  inputs,
  onChangeInputs,
  onUpdateFieldName,
  onGeneratePlans,
  onBackToInputs,
  onMinimizeToMap,
  onRedrawField,
  onExportGeoJSON,
  nasaData,
  isLoadingNasa,
}: FarmPlannerModalProps) {
  const [showCustomWater, setShowCustomWater] = useState(false);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [backendClimate, setBackendClimate] = useState<ClimateProfile | null>(null);
  const [backendPlans, setBackendPlans] = useState<CropCyclePlan[] | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setPlanLoading(true);
    fetchCropPlanFromBackend(field, inputs)
      .then((res) => {
        if (cancelled) return;
        setBackendClimate(res.climate);
        setBackendPlans(res.plans);
        setPlanLoading(false);
      })
      .catch(() => {
        if (!cancelled) setPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, field, inputs]);

  const climateSummary = useMemo(() => {
    const records = nasaData?.records ?? [];
    const validTemps = records
      .map((r) => r.tempC)
      .filter((v): v is number => v !== null);
    const avgTemp =
      validTemps.length > 0
        ? validTemps.reduce((a, b) => a + b, 0) / validTemps.length
        : null;
    const validWetness = records
      .map((r) => r.soilWetness)
      .filter((v): v is number => v !== null);
    const latestWetness =
      validWetness.length > 0 ? validWetness[validWetness.length - 1] : null;

    return { avgTemp, latestWetness };
  }, [nasaData]);

  const plans: CropCyclePlan[] = useMemo(
    () => generateCropCyclePlans(field, inputs, nasaData),
    [field, inputs, nasaData]
  );

  if (!isOpen) return null;

  const activePlans =
    backendPlans && backendPlans.length > 0 ? backendPlans : plans;
  const totalWaterM3 = Math.round(field.areaHectares * inputs.waterM3PerHa);
  const prevCropMeta = PREVIOUS_CROP_INFO[inputs.lastCrop];
  const topPlan = activePlans[0];
  const otherPlans = activePlans.slice(1);

  const handleSelectWaterTier = (tier: WaterSupplyTier) => {
    onChangeInputs({
      ...inputs,
      waterTier: tier,
      waterM3PerHa: WATER_TIER_PRESETS[tier].defaultM3PerHa,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        step === "inputs"
          ? "3 Quick Questions About Your Land"
          : "Your Recommended Crop Plan"
      }
      className="fixed inset-0 z-[480] flex items-center justify-center p-3 sm:p-5 bg-[#070B0E]/75 backdrop-blur-md"
    >
      <div className="w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-3xl bg-[#0B1015]/95 border border-white/10 shadow-2xl text-[#F2F7F4] overflow-hidden">
        {/* Top Header: Field Name, Simple Size & NASA Local Weather */}
        <div className="shrink-0 px-5 py-4 border-b border-white/[0.08] bg-[#0D1318]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#A3E4B7] mb-1">
                <Satellite className="w-3.5 h-3.5" />
                {step === "inputs"
                  ? "Step 2 of 3 • 3 Quick Questions About Your Land"
                  : "Step 3 of 3 • Your Recommended Crop Plan"}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {step === "inputs" ? (
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => onUpdateFieldName(e.target.value)}
                    aria-label="Field Name"
                    className="text-base sm:text-lg font-bold bg-[#121A21] border border-white/10 rounded-xl px-2.5 py-1 text-[#F2F7F4] focus:outline-none focus:ring-2 focus:ring-[#A3E4B7]/40 w-full sm:w-64"
                  />
                ) : (
                  <h2 className="text-base sm:text-lg font-bold text-[#F2F7F4]">
                    {field.name}
                  </h2>
                )}
                <span className="px-3 py-1 rounded-full bg-[#111920] border border-white/10 text-xs font-semibold text-[#F2F7F4]">
                  Field Size: {field.areaHectares.toFixed(2)} Hectares /{" "}
                  {field.areaAcres.toFixed(1)} Acres
                </span>
              </div>
            </div>

            {/* Plain NASA Local Weather Pill */}
            <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-[#111920] border border-white/[0.08] text-xs shrink-0">
              {isLoadingNasa ? (
                <span className="inline-flex items-center gap-1.5 text-[#8A9B93]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A3E4B7]" />
                  Checking local weather...
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                    <Thermometer className="w-3.5 h-3.5" />
                    {climateSummary.avgTemp !== null
                      ? `${climateSummary.avgTemp >= 20 ? "Warm" : "Mild"} ${climateSummary.avgTemp.toFixed(0)}°C`
                      : "Weather synced"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#A3E4B7] font-semibold">
                    <Droplets className="w-3.5 h-3.5" />
                    Soil Moisture:{" "}
                    {climateSummary.latestWetness !== null
                      ? `${Math.round(climateSummary.latestWetness * 100)}%`
                      : "—"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto scroll-slim p-5 space-y-5">
          {step === "inputs" ? (
            <>
              <p className="text-xs sm:text-sm text-[#9DB0A7]">
                NASA satellites checked your field size and weather. Answer 3
                simple questions about your land so we can suggest the best
                planting plan for you:
              </p>

              {/* Question 1: Water */}
              <section className="rounded-2xl bg-[#111920] border border-white/[0.08] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#F2F7F4] flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-sky-400" />
                      1. How much water does this field have?
                    </h3>
                    <p className="text-xs text-[#8A9B93] mt-0.5">
                      Pick the choice that matches your farm best.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-[#8A9B93] block">
                      Estimated Water for Your Field
                    </span>
                    <span className="text-sm font-bold text-[#A3E4B7]">
                      ~{totalWaterM3.toLocaleString()} m³
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(WATER_TIER_PRESETS) as WaterSupplyTier[]).map(
                    (tierKey) => {
                      const preset = WATER_TIER_PRESETS[tierKey];
                      const active = inputs.waterTier === tierKey;
                      return (
                        <button
                          key={tierKey}
                          type="button"
                          onClick={() => handleSelectWaterTier(tierKey)}
                          className={`text-left p-3.5 rounded-xl border transition ${
                            active
                              ? "bg-[#A3E4B7]/12 border-[#A3E4B7]/60 text-[#F2F7F4]"
                              : "bg-[#0D1318] border-white/[0.08] text-[#9DB0A7] hover:border-white/25"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs sm:text-sm font-bold text-[#F2F7F4]">
                              {preset.label}
                            </span>
                            {active && (
                              <CheckCircle2 className="w-4 h-4 text-[#A3E4B7] shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-[#8A9B93] mt-1 leading-snug">
                            {preset.desc}
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowCustomWater((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#A3E4B7] hover:underline"
                  >
                    {showCustomWater ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    Know your exact water quota? Enter m³/ha
                  </button>

                  {showCustomWater && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-3">
                      <label
                        htmlFor="water-m3-input"
                        className="text-xs font-semibold text-[#C7D4CD]"
                      >
                        Water amount per hectare (m³/ha):
                      </label>
                      <input
                        id="water-m3-input"
                        type="number"
                        min={0}
                        max={20000}
                        step={250}
                        value={inputs.waterM3PerHa}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          const derivedTier: WaterSupplyTier =
                            val <= 2200
                              ? "low"
                              : val <= 5500
                                ? "moderate"
                                : "high";
                          onChangeInputs({
                            ...inputs,
                            waterTier: derivedTier,
                            waterM3PerHa: val,
                          });
                        }}
                        className="w-36 px-3 py-1.5 rounded-xl bg-[#0D1318] border border-white/15 text-sm font-bold text-[#F2F7F4] focus:outline-none focus:ring-2 focus:ring-[#A3E4B7]/40"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* Question 2: Last Crop */}
              <section className="rounded-2xl bg-[#111920] border border-white/[0.08] p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[#F2F7F4] flex items-center gap-2">
                    <Wheat className="w-4 h-4 text-[#A3E4B7]" />
                    2. What was the last crop planted here?
                  </h3>
                  <p className="text-xs text-[#8A9B93] mt-0.5">
                    Helps keep your soil healthy and avoid repeat crop pests.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PREVIOUS_CROPS.map((crop) => {
                    const active = inputs.lastCrop === crop;
                    return (
                      <button
                        key={crop}
                        type="button"
                        onClick={() =>
                          onChangeInputs({ ...inputs, lastCrop: crop })
                        }
                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-left transition ${
                          active
                            ? "bg-white text-[#070B0E] border-white shadow-sm"
                            : "bg-[#0D1318] text-[#C7D4CD] border-white/[0.08] hover:border-white/25"
                        }`}
                      >
                        {PREVIOUS_CROP_INFO[crop].label}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-[#0D1318] border border-[#A3E4B7]/20 px-3.5 py-2.5 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#A3E4B7] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#C7D4CD] leading-relaxed">
                    <strong className="text-[#F2F7F4]">
                      What {inputs.lastCrop} left in your soil:
                    </strong>{" "}
                    {prevCropMeta.soilEffect}
                  </p>
                </div>
              </section>

              {/* Question 3: Priority */}
              <section className="rounded-2xl bg-[#111920] border border-white/[0.08] p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[#F2F7F4] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#A3E4B7]" />
                    3. What matters most to you this year?
                  </h3>
                  <p className="text-xs text-[#8A9B93] mt-0.5">
                    We will highlight the plan that matches your goal first.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRIORITY_OPTIONS.map((opt) => {
                    const active = inputs.priority === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onChangeInputs({ ...inputs, priority: opt.id })
                        }
                        className={`text-left p-3.5 rounded-xl border transition ${
                          active
                            ? "bg-[#A3E4B7]/12 border-[#A3E4B7]/60"
                            : "bg-[#0D1318] border-white/[0.08] hover:border-white/25"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#F2F7F4] mb-1">
                          {opt.icon}
                          {opt.title}
                        </div>
                        <p className="text-xs text-[#8A9B93] leading-snug">
                          {opt.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            /* Simplified Farmer-Friendly Crop Plan View */
            <div className="space-y-4">
              {/* 3 Big Goal Switcher Buttons */}
              <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#111920] border border-white/[0.08] p-2">
                {PRIORITY_OPTIONS.map((opt) => {
                  const active = inputs.priority === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onChangeInputs({ ...inputs, priority: opt.id })
                      }
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition ${
                        active
                          ? "bg-white text-[#070B0E] shadow-sm"
                          : "bg-[#0D1318] text-[#9DB0A7] hover:text-[#F2F7F4]"
                      }`}
                    >
                      {opt.icon}
                      <span>{opt.shortTitle}</span>
                    </button>
                  );
                })}
              </div>

              {/* NASA 10-Year Weather & Water Resilience Overview */}
              {backendClimate ? (
                <section
                  aria-label="NASA Weather and Water Resilience Check"
                  className="rounded-2xl bg-[#0E161C] border border-[#A3E4B7]/25 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-[#A3E4B7]" />
                      <h3 className="text-xs sm:text-sm font-bold text-[#F2F7F4]">
                        NASA Weather &amp; Water Check:{" "}
                        <span className="text-[#A3E4B7]">
                          {backendClimate.zoneLabel}
                        </span>
                      </h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#111920] border border-white/10 text-[10px] font-bold uppercase tracking-wider text-[#9DB0A7]">
                      {backendClimate.sources.climatology === "nasa-power"
                        ? "Live NASA POWER Multi-Year"
                        : "Regional Estimate"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-xl bg-[#0B1015] border border-white/[0.07] p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-[#8A9B93]">
                        Normal Yearly Rain
                      </div>
                      <div className="text-sm font-bold text-sky-400 mt-0.5">
                        {backendClimate.annualRainMm.toLocaleString()} mm/yr
                      </div>
                      <div className="text-[11px] text-[#8A9B93]">
                        {backendClimate.dryMonths.length} dry month
                        {backendClimate.dryMonths.length === 1 ? "" : "s"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#0B1015] border border-white/[0.07] p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-[#8A9B93]">
                        Driest Recent Year
                      </div>
                      <div className="text-sm font-bold text-amber-300 mt-0.5">
                        {backendClimate.driestYear &&
                        backendClimate.driestYearRainMm !== null
                          ? `${backendClimate.driestYear}: ${backendClimate.driestYearRainMm.toLocaleString()} mm`
                          : "—"}
                      </div>
                      <div className="text-[11px] text-[#8A9B93]">
                        {backendClimate.droughtYears !== null &&
                        backendClimate.yearsAnalyzed
                          ? `${backendClimate.droughtYears} dry yrs in ${backendClimate.yearsAnalyzed}`
                          : "10-year check"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#0B1015] border border-white/[0.07] p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-[#8A9B93]">
                        Warming Trend
                      </div>
                      <div className="text-sm font-bold text-[#F2F7F4] mt-0.5">
                        {backendClimate.warmingPerDecadeC !== null
                          ? `${backendClimate.warmingPerDecadeC >= 0 ? "+" : ""}${backendClimate.warmingPerDecadeC}°C / 10y`
                          : "Steady"}
                      </div>
                      <div className="text-[11px] text-[#8A9B93]">
                        {backendClimate.hotMonths.length > 0
                          ? `${backendClimate.hotMonths.length} very hot mos (35°C+)`
                          : "No extreme heat mos"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#0B1015] border border-white/[0.07] p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-[#8A9B93]">
                        Soil Wetness Now
                      </div>
                      <div className="text-sm font-bold text-[#A3E4B7] mt-0.5">
                        {backendClimate.recent.topsoilWetnessPct !== null
                          ? `${backendClimate.recent.topsoilWetnessPct}% topsoil`
                          : "Synced"}
                      </div>
                      <div className="text-[11px] text-[#8A9B93]">
                        {backendClimate.recent.rain30dMm !== null
                          ? `${backendClimate.recent.rain30dMm} mm rain (30d)`
                          : "Recent 30 days"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {(
                      [
                        ["Drought", backendClimate.risks.drought],
                        ["Summer Heat", backendClimate.risks.heat],
                        ["Frost", backendClimate.risks.frost],
                        ["Rain Swings", backendClimate.risks.rainfallSwings],
                      ] as const
                    ).map(([label, riskLevel]) => (
                      <span
                        key={label}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getRiskPillStyle(
                          riskLevel
                        )}`}
                      >
                        {label} Risk: {formatRiskLabel(riskLevel)}
                      </span>
                    ))}
                  </div>
                </section>
              ) : planLoading ? (
                <div className="rounded-2xl bg-[#111920] border border-white/[0.08] px-4 py-3 flex items-center gap-2 text-xs text-[#9DB0A7]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#A3E4B7]" />
                  Checking 10 years of NASA rainfall, soil wetness &amp; heat
                  trends for your field...
                </div>
              ) : null}

              {/* #1 Primary Recommended Plan Card */}
              {topPlan && (
                <SimplePlanCard
                  plan={topPlan}
                  inputs={inputs}
                  isPrimary
                />
              )}

              {/* Toggle to Show/Hide Other 2 Options */}
              {otherPlans.length > 0 && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAllPlans((v) => !v)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-[#111920] hover:bg-[#17222B] border border-white/10 text-xs font-bold text-[#A3E4B7] flex items-center justify-center gap-2 transition"
                  >
                    {showAllPlans ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Hide Other Plan Options
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show {otherPlans.length} Other Plan Options
                      </>
                    )}
                  </button>

                  {showAllPlans &&
                    otherPlans.map((plan) => (
                      <SimplePlanCard
                        key={plan.id}
                        plan={plan}
                        inputs={inputs}
                        isPrimary={false}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 px-5 py-3.5 border-t border-white/[0.08] bg-[#0D1318] flex flex-wrap items-center justify-between gap-2">
          {step === "inputs" ? (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRedrawField}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/10 bg-[#121A21] hover:bg-[#19242E] text-xs font-semibold text-[#C7D4CD] transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Redraw Field
                </button>
                <button
                  type="button"
                  onClick={onMinimizeToMap}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/10 bg-[#121A21] hover:bg-[#19242E] text-xs font-semibold text-[#C7D4CD] transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Map
                </button>
              </div>
              <button
                type="button"
                onClick={onGeneratePlans}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-[#A3E4B7] text-[#070B0E] text-xs sm:text-sm font-bold shadow-lg transition"
              >
                Show My Crop Plan
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onBackToInputs}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/10 bg-[#121A21] hover:bg-[#19242E] text-xs font-semibold text-[#C7D4CD] transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change Answers
                </button>
                <button
                  type="button"
                  onClick={onRedrawField}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/10 bg-[#121A21] hover:bg-[#19242E] text-xs font-semibold text-[#C7D4CD] transition"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Mark New Field
                </button>
                <button
                  type="button"
                  onClick={onExportGeoJSON}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/10 bg-[#121A21] hover:bg-[#19242E] text-xs font-semibold text-[#C7D4CD] transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#A3E4B7]" />
                  Export GeoJSON
                </button>
              </div>
              <button
                type="button"
                onClick={onMinimizeToMap}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-[#A3E4B7] text-[#070B0E] text-xs font-bold shadow-lg transition"
              >
                <Eye className="w-4 h-4" />
                Inspect on 3D / 2D Map
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SimplePlanCard({
  plan,
  inputs,
  isPrimary,
}: {
  plan: CropCyclePlan;
  inputs: FarmerGroundInputs;
  isPrimary: boolean;
}) {
  const waterPill = getWaterPill(plan.waterStatus);
  const landBenefit = getLandBenefitSummary(plan);

  return (
    <article
      className={`rounded-2xl p-4 sm:p-5 border transition ${
        isPrimary
          ? "bg-[#111920] border-[#A3E4B7]/55 shadow-lg shadow-[#A3E4B7]/5"
          : "bg-[#0E151B] border-white/[0.08]"
      }`}
    >
      {/* Title + Water Fit Pill */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isPrimary
                  ? "bg-[#A3E4B7] text-[#070B0E]"
                  : "bg-[#19232C] text-[#9DB0A7]"
              }`}
            >
              {isPrimary ? "Best Plan for Your Land" : plan.badge}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${waterPill.classes}`}
            >
              {waterPill.text}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#F2F7F4]">
            {plan.name}
          </h3>
          <p className="text-xs sm:text-sm text-[#9DB0A7] mt-0.5">
            {plan.tagline}
          </p>
        </div>
      </div>

      {/* 3 Big Farmer Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
        <div className="rounded-xl bg-[#0B1015] border border-white/[0.08] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A9B93]">
            Estimated Yearly Income
          </div>
          <div className="text-lg font-bold text-[#F2F7F4] mt-0.5">
            ${plan.estimatedTotalRevenueUsd.toLocaleString()} total
          </div>
          <div className="text-xs text-[#A3E4B7]">
            ~${plan.estimatedRevenuePerHaUsd.toLocaleString()} per hectare
          </div>
        </div>

        <div className="rounded-xl bg-[#0B1015] border border-white/[0.08] p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A9B93]">
            Water Needed
          </div>
          <div className="text-lg font-bold text-sky-400 mt-0.5">
            {plan.waterNeededM3PerHa.toLocaleString()} m³/ha
          </div>
          <div className="text-xs text-[#8A9B93]">
            {plan.dryYearWaterNeedM3PerHa !== undefined ? (
              <>
                Dry year:{" "}
                <span className="text-amber-300 font-semibold">
                  {plan.dryYearWaterNeedM3PerHa.toLocaleString()} m³/ha
                </span>{" "}
                • Yours: {inputs.waterM3PerHa.toLocaleString()}
              </>
            ) : (
              <>Your supply: {inputs.waterM3PerHa.toLocaleString()} m³/ha</>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-[#0B1015] border border-white/[0.08] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9B93]">
              Soil &amp; Weather Score
            </span>
            <span className="text-[11px] font-semibold text-[#A3E4B7]">
              {landBenefit.title}
            </span>
          </div>
          <div className="space-y-1.5 text-[11px]">
            <div>
              <div className="flex items-center justify-between text-[#C7D4CD]">
                <span className="inline-flex items-center gap-1">
                  <Sprout className="w-3 h-3 text-[#A3E4B7]" />
                  Soil Health
                </span>
                <span className="font-bold text-[#A3E4B7]">
                  {plan.soilHealthScore}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-0.5">
                <div
                  className="h-full rounded-full bg-[#A3E4B7]"
                  style={{ width: `${plan.soilHealthScore}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-[#C7D4CD]">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-sky-400" />
                  Weather Resilience
                </span>
                <span className="font-bold text-sky-400">
                  {plan.resilienceScore ?? plan.waterEfficiencyScore}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-0.5">
                <div
                  className="h-full rounded-full bg-sky-400"
                  style={{
                    width: `${
                      plan.resilienceScore ?? plan.waterEfficiencyScore
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What to Plant (Step-by-Step 1-Year Cycle) */}
      <div className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[#A3E4B7] mb-2">
          What to Plant (Step-by-Step 1-Year Cycle)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {plan.stages.map((stage, idx) => (
            <div
              key={`${stage.season}-${idx}`}
              className="rounded-xl bg-[#0B1015] border border-white/[0.08] p-3.5"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3E4B7]">
                  {STEP_LABELS[idx] ?? stage.season}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#111920] border border-white/[0.08] text-[10px] font-semibold text-[#C7D4CD]">
                  {stage.durationMonths}
                </span>
              </div>
              <div className="text-sm sm:text-base font-bold text-[#F2F7F4] mb-1">
                {stage.crop}
              </div>
              <p className="text-xs text-[#9DB0A7] leading-snug">
                {stage.role}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2 Simple Boxes: Why This Works & Simple Steps to Follow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-[#0B1015]/85 border border-white/[0.06] p-3.5 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#A3E4B7]">
            Why This Works for Your Field
          </div>
          <ul className="space-y-1.5 text-[#C7D4CD] list-disc list-inside">
            {plan.whyItFits.map((reason) => (
              <li key={reason} className="leading-snug">
                {reason}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-[#0B1015]/85 border border-white/[0.06] p-3.5 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
            Simple Steps to Follow
          </div>
          <ul className="space-y-1.5 text-[#C7D4CD] list-disc list-inside">
            {plan.actionSteps.map((act) => (
              <li key={act} className="leading-snug">
                {act}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {plan.cautions && plan.cautions.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-400/30 p-3.5 space-y-1.5 text-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Weather &amp; Water Watchouts
          </div>
          <ul className="space-y-1 text-amber-100/90 list-disc list-inside">
            {plan.cautions.map((c) => (
              <li key={c} className="leading-snug">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
