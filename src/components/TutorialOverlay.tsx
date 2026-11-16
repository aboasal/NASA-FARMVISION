"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Compass,
  Globe2,
  Lightbulb,
  LocateFixed,
  Mic,
  PartyPopper,
  PenTool,
  Play,
  Search,
  Sparkles,
  Volume2,
} from "lucide-react";
import { speakText, stopSpeaking } from "@/lib/speech";

interface TutorialOverlayProps {
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  isWelcomeOpen: boolean;
  hasUsedLocationTool: boolean;
  hasSwitchedView: boolean;
  hasMarkedField: boolean;
  isDrawing: boolean;
  hasGeneratedPlan: boolean;
  viewMode: "globe" | "map";
  onEnterFromWelcome: () => void;
  onSearchLocation: (query: string) => void;
  onStartVoiceSearch: () => void;
  onLocateMe: () => void;
  onFlyToCoords: (lat: number, lng: number) => void;
  onToggleViewMode: () => void;
  onStartDrawing: () => void;
  onQuickDemoField: () => void;
}

interface TourStepConfig {
  id: string;
  target: string;
  title: string;
  description: string;
  tip: string;
}

const STEP_COOLDOWN_MS = 550;

const TOUR_STEPS: TourStepConfig[] = [
  {
    id: "welcome",
    target: "welcome-cta",
    title: "1. Welcome — Enter the 3D Earth",
    description:
      "Welcome to NASA × FARMVISION! Behind this title is a live interactive 3D Earth powered by NASA satellites. Click View 3D Earth or press Next → to begin.",
    tip: "Clicking Next → transitions straight into the 3D Earth and opens Step 2.",
  },
  {
    id: "location",
    target: "location-search",
    title: "2. Find Your Farm — What Every Icon Does",
    description:
      "Each icon in the top search bar helps you find your land in a different way. Here is what every icon does:",
    tip: "Try any tool above (or tap one below) whenever you like — or press Next → to keep going:",
  },
  {
    id: "views",
    target: "view-switcher",
    title: "3. Switch Between 3D Earth & 2D Satellite Map",
    description:
      "Explore the planet in 3D Earth view, or click 2D Map (or zoom in close) for flat overhead satellite photos of your fields.",
    tip: "In 2D Map view you can also inspect satellite field imagery before marking your plot:",
  },
  {
    id: "mark-field",
    target: "mark-field-btn",
    title: "4. Mark Your Field Boundary",
    description:
      "Click Mark My Field in the top-right to turn on corner drawing on the map. Tap 3 or 4 corners around your plot and press Finish Land.",
    tip: "Preview drawing mode below, launch a sample farm, or click Next → anytime:",
  },
  {
    id: "plan-steps",
    target: "step-progress",
    title: "5. Answer 3 Simple Questions → Get Your Crop Plan",
    description:
      "Once your field is marked, clouds sweep across to your planner where you pick Water Supply, Last Crop, and Goal to get a simple 1-Year Plan & 3-Year Forecast.",
    tip: "Use these 3 top-bar tabs anytime to jump back and adjust your answers.",
  },
  {
    id: "practice",
    target: "quick-practice",
    title: '6. Interactive "Quick Practice" Checklist',
    description:
      "Put your new skills into action! This live drawer tracks your 4 steps—entering the 3D Earth, finding your location, marking your land, and generating your crop plan.",
    tip: "You can replay this spotlight tour anytime by clicking Tour in the top bar or Start Guided Tour inside the checklist!",
  },
];

const QUICK_REGIONS = [
  { label: "Nile Delta", query: "Nile Delta, Egypt" },
  { label: "Fresno, CA", query: "Fresno, California" },
  { label: "Punjab", query: "Ludhiana, Punjab" },
];

interface SpotlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function TutorialOverlay({
  isOpen,
  onToggle,
  isWelcomeOpen,
  hasUsedLocationTool,
  hasSwitchedView,
  hasMarkedField,
  isDrawing,
  hasGeneratedPlan,
  viewMode,
  onEnterFromWelcome,
  onSearchLocation,
  onStartVoiceSearch,
  onLocateMe,
  onFlyToCoords,
  onToggleViewMode,
  onStartDrawing,
  onQuickDemoField,
}: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [spotlight, setSpotlight] = useState<SpotlightBox | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({
    top: 88,
    left: 24,
  });
  const [isChecklistCollapsed, setIsChecklistCollapsed] = useState<boolean>(false);
  const [showCoordsBox, setShowCoordsBox] = useState<boolean>(false);
  const [latInput, setLatInput] = useState<string>("30.8225");
  const [lngInput, setLngInput] = useState<string>("31.0187");
  const [coordError, setCoordError] = useState<string | null>(null);
  const [tipNotice, setTipNotice] = useState<string | null>(null);
  const [isStepCooldown, setIsStepCooldown] = useState<boolean>(false);

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const prevOpenRef = useRef<boolean>(false);

  // Sync start step when tour opens (starts cleanly at Step 1 of 6)
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setStepIndex(0);
      setTipNotice(null);
      setShowCoordsBox(false);
    }
    if (!isOpen) {
      stopSpeaking();
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Enforce a short anti-spam cooldown on every step transition so Next -> / keys move strictly one step at a time
  useEffect(() => {
    if (!isOpen) return;
    stopSpeaking();
    setIsStepCooldown(true);
    const id = window.setTimeout(() => setIsStepCooldown(false), STEP_COOLDOWN_MS);
    return () => window.clearTimeout(id);
  }, [isOpen, stepIndex]);

  // Expand Quick Practice drawer automatically during Step 6 so the spotlight shows all 4 tasks
  useEffect(() => {
    if (isOpen && stepIndex === 5) {
      setIsChecklistCollapsed(false);
    }
  }, [isOpen, stepIndex]);

  const currentStep = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0];
  const minStepIndex = 0;

  const measureAndPosition = useCallback(() => {
    if (!isOpen || typeof window === "undefined") return;

    const targetKey =
      currentStep.target === "welcome-cta" && !isWelcomeOpen
        ? "view-switcher"
        : currentStep.target;
    const targetEl = document.querySelector(
      `[data-tour="${targetKey}"]`
    ) as HTMLElement | null;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cardEl = popoverRef.current;
    const cardW = cardEl ? cardEl.offsetWidth : Math.min(420, vw - 32);
    const cardH = cardEl ? cardEl.offsetHeight : 320;
    const margin = 16;

    if (!targetEl) {
      setSpotlight(null);
      setPopoverPos({
        top: Math.max(margin, Math.round((vh - cardH) / 2)),
        left: Math.max(margin, Math.round((vw - cardW) / 2)),
      });
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      setSpotlight(null);
      setPopoverPos({
        top: Math.max(margin, Math.round((vh - cardH) / 2)),
        left: Math.max(margin, Math.round((vw - cardW) / 2)),
      });
      return;
    }

    const pad = 8;
    const box: SpotlightBox = {
      top: Math.max(4, rect.top - pad),
      left: Math.max(4, rect.left - pad),
      width: Math.min(vw - 8, rect.width + pad * 2),
      height: Math.min(vh - 8, rect.height + pad * 2),
    };
    setSpotlight(box);

    const boxBottom = box.top + box.height;
    const boxRight = box.left + box.width;

    let top = margin;
    let left = margin;

    if (currentStep.target === "quick-practice") {
      // Position cleanly to the left of the bottom-right Quick Practice box (like Screenshot 3)
      const leftSpace = box.left - cardW - 18;
      if (leftSpace >= margin) {
        left = leftSpace;
        top = Math.max(
          margin,
          Math.min(vh - cardH - margin, box.top + box.height - cardH)
        );
      } else {
        left = Math.max(margin, Math.min(vw - cardW - margin, box.left));
        top = Math.max(margin, box.top - cardH - 14);
      }
    } else if (box.top > vh * 0.52) {
      // Bottom area target (Welcome CTA) — prefer below if fits, else above
      if (boxBottom + 14 + cardH <= vh - margin) {
        top = boxBottom + 14;
      } else {
        top = Math.max(margin, box.top - cardH - 14);
      }
      left = Math.max(
        margin,
        Math.min(vw - cardW - margin, box.left + box.width / 2 - cardW / 2)
      );
    } else {
      // Top bar / header targets — place cleanly below the spotlight
      top = Math.min(vh - cardH - margin, boxBottom + 14);
      if (boxRight > vw - cardW * 0.45) {
        left = Math.max(margin, Math.min(vw - cardW - margin, boxRight - cardW));
      } else {
        left = Math.max(
          margin,
          Math.min(vw - cardW - margin, box.left + box.width / 2 - cardW / 2)
        );
      }
    }

    setPopoverPos({ top: Math.round(top), left: Math.round(left) });
  }, [currentStep.target, isOpen, isWelcomeOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    measureAndPosition();
    const raf = requestAnimationFrame(measureAndPosition);
    const t1 = window.setTimeout(measureAndPosition, 80);
    const t2 = window.setTimeout(measureAndPosition, 260);
    const t3 = window.setTimeout(measureAndPosition, 560);

    window.addEventListener("resize", measureAndPosition);
    window.addEventListener("scroll", measureAndPosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener("resize", measureAndPosition);
      window.removeEventListener("scroll", measureAndPosition, true);
    };
  }, [
    isOpen,
    stepIndex,
    isWelcomeOpen,
    showCoordsBox,
    hasUsedLocationTool,
    hasSwitchedView,
    isDrawing,
    measureAndPosition,
  ]);

  const handleNext = useCallback(() => {
    if (isStepCooldown) return;
    setTipNotice(null);
    if (stepIndex === 0 && isWelcomeOpen) {
      onEnterFromWelcome();
      setStepIndex(1);
      return;
    }
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      onToggle(false);
    }
  }, [
    isStepCooldown,
    isWelcomeOpen,
    onEnterFromWelcome,
    onToggle,
    stepIndex,
  ]);

  const handleBack = useCallback(() => {
    if (isStepCooldown) return;
    setTipNotice(null);
    if (stepIndex > minStepIndex) {
      setStepIndex((i) => i - 1);
    }
  }, [isStepCooldown, minStepIndex, stepIndex]);

  const handleSpeakCurrentStep = useCallback(() => {
    if (currentStep.id === "location") {
      speakText(
        `${currentStep.title}. ${currentStep.description} ` +
          `1. Search Bar and Go: type your village or town name and press Go. ` +
          `2. Voice Mic: tap to speak your village name out loud instead of typing. ` +
          `3. GPS Target: jumps straight to your device location. ` +
          `4. Lat Lng Compass: type exact latitude and longitude numbers. ` +
          `5. Quick Regions: tap a sample farming area to fly there now.`
      );
      return;
    }
    speakText(`${currentStep.title}. ${currentStep.description} ${currentStep.tip}`);
  }, [currentStep]);

  // Keyboard support: ArrowLeft / ArrowRight / Escape (ignore held key repeats)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleBack();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onToggle(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleBack, handleNext, isOpen, onToggle]);

  const handleQuickRegion = (label: string, query: string) => {
    onSearchLocation(query);
    setTipNotice(`Flying map to ${label}!`);
  };

  const handleCoordsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(latInput.trim());
    const lng = Number(lngInput.trim());
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      setCoordError("Lat -90..90, Lng -180..180");
      return;
    }
    setCoordError(null);
    onFlyToCoords(lat, lng);
    setTipNotice(`Moved to (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)!`);
  };

  const practiceItems = [
    {
      id: "enter-earth",
      label: "Enter the 3D Earth view",
      done: !isWelcomeOpen,
    },
    {
      id: "find-location",
      label: "Find a location (Search, Voice, GPS, or Coords)",
      done: hasUsedLocationTool,
    },
    {
      id: "mark-field",
      label: "Mark your field corners (or load Demo Field)",
      done: hasMarkedField,
    },
    {
      id: "generate-plan",
      label: "Generate your 1-Year Crop Plan",
      done: hasGeneratedPlan,
    },
  ];
  const completedCount = practiceItems.filter((item) => item.done).length;
  const showQuickPracticeDrawer = !isWelcomeOpen || (isOpen && stepIndex === 5);

  return (
    <>
      {/* 1. Bottom-Right "Quick Practice: X/4 completed" Live Checklist Drawer */}
      {showQuickPracticeDrawer && (
        <aside
          data-tour="quick-practice"
          aria-label="Quick Practice Checklist"
          className="fixed bottom-4 right-4 z-[460] w-72 sm:w-80 rounded-2xl bg-[#10241C]/95 backdrop-blur-xl border border-[#6EE7B7]/25 shadow-2xl overflow-hidden text-[#F7FAF6]"
        >
          <button
            type="button"
            onClick={() => setIsChecklistCollapsed((c) => !c)}
            aria-expanded={!isChecklistCollapsed}
            className="w-full px-3.5 py-2.5 bg-gradient-to-r from-[#1A3D2E] via-[#153125] to-[#10241C] border-b border-[#6EE7B7]/20 flex items-center justify-between gap-2 text-left"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#6EE7B7] shrink-0" />
              <span className="text-xs font-bold text-[#F7FAF6]">
                Quick Practice: {completedCount}/4 completed
              </span>
            </div>
            {isChecklistCollapsed ? (
              <ChevronUp className="w-4 h-4 text-[#C2D9CD]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#C2D9CD]" />
            )}
          </button>

          {!isChecklistCollapsed && (
            <div className="p-3 space-y-2">
              <ul className="space-y-1.5">
                {practiceItems.map((item) => (
                  <li
                    key={item.id}
                    className={`flex items-start gap-2 text-xs transition ${
                      item.done
                        ? "text-[#6EE7B7] line-through opacity-80"
                        : "text-[#D4E6DC]"
                    }`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#6EE7B7] shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#86A897] shrink-0 mt-0.5" />
                    )}
                    <span className="leading-snug">{item.label}</span>
                  </li>
                ))}
              </ul>

              {completedCount === 4 && (
                <div className="rounded-xl bg-[#6EE7B7]/15 border border-[#6EE7B7]/40 px-2.5 py-1.5 text-[11px] font-semibold text-[#6EE7B7] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  All 4 steps completed! Ready to farm smarter.
                </div>
              )}

              <div className="pt-1 border-t border-[#6EE7B7]/15">
                <button
                  type="button"
                  onClick={() => {
                    setStepIndex(0);
                    onToggle(true);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#152E24] hover:bg-[#1C3D30] border border-[#6EE7B7]/35 text-[11px] font-bold text-[#6EE7B7] transition"
                >
                  <Play className="w-3 h-3" />
                  Start Guided Tour
                </button>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* 2. Glowing Spotlight Cutout Overlay */}
      {isOpen && spotlight && (
        <div
          aria-hidden="true"
          className="fixed z-[520] rounded-2xl pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow:
              "0 0 0 9999px rgba(8, 21, 16, 0.72), 0 0 0 2px #6EE7B7, 0 0 28px 6px rgba(110, 231, 183, 0.42)",
          }}
        />
      )}

      {/* Dim backdrop fallback if spotlight target isn't mounted */}
      {isOpen && !spotlight && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[520] bg-[#081510]/72 pointer-events-none"
        />
      )}

      {/* 3. Positioned Guided Tour Popover Card */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`Guided Tour ${currentStep.title}`}
          style={{
            top: popoverPos.top,
            left: popoverPos.left,
          }}
          className="fixed z-[530] w-[calc(100vw-2rem)] max-w-[420px] max-h-[calc(100dvh-5.5rem)] overflow-y-auto scroll-slim rounded-2xl bg-[#10241C] border border-[#6EE7B7]/30 shadow-2xl text-[#F7FAF6] p-4 space-y-2.5 transition-all duration-300 ease-out"
        >
          {/* Top Row: Progress Dots, Harvest Gold Listen & Skip Tour */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5" aria-label="Tour progress">
              {TOUR_STEPS.map((st, idx) => (
                <button
                  key={st.id}
                  type="button"
                  disabled={isStepCooldown}
                  onClick={() => {
                    if (isStepCooldown) return;
                    setTipNotice(null);
                    setStepIndex(idx);
                  }}
                  title={`Go to step ${idx + 1}`}
                  aria-label={`Go to step ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all disabled:cursor-not-allowed ${
                    idx === stepIndex
                      ? "w-5 bg-[#6EE7B7]"
                      : idx < stepIndex
                        ? "w-1.5 bg-[#6EE7B7]/65 hover:bg-[#6EE7B7]"
                        : "w-1.5 bg-white/30 hover:bg-white/55"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSpeakCurrentStep}
                title="Listen to this step read aloud"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-400 hover:bg-amber-300 text-[10px] font-bold text-[#091812] shadow-sm transition"
              >
                <Volume2 className="w-3 h-3" />
                Listen
              </button>
              <button
                type="button"
                onClick={() => onToggle(false)}
                className="text-[11px] font-semibold text-[#C2D9CD] hover:text-[#F7FAF6] transition"
              >
                Skip Tour
              </button>
            </div>
          </div>

          {/* Step Pill + Mini Farmer Badge */}
          <div className="flex items-center gap-2">
            <MiniFarmerIcon />
            <span className="px-2.5 py-0.5 rounded-md bg-[#6EE7B7]/15 border border-[#6EE7B7]/40 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6EE7B7]">
              STEP {stepIndex + 1} OF {TOUR_STEPS.length}
            </span>
          </div>

          {/* Title & Description */}
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-[#F7FAF6] leading-snug">
              {currentStep.title}
            </h3>
            <p className="text-xs text-[#D4E6DC] leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Step 2 Dedicated Icon-by-Icon Guide ("Explain what every icon at Step 2 does") */}
          {currentStep.id === "location" && (
            <div className="rounded-xl bg-[#0C1B15] border border-[#6EE7B7]/20 p-2.5 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6EE7B7]">
                What Every Icon Does
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-[#152E24] px-2 py-1.5">
                <span className="w-6 h-6 rounded-full bg-[#1C3B2E] border border-[#6EE7B7]/25 flex items-center justify-center shrink-0 text-[#F7FAF6]">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-[#F7FAF6]">
                    Search Box &amp; Go
                  </div>
                  <p className="text-[10px] text-[#C2D9CD] leading-snug">
                    Type your village, town, or farm area above, then tap <strong>Go</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-[#152E24] px-2 py-1.5">
                <span className="w-6 h-6 rounded-full bg-[#0F231C] border border-sky-400/45 flex items-center justify-center shrink-0 text-sky-300">
                  <Mic className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-sky-200">
                    Voice Mic (Speak)
                  </div>
                  <p className="text-[10px] text-[#C2D9CD] leading-snug">
                    Tap to say your village or region out loud — no typing needed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onStartVoiceSearch();
                    setTipNotice("Voice Mic ready — speak your town or use a sample region!");
                  }}
                  className="px-2 py-1 rounded-full bg-[#0C1B15] border border-sky-400/40 hover:bg-sky-400/20 text-[10px] font-bold text-sky-200 shrink-0 transition"
                >
                  Try
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-[#152E24] px-2 py-1.5">
                <span className="w-6 h-6 rounded-full bg-[#0F231C] border border-[#6EE7B7]/45 flex items-center justify-center shrink-0 text-[#6EE7B7]">
                  <LocateFixed className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-[#6EE7B7]">
                    GPS Target Icon
                  </div>
                  <p className="text-[10px] text-[#C2D9CD] leading-snug">
                    Jumps straight to where you are standing using device GPS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLocateMe();
                    setTipNotice("Requesting device GPS location!");
                  }}
                  className="px-2 py-1 rounded-full bg-[#0C1B15] border border-[#6EE7B7]/40 hover:bg-[#6EE7B7]/20 text-[10px] font-bold text-[#6EE7B7] shrink-0 transition"
                >
                  Try GPS
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-[#152E24] px-2 py-1.5">
                <span className="w-6 h-6 rounded-full bg-[#0F231C] border border-amber-300/45 flex items-center justify-center shrink-0 text-amber-200">
                  <Compass className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-amber-200">
                    Compass (Lat / Lng)
                  </div>
                  <p className="text-[10px] text-[#C2D9CD] leading-snug">
                    Enter exact latitude &amp; longitude numbers for your plot.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCoordsBox((v) => !v)}
                  className="px-2 py-1 rounded-full bg-[#0C1B15] border border-amber-300/40 hover:bg-amber-300/20 text-[10px] font-bold text-amber-200 shrink-0 transition"
                >
                  {showCoordsBox ? "Hide" : "Lat/Lng"}
                </button>
              </div>

              {showCoordsBox && (
                <form
                  onSubmit={handleCoordsSubmit}
                  className="space-y-1 rounded-lg bg-[#0F231C] border border-amber-300/30 p-2"
                >
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      aria-label="Latitude"
                      value={latInput}
                      onChange={(e) => setLatInput(e.target.value)}
                      placeholder="Lat"
                      className="w-full px-2 py-1 rounded-lg bg-[#0C1B15] border border-[#6EE7B7]/25 text-[10px] text-[#F7FAF6] focus:outline-none focus:ring-1 focus:ring-[#6EE7B7]"
                    />
                    <input
                      type="text"
                      aria-label="Longitude"
                      value={lngInput}
                      onChange={(e) => setLngInput(e.target.value)}
                      placeholder="Lng"
                      className="w-full px-2 py-1 rounded-lg bg-[#0C1B15] border border-[#6EE7B7]/25 text-[10px] text-[#F7FAF6] focus:outline-none focus:ring-1 focus:ring-[#6EE7B7]"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 rounded-lg bg-[#F7FAF6] hover:bg-[#6EE7B7] text-[#08150F] text-[10px] font-bold shrink-0"
                    >
                      Go
                    </button>
                  </div>
                  {coordError && (
                    <p className="text-[10px] text-rose-300">{coordError}</p>
                  )}
                </form>
              )}

              <div className="rounded-lg bg-[#152E24] px-2 py-1.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#0F231C] border border-[#6EE7B7]/30 flex items-center justify-center shrink-0 text-[#6EE7B7]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-[#F7FAF6]">
                      Quick Region Shortcuts
                    </div>
                    <p className="text-[10px] text-[#C2D9CD] leading-snug">
                      Tap a sample region to jump there immediately:
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pl-8">
                  {QUICK_REGIONS.map((region) => (
                    <button
                      key={region.label}
                      type="button"
                      onClick={() => handleQuickRegion(region.label, region.query)}
                      className="px-2.5 py-0.5 rounded-full bg-[#0C1B15] border border-[#6EE7B7]/25 hover:border-[#6EE7B7]/70 text-[10px] font-semibold text-[#F7FAF6] transition"
                    >
                      {region.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tip Callout Box (matching 💡 box in screenshots) */}
          <div className="rounded-xl bg-[#152E24] border border-[#6EE7B7]/30 p-2.5 space-y-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#E6F1EC] leading-snug">
                {currentStep.tip}
              </p>
            </div>

            {tipNotice && currentStep.id === "location" && (
              <p className="text-[10px] font-semibold text-[#6EE7B7]">
                {tipNotice}
              </p>
            )}

            {/* Direct view toggle button inside Step 3 tip box */}
            {currentStep.id === "views" && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onToggleViewMode();
                    setTipNotice(
                      `Switched to ${viewMode === "globe" ? "2D Satellite Map" : "3D Earth"}!`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4ADE80] hover:bg-amber-300 text-[#07150F] text-[10px] font-bold transition"
                >
                  <Globe2 className="w-3 h-3" />
                  Switch to {viewMode === "globe" ? "2D Map" : "3D Earth"}
                </button>
                {tipNotice && (
                  <span className="text-[10px] font-semibold text-[#6EE7B7]">
                    {tipNotice}
                  </span>
                )}
              </div>
            )}

            {/* Direct actions inside Step 4 tip box */}
            {currentStep.id === "mark-field" && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onStartDrawing();
                    setTipNotice("Draw tool active — tap corners on the map anytime!");
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4ADE80] hover:bg-amber-300 text-[#07150F] text-[10px] font-bold transition"
                >
                  <PenTool className="w-3 h-3" />
                  {isDrawing ? "Drawing Active ✓" : "Start Draw Tool"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onToggle(false);
                    onQuickDemoField();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0C1B15] border border-[#6EE7B7]/30 hover:border-[#6EE7B7] text-[10px] font-semibold text-[#F7FAF6] transition"
                >
                  <Sparkles className="w-3 h-3 text-[#6EE7B7]" />
                  Try Demo Field
                </button>
              </div>
            )}

            {tipNotice && currentStep.id === "mark-field" && (
              <p className="text-[10px] font-semibold text-[#6EE7B7]">
                {tipNotice}
              </p>
            )}
          </div>

          {/* Bottom Navigation Bar: ← Back | 1 step at a time | Next → */}
          <div className="pt-0.5 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={stepIndex <= minStepIndex || isStepCooldown}
              onClick={handleBack}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#C2D9CD] hover:text-[#F7FAF6] disabled:opacity-30 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>

            <span className="text-[10px] text-[#8FA89B] font-medium select-none">
              1 step at a time
            </span>

            {stepIndex < TOUR_STEPS.length - 1 ? (
              <button
                type="button"
                disabled={isStepCooldown}
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#F7FAF6] hover:bg-[#6EE7B7] text-[#08150F] text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isStepCooldown}
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#6EE7B7] hover:bg-amber-300 text-[#08150F] text-xs font-bold shadow-md transition disabled:opacity-50"
              >
                Finish Tour
                <PartyPopper className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MiniFarmerIcon() {
  return (
    <div className="w-6 h-6 rounded-full bg-[#13251D] border border-[#A3E4B7]/50 flex items-center justify-center overflow-hidden shrink-0">
      <svg viewBox="0 0 64 64" className="w-5 h-5" aria-hidden="true">
        <ellipse cx="32" cy="21" rx="22" ry="5.5" fill="#FBBF24" />
        <path d="M19 20 C19 10, 45 10, 45 20 Z" fill="#F59E0B" />
        <rect x="19" y="17.5" width="26" height="3" rx="1.5" fill="#10B981" />
        <circle cx="32" cy="31" r="11" fill="#FDBA74" />
        <circle cx="28" cy="30" r="1.5" fill="#1E293B" />
        <circle cx="36" cy="30" r="1.5" fill="#1E293B" />
        <path
          d="M27.5 34.5 Q32 38.5 36.5 34.5"
          fill="none"
          stroke="#7C2D12"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M16 58 C16 45, 48 45, 48 58 Z" fill="#F2F7F4" />
        <rect x="21" y="51" width="22" height="8" rx="2" fill="#10B981" />
      </svg>
    </div>
  );
}
