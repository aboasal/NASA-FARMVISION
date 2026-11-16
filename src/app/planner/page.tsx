"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FarmPlannerPage from "@/components/FarmPlannerPage";
import { exportFieldsToGeoJSON, SAMPLE_FIELDS } from "@/lib/geo";
import {
  fetchNasaPowerData,
  loadSavedFieldsFromBackend,
  saveFieldToBackend,
} from "@/lib/nasa";
import type { AreaUnit, FontScale } from "@/lib/speech";
import type {
  FarmField,
  FarmerGroundInputs,
  NasaPowerResponse,
} from "@/types/farm";

const DEFAULT_GROUND_INPUTS: FarmerGroundInputs = {
  waterTier: "moderate",
  waterM3PerHa: 4000,
  lastCrop: "Wheat",
  priority: "sustainability",
};

export default function PlannerRoutePage() {
  const router = useRouter();
  const [step, setStep] = useState<"inputs" | "plans">("inputs");
  const [field, setField] = useState<FarmField>(SAMPLE_FIELDS[0]);
  const [inputs, setInputs] = useState<FarmerGroundInputs>(DEFAULT_GROUND_INPUTS);
  const [nasaData, setNasaData] = useState<NasaPowerResponse | null>(null);
  const [isLoadingNasa, setIsLoadingNasa] = useState<boolean>(true);

  const [fontScale, setFontScale] = useState<FontScale>("large");
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(false);
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("ha");

  // Load saved field/inputs + accessibility settings on client mount
  useEffect(() => {
    try {
      const savedField = localStorage.getItem("farmvision:activeField");
      if (savedField) setField(JSON.parse(savedField) as FarmField);

      const savedInputs = localStorage.getItem("farmvision:groundInputs");
      if (savedInputs) setInputs(JSON.parse(savedInputs) as FarmerGroundInputs);

      const savedScale = localStorage.getItem("farmvision:fontScale") as FontScale | null;
      if (savedScale) setFontScale(savedScale);

      const savedContrast = localStorage.getItem("farmvision:highContrast");
      if (savedContrast === "true") setHighContrast(true);

      const savedVoice = localStorage.getItem("farmvision:autoSpeak");
      if (savedVoice === "true") setAutoSpeak(true);

      const savedUnit = localStorage.getItem("farmvision:areaUnit") as AreaUnit | null;
      if (savedUnit) setAreaUnit(savedUnit);
    } catch {
      // Ignore storage errors
    }

    loadSavedFieldsFromBackend().then((records) => {
      if (records.length > 0 && !localStorage.getItem("farmvision:activeField")) {
        const latest = records[0];
        setField(latest);
        if (latest.inputs) setInputs(latest.inputs);
      }
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.fontScale = fontScale;
    localStorage.setItem("farmvision:fontScale", fontScale);
  }, [fontScale]);

  useEffect(() => {
    document.documentElement.dataset.highContrast = String(highContrast);
    localStorage.setItem("farmvision:highContrast", String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem("farmvision:autoSpeak", String(autoSpeak));
  }, [autoSpeak]);

  useEffect(() => {
    localStorage.setItem("farmvision:areaUnit", areaUnit);
  }, [areaUnit]);

  // Keep NASA POWER weather data synced for current field centroid
  const lat = field.centroid[0];
  const lng = field.centroid[1];
  useEffect(() => {
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
  }, [lat, lng]);

  // Persist updates locally and to backend
  useEffect(() => {
    try {
      localStorage.setItem("farmvision:activeField", JSON.stringify(field));
      localStorage.setItem("farmvision:groundInputs", JSON.stringify(inputs));
    } catch {
      // Ignore
    }
    const timer = window.setTimeout(() => {
      void saveFieldToBackend(field, inputs);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [field, inputs]);

  return (
    <FarmPlannerPage
      step={step}
      field={field}
      inputs={inputs}
      onChangeInputs={setInputs}
      onUpdateFieldName={(name) => setField((prev) => ({ ...prev, name }))}
      onGeneratePlans={() => {
        setStep("plans");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      onBackToInputs={() => {
        setStep("inputs");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      onReturnToMap={() => router.push("/")}
      onRedrawField={() => router.push("/")}
      onExportGeoJSON={() => exportFieldsToGeoJSON([field])}
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
  );
}
