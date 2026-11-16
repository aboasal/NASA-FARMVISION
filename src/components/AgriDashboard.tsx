"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Crosshair,
  FolderClock,
  Globe2,
  HelpCircle,
  Home,
  Layers,
  LocateFixed,
  Map as MapIcon,
  Mic,
  MicOff,
  PenTool,
  Satellite,
  Search,
  SlidersHorizontal,
  Sparkles,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { altitudeToZoom, zoomToAltitude } from "@/lib/view";
import CloudTransitionOverlay, {
  type CloudTransitionPhase,
} from "@/components/CloudTransitionOverlay";
import FarmPlannerPage from "@/components/FarmPlannerPage";
import LoginPortal, { type FarmerSession } from "@/components/LoginPortal";
import TutorialOverlay from "@/components/TutorialOverlay";
import type { FlyToTarget } from "@/components/FarmMap";
import type { GlobePovTarget } from "@/components/Globe3D";
import {
  createFarmField,
  exportFieldsToGeoJSON,
} from "@/lib/geo";
import {
  fetchNasaPowerData,
  getNasaGibsLayers,
  getPastDateISO,
  loadSavedFieldsFromBackend,
  saveFieldToBackend,
} from "@/lib/nasa";
import {
  WELCOME_VOICE_PROMPT,
  speakText,
  startVoiceListening,
  stopSpeaking,
  type AreaUnit,
  type FontScale,
} from "@/lib/speech";
import type {
  BaseMapId,
  FarmField,
  FarmerGroundInputs,
  LatLngPoint,
  NasaGibsLayerId,
  NasaPowerResponse,
  SavedFieldRecord,
} from "@/types/farm";

const FarmMap = dynamic(() => import("@/components/FarmMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B1914] text-[#C2D9CD] gap-2">
      <Satellite className="w-8 h-8 animate-pulse text-[#6EE7B7]" />
      <span className="text-sm font-medium">
        Loading Interactive Satellite Map...
      </span>
    </div>
  ),
});

const Globe3D = dynamic(() => import("@/components/Globe3D"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B1914] text-[#C2D9CD] gap-2">
      <Globe2 className="w-9 h-9 animate-pulse text-[#6EE7B7]" />
      <span className="text-sm font-medium">Loading 3D Earth...</span>
    </div>
  ),
});

type ViewMode = "globe" | "map";
type PlannerStep = "idle" | "inputs" | "plans";

const DEFAULT_FARM_CENTER: LatLngPoint = [30.8225, 31.0187];

const DEFAULT_GROUND_INPUTS: FarmerGroundInputs = {
  waterTier: "moderate",
  waterM3PerHa: 4000,
  lastCrop: "Wheat",
  priority: "profit",
};

export default function AgriDashboard() {
  // Clean entry: no pre-loaded sample plots so the farmer starts by marking their own land
  const [fields, setFields] = useState<FarmField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Guided 4-stage workflow, Cosmic Login Portal & interactive tour state
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(true);
  const [farmerSession, setFarmerSession] = useState<FarmerSession>({
    name: "Guest Farmer",
    region: "Nile Delta",
    mode: "guest",
  });
  const [plannerStep, setPlannerStep] = useState<PlannerStep>("idle");
  const [isPlannerOpen, setIsPlannerOpen] = useState<boolean>(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const hasAutoShownTutorialRef = useRef<boolean>(false);
  const [hasUsedLocationTool, setHasUsedLocationTool] =
    useState<boolean>(false);
  const [hasSwitchedView, setHasSwitchedView] = useState<boolean>(false);
  const [groundInputs, setGroundInputs] =
    useState<FarmerGroundInputs>(DEFAULT_GROUND_INPUTS);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState<LatLngPoint[]>([]);

  // Map & NASA GIBS overlay state
  const [baseMap, setBaseMap] = useState<BaseMapId>("satellite");
  const [gibsLayer, setGibsLayer] = useState<NasaGibsLayerId>("none");
  const [gibsDate, setGibsDate] = useState<string>("2026-11-01");
  const [maxGibsDate, setMaxGibsDate] = useState<string>("2026-11-10");
  const [gibsOpacity, setGibsOpacity] = useState<number>(0.72);
  const [showLayerPanel, setShowLayerPanel] = useState<boolean>(false);
  const [flyToTarget, setFlyToTarget] = useState<FlyToTarget | null>(null);

  // Welcome hero overlay & 3D globe <-> 2D Leaflet map handoff
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(true);
  const [globePovTarget, setGlobePovTarget] = useState<GlobePovTarget | null>(
    null
  );
  const [viewMode, setViewMode] = useState<ViewMode>("globe");
  const [mapView, setMapView] = useState<{ center: LatLngPoint; zoom: number }>({
    center: DEFAULT_FARM_CENTER,
    zoom: 15,
  });
  const [globeView, setGlobeView] = useState<{
    center: LatLngPoint;
    altitude: number;
  }>({
    center: DEFAULT_FARM_CENTER,
    altitude: 2.55,
  });

  const pendingFlyRef = useRef<FlyToTarget | null>(null);
  const viewModeRef = useRef<ViewMode>("globe");
  const globePovRef = useRef<{ center: LatLngPoint; altitude: number } | null>(
    null
  );
  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  const enterMap = useCallback((center: LatLngPoint, zoom: number) => {
    const pending = pendingFlyRef.current;
    pendingFlyRef.current = null;
    setMapView({ center, zoom });
    setFlyToTarget(pending ? { ...pending, key: Date.now() } : null);
    setViewMode("map");
  }, []);

  const enterGlobe = useCallback((center: LatLngPoint, zoom: number) => {
    const altitude = Math.max(zoomToAltitude(zoom), 0.9);
    setFlyToTarget(null);
    globePovRef.current = { center, altitude };
    setGlobeView({ center, altitude });
    setViewMode("globe");
  }, []);

  /** Fly to a location in whichever view is active (globe flies in, then hands off). */
  const flyTo = useCallback((center: LatLngPoint, zoom: number) => {
    const target: FlyToTarget = { center, zoom, key: Date.now() };
    if (viewModeRef.current === "globe") pendingFlyRef.current = target;
    setFlyToTarget(target);
  }, []);

  // Search & Voice Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [isVoiceSearching, setIsVoiceSearching] = useState(false);
  const stopVoiceSearchRef = useRef<(() => void) | null>(null);

  // Accessibility, Voice Guide & Land Unit QoL state
  const [fontScale, setFontScale] = useState<FontScale>("normal");
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(false);
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("ha");
  const [voicePromptVisible, setVoicePromptVisible] = useState<boolean>(false);
  const [voiceBeaconPulse, setVoiceBeaconPulse] = useState<boolean>(true);
  const didSpeakStartRef = useRef<boolean>(false);
  const isLoginOpenRef = useRef<boolean>(true);
  const isWelcomeOpenRef = useRef<boolean>(true);
  useEffect(() => {
    isLoginOpenRef.current = isLoginOpen;
  }, [isLoginOpen]);
  useEffect(() => {
    isWelcomeOpenRef.current = isWelcomeOpen;
  }, [isWelcomeOpen]);

  // Saved field history dropdown QoL
  const [savedHistoryOpen, setSavedHistoryOpen] = useState(false);
  const [savedRecords, setSavedRecords] = useState<SavedFieldRecord[]>([]);

  // Spinning Earth + Cloud Curtain transition state
  const [transitionPhase, setTransitionPhase] =
    useState<CloudTransitionPhase>("idle");
  const [transitionDirection, setTransitionDirection] = useState<
    "to-planner" | "to-map"
  >("to-planner");
  const [transitionFieldName, setTransitionFieldName] = useState<string>("");
  const transitionTimersRef = useRef<number[]>([]);

  const clearTransitionTimers = useCallback(() => {
    transitionTimersRef.current.forEach((id) => window.clearTimeout(id));
    transitionTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      clearTransitionTimers();
      stopSpeaking();
      stopVoiceSearchRef.current?.();
    };
  }, [clearTransitionTimers]);

  // Auto-play 2-second Voice Helper greeting + spotlight the glowing speaker icon for non-readers
  useEffect(() => {
    didSpeakStartRef.current = false;
    let pointerCleanup: (() => void) | null = null;

    const timer = window.setTimeout(() => {
      setVoicePromptVisible(true);
      setVoiceBeaconPulse(true);
      speakText(WELCOME_VOICE_PROMPT, {
        onStart: () => {
          didSpeakStartRef.current = true;
        },
      });

      const handleFirstInteraction = (ev: PointerEvent) => {
        window.removeEventListener("pointerdown", handleFirstInteraction);
        pointerCleanup = null;
        const target = ev.target as HTMLElement | null;
        if (
          target?.closest(
            '[data-tour="voice-helper-btn"], [data-testid="voice-welcome-banner"]'
          )
        ) {
          return;
        }
        if (!didSpeakStartRef.current) {
          speakText(WELCOME_VOICE_PROMPT, {
            onStart: () => {
              didSpeakStartRef.current = true;
            },
          });
        }
      };

      window.addEventListener("pointerdown", handleFirstInteraction);
      pointerCleanup = () =>
        window.removeEventListener("pointerdown", handleFirstInteraction);
    }, 2000);

    return () => {
      window.clearTimeout(timer);
      pointerCleanup?.();
    };
  }, []);

  const handleActivateVoiceHelper = useCallback(() => {
    didSpeakStartRef.current = true;
    setAutoSpeak(true);
    setVoicePromptVisible(false);
    setVoiceBeaconPulse(false);
    const message = isLoginOpenRef.current
      ? "Voice helper is now on. Tap the green Sign In button in the middle of the screen, or tap Enter as Guest Farmer below it to launch the 3D Earth."
      : isWelcomeOpenRef.current
        ? "Voice helper is now on. Tap View 3D Earth in the center of your screen, or tap Next on the tour card to begin."
        : "Voice helper is now on. Use the search bar, blue microphone, or green GPS target at the top to find your farm, then tap Mark My Field.";
    speakText(message);
  }, []);

  // Hydrate saved accessibility preferences & backend field history
  useEffect(() => {
    try {
      const sScale = localStorage.getItem("farmvision:fontScale") as FontScale | null;
      if (sScale === "normal" || sScale === "large" || sScale === "xlarge") {
        setFontScale(sScale);
      }
      if (localStorage.getItem("farmvision:highContrast") === "true") {
        setHighContrast(true);
      }
      if (localStorage.getItem("farmvision:autoSpeak") === "true") {
        setAutoSpeak(true);
      }
      const sUnit = localStorage.getItem("farmvision:areaUnit") as AreaUnit | null;
      if (sUnit === "ha" || sUnit === "acres" || sUnit === "feddan") {
        setAreaUnit(sUnit);
      }
    } catch {
      // Ignore storage errors
    }

    loadSavedFieldsFromBackend().then((records) => {
      setSavedRecords(records);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.fontScale = fontScale;
    try {
      localStorage.setItem("farmvision:fontScale", fontScale);
    } catch {
      // Ignore
    }
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.dataset.highContrast = String(highContrast);
    try {
      localStorage.setItem("farmvision:highContrast", String(highContrast));
    } catch {
      // Ignore
    }
  }, [highContrast]);

  useEffect(() => {
    try {
      localStorage.setItem("farmvision:autoSpeak", String(autoSpeak));
    } catch {
      // Ignore
    }
  }, [autoSpeak]);

  useEffect(() => {
    try {
      localStorage.setItem("farmvision:areaUnit", areaUnit);
    } catch {
      // Ignore
    }
  }, [areaUnit]);

  // NASA POWER state
  const [nasaData, setNasaData] = useState<NasaPowerResponse | null>(null);
  const [isLoadingNasa, setIsLoadingNasa] = useState(false);

  // Hydrate dynamic GIBS date bounds cleanly on client mount
  useEffect(() => {
    setGibsDate(getPastDateISO(10));
    setMaxGibsDate(getPastDateISO(2));
  }, []);

  const fieldsRef = useRef(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) ?? null,
    [fields, selectedFieldId]
  );

  // Fetch NASA POWER data whenever the marked field centroid changes
  const centroidKey = selectedField
    ? `${selectedField.centroid[0].toFixed(4)},${selectedField.centroid[1].toFixed(4)}`
    : null;

  useEffect(() => {
    if (!centroidKey) {
      setNasaData(null);
      return;
    }
    const [lat, lng] = centroidKey.split(",").map(Number);

    let cancelled = false;
    setIsLoadingNasa(true);

    fetchNasaPowerData(lat, lng).then((res) => {
      if (!cancelled) {
        setNasaData(res);
        setIsLoadingNasa(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [centroidKey]);

  // Persist the marked field & farmer ground inputs to our Next.js backend (/api/fields) & localStorage
  useEffect(() => {
    if (!selectedField) return;
    try {
      localStorage.setItem("farmvision:activeField", JSON.stringify(selectedField));
      localStorage.setItem("farmvision:groundInputs", JSON.stringify(groundInputs));
    } catch {
      // Ignore
    }
    const timer = window.setTimeout(() => {
      void saveFieldToBackend(selectedField, groundInputs).then(() => {
        loadSavedFieldsFromBackend().then(setSavedRecords);
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [selectedField, groundInputs]);

  const triggerTransitionToPlanner = useCallback(
    (targetStep: "inputs" | "plans", fieldOverride?: FarmField) => {
      const targetField =
        fieldOverride ?? fieldsRef.current.find((f) => f.id === selectedFieldId);
      if (!targetField) return;

      clearTransitionTimers();
      setIsDrawing(false);
      setIsTutorialOpen(false);
      setSavedHistoryOpen(false);
      setTransitionDirection("to-planner");
      setTransitionFieldName(targetField.name);

      if (autoSpeak) {
        speakText(
          `Field ${targetField.name} marked. Flying through the clouds to your farm planner.`
        );
      }

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        setPlannerStep(targetStep);
        setIsPlannerOpen(true);
        setTransitionPhase("idle");
        window.scrollTo({ top: 0 });
        return;
      }

      // Stage 1 (0ms -> 2400ms): Smooth orbital rotation on 3D Earth
      setViewMode("globe");
      setGlobeView({ center: targetField.centroid, altitude: 1.9 });
      setGlobePovTarget({
        center: targetField.centroid,
        altitude: 1.9,
        durationMs: 2200,
        autoRotate: true,
        autoRotateSpeed: 5.5,
        key: Date.now(),
      });
      setTransitionPhase("spinning-earth");

      // Stage 2 (2400ms -> 4200ms): Volumetric clouds sweep across spinning globe
      const t1 = window.setTimeout(() => {
        setTransitionPhase("clouds-closing");
      }, 2400);

      // Stage 3 (4200ms -> 5400ms): Mount Farm Planner behind clouds & part clouds
      const t2 = window.setTimeout(() => {
        setPlannerStep(targetStep);
        setIsPlannerOpen(true);
        window.scrollTo({ top: 0 });
        setTransitionPhase("clouds-opening");
      }, 4200);

      // Stage 4 (5400ms): Transition complete
      const t3 = window.setTimeout(() => {
        setTransitionPhase("idle");
      }, 5400);

      transitionTimersRef.current = [t1, t2, t3];
    },
    [autoSpeak, clearTransitionTimers, selectedFieldId]
  );

  const triggerTransitionBackToMap = useCallback(
    (onAfterOpen?: () => void) => {
      clearTransitionTimers();
      const targetCenter =
        fieldsRef.current.find((f) => f.id === selectedFieldId)?.centroid ??
        DEFAULT_FARM_CENTER;
      setTransitionDirection("to-map");
      setTransitionPhase("clouds-closing");

      const t1 = window.setTimeout(() => {
        setIsPlannerOpen(false);
        setGlobePovTarget({
          center: targetCenter,
          altitude: 1.5,
          durationMs: 1500,
          autoRotate: true,
          autoRotateSpeed: 0.55,
          key: Date.now(),
        });
        onAfterOpen?.();
        setTransitionPhase("clouds-opening");
      }, 1200);

      const t2 = window.setTimeout(() => {
        setTransitionPhase("idle");
      }, 2500);

      transitionTimersRef.current = [t1, t2];
    },
    [clearTransitionTimers, selectedFieldId]
  );

  const gibsLayers = useMemo(() => getNasaGibsLayers(gibsDate), [gibsDate]);

  const handleEnterFromWelcome = useCallback(() => {
    const targetCenter =
      fieldsRef.current.find((f) => f.id === selectedFieldId)?.centroid ??
      DEFAULT_FARM_CENTER;
    setIsWelcomeOpen(false);
    setViewMode("globe");
    if (!hasAutoShownTutorialRef.current) {
      hasAutoShownTutorialRef.current = true;
      setIsTutorialOpen(true);
    }
    setGlobePovTarget({
      center: targetCenter,
      altitude: 1.45,
      durationMs: 1400,
      autoRotate: true,
      key: Date.now(),
    });
  }, [selectedFieldId]);

  const handleReturnToWelcome = useCallback(() => {
    const targetCenter =
      fieldsRef.current.find((f) => f.id === selectedFieldId)?.centroid ??
      DEFAULT_FARM_CENTER;
    setIsDrawing(false);
    setDraftPoints([]);
    setIsPlannerOpen(false);
    setIsTutorialOpen(false);
    setFlyToTarget(null);
    setGlobeView({ center: targetCenter, altitude: 2.55 });
    setViewMode("globe");
    setIsWelcomeOpen(true);
    setGlobePovTarget({
      center: targetCenter,
      altitude: 2.55,
      durationMs: 1200,
      autoRotate: true,
      key: Date.now(),
    });
  }, [selectedFieldId]);

  const handleSelectField = useCallback(
    (id: string) => {
      setSelectedFieldId(id);
      const target = fieldsRef.current.find((f) => f.id === id);
      if (target) flyTo(target.centroid, 15);
    },
    [flyTo]
  );

  const handleGlobeViewChange = useCallback(
    (center: LatLngPoint, altitude: number) => {
      globePovRef.current = { center, altitude };
    },
    []
  );

  const handleStartDrawing = useCallback(() => {
    setIsPlannerOpen(false);
    setDraftPoints([]);
    setIsDrawing(true);
    if (viewModeRef.current === "globe") {
      const pov = globePovRef.current;
      const sel = fieldsRef.current.find((f) => f.id === selectedFieldId);
      const center: LatLngPoint =
        pov && pov.altitude < 0.6
          ? pov.center
          : sel?.centroid ?? globeView.center;
      flyTo(
        center,
        pov && pov.altitude < 0.6
          ? Math.max(altitudeToZoom(pov.altitude), 15)
          : 16
      );
    }
  }, [flyTo, globeView.center, selectedFieldId]);

  const handleAddDraftPoint = useCallback((point: LatLngPoint) => {
    setDraftPoints((prev) => [...prev, point]);
  }, []);

  const handleUndoDraftPoint = useCallback(() => {
    setDraftPoints((prev) => prev.slice(0, -1));
  }, []);

  const handleClearDraft = useCallback(() => {
    setDraftPoints([]);
  }, []);

  const handleFinishDrawing = useCallback(() => {
    if (draftPoints.length < 3) return;
    const newField = createFarmField(
      "My Farm Field",
      "Wheat",
      draftPoints,
      fieldsRef.current.length
    );
    setFields([newField]);
    setSelectedFieldId(newField.id);
    setIsDrawing(false);
    setDraftPoints([]);
    setPlannerStep("inputs");
    triggerTransitionToPlanner("inputs", newField);
  }, [draftPoints, triggerTransitionToPlanner]);

  const handleCancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDraftPoints([]);
  }, []);

  const handleQuickDemoField = useCallback(() => {
    const base =
      viewModeRef.current === "globe"
        ? globePovRef.current?.center ?? globeView.center
        : mapView.center;
    const dLat = 0.0032;
    const dLng = 0.004;
    const corners: LatLngPoint[] = [
      [base[0] + dLat, base[1] - dLng],
      [base[0] + dLat, base[1] + dLng],
      [base[0] - dLat, base[1] + dLng],
      [base[0] - dLat, base[1] - dLng],
    ];
    const demoField = createFarmField("Sample Farm Field", "Wheat", corners, 0);
    setFields([demoField]);
    setSelectedFieldId(demoField.id);
    setIsDrawing(false);
    setDraftPoints([]);
    setPlannerStep("inputs");
    triggerTransitionToPlanner("inputs", demoField);
  }, [globeView.center, mapView.center, triggerTransitionToPlanner]);

  const handleUpdateFieldName = useCallback(
    (name: string) => {
      if (!selectedFieldId) return;
      setFields((prev) =>
        prev.map((f) => (f.id === selectedFieldId ? { ...f, name } : f))
      );
    },
    [selectedFieldId]
  );

  const handleExportGeoJSON = useCallback(() => {
    exportFieldsToGeoJSON(fieldsRef.current);
  }, []);

  const runLocationSearch = useCallback(
    async (rawQuery: string) => {
      const q = rawQuery.trim();
      if (!q) return;

      setHasUsedLocationTool(true);
      setSearchQuery(q);
      setIsSearching(true);
      setSearchMessage(null);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
            q
          )}`
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          flyTo([lat, lon], 14);
        } else {
          setSearchMessage("Location not found. Try a village or city name.");
        }
      } catch {
        setSearchMessage("Search unavailable right now.");
      } finally {
        setIsSearching(false);
      }
    },
    [flyTo]
  );

  const handleSearchLocation = (e: React.FormEvent) => {
    e.preventDefault();
    void runLocationSearch(searchQuery);
  };

  const handleStartLoginLaunch = useCallback(
    (session: FarmerSession) => {
      setFarmerSession(session);
      setIsWelcomeOpen(false);
      setViewMode("globe");
      const targetCenter =
        fieldsRef.current.find((f) => f.id === selectedFieldId)?.centroid ??
        DEFAULT_FARM_CENTER;
      setGlobePovTarget({
        center: targetCenter,
        altitude: 1.45,
        durationMs: 2000,
        autoRotate: true,
        autoRotateSpeed: 0.65,
        key: Date.now(),
      });
    },
    [selectedFieldId]
  );

  const handleCompleteLogin = useCallback(
    (session: FarmerSession) => {
      setFarmerSession(session);
      setIsLoginOpen(false);
      setIsWelcomeOpen(false);
      if (!hasAutoShownTutorialRef.current) {
        hasAutoShownTutorialRef.current = true;
        setIsTutorialOpen(true);
      }

      if (session.region) {
        const lower = session.region.toLowerCase();
        if (lower.includes("fresno") || lower.includes("california")) {
          setHasUsedLocationTool(true);
          setGlobePovTarget({
            center: [36.7378, -119.7871],
            altitude: 1.05,
            durationMs: 1400,
            autoRotate: true,
            autoRotateSpeed: 0.45,
            key: Date.now(),
          });
        } else if (lower.includes("punjab") || lower.includes("ludhiana")) {
          setHasUsedLocationTool(true);
          setGlobePovTarget({
            center: [30.901, 75.8573],
            altitude: 1.05,
            durationMs: 1400,
            autoRotate: true,
            autoRotateSpeed: 0.45,
            key: Date.now(),
          });
        } else if (lower.includes("nile")) {
          setHasUsedLocationTool(true);
          setGlobePovTarget({
            center: [30.8225, 31.0187],
            altitude: 1.05,
            durationMs: 1400,
            autoRotate: true,
            autoRotateSpeed: 0.45,
            key: Date.now(),
          });
        } else {
          void runLocationSearch(session.region);
        }
      }
    },
    [runLocationSearch]
  );

  const handleReopenLogin = useCallback(() => {
    setIsDrawing(false);
    setDraftPoints([]);
    setIsPlannerOpen(false);
    setIsTutorialOpen(false);
    setIsLoginOpen(true);
  }, []);

  const handleStartVoiceSearch = useCallback(() => {
    setHasUsedLocationTool(true);
    if (isVoiceSearching) {
      stopVoiceSearchRef.current?.();
      setIsVoiceSearching(false);
      return;
    }
    setSearchMessage(null);
    setIsVoiceSearching(true);
    stopVoiceSearchRef.current = startVoiceListening(
      (transcript) => {
        setSearchQuery(transcript);
        void runLocationSearch(transcript);
      },
      (msg) => setSearchMessage(msg),
      () => setIsVoiceSearching(false)
    );
  }, [isVoiceSearching, runLocationSearch]);

  const handleLoadSavedRecord = useCallback(
    (rec: SavedFieldRecord) => {
      setFields([rec]);
      setSelectedFieldId(rec.id);
      if (rec.inputs) {
        setGroundInputs(rec.inputs);
      }
      setSavedHistoryOpen(false);
      flyTo(rec.centroid, 15);
      triggerTransitionToPlanner("inputs", rec);
    },
    [flyTo, triggerTransitionToPlanner]
  );

  const handleFlyToCoords = useCallback(
    (lat: number, lng: number) => {
      setHasUsedLocationTool(true);
      setSearchMessage(null);
      flyTo([lat, lng], 15);
    },
    [flyTo]
  );

  const handleLocateMe = useCallback(() => {
    setHasUsedLocationTool(true);
    if (!navigator.geolocation) {
      setSearchMessage("GPS is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyTo([pos.coords.latitude, pos.coords.longitude], 16);
      },
      () => {
        setSearchMessage("Could not access your GPS location.");
      }
    );
  }, [flyTo]);

  const handleSwitchToGlobe = useCallback(() => {
    if (viewMode === "globe" || isDrawing) return;
    setHasSwitchedView(true);
    enterGlobe(selectedField?.centroid ?? mapView.center, 3);
  }, [enterGlobe, isDrawing, mapView.center, selectedField, viewMode]);

  const handleSwitchToMap = useCallback(() => {
    if (viewMode === "map") return;
    setHasSwitchedView(true);
    const pov = globePovRef.current;
    if (pov && pov.altitude < 0.6) {
      flyTo(pov.center, Math.max(altitudeToZoom(pov.altitude), 12));
    } else if (selectedField) {
      flyTo(selectedField.centroid, 15);
    } else {
      enterMap(globeView.center, 15);
    }
  }, [enterMap, flyTo, globeView.center, selectedField, viewMode]);

  const handleToggleViewMode = useCallback(() => {
    if (viewMode === "globe") {
      handleSwitchToMap();
    } else {
      handleSwitchToGlobe();
    }
  }, [handleSwitchToGlobe, handleSwitchToMap, viewMode]);

  const activeHeaderStep: 1 | 2 | 3 =
    !selectedField || isDrawing || plannerStep === "idle"
      ? 1
      : plannerStep === "inputs"
        ? 2
        : 3;

  const isPlannerPageActive =
    Boolean(selectedField) && isPlannerOpen && plannerStep !== "idle";

  return (
    <>
      <div
        className={
          isPlannerPageActive
            ? "fixed inset-0 opacity-0 pointer-events-none -z-10 overflow-hidden"
            : "relative h-dvh w-screen flex flex-col bg-[#0B1914] text-[#F7FAF6] overflow-hidden"
        }
      >
        {/* Top Navigation Bar (Guided 3-Step Flow Header — Warm Canopy & Harvest Gold) */}
        <header
          className={`shrink-0 bg-[#0E221A]/95 backdrop-blur-xl border-[#6EE7B7]/25 px-2.5 sm:px-3.5 flex items-center justify-between gap-1.5 z-20 transition-all duration-500 ease-out ${
            isLoginOpen || isWelcomeOpen
              ? "-translate-y-full opacity-0 pointer-events-none h-0 border-0 overflow-hidden"
              : "translate-y-0 opacity-100 h-14 border-b"
          }`}
        >
          {/* Left: Brand + Home + Guided Tour + Glowing Voice Helper + Text Size */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[#6EE7B7]/15 border border-[#6EE7B7]/40 text-[#6EE7B7] flex items-center justify-center shadow-sm">
              <Satellite className="w-4 h-4" />
            </div>
            <div className="hidden 2xl:block">
              <h1 className="text-sm font-bold text-[#F7FAF6] leading-tight">
                NASA &times; FARMVISION
              </h1>
              <p className="text-[10px] text-[#B8D3C5] font-medium">
                NASA Crop Planner
              </p>
            </div>
            <button
              type="button"
              onClick={handleReturnToWelcome}
              title="Return to Welcome Home"
              className="ml-0.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#6EE7B7]/25 bg-[#152E24] hover:bg-[#1C3D30] text-[#F7FAF6] text-xs font-medium transition"
            >
              <Home className="w-3.5 h-3.5 text-[#6EE7B7]" />
              <span className="hidden 2xl:inline">Home</span>
            </button>
            <button
              type="button"
              onClick={() => setIsTutorialOpen(true)}
              title="Start Guided Tour"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#6EE7B7]/45 bg-[#6EE7B7]/15 hover:bg-[#6EE7B7]/25 text-[#6EE7B7] text-xs font-semibold transition"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tour</span>
            </button>
            {!isLoginOpen && !isWelcomeOpen && (
              <button
                data-tour="voice-helper-btn"
                type="button"
                onClick={() => {
                  if (autoSpeak) {
                    stopSpeaking();
                    setAutoSpeak(false);
                    setVoiceBeaconPulse(false);
                  } else {
                    handleActivateVoiceHelper();
                  }
                }}
                title="Voice Helper — Listen to spoken guidance anytime"
                aria-pressed={autoSpeak}
                className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-extrabold transition shadow-md ${
                  autoSpeak
                    ? "bg-[#4ADE80] hover:bg-[#6EE7B7] text-[#07150F] border-[#6EE7B7] ring-2 ring-[#4ADE80]/40"
                    : `bg-amber-400 hover:bg-amber-300 text-[#08150F] border-amber-200 ${
                        voiceBeaconPulse ? "ring-4 ring-amber-400/40" : ""
                      }`
                }`}
              >
                {autoSpeak ? (
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="hidden xl:inline">
                  {autoSpeak ? "Voice ON" : "Voice"}
                </span>
                {voiceBeaconPulse && !autoSpeak && (
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full bg-rose-600 animate-ping"
                  />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setFontScale((s) =>
                  s === "normal" ? "large" : s === "large" ? "xlarge" : "normal"
                )
              }
              title="Cycle Text Size (A / A+ / A++)"
              className="px-2.5 py-1 rounded-full border border-[#6EE7B7]/25 bg-[#152E24] hover:bg-[#1C3D30] text-xs font-bold text-[#F7FAF6] transition"
            >
              {fontScale === "normal" ? "A" : fontScale === "large" ? "A+" : "A++"}
            </button>
          </div>

          {/* Center-Left: 3-Step Workflow Progress Indicator (Tablet & Desktop) */}
          <nav
            data-tour="step-progress"
            aria-label="Farm planning steps"
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-[#152E24] border border-[#6EE7B7]/25 text-[11px] font-semibold shrink-0"
          >
            <span
              className={`px-2 py-0.5 rounded-full transition ${
                activeHeaderStep === 1
                  ? "bg-[#6EE7B7]/25 text-[#6EE7B7]"
                  : "text-[#B8D3C5]"
              }`}
            >
              1. Mark
            </span>
            <span className="text-[#6EE7B7]/35">&rsaquo;</span>
            <button
              type="button"
              disabled={!selectedField}
              onClick={() => {
                if (!selectedField) return;
                triggerTransitionToPlanner("inputs");
              }}
              className={`px-2 py-0.5 rounded-full transition disabled:opacity-45 ${
                activeHeaderStep === 2
                  ? "bg-[#6EE7B7]/25 text-[#6EE7B7]"
                  : "text-[#B8D3C5] hover:text-[#F7FAF6]"
              }`}
            >
              2. Inputs
            </button>
            <span className="text-[#6EE7B7]/35">&rsaquo;</span>
            <button
              type="button"
              disabled={!selectedField}
              onClick={() => {
                if (!selectedField) return;
                triggerTransitionToPlanner("plans");
              }}
              className={`px-2 py-0.5 rounded-full transition disabled:opacity-45 ${
                activeHeaderStep === 3
                  ? "bg-[#6EE7B7]/25 text-[#6EE7B7]"
                  : "text-[#B8D3C5] hover:text-[#F7FAF6]"
              }`}
            >
              3. Plan
            </button>
          </nav>

          {/* Location Search + Voice Mic + GPS */}
          <form
            data-tour="location-search"
            onSubmit={handleSearchLocation}
            className="flex-1 min-w-0 max-w-sm flex items-center gap-1.5"
          >
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-[#B8D3C5] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search village, region, or farm..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#152E24] border border-[#6EE7B7]/25 text-[#F7FAF6] placeholder:text-[#86A897] rounded-full focus:bg-[#1A382C] focus:outline-none focus:ring-2 focus:ring-[#6EE7B7]/45 transition"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-[#1B3A2E] hover:bg-[#244B3C] border border-[#6EE7B7]/25 text-[#F7FAF6] rounded-full transition disabled:opacity-50"
            >
              {isSearching ? "..." : "Go"}
            </button>
            <button
              type="button"
              onClick={handleStartVoiceSearch}
              title="Voice search village or city"
              className={`shrink-0 p-1.5 rounded-full border transition ${
                isVoiceSearching
                  ? "bg-rose-500 border-rose-300 text-white animate-pulse"
                  : "border-sky-400/35 bg-[#152E24] hover:bg-[#1C3D30] text-sky-300"
              }`}
            >
              {isVoiceSearching ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handleLocateMe}
              title="Jump to my current location"
              className="shrink-0 p-1.5 rounded-full border border-[#6EE7B7]/35 bg-[#152E24] hover:bg-[#1C3D30] text-[#6EE7B7] transition"
            >
              <LocateFixed className="w-4 h-4" />
            </button>
          </form>

          {/* Saved History + Primary Action: Mark My Field */}
          <div className="flex items-center gap-2 shrink-0 relative">
            {searchMessage && (
              <span className="text-[11px] text-rose-300 hidden xl:inline">
                {searchMessage}
              </span>
            )}
            {savedRecords.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSavedHistoryOpen((v) => !v)}
                  title="Open previously saved fields"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-[#6EE7B7]/25 bg-[#152E24] hover:bg-[#1C3D30] text-xs font-semibold text-[#D4E6DC] transition"
                >
                  <FolderClock className="w-3.5 h-3.5 text-[#6EE7B7]" />
                  <span className="hidden 2xl:inline">Saved ({savedRecords.length})</span>
                </button>

                {savedHistoryOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#10241C] border border-[#6EE7B7]/30 shadow-2xl p-2 z-50 space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#B8D3C5]">
                      Saved Fields History
                    </div>
                    {savedRecords.slice(0, 6).map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => handleLoadSavedRecord(rec)}
                        className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-[#1A382C] transition flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <div className="text-xs font-bold text-[#F7FAF6] truncate">
                            {rec.name}
                          </div>
                          <div className="text-[11px] text-[#B8D3C5]">
                            {rec.areaHectares.toFixed(1)} ha &bull;{" "}
                            {rec.inputs?.lastCrop ?? rec.crop}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-[#6EE7B7] shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              data-testid="header-farmer-badge"
              type="button"
              onClick={handleReopenLogin}
              title={`Signed in as ${farmerSession.name} — click to switch farmer account`}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#6EE7B7]/25 bg-[#152E24] hover:bg-[#1C3D30] text-xs font-semibold text-[#D4E6DC] max-w-[140px] transition"
            >
              <User className="w-3.5 h-3.5 text-[#6EE7B7] shrink-0" />
              <span className="truncate">{farmerSession.name}</span>
            </button>

            <button
              data-tour="mark-field-btn"
              type="button"
              onClick={isDrawing ? handleCancelDrawing : handleStartDrawing}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm transition ${
                isDrawing
                  ? "bg-amber-400 hover:bg-amber-300 text-[#08150F]"
                  : "bg-[#4ADE80] hover:bg-amber-300 text-[#07150F]"
              }`}
            >
              {isDrawing ? (
                <>
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Drawing Active</span>
                </>
              ) : (
                <>
                  <PenTool className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark My Field</span>
                </>
              )}
            </button>
          </div>
        </header>

      {/* Full-Screen Interactive Globe / 2D Map Stage (Warm Canopy Green backdrop) */}
      <main className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-[#0B1914]">
        {/* Persistent 3D Globe Layer with cross-fade & zoom transition */}
        <div
          className={`absolute inset-0 transition-all duration-500 ease-out ${
            viewMode === "globe"
              ? "opacity-100 scale-100 z-10 pointer-events-auto"
              : "opacity-0 scale-110 z-0 pointer-events-none"
          }`}
        >
          <Globe3D
            isActive={viewMode === "globe"}
            fields={fields}
            selectedFieldId={selectedFieldId}
            onSelectField={handleSelectField}
            initialView={globeView}
            flyToTarget={flyToTarget}
            povTarget={globePovTarget}
            onZoomIntoMap={enterMap}
            onViewChange={handleGlobeViewChange}
          />
        </div>

        {/* Persistent 2D Leaflet Map Layer with cross-fade & scale transition */}
        <div
          className={`absolute inset-0 transition-all duration-500 ease-in-out ${
            viewMode === "map"
              ? "opacity-100 scale-100 z-20 pointer-events-auto"
              : "opacity-0 scale-95 z-0 pointer-events-none"
          }`}
        >
          <FarmMap
            isActive={viewMode === "map"}
            fields={fields}
            selectedFieldId={selectedFieldId}
            onSelectField={handleSelectField}
            isDrawing={isDrawing}
            draftPoints={draftPoints}
            onAddDraftPoint={handleAddDraftPoint}
            onUndoDraftPoint={handleUndoDraftPoint}
            onClearDraft={handleClearDraft}
            onFinishDrawing={handleFinishDrawing}
            onCancelDrawing={handleCancelDrawing}
            baseMap={baseMap}
            gibsLayer={gibsLayer}
            gibsDate={gibsDate}
            gibsOpacity={gibsOpacity}
            flyToTarget={flyToTarget}
            initialView={mapView}
            onZoomOutToGlobe={enterGlobe}
          />
        </div>

        {/* 3D Earth / 2D Map Toggle */}
        <div
          data-tour="view-switcher"
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-[450] flex items-center gap-1 p-1 rounded-full bg-[#10241C]/92 backdrop-blur-xl border border-[#6EE7B7]/25 shadow-xl transition-opacity ${
            isLoginOpen || isWelcomeOpen
              ? "opacity-0 pointer-events-none duration-500"
              : "opacity-100 duration-700"
          }`}
        >
          <button
            type="button"
            disabled={isDrawing}
            onClick={handleSwitchToGlobe}
            aria-pressed={viewMode === "globe"}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition disabled:opacity-40 ${
              viewMode === "globe"
                ? "bg-[#F7FAF6] text-[#08150F]"
                : "text-[#B8D3C5] hover:text-[#F7FAF6]"
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            3D Earth
          </button>
          <button
            type="button"
            onClick={handleSwitchToMap}
            aria-pressed={viewMode === "map"}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
              viewMode === "map"
                ? "bg-[#F7FAF6] text-[#08150F]"
                : "text-[#B8D3C5] hover:text-[#F7FAF6]"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            2D Map
          </button>
        </div>

        {/* Floating Bottom Guidance Bar — Stage 2 (Bottom-Left away from Quick Practice) */}
        {!isLoginOpen && !isWelcomeOpen && !isDrawing && !selectedField && !isTutorialOpen && (
          <div className="absolute bottom-4 left-4 z-[450] w-[calc(100%-2rem)] max-w-lg px-4 py-3 rounded-2xl bg-[#10241C]/94 backdrop-blur-xl border border-[#6EE7B7]/30 shadow-2xl flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-[180px] flex-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6EE7B7]">
                Step 1 of 3 &bull; Find &amp; Mark Your Land
              </div>
              <p className="text-xs text-[#D4E6DC] mt-0.5">
                {viewMode === "globe"
                  ? "Find your region by search, GPS, or globe—then mark your field."
                  : "Pan to your land parcel, then tap Mark My Field."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleQuickDemoField}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#6EE7B7]/30 bg-[#152E24] hover:bg-[#1C3D30] text-xs font-semibold text-[#D4E6DC] transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#6EE7B7]" />
                Demo Field
              </button>
              <button
                type="button"
                onClick={handleStartDrawing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#4ADE80] hover:bg-amber-300 text-[#07150F] text-xs font-bold transition"
              >
                <PenTool className="w-3.5 h-3.5" />
                Mark My Field
              </button>
            </div>
          </div>
        )}

        {/* Floating Bottom Field Bar — Bottom-Left away from Quick Practice */}
        {!isLoginOpen &&
          !isWelcomeOpen &&
          !isDrawing &&
          selectedField &&
          !isPlannerOpen &&
          !isTutorialOpen && (
            <div className="absolute bottom-4 left-4 z-[450] w-[calc(100%-2rem)] max-w-md px-4 py-3 rounded-2xl bg-[#10241C]/94 backdrop-blur-xl border border-[#6EE7B7]/40 shadow-2xl flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6EE7B7]">
                  Marked Field Ready
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#F7FAF6]">
                  {selectedField.name} &bull;{" "}
                  <span className="text-[#6EE7B7]">
                    {selectedField.areaHectares.toFixed(2)} ha
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleStartDrawing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#6EE7B7]/25 bg-[#152E24] hover:bg-[#1C3D30] text-xs font-semibold text-[#D4E6DC] transition"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Mark New Field
                </button>
                <button
                  type="button"
                  onClick={() =>
                    triggerTransitionToPlanner(
                      plannerStep === "idle" ? "inputs" : plannerStep
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#4ADE80] hover:bg-amber-300 text-[#07150F] text-xs font-bold transition"
                >
                  {plannerStep === "plans"
                    ? "Open Crop Plan"
                    : "Open Crop Plan / Inputs"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        {/* Floating NASA Layers & Base Map Control (Top Right) — 2D map only */}
        {viewMode === "map" && (
          <div className="absolute top-3 right-3 z-[400] flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setShowLayerPanel((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#10241C]/94 backdrop-blur-xl border border-[#6EE7B7]/30 shadow-lg text-xs font-semibold text-[#F7FAF6] hover:border-[#6EE7B7]/60 transition"
            >
              <Layers className="w-3.5 h-3.5 text-[#6EE7B7]" />
              NASA &amp; Map Layers
            </button>

            {showLayerPanel && (
              <div className="w-64 bg-[#10241C]/95 backdrop-blur-xl border border-[#6EE7B7]/30 rounded-2xl shadow-2xl p-3 space-y-3 text-[#F7FAF6]">
                {/* Base Map Toggle */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#B8D3C5] mb-1.5 flex items-center gap-1">
                    <MapIcon className="w-3 h-3" />
                    Base Map
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBaseMap("satellite")}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition ${
                        baseMap === "satellite"
                          ? "bg-[#F7FAF6] text-[#08150F] border-[#F7FAF6]"
                          : "bg-[#152E24] text-[#B8D3C5] border-[#6EE7B7]/20 hover:text-[#F7FAF6]"
                      }`}
                    >
                      Satellite
                    </button>
                    <button
                      type="button"
                      onClick={() => setBaseMap("street")}
                      className={`py-1.5 rounded-xl text-xs font-semibold border transition ${
                        baseMap === "street"
                          ? "bg-[#F7FAF6] text-[#08150F] border-[#F7FAF6]"
                          : "bg-[#152E24] text-[#B8D3C5] border-[#6EE7B7]/20 hover:text-[#F7FAF6]"
                      }`}
                    >
                      Street Map
                    </button>
                  </div>
                </div>

                {/* NASA GIBS Satellite Overlays */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#B8D3C5] mb-1.5 flex items-center gap-1">
                    <Satellite className="w-3 h-3 text-sky-400" />
                    NASA GIBS Overlay
                  </div>
                  <div className="space-y-1">
                    {gibsLayers.map((layer) => (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => setGibsLayer(layer.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                          gibsLayer === layer.id
                            ? "bg-[#6EE7B7]/20 border-[#6EE7B7]/55 text-[#6EE7B7] font-semibold"
                            : "bg-[#152E24] border-[#6EE7B7]/20 text-[#D4E6DC] hover:border-[#6EE7B7]/45"
                        }`}
                      >
                        {layer.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overlay Date & Opacity */}
                {gibsLayer !== "none" && (
                  <div className="pt-2 border-t border-[#6EE7B7]/20 space-y-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#B8D3C5] mb-1">
                        Satellite Pass Date
                      </label>
                      <input
                        type="date"
                        value={gibsDate}
                        max={maxGibsDate}
                        onChange={(e) => setGibsDate(e.target.value)}
                        className="w-full text-xs px-2 py-1 rounded-lg border border-[#6EE7B7]/25 bg-[#152E24] text-[#F7FAF6] focus:outline-none focus:ring-1 focus:ring-[#6EE7B7]"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-[#B8D3C5] mb-1">
                        <span className="inline-flex items-center gap-1">
                          <SlidersHorizontal className="w-3 h-3" />
                          Overlay Opacity
                        </span>
                        <span>{Math.round(gibsOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.15}
                        max={1}
                        step={0.05}
                        value={gibsOpacity}
                        onChange={(e) =>
                          setGibsOpacity(parseFloat(e.target.value))
                        }
                        className="w-full accent-[#6EE7B7]"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Interactive Spotlight Guided Tour & Quick Practice Checklist */}
      {!isPlannerPageActive && !isLoginOpen && (
        <TutorialOverlay
          isOpen={isTutorialOpen}
          onToggle={setIsTutorialOpen}
          isWelcomeOpen={isWelcomeOpen}
          hasUsedLocationTool={hasUsedLocationTool}
          hasSwitchedView={hasSwitchedView}
          hasMarkedField={Boolean(selectedField)}
          isDrawing={isDrawing}
          hasGeneratedPlan={plannerStep === "plans"}
          viewMode={viewMode}
          onEnterFromWelcome={handleEnterFromWelcome}
          onSearchLocation={(q) => void runLocationSearch(q)}
          onStartVoiceSearch={handleStartVoiceSearch}
          onLocateMe={handleLocateMe}
          onFlyToCoords={handleFlyToCoords}
          onToggleViewMode={handleToggleViewMode}
          onStartDrawing={handleStartDrawing}
          onQuickDemoField={handleQuickDemoField}
        />
      )}

      {/* Futuristic Cosmic NASA Login Portal at the Start of the Website */}
      {!isPlannerPageActive && isLoginOpen && (
        <LoginPortal
          onStartLaunch={handleStartLoginLaunch}
          onCompleteLogin={handleCompleteLogin}
          fontScale={fontScale}
          onChangeFontScale={setFontScale}
          highContrast={highContrast}
          onToggleHighContrast={() => setHighContrast((v) => !v)}
          autoSpeak={autoSpeak}
          onToggleAutoSpeak={() => setAutoSpeak((v) => !v)}
        />
      )}

      {/* Glowing Harvest Gold Voice Helper Beacon on Login / Welcome Overlay */}
      {!isPlannerPageActive && (isLoginOpen || isWelcomeOpen) && (
        <button
          data-tour="voice-helper-btn"
          type="button"
          onClick={handleActivateVoiceHelper}
          title="Tap for Voice Help"
          aria-pressed={autoSpeak}
          className={`fixed top-4 right-4 z-[540] inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-amber-200 bg-amber-400 hover:bg-amber-300 text-[#08150F] text-xs sm:text-sm font-extrabold shadow-2xl transition ${
            voiceBeaconPulse ? "ring-4 ring-amber-400/45" : ""
          }`}
        >
          <span className="relative flex items-center justify-center">
            <Volume2 className="w-5 h-5" />
            {voiceBeaconPulse && (
              <span
                aria-hidden="true"
                className="absolute -inset-1 rounded-full border-2 border-[#08150F]/45 animate-ping"
              />
            )}
          </span>
          <span>Voice Helper</span>
        </button>
      )}

      {/* 2-Second Floating Voice Helper Greeting Banner for Non-Readers */}
      {!isPlannerPageActive && voicePromptVisible && (
        <aside
          data-testid="voice-welcome-banner"
          aria-live="polite"
          className={`fixed left-4 z-[540] max-w-sm rounded-2xl bg-[#10241C]/95 backdrop-blur-xl border-2 border-amber-400 shadow-2xl p-3.5 text-[#F7FAF6] space-y-2.5 ${
            isLoginOpen || isWelcomeOpen ? "top-4" : "top-16"
          }`}
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-full bg-amber-400 text-[#08150F] flex items-center justify-center shrink-0 shadow-md ring-4 ring-amber-400/30">
                <Volume2 className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  Voice Guide Available
                </div>
                <p className="text-xs text-[#E6F1EC] leading-snug">
                  Hard to read? Tap the glowing yellow <strong>Speaker Icon</strong> anytime and I will guide you with my voice.
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Dismiss voice helper notice"
              onClick={() => setVoicePromptVisible(false)}
              className="text-sm font-bold text-[#C2D9CD] hover:text-white px-1 leading-none"
            >
              &times;
            </button>
          </div>
          <button
            type="button"
            onClick={handleActivateVoiceHelper}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#08150F] text-xs font-extrabold shadow-sm transition"
          >
            <Volume2 className="w-4 h-4" />
            Tap Here for Voice Help
          </button>
        </aside>
      )}

      {/* Stage 1: Welcome Home Screen Overlay — Warm Canopy Green & Harvest Gold */}
      <section
        aria-label="Welcome to NASA × FARMVISION"
        aria-hidden={isLoginOpen || !isWelcomeOpen}
        className={`fixed inset-0 z-[500] flex flex-col items-center justify-center px-6 text-center transition-all duration-700 ease-out ${
          !isLoginOpen && isWelcomeOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-105 pointer-events-none"
        }`}
        style={{
          background:
            "radial-gradient(circle at center, rgba(11, 25, 20, 0.25) 0%, rgba(8, 21, 16, 0.86) 100%)",
        }}
      >
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#10241C]/85 border border-[#6EE7B7]/30 text-[#6EE7B7] text-[11px] font-semibold tracking-[0.2em] uppercase backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6EE7B7] animate-pulse" />
            System Status &bull; NASA Earth Observation
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#F7FAF6] drop-shadow-lg leading-[1.06]">
            EXPLORE.
            <br />
            MONITOR.
            <br />
            <span className="text-[#6EE7B7]">CULTIVATE.</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-[#C2D9CD] max-w-xl leading-relaxed drop-shadow">
            Welcome to{" "}
            <span className="text-[#F7FAF6] font-semibold">NASA &times; FARMVISION</span>{" "}
            — mark your farm boundary on the 3D Earth, enter your water supply
            &amp; last crop, and get personalized NASA-backed crop rotation
            plans.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              data-tour="welcome-cta"
              type="button"
              onClick={handleEnterFromWelcome}
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#F7FAF6] hover:bg-[#4ADE80] text-[#08150F] text-xs sm:text-sm font-bold uppercase tracking-[0.14em] shadow-2xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#6EE7B7]/60"
            >
              <Globe2 className="w-4 h-4" />
              View 3D Earth
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </section>
      </div>

      {/* Dedicated Full-Screen Planner & 3-Year Prediction Page */}
      {isPlannerPageActive && selectedField && (
        <FarmPlannerPage
          step={plannerStep === "plans" ? "plans" : "inputs"}
          field={selectedField}
          inputs={groundInputs}
          onChangeInputs={setGroundInputs}
          onUpdateFieldName={handleUpdateFieldName}
          onGeneratePlans={() => {
            setPlannerStep("plans");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onBackToInputs={() => {
            setPlannerStep("inputs");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onReturnToMap={() => triggerTransitionBackToMap()}
          onRedrawField={() =>
            triggerTransitionBackToMap(() => handleStartDrawing())
          }
          onExportGeoJSON={handleExportGeoJSON}
          nasaData={nasaData}
          isLoadingNasa={isLoadingNasa}
          fontScale={fontScale}
          onChangeFontScale={setFontScale}
          highContrast={highContrast}
          onToggleHighContrast={() => setHighContrast((v) => !v)}
          autoSpeak={autoSpeak}
          onToggleAutoSpeak={() => setAutoSpeak((v) => !v)}
          areaUnit={areaUnit}
          onChangeAreaUnit={setAreaUnit}
        />
      )}

      {/* Spinning Earth + Volumetric Cloud Curtain Transition */}
      <CloudTransitionOverlay
        phase={transitionPhase}
        fieldName={transitionFieldName}
        direction={transitionDirection}
      />
    </>
  );
}
