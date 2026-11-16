"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Contrast,
  Lock,
  Mic,
  MicOff,
  Rocket,
  Satellite,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { startVoiceListening, type FontScale } from "@/lib/speech";

export interface FarmerSession {
  name: string;
  region: string;
  mode: "farmer" | "guest";
}

interface LoginPortalProps {
  onStartLaunch?: (session: FarmerSession) => void;
  onCompleteLogin: (session: FarmerSession) => void;
  fontScale: FontScale;
  onChangeFontScale: (scale: FontScale) => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
}

const STAR_FIELD = [
  { x: 92, y: 108, r: 1.8, o: 0.9, twinkle: true },
  { x: 210, y: 216, r: 1.2, o: 0.65, twinkle: false },
  { x: 318, y: 84, r: 2.3, o: 0.95, twinkle: true },
  { x: 448, y: 170, r: 1.4, o: 0.6, twinkle: false },
  { x: 605, y: 74, r: 1.9, o: 0.85, twinkle: true },
  { x: 790, y: 126, r: 1.3, o: 0.7, twinkle: false },
  { x: 980, y: 90, r: 2.4, o: 0.9, twinkle: true },
  { x: 1140, y: 198, r: 1.5, o: 0.75, twinkle: false },
  { x: 1310, y: 135, r: 2.1, o: 0.88, twinkle: true },
  { x: 1240, y: 325, r: 1.3, o: 0.6, twinkle: false },
  { x: 1065, y: 396, r: 2.0, o: 0.82, twinkle: true },
  { x: 1340, y: 522, r: 1.6, o: 0.7, twinkle: false },
  { x: 1180, y: 666, r: 2.2, o: 0.88, twinkle: true },
  { x: 936, y: 756, r: 1.4, o: 0.65, twinkle: false },
  { x: 690, y: 792, r: 1.7, o: 0.78, twinkle: true },
  { x: 520, y: 648, r: 1.3, o: 0.55, twinkle: false },
  { x: 260, y: 432, r: 1.8, o: 0.82, twinkle: true },
  { x: 132, y: 350, r: 1.4, o: 0.7, twinkle: false },
  { x: 878, y: 280, r: 1.5, o: 0.65, twinkle: true },
  { x: 404, y: 520, r: 1.7, o: 0.75, twinkle: false },
  { x: 165, y: 745, r: 1.9, o: 0.85, twinkle: true },
  { x: 1370, y: 810, r: 1.8, o: 0.8, twinkle: false },
];

const LAUNCH_DURATION_MS = 1800;

export default function LoginPortal({
  onStartLaunch,
  onCompleteLogin,
  fontScale,
  onChangeFontScale,
  highContrast,
  onToggleHighContrast,
  autoSpeak,
  onToggleAutoSpeak,
}: LoginPortalProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [farmerInput, setFarmerInput] = useState("");
  const [farmPin, setFarmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchFadingOut, setLaunchFadingOut] = useState(false);
  const [launchProgress, setLaunchProgress] = useState(0);
  const [pendingSession, setPendingSession] = useState<FarmerSession | null>(
    null
  );

  const farmerInputRef = useRef<HTMLInputElement | null>(null);
  const stopVoiceRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearLaunchTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearLaunchTimers();
      stopVoiceRef.current?.();
    };
  }, [clearLaunchTimers]);

  const launchSession = useCallback(
    (session: FarmerSession) => {
      if (isLaunching) return;
      stopVoiceRef.current?.();
      setIsVoiceActive(false);
      setMenuOpen(false);
      setPendingSession(session);

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      onStartLaunch?.(session);

      if (prefersReducedMotion) {
        onCompleteLogin(session);
        return;
      }

      setIsLaunching(true);
      setLaunchProgress(18);

      const tProgress = window.setTimeout(() => setLaunchProgress(100), 60);
      const tFade = window.setTimeout(
        () => setLaunchFadingOut(true),
        LAUNCH_DURATION_MS - 650
      );
      const tDone = window.setTimeout(() => {
        onCompleteLogin(session);
      }, LAUNCH_DURATION_MS);

      timersRef.current = [tProgress, tFade, tDone];
    },
    [isLaunching, onCompleteLogin, onStartLaunch]
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (farmPin.length > 0 && farmPin.length < 4) {
      setPinError("Farm PIN must be 4 digits (or leave blank).");
      return;
    }
    setPinError(null);
    const cleaned = farmerInput.trim();
    const looksLikeRegion =
      cleaned.includes(",") ||
      /\b(delta|fresno|punjab|california|egypt|india|valley|basin)\b/i.test(
        cleaned
      );
    launchSession({
      name: cleaned
        ? looksLikeRegion
          ? `Farmer (${cleaned.split(",")[0]})`
          : cleaned
        : "Farmer Account",
      region: looksLikeRegion ? cleaned : "",
      mode: "farmer",
    });
  };

  const handleGuestEnter = () => {
    launchSession({
      name: "Guest Farmer",
      region: "",
      mode: "guest",
    });
  };

  const handleVoiceInput = () => {
    if (isVoiceActive) {
      stopVoiceRef.current?.();
      setIsVoiceActive(false);
      return;
    }
    setVoiceStatus("Listening... say your name or region");
    setIsVoiceActive(true);
    stopVoiceRef.current = startVoiceListening(
      (transcript) => {
        setFarmerInput(transcript);
        setVoiceStatus(`Heard "${transcript}" — signing in`);
        launchSession({
          name: transcript,
          region: transcript,
          mode: "farmer",
        });
      },
      (errMsg) => setVoiceStatus(errMsg),
      () => setIsVoiceActive(false)
    );
  };

  return (
    <div
      className={`fixed inset-0 z-[520] flex items-center justify-center px-3 sm:px-6 pt-16 pb-5 overflow-x-hidden overflow-y-auto transition-all duration-[650ms] ease-out ${
        launchFadingOut
          ? "opacity-0 scale-105 pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at 18% 22%, rgba(16, 110, 90, 0.56) 0%, transparent 48%), radial-gradient(ellipse at 85% 74%, rgba(13, 88, 102, 0.54) 0%, transparent 50%), radial-gradient(circle at 50% 45%, #071e19 0%, #04100d 56%, #020806 100%)",
      }}
    >
      {/* Clipped Full-Viewport Ambient Space Layers (prevents scrollbars during nebula drift) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {/* Drifting Cosmic Emerald & Cyan Aurora Nebula Layers */}
        <div
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-3xl animate-nebula-drift"
          style={{
            background:
              "radial-gradient(circle, rgba(52, 211, 153, 0.24) 0%, rgba(13, 148, 136, 0.1) 50%, transparent 75%)",
          }}
        />
        <div
          className="absolute -bottom-32 -right-24 w-[540px] h-[540px] rounded-full blur-3xl animate-nebula-drift"
          style={{
            animationDelay: "-7s",
            background:
              "radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, rgba(16, 185, 129, 0.12) 50%, transparent 75%)",
          }}
        />

        {/* Deep Space Starfield & Animated Meteors */}
        <svg
          className="absolute inset-0 w-full h-full opacity-90"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="shootingStarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0" />
              <stop offset="65%" stopColor="#A7F3D0" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {STAR_FIELD.map((st, idx) => (
            <circle
              key={idx}
              cx={st.x}
              cy={st.y}
              r={st.r}
              fill={idx % 3 === 0 ? "#A7F3D0" : idx % 5 === 0 ? "#FDE68A" : "#ECFEFF"}
              opacity={st.o}
              className={st.twinkle ? "animate-pulse" : undefined}
              style={
                st.twinkle
                  ? { animationDuration: `${2.4 + (idx % 4) * 0.7}s` }
                  : undefined
              }
            />
          ))}

          {/* Animated Shooting Stars */}
          <g className="animate-meteor-1">
            <path
              d="M920 95 L1145 190"
              stroke="url(#shootingStarGrad)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="1145" cy="190" r="2.8" fill="#FDE68A" />
          </g>
          <g className="animate-meteor-2">
            <path
              d="M210 140 L395 218"
              stroke="url(#shootingStarGrad)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <circle cx="395" cy="218" r="2.2" fill="#A7F3D0" />
          </g>
        </svg>
      </div>

      {/* Main Framed Cosmic Glass Sign-In Portal Card */}
      <section
        data-testid="login-portal-card"
        aria-label="NASA × FARMVISION Sign-In Portal"
        className={`relative w-full max-w-5xl min-h-[540px] sm:min-h-[600px] rounded-[28px] border border-[#6EE7B7]/40 shadow-[0_28px_90px_rgba(0,0,0,0.88)] overflow-hidden flex flex-col justify-between p-5 sm:p-8 backdrop-blur-2xl transition-transform duration-700 ${
          isLaunching ? "scale-[1.03]" : "scale-100"
        }`}
        style={{
          background:
            "radial-gradient(circle at 22% 26%, rgba(34, 155, 134, 0.30) 0%, transparent 46%), radial-gradient(circle at 82% 76%, rgba(20, 128, 102, 0.28) 0%, transparent 48%), radial-gradient(circle at 55% 42%, rgba(8, 34, 29, 0.88) 0%, rgba(4, 15, 13, 0.96) 100%)",
        }}
      >
        {/* Cosmic Space-Agri Background Layer: Animated Orbit Track, Satellite & Radar Beam */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1000 600"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 w-full h-full"
        >
          <defs>
            <linearGradient id="scanConeGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.34" />
              <stop offset="55%" stopColor="#34D399" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="orbitPathGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#6EE7B7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Animated Flowing Elliptical Satellite Orbit Tracks */}
          <path
            d="M-60 410 Q460 -10 1040 120"
            fill="none"
            stroke="url(#orbitPathGrad)"
            strokeWidth="1.6"
            strokeDasharray="7 7"
            className="animate-radar-dash"
          />
          <path
            d="M40 570 Q520 105 1040 245"
            fill="none"
            stroke="#6EE7B7"
            strokeOpacity="0.2"
            strokeWidth="1"
            strokeDasharray="4 8"
            className="animate-radar-dash"
          />

          {/* Orbiting NASA Earth-Observation Satellite + Live Sweeping Scan Beam */}
          <g className="animate-satellite-orbit">
            <polygon
              points="875,76 45,455 280,595"
              fill="url(#scanConeGrad)"
              className="animate-pulse"
              style={{ animationDuration: "4.2s" }}
            />
            <line
              x1="875"
              y1="76"
              x2="145"
              y2="520"
              stroke="#6EE7B7"
              strokeOpacity="0.34"
              strokeWidth="1.1"
              strokeDasharray="4 6"
              className="animate-radar-dash"
            />

            {/* Detailed NASA Earth-Observation Satellite */}
            <g transform="translate(875 76) rotate(-22)">
            {/* Solar Wing Left */}
            <rect
              x="-44"
              y="-9"
              width="28"
              height="18"
              rx="2"
              fill="#0E7490"
              stroke="#6EE7B7"
              strokeWidth="1.3"
            />
            <line x1="-35" y1="-9" x2="-35" y2="9" stroke="#A7F3D0" strokeWidth="0.7" />
            <line x1="-25" y1="-9" x2="-25" y2="9" stroke="#A7F3D0" strokeWidth="0.7" />
            {/* Solar Wing Right */}
            <rect
              x="16"
              y="-9"
              width="28"
              height="18"
              rx="2"
              fill="#0E7490"
              stroke="#6EE7B7"
              strokeWidth="1.3"
            />
            <line x1="25" y1="-9" x2="25" y2="9" stroke="#A7F3D0" strokeWidth="0.7" />
            <line x1="35" y1="-9" x2="35" y2="9" stroke="#A7F3D0" strokeWidth="0.7" />
            {/* Gold Foil Instrument Bus */}
            <rect
              x="-12"
              y="-11"
              width="24"
              height="22"
              rx="3"
              fill="#F59E0B"
              stroke="#FDE68A"
              strokeWidth="1.5"
            />
            {/* Optical Sensor Dish */}
            <path d="M-7 11 L7 11 L0 21 Z" fill="#F7FAF6" />
            <circle cx="0" cy="21" r="3" fill="#4ADE80" />
            </g>
          </g>
        </svg>

        {/* Subtle Right-Top Telemetry Ring & Aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full border border-[#6EE7B7]/15 bg-[#2DD4BF]/6 blur-2xl"
        />

        {/* Bottom-Left Glowing Planet Earth Horizon + Orbital Crop Scan Rings */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 68% 28%, rgba(167, 243, 208, 0.94) 0%, rgba(52, 211, 153, 0.68) 20%, rgba(14, 116, 144, 0.72) 48%, rgba(4, 24, 29, 0.96) 76%, #020A08 100%)",
            boxShadow:
              "0 0 75px rgba(110, 231, 183, 0.42), inset -18px -18px 45px rgba(0, 0, 0, 0.84)",
          }}
        >
          {/* Rotating & Counter-Rotating Orbital Scan Rings around Earth horizon */}
          <div
            className="absolute -inset-4 rounded-full border border-dashed border-[#6EE7B7]/35 animate-spin"
            style={{ animationDuration: "32s" }}
          />
          <div
            className="absolute -inset-9 rounded-full border border-dotted border-amber-300/30 animate-spin"
            style={{ animationDuration: "48s", animationDirection: "reverse" }}
          >
            <span className="absolute top-1/2 -right-1 w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_8px_#FBBF24]" />
          </div>
          <svg viewBox="0 0 200 200" className="w-full h-full opacity-65">
            {/* Verdant Agricultural Land Contours */}
            <path
              d="M52 58 Q88 38 118 60 Q124 85 95 96 Q62 92 52 58 Z"
              fill="#4ADE80"
              opacity="0.34"
            />
            <path
              d="M112 96 Q148 88 166 116 Q154 146 120 132 Q104 114 112 96 Z"
              fill="#34D399"
              opacity="0.28"
            />
            {/* Atmospheric Swirl & Cloud Arcs */}
            <path
              d="M35 72 Q95 45 162 84"
              fill="none"
              stroke="#ECFEFF"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.48"
            />
            <path
              d="M48 104 Q112 82 178 118"
              fill="none"
              stroke="#A7F3D0"
              strokeWidth="5"
              strokeLinecap="round"
              opacity="0.36"
            />
            <path
              d="M74 52 Q128 34 170 62"
              fill="none"
              stroke="#F7FAF6"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>
        </div>

        {/* Top Bar Inside Portal Card: Top-Left Sign In Badge & Top-Right Menu */}
        <div className="relative z-20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              data-testid="login-mode-toggle"
              type="button"
              disabled={isLaunching}
              onClick={() => farmerInputRef.current?.focus()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#6EE7B7]/45 bg-[#0A231C]/75 hover:bg-[#123A2E]/85 text-[#ECFEFF] text-xs sm:text-sm font-semibold shadow-[0_0_24px_rgba(110,231,183,0.22)] backdrop-blur-md transition disabled:opacity-50"
            >
              <User className="w-3.5 h-3.5 text-[#6EE7B7]" />
              <span>Sign In &bull; Farmer Portal</span>
            </button>

            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#092019]/75 border border-[#6EE7B7]/20 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8EC9B5] backdrop-blur-md">
              <Satellite className="w-3 h-3 text-amber-300" />
              Orbit: 705 km Sun-Sync
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              disabled={isLaunching}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Open display and voice menu"
              aria-expanded={menuOpen}
              className="p-2.5 rounded-xl border border-[#6EE7B7]/25 bg-[#0A231C]/65 hover:bg-[#123A2E]/85 text-[#ECFEFF] transition backdrop-blur-md disabled:opacity-50"
            >
              {/* Staggered 3-line icon matching reference design */}
              <span className="flex flex-col items-end gap-1.5 w-6">
                <span className="w-6 h-0.5 rounded-full bg-current" />
                <span className="w-4 h-0.5 rounded-full bg-[#6EE7B7]" />
                <span className="w-5 h-0.5 rounded-full bg-current" />
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#0D231B]/95 border border-[#6EE7B7]/35 shadow-2xl p-3 space-y-2.5 text-left z-30 backdrop-blur-xl">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6EE7B7]">
                  Accessibility Options
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#E6F1EC]">
                    Text Size
                  </span>
                  <div className="inline-flex rounded-full bg-[#152E24] border border-[#6EE7B7]/25 p-0.5">
                    {(["normal", "large", "xlarge"] as FontScale[]).map(
                      (sc, i) => (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => onChangeFontScale(sc)}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition ${
                            fontScale === sc
                              ? "bg-[#6EE7B7] text-[#07150F]"
                              : "text-[#C2D9CD] hover:text-white"
                          }`}
                        >
                          {i === 0 ? "A" : i === 1 ? "A+" : "A++"}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleHighContrast}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#152E24] hover:bg-[#1C3D30] border border-[#6EE7B7]/25 text-xs font-semibold text-[#F7FAF6] transition"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Contrast className="w-3.5 h-3.5 text-[#6EE7B7]" />
                    High Contrast
                  </span>
                  <span className="text-[11px] font-bold text-[#6EE7B7]">
                    {highContrast ? "ON" : "OFF"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onToggleAutoSpeak}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-[#152E24] hover:bg-[#1C3D30] border border-amber-300/35 text-xs font-semibold text-[#F7FAF6] transition"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {autoSpeak ? (
                      <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                    ) : (
                      <VolumeX className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    Auto-Voice Guide
                  </span>
                  <span className="text-[11px] font-bold text-amber-300">
                    {autoSpeak ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center Hero: NASA × FARMVISION Brand + Sign-In Card */}
        <div className="relative z-10 my-auto py-4 flex flex-col items-center text-center gap-4">
          {/* NASA × FARMVISION Header */}
          <div className="flex flex-col items-center gap-2">
            <h1
              data-testid="login-hero-title"
              aria-label="NASA × FARMVISION"
              className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 drop-shadow-[0_0_24px_rgba(110,231,183,0.4)]"
            >
              <svg
                viewBox="0 0 296 64"
                aria-hidden="true"
                className="w-40 sm:w-52 h-auto"
              >
                {/* N */}
                <path
                  d="M22 52 V18 C22 12 31 11 35 16 L60 46 V12"
                  fill="none"
                  stroke="#F7FAF6"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* A */}
                <path
                  d="M84 52 L106 14 C108 11 112 11 114 14 L136 52"
                  fill="none"
                  stroke="#F7FAF6"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* S */}
                <path
                  d="M198 18 C184 11 163 14 163 23 C163 32 200 30 200 41 C200 50 176 54 160 46"
                  fill="none"
                  stroke="#F7FAF6"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                />
                {/* A */}
                <path
                  d="M224 52 L246 14 C248 11 252 11 254 14 L276 52"
                  fill="none"
                  stroke="#F7FAF6"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-400/20 border border-amber-300/60 text-amber-300 text-lg sm:text-xl font-black shadow-[0_0_16px_rgba(251,191,36,0.35)]"
              >
                &times;
              </span>

              <span className="text-2xl sm:text-4xl font-black tracking-[0.16em] bg-gradient-to-r from-[#6EE7B7] via-[#A7F3D0] to-amber-300 bg-clip-text text-transparent">
                FARMVISION
              </span>
            </h1>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0D2720]/85 border border-[#6EE7B7]/35 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#6EE7B7]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
              Satellite Crop Rotation &amp; Soil Resilience Mission
            </div>
          </div>

          {/* Launching Progress State OR Sign-In Form */}
          {isLaunching ? (
            <div className="w-full max-w-md rounded-2xl bg-[#0A221B]/92 border border-[#6EE7B7]/45 p-5 shadow-2xl space-y-3 backdrop-blur-xl">
              <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6EE7B7]">
                <Rocket className="w-4 h-4 text-amber-300 animate-bounce" />
                Locking NASA Satellite Telemetry...
              </div>
              <p className="text-sm font-semibold text-[#F7FAF6]">
                Welcome, {pendingSession?.name ?? "Farmer"} — entering 3D Earth
              </p>
              <div className="h-2.5 w-full rounded-full bg-[#152E24] overflow-hidden border border-[#6EE7B7]/25">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#4ADE80] via-[#6EE7B7] to-amber-300 transition-all duration-[1500ms] ease-out"
                  style={{ width: `${launchProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleFormSubmit}
              className="w-full max-w-md rounded-2xl border border-[#6EE7B7]/40 bg-[#082019]/88 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl space-y-3.5 text-left"
            >
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6EE7B7] mb-1">
                  Farmer Name or Plot ID
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-[#8FB4A6] absolute left-3 pointer-events-none" />
                  <input
                    ref={farmerInputRef}
                    data-testid="login-name-input"
                    type="text"
                    value={farmerInput}
                    onChange={(e) => setFarmerInput(e.target.value)}
                    placeholder="e.g. Ahmed AboAsal or Nile Farm 01"
                    className="w-full pl-9 pr-11 py-2.5 rounded-xl bg-[#0F2B22] border border-[#6EE7B7]/30 text-sm text-[#F7FAF6] placeholder:text-[#7DA192] focus:outline-none focus:ring-2 focus:ring-[#6EE7B7]/50"
                  />
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    title="Speak your farmer name or farm region"
                    aria-label="Speak your farmer name or farm region"
                    className={`absolute right-1.5 p-1.5 rounded-lg border transition ${
                      isVoiceActive
                        ? "bg-rose-500 border-rose-300 text-white animate-pulse"
                        : "bg-[#153B30] border-[#6EE7B7]/30 hover:border-[#6EE7B7] text-[#6EE7B7]"
                    }`}
                  >
                    {isVoiceActive ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {voiceStatus && (
                  <p className="text-[11px] font-medium text-[#A7F3D0] mt-1">
                    {voiceStatus}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6EE7B7] mb-1">
                  Farm PIN / Passcode (Optional)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#8FB4A6] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    data-testid="login-pin-input"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={farmPin}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setFarmPin(digitsOnly);
                      if (pinError) setPinError(null);
                    }}
                    placeholder="Enter 4-digit PIN or leave blank"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0F2B22] border border-[#6EE7B7]/30 text-sm text-[#F7FAF6] placeholder:text-[#7DA192] focus:outline-none focus:ring-2 focus:ring-[#6EE7B7]/50"
                  />
                </div>
                {pinError && (
                  <p
                    data-testid="login-pin-error"
                    className="text-[11px] font-medium text-rose-300 mt-1"
                  >
                    {pinError}
                  </p>
                )}
              </div>

              <button
                data-testid="login-submit-btn"
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4ADE80] hover:bg-amber-300 text-[#07150F] text-sm font-extrabold shadow-lg transition"
              >
                <Rocket className="w-4 h-4" />
                Sign In to Satellite Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Clean Direct Guest Access Button */}
          {!isLaunching && (
            <button
              data-testid="guest-login-btn"
              type="button"
              onClick={handleGuestEnter}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#6EE7B7]/35 bg-[#0B241D]/80 hover:bg-[#153B30] hover:border-amber-300/60 text-xs sm:text-sm font-bold text-[#9CE3CA] hover:text-amber-200 transition backdrop-blur-md shadow-md"
            >
              <span>Enter as Guest Farmer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom Status Telemetry Row inside Portal */}
        <div className="relative z-10 flex flex-wrap items-center justify-end gap-2 text-[10px] sm:text-[11px] font-semibold text-[#94BAAC]">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#092019]/75 border border-[#6EE7B7]/20 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
            SMAP Soil &bull; MODIS NDVI 98.4%
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#092019]/75 border border-[#6EE7B7]/20 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
            NASA POWER &amp; GIBS Live Ready
          </span>
        </div>
      </section>
    </div>
  );
}
