import type {
  FarmerGroundInputs,
  PlanPriority,
  PreviousCropType,
  WaterSupplyTier,
} from "@/types/farm";
import { WATER_TIER_PRESETS } from "@/lib/nasa";
import { LANGUAGES, type AppLanguage } from "@/lib/i18n";

export type AreaUnit = "ha" | "acres" | "feddan";
export type FontScale = "normal" | "large" | "xlarge";

export type VoicePersonaId =
  | "friendly-guide"
  | "slow-clear"
  | "nasa-mission"
  | "outdoor-bright";

export interface VoicePersonaPreset {
  id: VoicePersonaId;
  label: string;
  tagline: string;
  rate: number;
  pitch: number;
  recommendedForWebsite?: boolean;
}

export const VOICE_PERSONAS: VoicePersonaPreset[] = [
  {
    id: "friendly-guide",
    label: "Friendly Farm Guide (Recommended Default)",
    tagline: "Warm, natural, easy-to-follow pace built for everyday farmers.",
    rate: 0.96,
    pitch: 1.02,
    recommendedForWebsite: true,
  },
  {
    id: "slow-clear",
    label: "Slow & Clear (Best for Non-Readers & Elders)",
    tagline: "Deliberate slower cadence so every number and crop name is crystal clear.",
    rate: 0.78,
    pitch: 0.94,
    recommendedForWebsite: true,
  },
  {
    id: "nasa-mission",
    label: "NASA Mission Control",
    tagline: "Crisp, steady briefing tone suited for quick weather & climate summaries.",
    rate: 1.06,
    pitch: 0.88,
  },
  {
    id: "outdoor-bright",
    label: "Outdoor High-Clarity",
    tagline: "Slightly higher pitch and brisk articulation to cut through field noise.",
    rate: 1.12,
    pitch: 1.14,
  },
];

export interface VoiceHelperSettings {
  lang: AppLanguage;
  persona: VoicePersonaId;
  voiceURI: string; // "" = auto-select highest-quality voice for lang
  rate: number;
  pitch: number;
}

let currentVoiceSettings: VoiceHelperSettings = {
  lang: "en",
  persona: "friendly-guide",
  voiceURI: "",
  rate: 0.96,
  pitch: 1.02,
};

export function getVoiceSettings(): VoiceHelperSettings {
  return { ...currentVoiceSettings };
}

export function setVoiceSettings(
  next: Partial<VoiceHelperSettings>
): VoiceHelperSettings {
  currentVoiceSettings = { ...currentVoiceSettings, ...next };
  return getVoiceSettings();
}

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

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  try {
    return window.speechSynthesis.getVoices();
  } catch {
    return [];
  }
}

let activeAudio: HTMLAudioElement | null = null;
let activeSpeechToken = 0;

export function stopSpeaking(): void {
  activeSpeechToken += 1;
  if (activeAudio) {
    try {
      activeAudio.onplay = null;
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
      activeAudio.removeAttribute("src");
      activeAudio.load();
    } catch {
      // Ignore audio element cleanup errors
    }
    activeAudio = null;
  }
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore browser speech errors
  }
}

export const WELCOME_VOICE_PROMPT =
  "Welcome to NASA × FARMVISION. If reading is difficult or you want voice help, tap the glowing yellow speaker icon with the sound waves at any time, and I will guide you step by step with my voice.";

function pickPreferredVoice(
  voices: SpeechSynthesisVoice[],
  lang: AppLanguage,
  explicitVoiceURI: string,
  persona: VoicePersonaId = currentVoiceSettings.persona
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  const prefix = lang.toLowerCase();

  if (explicitVoiceURI && explicitVoiceURI !== "__cloud_neural__") {
    const exact = voices.find((v) => v.voiceURI === explicitVoiceURI);
    if (exact && exact.lang.toLowerCase().startsWith(prefix)) {
      return exact;
    }
  }

  const matching = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  if (matching.length === 0) {
    // Never fall back to unrelated language voices (e.g., en-US reading Arabic/Hindi)
    return undefined;
  }

  const natural = matching.filter((v) =>
    /natural|online|google|neural/i.test(v.name)
  );
  const ranked = natural.length > 0 ? natural : matching;
  if (ranked.length === 1) return ranked[0];

  const personaIndexMap: Record<VoicePersonaId, number> = {
    "friendly-guide": 0,
    "slow-clear": 1,
    "nasa-mission": 2,
    "outdoor-bright": 3,
  };
  return ranked[personaIndexMap[persona] % ranked.length] ?? ranked[0];
}

function buildUtterance(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    lang?: AppLanguage;
    persona?: VoicePersonaId;
    voiceURI?: string;
    onStart?: () => void;
    onEnd?: () => void;
  }
): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  const lang = options?.lang ?? currentVoiceSettings.lang;
  const persona = options?.persona ?? currentVoiceSettings.persona;
  const voiceURI =
    options?.voiceURI !== undefined
      ? options.voiceURI
      : currentVoiceSettings.voiceURI;
  const voices = getAvailableVoices();
  const preferred = pickPreferredVoice(voices, lang, voiceURI, persona);

  if (preferred) {
    utterance.voice = preferred;
  }
  utterance.lang = preferred?.lang || LANGUAGES[lang].speechLang;
  utterance.rate = options?.rate ?? currentVoiceSettings.rate;
  utterance.pitch = options?.pitch ?? currentVoiceSettings.pitch;

  if (options?.onStart) {
    utterance.onstart = () => options.onStart?.();
  }
  if (options?.onEnd) {
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = () => options.onEnd?.();
  }

  return utterance;
}

function speakWithBrowserSynthesis(
  text: string,
  options: {
    rate?: number;
    pitch?: number;
    lang?: AppLanguage;
    persona?: VoicePersonaId;
    voiceURI?: string;
    onStart?: () => void;
    onEnd?: () => void;
  },
  token: number
): boolean {
  if (!isSpeechSynthesisSupported() || token !== activeSpeechToken) {
    options.onEnd?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();
    const voices = getAvailableVoices();
    let started = false;
    const wrappedOptions = {
      ...options,
      onStart: () => {
        if (token !== activeSpeechToken) return;
        started = true;
        options.onStart?.();
      },
      onEnd: () => {
        if (token !== activeSpeechToken) return;
        options.onEnd?.();
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
          token !== activeSpeechToken ||
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
          if (token === activeSpeechToken) {
            options.onEnd?.();
          }
        }
      };
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        handleVoicesChanged
      );
    }

    return true;
  } catch {
    options.onEnd?.();
    return false;
  }
}

export function speakText(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    lang?: AppLanguage;
    persona?: VoicePersonaId;
    voiceURI?: string;
    onStart?: () => void;
    onEnd?: () => void;
  }
): boolean {
  const cleaned = text.trim();
  if (typeof window === "undefined" || !cleaned) {
    options?.onEnd?.();
    return false;
  }

  stopSpeaking();
  const token = ++activeSpeechToken;
  const lang = options?.lang ?? currentVoiceSettings.lang;
  const persona = options?.persona ?? currentVoiceSettings.persona;
  const rate = options?.rate ?? currentVoiceSettings.rate;
  const pitch = options?.pitch ?? currentVoiceSettings.pitch;
  const voiceURI =
    options?.voiceURI !== undefined
      ? options.voiceURI
      : currentVoiceSettings.voiceURI;

  const voices = getAvailableVoices();
  const prefix = lang.toLowerCase();
  const matchingVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(prefix)
  );
  const explicitLocalMatch =
    voiceURI && voiceURI !== "__cloud_neural__"
      ? voices.find(
          (v) =>
            v.voiceURI === voiceURI && v.lang.toLowerCase().startsWith(prefix)
        )
      : undefined;

  // Use explicit local OS voice only when user specifically chose one matching this language
  if (explicitLocalMatch) {
    return speakWithBrowserSynthesis(
      cleaned,
      {
        ...options,
        lang,
        persona,
        rate,
        pitch,
        voiceURI: explicitLocalMatch.voiceURI,
      },
      token
    );
  }

  // Otherwise use native Cloud Neural TTS (/api/tts) whenever Auto/Cloud is selected or no OS voice matches lang
  if (
    voiceURI === "" ||
    voiceURI === "__cloud_neural__" ||
    matchingVoices.length === 0
  ) {
    try {
      const url = `/api/tts?lang=${encodeURIComponent(
        lang
      )}&persona=${encodeURIComponent(persona)}&text=${encodeURIComponent(
        cleaned.slice(0, 1400)
      )}`;
      const audio = new Audio(url);
      activeAudio = audio;

      const isSingleRegionalUpstream = lang === "ar" || lang === "hi";
      const personaPreset = VOICE_PERSONAS.find((p) => p.id === persona);
      const rateDelta = personaPreset ? rate - personaPreset.rate : 0;
      const baseRate = isSingleRegionalUpstream
        ? persona === "slow-clear"
          ? 0.78
          : persona === "nasa-mission"
            ? 0.9
            : persona === "outdoor-bright"
              ? 1.12
              : 0.98
        : rate;
      const effectiveRate = Math.max(0.5, Math.min(1.5, baseRate + rateDelta));
      const preservePitch = isSingleRegionalUpstream
        ? !(persona === "nasa-mission" || persona === "outdoor-bright")
        : !(
            (persona === "nasa-mission" || persona === "outdoor-bright") &&
            Math.abs(pitch - 1.0) > 0.01
          );

      const applyPlaybackTuning = () => {
        try {
          audio.defaultPlaybackRate = effectiveRate;
          audio.playbackRate = effectiveRate;
          const mediaWithPitch = audio as HTMLAudioElement & {
            preservesPitch?: boolean;
            webkitPreservesPitch?: boolean;
            mozPreservesPitch?: boolean;
          };
          if ("preservesPitch" in mediaWithPitch) {
            mediaWithPitch.preservesPitch = preservePitch;
          }
          if ("webkitPreservesPitch" in mediaWithPitch) {
            mediaWithPitch.webkitPreservesPitch = preservePitch;
          }
          if ("mozPreservesPitch" in mediaWithPitch) {
            mediaWithPitch.mozPreservesPitch = preservePitch;
          }
        } catch {
          // Ignore browser media rate tuning limitations
        }
      };

      applyPlaybackTuning();

      let fellBack = false;
      const fallbackToLocal = () => {
        if (fellBack || token !== activeSpeechToken) return;
        fellBack = true;
        if (activeAudio === audio) activeAudio = null;
        if (matchingVoices.length > 0) {
          speakWithBrowserSynthesis(
            cleaned,
            { ...options, lang, persona, rate, pitch, voiceURI: "" },
            token
          );
        } else {
          options?.onEnd?.();
        }
      };

      audio.onloadedmetadata = () => {
        if (token !== activeSpeechToken) return;
        applyPlaybackTuning();
      };
      audio.onplay = () => {
        if (token !== activeSpeechToken) return;
        applyPlaybackTuning();
        options?.onStart?.();
      };
      audio.onended = () => {
        if (activeAudio === audio) activeAudio = null;
        if (token === activeSpeechToken) {
          options?.onEnd?.();
        }
      };
      audio.onerror = () => {
        fallbackToLocal();
      };

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {
          fallbackToLocal();
        });
      }
      return true;
    } catch {
      if (matchingVoices.length > 0) {
        return speakWithBrowserSynthesis(
          cleaned,
          { ...options, lang, persona, rate, pitch, voiceURI: "" },
          token
        );
      }
      options?.onEnd?.();
      return false;
    }
  }

  return speakWithBrowserSynthesis(
    cleaned,
    { ...options, lang, persona, rate, pitch, voiceURI },
    token
  );
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
    rec.lang = LANGUAGES[currentVoiceSettings.lang].speechLang;
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

  // 1. Water tiers (EN, AR, ES, FR, HI)
  let waterTier: WaterSupplyTier | null = null;
  if (
    /(little|low|rain only|dry|scarc|small tank|قليل|شح|مطر|poca|bajo|sequía|faible|peu d'eau|कम|सूखा)/.test(
      t
    )
  ) {
    waterTier = "low";
  } else if (
    /(medium|moderate|well|canal|regular|متوسط|بئر|ترعة|media|medio|pozo|moyen|puits|मध्यम|कुआं)/.test(
      t
    )
  ) {
    waterTier = "moderate";
  } else if (
    /(plenty|high|lots|river|drip|pump|abundant|full|كثير|وفيرة|نهر|تنقيط|mucha|abundante|beaucoup|abondant|ज़्यादा|पर्याप्त|नदी)/.test(
      t
    )
  ) {
    waterTier = "high";
  }
  if (waterTier) {
    next.waterTier = waterTier;
    next.waterM3PerHa = WATER_TIER_PRESETS[waterTier].defaultM3PerHa;
    matches.push(`Water: ${WATER_TIER_PRESETS[waterTier].label}`);
  }

  // Exact m3/ha number mentioned
  const numMatch = t.match(/\b(\d{3,5})\b/);
  if (
    numMatch &&
    /(water|meter|cubic|quota|m3|liter|ماء|متر|مكعب|agua|eau|पानी)/.test(t)
  ) {
    const val = Math.min(20000, Math.max(0, Number(numMatch[1])));
    next.waterM3PerHa = val;
    next.waterTier =
      val <= 2200 ? "low" : val <= 5500 ? "moderate" : "high";
    matches.push(`Water quota: ${val.toLocaleString()} m³/ha`);
  }

  // 2. Last Crop (EN, AR, ES, FR, HI)
  const cropKeywords: [RegExp, PreviousCropType][] = [
    [/(wheat|barley|grain|قمح|شعير|trigo|cebada|blé|orge|गेहूं|जौ)/, "Wheat"],
    [/(corn|maize|ذرة|maíz|maïs|मक्का)/, "Corn"],
    [/(rice|paddy|أرز|رز|arroz|riz|चावल|धान)/, "Rice"],
    [/(cotton|قطن|algodón|coton|कपास)/, "Cotton"],
    [
      /(vegetable|tomato|potato|onion|pepper|خضار|خضروات|طماطم|بطاطس|verdura|tomate|papa|légume|सब्जी|टमाटर|आलू)/,
      "Vegetables",
    ],
    [
      /(soy|soybean|bean|legume|pea|lentil|chickpea|clover|فول|صويا|عدس|حمص|برسيم|soja|frijol|légumineuse|सोयाबीन|चना|दाल)/,
      "Soybeans",
    ],
    [
      /(orchard|tree|fruit|olive|citrus|mango|date|بستان|أشجار|فاكهة|شجر|huerta|verger|बगीचा|फल)/,
      "Orchard",
    ],
    [/(fallow|rest|empty|nothing|unplanted|bare|بور|راحة|فارغ|barbecho|jachère|परती)/, "Fallow"],
  ];
  for (const [re, crop] of cropKeywords) {
    if (re.test(t)) {
      next.lastCrop = crop;
      matches.push(`Last crop: ${crop}`);
      break;
    }
  }

  // 3. Priority / Goal (EN, AR, ES, FR, HI)
  let priority: PlanPriority | null = null;
  if (
    /(money|profit|cash|income|earn|sell|مال|ربح|مكسب|دخل|dinero|ganancia|argent|revenu|पैसा|मुनाफा|कमाई)/.test(
      t
    )
  ) {
    priority = "profit";
    matches.push("Goal: More Money");
  } else if (
    /(health|healthy|soil|land|long term|years|sustain|تربة|صحة|أرض|مستدام|suelo|tierra|sol|terre|मिट्टी|स्वास्थ्य)/.test(
      t
    )
  ) {
    priority = "sustainability";
    matches.push("Goal: Healthy Land");
  } else if (
    /(save water|conserve|drought|safe harvest|توفير|حفظ المياه|جفاف|ahorrar agua|économiser|पानी बचाएं)/.test(
      t
    )
  ) {
    priority = "water-saving";
    matches.push("Goal: Save Water");
  }
  if (priority) {
    next.priority = priority;
  }

  // 4. Actions
  if (
    /(predict|show plan|crop plan|forecast|calculate|next|results|start|توقع|خطة|احسب|predecir|prédire|भविष्यवाणी)/.test(
      t
    )
  ) {
    action = "predict";
  } else if (/(back|change answers|edit|previous|رجوع|تعديل|atrás|retour|वापस)/.test(t)) {
    action = "back";
  } else if (/(read|speak|listen|help|اقرأ|استماع|تحدث|escuchar|écouter|सुनें)/.test(t)) {
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
