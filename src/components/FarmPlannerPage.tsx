"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Globe2,
  Leaf,
  Loader2,
  Mic,
  MicOff,
  PenTool,
  Printer,
  RotateCcw,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Volume2,
  VolumeX,
  Wheat,
} from "lucide-react";
import {
  fetchCropPlanFromBackend,
  generateCropCyclePlans,
  PREVIOUS_CROP_INFO,
  WATER_TIER_PRESETS,
} from "@/lib/nasa";
import {
  formatArea,
  isSpeechSynthesisSupported,
  parseVoiceCommandToInputs,
  speakText,
  startVoiceListening,
  stopSpeaking,
  type AreaUnit,
  type FontScale,
} from "@/lib/speech";
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

type WeatherScenario = "normal" | "dry" | "wet";

interface FarmPlannerPageProps {
  step: "inputs" | "plans";
  field: FarmField;
  inputs: FarmerGroundInputs;
  onChangeInputs: (next: FarmerGroundInputs) => void;
  onUpdateFieldName: (name: string) => void;
  onGeneratePlans: () => void;
  onBackToInputs: () => void;
  onReturnToMap: () => void;
  onRedrawField: () => void;
  onExportGeoJSON: () => void;
  nasaData: NasaPowerResponse | null;
  isLoadingNasa: boolean;
  fontScale: FontScale;
  onChangeFontScale: (scale: FontScale) => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  areaUnit: AreaUnit;
  onChangeAreaUnit: (unit: AreaUnit) => void;
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
    title: "More Money (Cash Profit)",
    shortTitle: "More Money",
    subtitle: "Grow high-value crops to bring in the highest harvest cash this year.",
    icon: <Coins className="w-6 h-6 text-amber-300 shrink-0" />,
  },
  {
    id: "sustainability",
    title: "Healthy Land for Years",
    shortTitle: "Healthy Land",
    subtitle: "Feed the soil naturally with beans and cover crops so yields stay strong.",
    icon: <Leaf className="w-6 h-6 text-[#A3E4B7] shrink-0" />,
  },
  {
    id: "water-saving",
    title: "Save Water (Safe Harvest)",
    shortTitle: "Save Water",
    subtitle: "Pick hardy crops that survive heat and dry weather with less irrigation.",
    icon: <Droplets className="w-6 h-6 text-sky-400 shrink-0" />,
  },
];

const STEP_LABELS = [
  "1st Planting (Months 1–4)",
  "2nd Planting (Months 5–8)",
  "3rd Planting (Months 9–12)",
];

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function getRiskPillStyle(level: RiskLevel): string {
  if (level === "high") {
    return "bg-rose-500/20 border-rose-400/50 text-rose-200";
  }
  if (level === "medium") {
    return "bg-amber-500/20 border-amber-400/50 text-amber-200";
  }
  return "bg-[#A3E4B7]/15 border-[#A3E4B7]/45 text-[#A3E4B7]";
}

function formatRiskLabel(level: RiskLevel): string {
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  return "Low";
}

function getWaterPill(status: CropCyclePlan["waterStatus"]) {
  if (status === "optimal") {
    return {
      text: "Enough Water for This Plan",
      classes: "bg-[#A3E4B7]/15 border-[#A3E4B7]/50 text-[#A3E4B7]",
    };
  }
  if (status === "tight") {
    return {
      text: "Water Is Tight — Use Mulch & Morning Watering",
      classes: "bg-amber-500/20 border-amber-400/50 text-amber-200",
    };
  }
  return {
    text: "Needs More Water Than You Have",
    classes: "bg-rose-500/20 border-rose-400/50 text-rose-200",
  };
}

function CropPictogram({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (n.includes("bean") || n.includes("soy") || n.includes("pea") || n.includes("lentil") || n.includes("clover")) {
    return (
      <svg viewBox="0 0 48 48" className="w-9 h-9 shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="#132A1E" stroke="#A3E4B7" strokeWidth="2" />
        <path d="M15 28 C15 16, 33 14, 33 26 C33 34, 15 36, 15 28 Z" fill="#A3E4B7" />
        <circle cx="20" cy="25" r="2.6" fill="#0B1610" />
        <circle cx="27" cy="23" r="2.6" fill="#0B1610" />
      </svg>
    );
  }
  if (n.includes("corn") || n.includes("maize") || n.includes("sorghum") || n.includes("millet")) {
    return (
      <svg viewBox="0 0 48 48" className="w-9 h-9 shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="#2A210D" stroke="#FBBF24" strokeWidth="2" />
        <ellipse cx="24" cy="23" rx="6" ry="11" fill="#FBBF24" />
        <path d="M16 26 Q24 38 32 26" fill="none" stroke="#34D399" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("rice") || n.includes("paddy")) {
    return (
      <svg viewBox="0 0 48 48" className="w-9 h-9 shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="#0E2430" stroke="#38BDF8" strokeWidth="2" />
        <path d="M14 32 Q24 27 34 32" stroke="#38BDF8" strokeWidth="3" fill="none" />
        <path d="M24 30 V14 M24 18 L18 13 M24 21 L30 16" stroke="#A3E4B7" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("vegetable") || n.includes("tomato") || n.includes("potato")) {
    return (
      <svg viewBox="0 0 48 48" className="w-9 h-9 shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="#2E1318" stroke="#FB7185" strokeWidth="2" />
        <circle cx="24" cy="26" r="9" fill="#F43F5E" />
        <path d="M20 16 L24 19 L28 16" stroke="#34D399" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("orchard") || n.includes("tree")) {
    return (
      <svg viewBox="0 0 48 48" className="w-9 h-9 shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="#13281D" stroke="#34D399" strokeWidth="2" />
        <rect x="21.5" y="26" width="5" height="10" rx="1.5" fill="#D97706" />
        <circle cx="24" cy="20" r="9" fill="#34D399" />
      </svg>
    );
  }
  if (n.includes("cotton") || n.includes("sunflower") || n.includes("sesame") || n.includes("canola")) {
    return (
      <svg viewBox="0 0 48 48" className="w-9 h-9 shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="#241D12" stroke="#FDE047" strokeWidth="2" />
        <circle cx="24" cy="22" r="7" fill="#FEF08A" />
        <circle cx="24" cy="22" r="3" fill="#B45309" />
        <path d="M24 29 V36" stroke="#A3E4B7" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (n.includes("fallow") || n.includes("rest") || n.includes("cover") || n.includes("rye") || n.includes("vetch")) {
    return (
      <svg viewBox="0 0 48 48" className="w-9 h-9 shrink-0" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="#17241D" stroke="#86EFAC" strokeWidth="2" />
        <path d="M13 31 C18 22, 30 22, 35 31 Z" fill="#86EFAC" />
        <path d="M18 23 Q24 14 30 23" fill="none" stroke="#A3E4B7" strokeWidth="2.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9 shrink-0" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#231E11" stroke="#FCD34D" strokeWidth="2" />
      <path d="M24 35 V13 M24 17 L18 13 M24 22 L30 18 M24 26 L18 22" stroke="#FCD34D" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function WaterPictogram({ tier }: { tier: WaterSupplyTier }) {
  if (tier === "low") {
    return <Sun className="w-7 h-7 text-amber-300 shrink-0" />;
  }
  if (tier === "moderate") {
    return <CloudRain className="w-7 h-7 text-sky-300 shrink-0" />;
  }
  return <Droplets className="w-7 h-7 text-[#A3E4B7] shrink-0" />;
}

export default function FarmPlannerPage({
  step,
  field,
  inputs,
  onChangeInputs,
  onUpdateFieldName,
  onGeneratePlans,
  onBackToInputs,
  onReturnToMap,
  onRedrawField,
  onExportGeoJSON,
  nasaData,
  isLoadingNasa,
  fontScale,
  onChangeFontScale,
  highContrast,
  onToggleHighContrast,
  autoSpeak,
  onToggleAutoSpeak,
  areaUnit,
  onChangeAreaUnit,
}: FarmPlannerPageProps) {
  const [backendClimate, setBackendClimate] = useState<ClimateProfile | null>(null);
  const [backendPlans, setBackendPlans] = useState<CropCyclePlan[] | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [scenario, setScenario] = useState<WeatherScenario>("normal");
  const [showAllPlans, setShowAllPlans] = useState(false);

  // Voice synthesis & recognition states (mounted check prevents SSR hydration mismatch)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const stopListeningRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setTtsAvailable(isSpeechSynthesisSupported());
    return () => {
      stopSpeaking();
      stopListeningRef.current?.();
    };
  }, []);

  const sttSupported = true;
  const ttsSupported = true;

  useEffect(() => {
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
  }, [field, inputs]);

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
    const totalRainRecent = records.reduce(
      (sum, r) => sum + (r.precipMm ?? 0),
      0
    );
    return { avgTemp, latestWetness, totalRainRecent };
  }, [nasaData]);

  const localPlans: CropCyclePlan[] = useMemo(
    () => generateCropCyclePlans(field, inputs, nasaData),
    [field, inputs, nasaData]
  );

  const activePlans =
    backendPlans && backendPlans.length > 0 ? backendPlans : localPlans;
  const topPlan = activePlans[0];
  const otherPlans = activePlans.slice(1);
  const areaDisplay = formatArea(field.areaHectares, areaUnit);
  const totalWaterM3 = Math.round(field.areaHectares * inputs.waterM3PerHa);
  const prevCropMeta = PREVIOUS_CROP_INFO[inputs.lastCrop];

  // Dynamic Predict Mechanic calculations
  const prediction = useMemo(() => {
    if (!topPlan) return null;
    const baseWaterNeed = topPlan.waterNeededM3PerHa;
    const dryNeed =
      topPlan.dryYearWaterNeedM3PerHa ?? Math.round(baseWaterNeed * 1.18);
    const wetNeed = Math.round(baseWaterNeed * 0.78);

    const scenarioWaterNeed =
      scenario === "dry"
        ? dryNeed
        : scenario === "wet"
          ? wetNeed
          : baseWaterNeed;

    const waterBalancePerHa = inputs.waterM3PerHa - scenarioWaterNeed;
    const waterRatio =
      scenarioWaterNeed > 0 ? inputs.waterM3PerHa / scenarioWaterNeed : 2;
    const baseResilience =
      topPlan.resilienceScore ?? topPlan.waterEfficiencyScore;

    const waterPenalty =
      waterRatio >= 1
        ? -5
        : Math.round((1 - clamp(waterRatio, 0, 1)) * 28);
    let stability = baseResilience - waterPenalty;
    if (scenario === "dry") stability -= 10;
    if (scenario === "wet") stability += 7;
    const harvestReliability = Math.round(clamp(stability, 18, 98));

    const incomeFactor =
      scenario === "normal"
        ? 1
        : scenario === "dry"
          ? clamp(harvestReliability / 90, 0.56, 0.96)
          : 1.07;

    const yearlyIncomeUsd = Math.round(
      topPlan.estimatedTotalRevenueUsd * incomeFactor
    );
    const threeYearIncomeUsd = yearlyIncomeUsd * 3;

    const soilYear1 = topPlan.soilHealthScore;
    const soilStep = soilYear1 >= 75 ? 6 : soilYear1 >= 60 ? 3 : 1;
    const soilYear2 = clamp(
      soilYear1 + soilStep - (scenario === "dry" ? 1 : 0),
      25,
      99
    );
    const soilYear3 = clamp(
      soilYear2 + soilStep - (scenario === "dry" ? 1 : 0),
      25,
      99
    );

    const scenarioNote =
      waterBalancePerHa >= 0
        ? `Even in a ${
            scenario === "dry" ? "dry year" : scenario === "wet" ? "wet year" : "normal year"
          }, your water supply covers the rotation with ${waterBalancePerHa.toLocaleString()} m³/ha to spare.`
        : `Short by ${Math.abs(waterBalancePerHa).toLocaleString()} m³/ha in a ${
            scenario === "dry" ? "dry year" : "normal year"
          } — consider irrigating fewer hectares or switching to Save Water.`;

    return {
      scenarioWaterNeed,
      waterBalancePerHa,
      harvestReliability,
      yearlyIncomeUsd,
      threeYearIncomeUsd,
      soilYear1,
      soilYear2,
      soilYear3,
      scenarioNote,
    };
  }, [inputs.waterM3PerHa, scenario, topPlan]);

  const speakHelper = (text: string) => {
    if (!ttsAvailable && !isSpeechSynthesisSupported()) {
      setVoiceFeedback(
        "Audio playback is unavailable in this browser window, but all large visual icons and text remain active."
      );
      return;
    }
    setIsSpeaking(true);
    speakText(text, {
      rate: fontScale === "xlarge" ? 0.88 : 0.94,
      onEnd: () => setIsSpeaking(false),
    });
  };

  const handleToggleReadPage = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    if (step === "inputs") {
      const msg =
        `You are setting up ${field.name}, measuring ${areaDisplay.value} ${areaDisplay.unitLabel}. ` +
        `Question 1: Your water supply is set to ${WATER_TIER_PRESETS[inputs.waterTier].label}, about ${inputs.waterM3PerHa} cubic meters per hectare. ` +
        `Question 2: Your last crop was ${PREVIOUS_CROP_INFO[inputs.lastCrop].label}. ` +
        `Question 3: Your main goal is ${
          PRIORITY_OPTIONS.find((p) => p.id === inputs.priority)?.title ??
          inputs.priority
        }. ` +
        `Tap Predict My Crop Rotation when you are ready.`;
      speakHelper(msg);
    } else if (topPlan && prediction) {
      const climatePart = backendClimate
        ? `NASA satellites show a ${backendClimate.zoneLabel} climate with ${backendClimate.annualRainMm} millimeters of rain per year. `
        : "";
      const msg =
        `${climatePart}Top recommended rotation is ${topPlan.name}. ` +
        `First plant ${topPlan.stages[0].crop}, then ${topPlan.stages[1].crop}, then ${topPlan.stages[2].crop}. ` +
        `Under the ${scenario} weather scenario, harvest reliability is ${prediction.harvestReliability} percent, ` +
        `soil health rises from ${prediction.soilYear1} percent to ${prediction.soilYear3} percent by year three, ` +
        `and predicted yearly income is about ${prediction.yearlyIncomeUsd.toLocaleString()} dollars.`;
      speakHelper(msg);
    }
  };

  const handleVoiceCommand = () => {
    if (isListening) {
      stopListeningRef.current?.();
      setIsListening(false);
      return;
    }

    setVoiceFeedback("Listening... say e.g. 'Medium water, Corn before, Save water, Predict'");
    setIsListening(true);

    stopListeningRef.current = startVoiceListening(
      (transcript) => {
        const parsed = parseVoiceCommandToInputs(transcript, inputs);
        onChangeInputs(parsed.updated);
        if (parsed.action === "predict") {
          onGeneratePlans();
        } else if (parsed.action === "back") {
          onBackToInputs();
        } else if (parsed.action === "listen") {
          handleToggleReadPage();
        }
        const summary = parsed.matchedLabel
          ? `Heard "${transcript}" → Applied: ${parsed.matchedLabel}`
          : parsed.action
            ? `Heard "${transcript}" → Running ${parsed.action}`
            : `Heard "${transcript}" — try naming water (little/medium/plenty), a crop, or your goal.`;
        setVoiceFeedback(summary);
        if (autoSpeak && parsed.matchedLabel) {
          speakHelper(`Applied ${parsed.matchedLabel}`);
        }
      },
      (err) => {
        setVoiceFeedback(err);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleAutoFillFromNasa = () => {
    const wet =
      backendClimate?.recent.topsoilWetnessPct ??
      (climateSummary.latestWetness !== null
        ? Math.round(climateSummary.latestWetness * 100)
        : null);
    const rainYear = backendClimate?.annualRainMm ?? null;

    let tier: WaterSupplyTier = "moderate";
    if ((wet !== null && wet < 28) || (rainYear !== null && rainYear < 220)) {
      tier = "moderate";
    } else if ((wet !== null && wet >= 55) || (rainYear !== null && rainYear >= 750)) {
      tier = "high";
    } else if (wet !== null && wet < 20 && rainYear !== null && rainYear < 150) {
      tier = "low";
    }

    const next: FarmerGroundInputs = {
      ...inputs,
      waterTier: tier,
      waterM3PerHa: WATER_TIER_PRESETS[tier].defaultM3PerHa,
    };
    onChangeInputs(next);

    const feedback = `NASA set your water estimate to ${WATER_TIER_PRESETS[tier].label} based on local soil moisture and rainfall.`;
    setVoiceFeedback(feedback);
    if (autoSpeak) speakHelper(feedback);
  };

  const handleSelectWaterTier = (tier: WaterSupplyTier) => {
    const next: FarmerGroundInputs = {
      ...inputs,
      waterTier: tier,
      waterM3PerHa: WATER_TIER_PRESETS[tier].defaultM3PerHa,
    };
    onChangeInputs(next);
    if (autoSpeak) {
      speakHelper(`${WATER_TIER_PRESETS[tier].label}. ${WATER_TIER_PRESETS[tier].desc}`);
    }
  };

  const handleSelectCrop = (crop: PreviousCropType) => {
    onChangeInputs({ ...inputs, lastCrop: crop });
    if (autoSpeak) {
      speakHelper(
        `Last crop ${PREVIOUS_CROP_INFO[crop].label}. ${PREVIOUS_CROP_INFO[crop].soilEffect}`
      );
    }
  };

  const handleSelectPriority = (priority: PlanPriority) => {
    onChangeInputs({ ...inputs, priority });
    if (autoSpeak) {
      const opt = PRIORITY_OPTIONS.find((p) => p.id === priority);
      if (opt) speakHelper(`${opt.title}. ${opt.subtitle}`);
    }
  };

  return (
    <div
      role="region"
      aria-label="NASA × FARMVISION Farmer Crop Planner & Prediction Studio"
      className="min-h-dvh w-full bg-[#0B1914] text-[#F7FAF6] flex flex-col"
    >
      {/* Top Sticky Bar — Warm Canopy Green & Harvest Gold High Contrast */}
      <header className="no-print sticky top-0 z-30 bg-[#0E221A]/95 backdrop-blur-xl border-b border-[#6EE7B7]/25 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back to Globe/Map + Brand */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onReturnToMap}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#152E24] hover:bg-[#1C3D30] border border-[#6EE7B7]/25 text-sm sm:text-base font-bold text-[#F7FAF6] transition"
            >
              <Globe2 className="w-5 h-5 text-[#6EE7B7]" />
              <span>&larr; 3D Earth &amp; Map</span>
            </button>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#152E24] border border-[#6EE7B7]/35 text-sm font-semibold text-[#6EE7B7]">
              <Satellite className="w-4 h-4" />
              <span>
                {step === "inputs"
                  ? "Step 2: Land Inputs"
                  : "Step 3: Prediction & Crop Plan"}
              </span>
            </div>
          </div>

          {/* Right: Accessibility & Voice QoL Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Font Size Switcher A / A+ / A++ */}
            <div
              role="group"
              aria-label="Text Size"
              className="inline-flex items-center rounded-full bg-[#152E24] border border-[#6EE7B7]/25 p-1"
            >
              {(
                [
                  ["normal", "A", "Normal text size"],
                  ["large", "A+", "Large text size"],
                  ["xlarge", "A++", "Extra large text size"],
                ] as const
              ).map(([scale, label, title]) => (
                <button
                  key={scale}
                  type="button"
                  title={title}
                  onClick={() => onChangeFontScale(scale)}
                  aria-pressed={fontScale === scale}
                  className={`px-3 py-1 rounded-full text-sm font-extrabold transition ${
                    fontScale === scale
                      ? "bg-[#6EE7B7] text-[#08150F]"
                      : "text-[#D4E6DC] hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* High Contrast Toggle */}
            <button
              type="button"
              onClick={onToggleHighContrast}
              aria-pressed={highContrast}
              title="Toggle high contrast for bright sunlight or low vision"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-bold transition ${
                highContrast
                  ? "bg-amber-300 text-[#08150F] border-amber-200"
                  : "bg-[#152E24] text-[#E6F1EC] border-[#6EE7B7]/25 hover:border-[#6EE7B7]/50"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Contrast</span>
            </button>

            {/* Voice Guide Auto-Speak Toggle */}
            {ttsSupported && (
              <button
                type="button"
                onClick={onToggleAutoSpeak}
                aria-pressed={autoSpeak}
                title="Automatically speak options when tapped"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm font-bold transition ${
                  autoSpeak
                    ? "bg-[#4ADE80] text-[#07150F] border-[#6EE7B7]"
                    : "bg-[#152E24] text-[#E6F1EC] border-[#6EE7B7]/25 hover:border-[#6EE7B7]/55"
                }`}
              >
                {autoSpeak ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
                <span>Voice Guide {autoSpeak ? "ON" : "OFF"}</span>
              </button>
            )}

            {/* Read Aloud / Stop Button — Harvest Gold Beacon */}
            {ttsSupported && (
              <button
                type="button"
                onClick={handleToggleReadPage}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-extrabold transition shadow-md border ${
                  isSpeaking
                    ? "bg-rose-500 text-white border-rose-300 hover:bg-rose-400"
                    : "bg-amber-400 text-[#08150F] border-amber-200 hover:bg-amber-300"
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>{isSpeaking ? "Stop Voice" : "Listen to Page"}</span>
              </button>
            )}

            {/* Answer by Voice Mic */}
            <button
              type="button"
              onClick={handleVoiceCommand}
              title={
                sttSupported
                  ? "Speak your water supply, last crop, and goal"
                  : "Check microphone voice support"
              }
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-extrabold transition ${
                isListening
                  ? "bg-rose-500 text-white border-rose-300 animate-pulse"
                  : "bg-[#152E24] text-sky-300 border-sky-400/45 hover:bg-[#1C3D30]"
              }`}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              <span>{isListening ? "Listening..." : "Speak Answers"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Voice Feedback / Notification Banner */}
        {voiceFeedback && (
          <div
            role="status"
            className="no-print rounded-2xl bg-[#152E24] border border-[#6EE7B7]/50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 text-base font-semibold text-[#F7FAF6]">
              <Sparkles className="w-5 h-5 text-[#6EE7B7] shrink-0" />
              <span>{voiceFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setVoiceFeedback(null)}
              className="text-sm font-bold text-[#6EE7B7] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Field Header Card with Editable Name, Large Unit Switcher & NASA Weather */}
        <section className="print-card rounded-3xl bg-[#10241C] border border-[#6EE7B7]/25 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-[260px]">
            <div className="text-sm font-bold uppercase tracking-wider text-[#6EE7B7]">
              Marked Farm Parcel &bull; {field.centroid[0].toFixed(3)}&deg;,{" "}
              {field.centroid[1].toFixed(3)}&deg;
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {step === "inputs" ? (
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => onUpdateFieldName(e.target.value)}
                  aria-label="Field Name"
                  className="text-2xl sm:text-3xl font-extrabold bg-[#152E24] border border-[#6EE7B7]/30 rounded-2xl px-4 py-2 text-[#F7FAF6] focus:outline-none focus:ring-2 focus:ring-[#6EE7B7]/50 w-full sm:w-96 max-w-full"
                />
              ) : (
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F7FAF6]">
                  {field.name}
                </h1>
              )}

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#152E24] border border-[#6EE7B7]/35 text-base sm:text-lg font-extrabold text-[#F7FAF6]">
                <span>Size:</span>
                <span className="text-[#6EE7B7]">
                  {areaDisplay.value} {areaDisplay.unitLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Land Unit Switcher QoL */}
            <div
              role="group"
              aria-label="Land Size Unit"
              className="no-print inline-flex items-center rounded-2xl bg-[#152E24] border border-[#6EE7B7]/25 p-1"
            >
              {(
                [
                  ["ha", "Hectares"],
                  ["acres", "Acres"],
                  ["feddan", "Feddan"],
                ] as const
              ).map(([u, label]) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onChangeAreaUnit(u)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-bold transition ${
                    areaUnit === u
                      ? "bg-[#F7FAF6] text-[#08150F]"
                      : "text-[#D4E6DC] hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Live NASA Sensor Summary Pill */}
            <div className="flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-[#152E24] border border-[#6EE7B7]/25 text-base">
              {isLoadingNasa ? (
                <span className="inline-flex items-center gap-2 text-[#C2D9CD]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#6EE7B7]" />
                  Checking NASA weather...
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 text-amber-300 font-bold">
                    <Thermometer className="w-5 h-5" />
                    {climateSummary.avgTemp !== null
                      ? `${climateSummary.avgTemp.toFixed(0)}°C Avg`
                      : "Temp Synced"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[#6EE7B7] font-bold">
                    <Droplets className="w-5 h-5" />
                    Soil:{" "}
                    {climateSummary.latestWetness !== null
                      ? `${Math.round(climateSummary.latestWetness * 100)}%`
                      : "Synced"}
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        {step === "inputs" ? (
          /* ============================================================= */
          /* STEP 1: LARGE-PRINT INPUTS WITH PICTOGRAMS & VOICE ASSIST     */
          /* ============================================================= */
          <div className="space-y-6">
            {/* Helper Banner */}
            <div className="rounded-3xl bg-[#152E24] border border-[#6EE7B7]/35 p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#F7FAF6]">
                  Tell Us 3 Simple Things About Your Farm
                </h2>
                <p className="text-base sm:text-lg text-[#D4E6DC] leading-relaxed">
                  Tap the big pictures below, tap <strong>Listen</strong> to hear options aloud, or tap{" "}
                  <strong>Auto-Fill from NASA</strong> if you are unsure.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleAutoFillFromNasa}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#6EE7B7]/15 hover:bg-[#6EE7B7]/25 border border-[#6EE7B7]/50 text-base font-bold text-[#6EE7B7] transition"
                >
                  <Sparkles className="w-5 h-5" />
                  Auto-Fill Water from NASA
                </button>
              </div>
            </div>

            {/* Question 1: Water */}
            <section className="rounded-3xl bg-[#10241C] border border-[#6EE7B7]/25 p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[#F7FAF6] flex items-center gap-2.5">
                      <Droplets className="w-6 h-6 text-sky-400 shrink-0" />
                      1. How much water does this field have?
                    </h3>
                    {ttsSupported && (
                      <button
                        type="button"
                        onClick={() =>
                          speakHelper(
                            "Question 1. How much water does this field have? Choose Little Water for mostly rain, Medium Water for canal or well pump, or Plenty of Water for drip or river pump."
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 border border-amber-200 text-sm font-bold text-[#08150F]"
                      >
                        <Volume2 className="w-4 h-4" />
                        Listen
                      </button>
                    )}
                  </div>
                  <p className="text-base text-[#C2D9CD]">
                    Pick the picture that best matches how you water crops.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#152E24] border border-[#6EE7B7]/25 px-4 py-2.5 text-right">
                  <div className="text-sm font-semibold text-[#C2D9CD]">
                    Total Water on Your Land
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-[#6EE7B7]">
                    ~{totalWaterM3.toLocaleString()} m&sup3; / year
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {(Object.keys(WATER_TIER_PRESETS) as WaterSupplyTier[]).map(
                  (tierKey) => {
                    const preset = WATER_TIER_PRESETS[tierKey];
                    const active = inputs.waterTier === tierKey;
                    return (
                      <div
                        key={tierKey}
                        className={`rounded-2xl border-2 p-5 transition flex flex-col justify-between gap-3 ${
                          active
                            ? "bg-[#6EE7B7]/16 border-[#6EE7B7] shadow-lg shadow-[#6EE7B7]/15"
                            : "bg-[#152E24] border-[#6EE7B7]/20 hover:border-[#6EE7B7]/45"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectWaterTier(tierKey)}
                          className="text-left space-y-2.5 w-full"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <WaterPictogram tier={tierKey} />
                            {active && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#6EE7B7] text-[#08150F] text-sm font-extrabold">
                                <CheckCircle2 className="w-4 h-4" />
                                Selected
                              </span>
                            )}
                          </div>
                          <div className="text-xl font-extrabold text-[#F7FAF6]">
                            {preset.label}
                          </div>
                          <p className="text-base text-[#D4E6DC] leading-relaxed">
                            {preset.desc}
                          </p>
                        </button>

                        {ttsSupported && (
                          <button
                            type="button"
                            onClick={() =>
                              speakHelper(`${preset.label}. ${preset.desc}`)
                            }
                            className="self-start inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0C1B15] hover:bg-amber-400 hover:text-[#08150F] border border-[#6EE7B7]/25 text-sm font-bold text-[#6EE7B7] transition"
                          >
                            <Volume2 className="w-4 h-4" />
                            Hear option
                          </button>
                        )}
                      </div>
                    );
                  }
                )}
              </div>

              {/* Easy Water Slider + Number Input */}
              <div className="rounded-2xl bg-[#152E24] border border-[#6EE7B7]/20 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[240px] space-y-2">
                  <label
                    htmlFor="water-range-slider"
                    className="block text-base font-bold text-[#F7FAF6]"
                  >
                    Adjust water amount per hectare:{" "}
                    <span className="text-[#6EE7B7]">
                      {inputs.waterM3PerHa.toLocaleString()} m&sup3;/ha
                    </span>
                  </label>
                  <input
                    id="water-range-slider"
                    type="range"
                    min={0}
                    max={12000}
                    step={250}
                    value={Math.min(12000, inputs.waterM3PerHa)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const derivedTier: WaterSupplyTier =
                        val <= 2200 ? "low" : val <= 5500 ? "moderate" : "high";
                      onChangeInputs({
                        ...inputs,
                        waterTier: derivedTier,
                        waterM3PerHa: val,
                      });
                    }}
                    className="w-full h-3 accent-[#6EE7B7] cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="water-exact-input"
                    className="text-base font-semibold text-[#D4E6DC]"
                  >
                    Exact m&sup3;/ha:
                  </label>
                  <input
                    id="water-exact-input"
                    type="number"
                    min={0}
                    max={25000}
                    step={250}
                    value={inputs.waterM3PerHa}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      const derivedTier: WaterSupplyTier =
                        val <= 2200 ? "low" : val <= 5500 ? "moderate" : "high";
                      onChangeInputs({
                        ...inputs,
                        waterTier: derivedTier,
                        waterM3PerHa: val,
                      });
                    }}
                    className="w-32 px-3 py-2 rounded-xl bg-[#0B1914] border border-[#6EE7B7]/30 text-lg font-extrabold text-[#F7FAF6] focus:outline-none focus:ring-2 focus:ring-[#6EE7B7]"
                  />
                </div>
              </div>
            </section>

            {/* Question 2: Last Crop */}
            <section className="rounded-3xl bg-[#10241C] border border-[#6EE7B7]/25 p-5 sm:p-6 space-y-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#F7FAF6] flex items-center gap-2.5">
                    <Wheat className="w-6 h-6 text-[#6EE7B7] shrink-0" />
                    2. What was the last crop planted here?
                  </h3>
                  {ttsSupported && (
                    <button
                      type="button"
                      onClick={() =>
                        speakHelper(
                          "Question 2. Tap the picture of the last crop you harvested from this field so we protect soil nutrients and stop repeating crop diseases."
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 border border-amber-200 text-sm font-bold text-[#08150F]"
                    >
                      <Volume2 className="w-4 h-4" />
                      Listen
                    </button>
                  )}
                </div>
                <p className="text-base text-[#C2D9CD]">
                  Changing crop families naturally breaks pests and feeds tired soil.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PREVIOUS_CROPS.map((crop) => {
                  const active = inputs.lastCrop === crop;
                  return (
                    <button
                      key={crop}
                      type="button"
                      onClick={() => handleSelectCrop(crop)}
                      className={`p-4 rounded-2xl border-2 text-left transition flex items-center gap-3 ${
                        active
                          ? "bg-[#F7FAF6] text-[#08150F] border-[#F7FAF6] shadow-lg"
                          : "bg-[#152E24] text-[#F7FAF6] border-[#6EE7B7]/20 hover:border-[#6EE7B7]/60"
                      }`}
                    >
                      <CropPictogram name={crop} />
                      <span className="text-base sm:text-lg font-extrabold leading-snug">
                        {PREVIOUS_CROP_INFO[crop].label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl bg-[#152E24] border border-[#6EE7B7]/35 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                  <Sparkles className="w-6 h-6 text-[#6EE7B7] shrink-0 mt-0.5" />
                  <p className="text-base sm:text-lg text-[#E6F1EC] leading-relaxed">
                    <strong className="text-[#6EE7B7]">
                      Soil status after {inputs.lastCrop}:
                    </strong>{" "}
                    {prevCropMeta.soilEffect}
                  </p>
                </div>
                {ttsSupported && (
                  <button
                    type="button"
                    onClick={() =>
                      speakHelper(
                        `After ${inputs.lastCrop}: ${prevCropMeta.soilEffect}`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-amber-400 hover:bg-amber-300 border border-amber-200 text-sm font-bold text-[#08150F]"
                  >
                    <Volume2 className="w-4 h-4" />
                    Listen
                  </button>
                )}
              </div>
            </section>

            {/* Question 3: Priority */}
            <section className="rounded-3xl bg-[#10241C] border border-[#6EE7B7]/25 p-5 sm:p-6 space-y-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-[#F7FAF6] flex items-center gap-2.5">
                    <ShieldCheck className="w-6 h-6 text-[#6EE7B7] shrink-0" />
                    3. What matters most to you this year?
                  </h3>
                  {ttsSupported && (
                    <button
                      type="button"
                      onClick={() =>
                        speakHelper(
                          "Question 3. Pick your main goal: More Money, Healthy Land for Years, or Save Water for dry weather."
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 border border-amber-200 text-sm font-bold text-[#08150F]"
                    >
                      <Volume2 className="w-4 h-4" />
                      Listen
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {PRIORITY_OPTIONS.map((opt) => {
                  const active = inputs.priority === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectPriority(opt.id)}
                      className={`text-left p-5 rounded-2xl border-2 transition space-y-2 ${
                        active
                          ? "bg-[#6EE7B7]/16 border-[#6EE7B7]"
                          : "bg-[#152E24] border-[#6EE7B7]/20 hover:border-[#6EE7B7]/45"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 text-xl font-extrabold text-[#F7FAF6]">
                          {opt.icon}
                          <span>{opt.title}</span>
                        </div>
                        {active && (
                          <CheckCircle2 className="w-6 h-6 text-[#6EE7B7] shrink-0" />
                        )}
                      </div>
                      <p className="text-base text-[#D4E6DC] leading-relaxed">
                        {opt.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Primary CTA */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 pb-6">
              <button
                type="button"
                onClick={onRedrawField}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full border border-[#6EE7B7]/30 bg-[#152E24] hover:bg-[#1C3D30] text-base font-bold text-[#E6F1EC] transition"
              >
                <RotateCcw className="w-5 h-5" />
                Redraw Land Boundary
              </button>

              <button
                type="button"
                onClick={() => {
                  onGeneratePlans();
                  if (autoSpeak && topPlan) {
                    speakHelper(
                      `Predicting your crop rotation now. Top plan is ${topPlan.name}.`
                    );
                  }
                }}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-[#4ADE80] hover:bg-amber-300 text-[#07150F] text-lg sm:text-xl font-extrabold shadow-2xl transition hover:scale-[1.02]"
              >
                <Sparkles className="w-6 h-6" />
                <span>Predict My Crop Rotation &amp; 3-Year Forecast</span>
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================= */
          /* STEP 2: INTERACTIVE PREDICT MECHANIC + NASA WEATHER + PLANS   */
          /* ============================================================= */
          <div className="space-y-6">
            {/* Big Goal Switcher Tabs */}
            <div
              role="group"
              aria-label="Switch Priority Goal"
              className="no-print grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-3xl bg-[#10241C] border border-[#6EE7B7]/25 p-2.5"
            >
              {PRIORITY_OPTIONS.map((opt) => {
                const active = inputs.priority === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectPriority(opt.id)}
                    className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-base sm:text-lg font-extrabold transition ${
                      active
                        ? "bg-[#F7FAF6] text-[#08150F] shadow-lg"
                        : "bg-[#152E24] text-[#D4E6DC] hover:text-white"
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.shortTitle}</span>
                  </button>
                );
              })}
            </div>

            {/* Interactive PREDICT MECHANIC: What-If Weather & 3-Year Simulator */}
            {topPlan && prediction && (
              <section
                aria-label="Interactive Crop & Weather Predictor"
                className="print-card rounded-3xl bg-gradient-to-br from-[#122B21] via-[#10241C] to-[#163428] border-2 border-[#6EE7B7]/50 p-5 sm:p-6 space-y-5 shadow-2xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#6EE7B7]">
                      <Sparkles className="w-4 h-4" />
                      Interactive 3-Year Predict Mechanic
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F7FAF6]">
                      Test &ldquo;{topPlan.name}&rdquo; in Different Weather Years
                    </h2>
                  </div>

                  {ttsSupported && (
                    <button
                      type="button"
                      onClick={() =>
                        speakHelper(
                          `In a ${
                            scenario === "dry"
                              ? "dry drought year"
                              : scenario === "wet"
                                ? "wet rain year"
                                : "normal weather year"
                          }, harvest reliability is ${prediction.harvestReliability} percent. ${prediction.scenarioNote} By year 3, your soil health score is predicted to reach ${prediction.soilYear3} percent.`
                        )
                      }
                      className="no-print inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 border border-amber-200 text-base font-bold text-[#08150F]"
                    >
                      <Volume2 className="w-5 h-5" />
                      Listen to Prediction
                    </button>
                  )}
                </div>

                {/* Scenario Selector Buttons */}
                <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        id: "normal" as const,
                        label: "Normal Weather Year",
                        sub: "NASA 30-Year Average Rain & Heat",
                        icon: <CloudRain className="w-5 h-5 text-sky-300" />,
                      },
                      {
                        id: "dry" as const,
                        label: "Dry / Drought Year",
                        sub: backendClimate?.driestYear
                          ? `Like ${backendClimate.driestYear} (${backendClimate.driestYearRainMm} mm rain)`
                          : "Hardest Drought Stress Test",
                        icon: <Sun className="w-5 h-5 text-amber-300" />,
                      },
                      {
                        id: "wet" as const,
                        label: "Wet / Good Rain Year",
                        sub: "+25% Rainfall Above Average",
                        icon: <Droplets className="w-5 h-5 text-[#6EE7B7]" />,
                      },
                    ]
                  ).map((sc) => {
                    const active = scenario === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          setScenario(sc.id);
                          if (autoSpeak) speakHelper(`Simulating ${sc.label}`);
                        }}
                        className={`p-4 rounded-2xl border-2 text-left transition ${
                          active
                            ? "bg-[#F7FAF6] text-[#08150F] border-[#F7FAF6] shadow-lg"
                            : "bg-[#0C1B15] text-[#F7FAF6] border-[#6EE7B7]/25 hover:border-[#6EE7B7]/60"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-lg font-extrabold">
                          {sc.icon}
                          <span>{sc.label}</span>
                        </div>
                        <p
                          className={`text-sm mt-1 ${
                            active ? "text-[#142920] font-semibold" : "text-[#C2D9CD]"
                          }`}
                        >
                          {sc.sub}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* 4 Big Prediction Result Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/25 p-4 space-y-1">
                    <div className="text-sm font-bold text-[#C2D9CD]">
                      Predicted Safe Harvest
                    </div>
                    <div className="text-3xl font-extrabold text-[#6EE7B7]">
                      {prediction.harvestReliability}%
                    </div>
                    <p className="text-sm text-[#D4E6DC]">
                      {prediction.harvestReliability >= 75
                        ? "Strong chance of a steady harvest"
                        : "Moderate weather risk — pick drought crops"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/25 p-4 space-y-1">
                    <div className="text-sm font-bold text-[#C2D9CD]">
                      Predicted Water Need
                    </div>
                    <div className="text-3xl font-extrabold text-sky-300">
                      {prediction.scenarioWaterNeed.toLocaleString()}
                      <span className="text-base font-bold"> m&sup3;/ha</span>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        prediction.waterBalancePerHa >= 0
                          ? "text-[#6EE7B7]"
                          : "text-amber-300"
                      }`}
                    >
                      {prediction.waterBalancePerHa >= 0
                        ? `+${prediction.waterBalancePerHa.toLocaleString()} m³/ha left over`
                        : `Short ${Math.abs(prediction.waterBalancePerHa).toLocaleString()} m³/ha`}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/25 p-4 space-y-1">
                    <div className="text-sm font-bold text-[#C2D9CD]">
                      Predicted 3-Year Income
                    </div>
                    <div className="text-3xl font-extrabold text-[#F7FAF6]">
                      ${prediction.threeYearIncomeUsd.toLocaleString()}
                    </div>
                    <p className="text-sm text-[#6EE7B7] font-semibold">
                      ~${prediction.yearlyIncomeUsd.toLocaleString()} / year
                    </p>
                  </div>

                  {/* 3-Year Soil Health Trajectory */}
                  <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/25 p-4 space-y-2">
                    <div className="text-sm font-bold text-[#C2D9CD]">
                      3-Year Soil Health Forecast
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-end pt-1">
                      {(
                        [
                          ["Yr 1", prediction.soilYear1],
                          ["Yr 2", prediction.soilYear2],
                          ["Yr 3", prediction.soilYear3],
                        ] as const
                      ).map(([yr, val]) => (
                        <div key={yr} className="text-center space-y-1">
                          <div className="text-base font-extrabold text-[#6EE7B7]">
                            {val}%
                          </div>
                          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#6EE7B7]"
                              style={{ width: `${val}%` }}
                            />
                          </div>
                          <div className="text-sm font-bold text-[#D4E6DC]">
                            {yr}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-base text-[#E6F1EC] bg-[#0C1B15]/85 border border-[#6EE7B7]/20 rounded-2xl px-4 py-3 leading-relaxed">
                  {prediction.scenarioNote}
                </p>
              </section>
            )}

            {/* NASA 10-Year Weather & Water Check Banner (Large Readable Type) */}
            {backendClimate ? (
              <section
                aria-label="NASA Weather and Water Resilience Check"
                className="print-card rounded-3xl bg-[#10241C] border border-[#6EE7B7]/35 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CloudRain className="w-6 h-6 text-[#6EE7B7]" />
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#F7FAF6]">
                      NASA 10-Year Climate Check:{" "}
                      <span className="text-[#6EE7B7]">
                        {backendClimate.zoneLabel}
                      </span>
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {ttsSupported && (
                      <button
                        type="button"
                        onClick={() =>
                          speakHelper(
                            `Your field climate is ${backendClimate.zoneLabel}. Average yearly rain is ${backendClimate.annualRainMm} millimeters with ${backendClimate.dryMonths.length} dry months. Drought risk is ${backendClimate.risks.drought}. Summer heat risk is ${backendClimate.risks.heat}.`
                          )
                        }
                        className="no-print inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 border border-amber-200 text-sm font-bold text-[#08150F]"
                      >
                        <Volume2 className="w-4 h-4" />
                        Listen
                      </button>
                    )}
                    <span className="px-3.5 py-1.5 rounded-full bg-[#152E24] border border-[#6EE7B7]/25 text-sm font-bold text-[#D4E6DC]">
                      {backendClimate.sources.climatology === "nasa-power"
                        ? "Live NASA POWER Multi-Year"
                        : "Regional Estimate"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/20 p-4">
                    <div className="text-sm font-bold text-[#C2D9CD]">
                      Normal Yearly Rain
                    </div>
                    <div className="text-2xl font-extrabold text-sky-300 mt-1">
                      {backendClimate.annualRainMm.toLocaleString()} mm / yr
                    </div>
                    <div className="text-sm text-[#D4E6DC] mt-0.5">
                      {backendClimate.dryMonths.length} dry month
                      {backendClimate.dryMonths.length === 1 ? "" : "s"} a year
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/20 p-4">
                    <div className="text-sm font-bold text-[#C2D9CD]">
                      Driest Recent Year
                    </div>
                    <div className="text-2xl font-extrabold text-amber-300 mt-1">
                      {backendClimate.driestYear &&
                      backendClimate.driestYearRainMm !== null
                        ? `${backendClimate.driestYear}: ${backendClimate.driestYearRainMm.toLocaleString()} mm`
                        : "—"}
                    </div>
                    <div className="text-sm text-[#D4E6DC] mt-0.5">
                      {backendClimate.droughtYears !== null &&
                      backendClimate.yearsAnalyzed
                        ? `${backendClimate.droughtYears} dry years in ${backendClimate.yearsAnalyzed}`
                        : "10-year history"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/20 p-4">
                    <div className="text-sm font-bold text-[#C2D9CD]">
                      Temperature Shift
                    </div>
                    <div className="text-2xl font-extrabold text-[#F7FAF6] mt-1">
                      {backendClimate.warmingPerDecadeC !== null
                        ? `${backendClimate.warmingPerDecadeC >= 0 ? "+" : ""}${backendClimate.warmingPerDecadeC}°C / 10 yrs`
                        : "Steady"}
                    </div>
                    <div className="text-sm text-[#D4E6DC] mt-0.5">
                      {backendClimate.hotMonths.length > 0
                        ? `${backendClimate.hotMonths.length} very hot months (35°C+)`
                        : "No extreme heat months"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/20 p-4">
                    <div className="text-sm font-bold text-[#C2D9CD]">
                      Soil Wetness Right Now
                    </div>
                    <div className="text-2xl font-extrabold text-[#6EE7B7] mt-1">
                      {backendClimate.recent.topsoilWetnessPct !== null
                        ? `${backendClimate.recent.topsoilWetnessPct}% topsoil`
                        : "Synced"}
                    </div>
                    <div className="text-sm text-[#D4E6DC] mt-0.5">
                      {backendClimate.recent.rain30dMm !== null
                        ? `${backendClimate.recent.rain30dMm} mm rain in last 30 days`
                        : "Recent 30-day scan"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {(
                    [
                      ["Drought Risk", backendClimate.risks.drought],
                      ["Summer Heat Risk", backendClimate.risks.heat],
                      ["Frost Risk", backendClimate.risks.frost],
                      ["Year-to-Year Rain Swings", backendClimate.risks.rainfallSwings],
                    ] as const
                  ).map(([label, riskLevel]) => (
                    <span
                      key={label}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getRiskPillStyle(
                        riskLevel
                      )}`}
                    >
                      {label}: {formatRiskLabel(riskLevel)}
                    </span>
                  ))}
                </div>
              </section>
            ) : planLoading ? (
              <div className="rounded-2xl bg-[#10241C] border border-[#6EE7B7]/25 px-5 py-4 flex items-center gap-3 text-base text-[#D4E6DC]">
                <Loader2 className="w-5 h-5 animate-spin text-[#6EE7B7]" />
                Loading 10 years of NASA rainfall, heat &amp; soil moisture data for your field...
              </div>
            ) : null}

            {/* Primary Plan Card */}
            {topPlan && (
              <LargePlanCard
                plan={topPlan}
                inputs={inputs}
                isPrimary
                ttsSupported={ttsSupported}
                onSpeak={speakHelper}
              />
            )}

            {/* Toggle Other Options */}
            {otherPlans.length > 0 && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowAllPlans((v) => !v)}
                  className="no-print w-full py-3.5 px-6 rounded-2xl bg-[#152E24] hover:bg-[#1C3D30] border border-[#6EE7B7]/30 text-base font-extrabold text-[#6EE7B7] flex items-center justify-center gap-2 transition"
                >
                  {showAllPlans ? (
                    <>
                      <ChevronUp className="w-5 h-5" />
                      Hide Other Rotation Options
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-5 h-5" />
                      Compare {otherPlans.length} More Crop Rotation Options
                    </>
                  )}
                </button>

                {showAllPlans &&
                  otherPlans.map((plan) => (
                    <LargePlanCard
                      key={plan.id}
                      plan={plan}
                      inputs={inputs}
                      isPrimary={false}
                      ttsSupported={ttsSupported}
                      onSpeak={speakHelper}
                    />
                  ))}
              </div>
            )}

            {/* Bottom Navigation & Export Actions */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-2 pb-8 border-t border-[#6EE7B7]/20">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={onBackToInputs}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#6EE7B7]/30 bg-[#152E24] hover:bg-[#1C3D30] text-base font-bold text-[#F7FAF6] transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Change Answers
                </button>
                <button
                  type="button"
                  onClick={onRedrawField}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#6EE7B7]/30 bg-[#152E24] hover:bg-[#1C3D30] text-base font-bold text-[#F7FAF6] transition"
                >
                  <PenTool className="w-5 h-5" />
                  Mark Another Field
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#6EE7B7]/30 bg-[#152E24] hover:bg-[#1C3D30] text-base font-bold text-[#F7FAF6] transition"
                >
                  <Printer className="w-5 h-5 text-[#6EE7B7]" />
                  Print Plan Sheet
                </button>
                <button
                  type="button"
                  onClick={onExportGeoJSON}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-[#6EE7B7]/30 bg-[#152E24] hover:bg-[#1C3D30] text-base font-bold text-[#F7FAF6] transition"
                >
                  <Download className="w-5 h-5 text-sky-300" />
                  Download GeoJSON
                </button>
              </div>

              <button
                type="button"
                onClick={onReturnToMap}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-[#4ADE80] hover:bg-amber-300 text-[#07150F] text-base font-extrabold shadow-xl transition"
              >
                <Globe2 className="w-5 h-5" />
                Back to 3D Earth &amp; Satellite Map
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function LargePlanCard({
  plan,
  inputs,
  isPrimary,
  ttsSupported,
  onSpeak,
}: {
  plan: CropCyclePlan;
  inputs: FarmerGroundInputs;
  isPrimary: boolean;
  ttsSupported: boolean;
  onSpeak: (text: string) => void;
}) {
  const waterPill = getWaterPill(plan.waterStatus);

  const buildPlanSpeech = () =>
    `${plan.name}. ${plan.tagline}. ` +
    `Step 1 in ${plan.stages[0].durationMonths}: plant ${plan.stages[0].crop}. ` +
    `Step 2 in ${plan.stages[1].durationMonths}: plant ${plan.stages[1].crop}. ` +
    `Step 3 in ${plan.stages[2].durationMonths}: plant ${plan.stages[2].crop}. ` +
    `Soil health score is ${plan.soilHealthScore} percent. Weather resilience is ${plan.resilienceScore ?? plan.waterEfficiencyScore} percent.`;

  return (
    <article
      className={`print-card rounded-3xl p-5 sm:p-6 border-2 transition space-y-5 ${
        isPrimary
          ? "bg-[#122920] border-[#6EE7B7]/65 shadow-xl"
          : "bg-[#10241C] border-[#6EE7B7]/25"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3.5 py-1 rounded-full text-sm font-extrabold ${
                isPrimary
                  ? "bg-[#6EE7B7] text-[#08150F]"
                  : "bg-[#1A382C] text-[#E6F1EC]"
              }`}
            >
              {isPrimary ? "Best Match for Your Land" : plan.badge}
            </span>
            <span
              className={`px-3.5 py-1 rounded-full text-sm font-bold border ${waterPill.classes}`}
            >
              {waterPill.text}
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F7FAF6]">
            {plan.name}
          </h3>
          <p className="text-base sm:text-lg text-[#D4E6DC]">{plan.tagline}</p>
        </div>

        {ttsSupported && (
          <button
            type="button"
            onClick={() => onSpeak(buildPlanSpeech())}
            className="no-print inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 border border-amber-200 text-base font-bold text-[#08150F]"
          >
            <Volume2 className="w-5 h-5" />
            Listen to Plan
          </button>
        )}
      </div>

      {/* 3 Big Readable Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/20 p-4">
          <div className="text-sm font-bold text-[#C2D9CD]">
            Estimated Yearly Income
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#F7FAF6] mt-1">
            ${plan.estimatedTotalRevenueUsd.toLocaleString()}
          </div>
          <div className="text-base text-[#6EE7B7] font-semibold mt-0.5">
            ~${plan.estimatedRevenuePerHaUsd.toLocaleString()} per hectare
          </div>
        </div>

        <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/20 p-4">
          <div className="text-sm font-bold text-[#C2D9CD]">
            Irrigation Water Needed
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-300 mt-1">
            {plan.waterNeededM3PerHa.toLocaleString()} m&sup3;/ha
          </div>
          <div className="text-sm sm:text-base text-[#D4E6DC] mt-0.5">
            {plan.dryYearWaterNeedM3PerHa !== undefined && (
              <>
                Dry yr:{" "}
                <strong className="text-amber-300">
                  {plan.dryYearWaterNeedM3PerHa.toLocaleString()}
                </strong>{" "}
                &bull;{" "}
              </>
            )}
            Yours: {inputs.waterM3PerHa.toLocaleString()} m&sup3;/ha
          </div>
        </div>

        <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/20 p-4 space-y-2.5">
          <div className="text-sm font-bold text-[#C2D9CD]">
            Soil Health &amp; Weather Resilience
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-base font-bold">
                <span className="inline-flex items-center gap-1.5 text-[#E6F1EC]">
                  <Sprout className="w-4 h-4 text-[#6EE7B7]" />
                  Soil Health
                </span>
                <span className="text-[#6EE7B7]">{plan.soilHealthScore}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-[#6EE7B7]"
                  style={{ width: `${plan.soilHealthScore}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-base font-bold">
                <span className="inline-flex items-center gap-1.5 text-[#E6F1EC]">
                  <ShieldCheck className="w-4 h-4 text-sky-300" />
                  Weather Resilience
                </span>
                <span className="text-sky-300">
                  {plan.resilienceScore ?? plan.waterEfficiencyScore}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/10 overflow-hidden mt-1">
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

      {/* 1-Year Step-by-Step Planting Calendar */}
      <div className="space-y-3">
        <div className="text-base font-extrabold uppercase tracking-wider text-[#6EE7B7]">
          What to Plant &amp; When (1-Year Cycle)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {plan.stages.map((stage, idx) => (
            <div
              key={`${stage.season}-${idx}`}
              className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/25 p-4 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-[#6EE7B7]">
                  {STEP_LABELS[idx] ?? stage.season}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#152E24] border border-[#6EE7B7]/25 text-sm font-bold text-[#F7FAF6]">
                  {stage.durationMonths}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CropPictogram name={stage.crop} />
                <div className="text-xl font-extrabold text-[#F7FAF6]">
                  {stage.crop}
                </div>
              </div>
              <p className="text-base text-[#D4E6DC] leading-relaxed">
                {stage.role}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Why It Fits & Action Steps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/20 p-4 sm:p-5 space-y-2.5">
          <div className="text-base font-extrabold uppercase tracking-wider text-[#6EE7B7]">
            Why This Works for Your Land
          </div>
          <ul className="space-y-2 text-base text-[#E6F1EC] list-disc list-inside leading-relaxed">
            {plan.whyItFits.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-[#0C1B15] border border-[#6EE7B7]/20 p-4 sm:p-5 space-y-2.5">
          <div className="text-base font-extrabold uppercase tracking-wider text-sky-300">
            Simple Steps to Follow
          </div>
          <ul className="space-y-2 text-base text-[#E6F1EC] list-disc list-inside leading-relaxed">
            {plan.actionSteps.map((act) => (
              <li key={act}>{act}</li>
            ))}
          </ul>
        </div>
      </div>

      {plan.cautions && plan.cautions.length > 0 && (
        <div className="rounded-2xl bg-amber-500/12 border border-amber-400/40 p-4 sm:p-5 space-y-2">
          <div className="text-base font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            Weather &amp; Water Watchouts
          </div>
          <ul className="space-y-1.5 text-base text-amber-100 list-disc list-inside leading-relaxed">
            {plan.cautions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
