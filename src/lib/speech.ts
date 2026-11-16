import type {
  FarmerGroundInputs,
  PlanPriority,
  PreviousCropType,
  WaterSupplyTier,
} from "@/types/farm";
import { WATER_TIER_PRESETS } from "@/lib/nasa";

export type AreaUnit = "ha" | "acres" | "feddan";
export type FontScale = "normal" | "large" | "xlarge";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore browser speech errors
  }
}

export const WELCOME_VOICE_PROMPT =
  "Welcome to NASA × FARMVISION. If reading is difficult or you want voice help, tap the glowing yellow speaker icon with the sound waves at any time, and I will guide you step by step with my voice.";

function buildUtterance(
  text: string,
  options?: { rate?: number; onStart?: () => void; onEnd?: () => void }
): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang.startsWith("en") && v.localService) ??
    voices.find((v) => v.lang.startsWith("en"));
  if (preferred) {
    utterance.voice = preferred;
  }
  utterance.lang = preferred?.lang || "en-US";
  utterance.rate = options?.rate ?? 0.94;
  utterance.pitch = 1.0;

  if (options?.onStart) {
    utterance.onstart = () => options.onStart?.();
  }
  if (options?.onEnd) {
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = () => options.onEnd?.();
  }

  return utterance;
}

export function speakText(
  text: string,
  options?: { rate?: number; onStart?: () => void; onEnd?: () => void }
): boolean {
  if (!isSpeechSynthesisSupported() || !text.trim()) {
    options?.onEnd?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    let started = false;
    const wrappedOptions = {
      ...options,
      onStart: () => {
        started = true;
        options?.onStart?.();
      },
    };
    const utterance = buildUtterance(text, wrappedOptions);
    window.speechSynthesis.speak(utterance);

    if (
      voices.length === 0 &&
      !window.speechSynthesis.speaking &&
      !window.speechSynthesis.pending &&
      typeof window.speechSynthesis.addEventListener === "function"
    ) {
      const handleVoicesChanged = () => {
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          handleVoicesChanged
        );
        if (
          started ||
          window.speechSynthesis.speaking ||
          window.speechSynthesis.pending
        ) {
          return;
        }
        try {
          const retryUtterance = buildUtterance(text, wrappedOptions);
          window.speechSynthesis.speak(retryUtterance);
        } catch {
          options?.onEnd?.();
        }
      };
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        handleVoicesChanged
      );
    }

    return true;
  } catch {
    options?.onEnd?.();
    return false;
  }
}

export function startVoiceListening(
  onResult: (transcript: string) => void,
  onError?: (message: string) => void,
  onEnd?: () => void
): (() => void) | null {
  if (typeof window === "undefined") {
    onError?.("Voice input is only available in the browser.");
    onEnd?.();
    return null;
  }

  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;

  if (!Ctor) {
    onError?.(
      "Voice microphone is not supported in this browser. Use the big tap buttons instead."
    );
    onEnd?.();
    return null;
  }

  try {
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onresult = (event) => {
      const result = event.results?.[0]?.[0]?.transcript ?? "";
      if (result.trim()) {
        onResult(result.trim());
      }
    };
    rec.onerror = (ev) => {
      const code = ev?.error || "error";
      const friendly =
        code === "not-allowed"
          ? "Microphone permission was denied. You can still use all big tap buttons."
          : code === "no-speech"
            ? "No speech heard. Try tapping the mic and speaking clearly."
            : `Voice recognition stopped (${code}).`;
      onError?.(friendly);
    };
    rec.onend = () => {
      onEnd?.();
    };

    rec.start();
    return () => {
      try {
        rec.stop();
      } catch {
        // Ignore
      }
    };
  } catch {
    onError?.("Could not start microphone.");
    onEnd?.();
    return null;
  }
}

export function parseVoiceCommandToInputs(
  transcript: string,
  current: FarmerGroundInputs
): {
  updated: FarmerGroundInputs;
  matchedLabel: string | null;
  action?: "predict" | "back" | "listen";
} {
  const t = transcript.toLowerCase();
  const next: FarmerGroundInputs = { ...current };
  const matches: string[] = [];
  let action: "predict" | "back" | "listen" | undefined;

  // 1. Water tiers
  let waterTier: WaterSupplyTier | null = null;
  if (
    /\b(little|low|rain only|dry|scarc|small tank)\b/.test(t)
  ) {
    waterTier = "low";
  } else if (/\b(medium|moderate|well|canal|regular)\b/.test(t)) {
    waterTier = "moderate";
  } else if (/\b(plenty|high|lots|river|drip|pump|abundant|full)\b/.test(t)) {
    waterTier = "high";
  }
  if (waterTier) {
    next.waterTier = waterTier;
    next.waterM3PerHa = WATER_TIER_PRESETS[waterTier].defaultM3PerHa;
    matches.push(`Water: ${WATER_TIER_PRESETS[waterTier].label}`);
  }

  // Exact m3/ha number mentioned with water/cubic/meter
  const numMatch = t.match(/\b(\d{3,5})\b/);
  if (numMatch && /\b(water|meter|cubic|quota|m3|liter)\b/.test(t)) {
    const val = Math.min(20000, Math.max(0, Number(numMatch[1])));
    next.waterM3PerHa = val;
    next.waterTier =
      val <= 2200 ? "low" : val <= 5500 ? "moderate" : "high";
    matches.push(`Water quota: ${val.toLocaleString()} m³/ha`);
  }

  // 2. Last Crop
  const cropKeywords: [RegExp, PreviousCropType][] = [
    [/\b(wheat|barley|grain)\b/, "Wheat"],
    [/\b(corn|maize)\b/, "Corn"],
    [/\b(rice|paddy)\b/, "Rice"],
    [/\b(cotton)\b/, "Cotton"],
    [/\b(vegetable|tomato|potato|onion|pepper)\b/, "Vegetables"],
    [/\b(soy|soybean|bean|legume|pea|lentil|chickpea|clover)\b/, "Soybeans"],
    [/\b(orchard|tree|fruit|olive|citrus|mango|date)\b/, "Orchard"],
    [/\b(fallow|rest|empty|nothing|unplanted|bare)\b/, "Fallow"],
  ];
  for (const [re, crop] of cropKeywords) {
    if (re.test(t)) {
      next.lastCrop = crop;
      matches.push(`Last crop: ${crop}`);
      break;
    }
  }

  // 3. Priority / Goal
  let priority: PlanPriority | null = null;
  if (/\b(money|profit|cash|income|earn|sell)\b/.test(t)) {
    priority = "profit";
    matches.push("Goal: More Money");
  } else if (/\b(health|healthy|soil|land|long term|years|sustain)\b/.test(t)) {
    priority = "sustainability";
    matches.push("Goal: Healthy Land");
  } else if (/\b(save water|conserve|drought|safe harvest)\b/.test(t)) {
    priority = "water-saving";
    matches.push("Goal: Save Water");
  }
  if (priority) {
    next.priority = priority;
  }

  // 4. Actions
  if (/\b(predict|show plan|crop plan|forecast|calculate|next|results|start)\b/.test(t)) {
    action = "predict";
  } else if (/\b(back|change answers|edit|previous)\b/.test(t)) {
    action = "back";
  } else if (/\b(read|speak|listen|help)\b/.test(t)) {
    action = "listen";
  }

  return {
    updated: next,
    matchedLabel: matches.length > 0 ? matches.join(" • ") : null,
    action,
  };
}

export function formatArea(
  areaHectares: number,
  unit: AreaUnit
): { value: string; unitLabel: string; factorFromHa: number } {
  if (unit === "acres") {
    const factor = 2.47105;
    return {
      value: (areaHectares * factor).toFixed(1),
      unitLabel: "Acres",
      factorFromHa: factor,
    };
  }
  if (unit === "feddan") {
    const factor = 2.38095;
    return {
      value: (areaHectares * factor).toFixed(1),
      unitLabel: "Feddan",
      factorFromHa: factor,
    };
  }
  return {
    value: areaHectares.toFixed(2),
    unitLabel: "Hectares",
    factorFromHa: 1,
  };
}
