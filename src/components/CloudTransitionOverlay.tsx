"use client";

import React from "react";
import { Cloud, Globe2, Satellite, Sparkles } from "lucide-react";

export type CloudTransitionPhase =
  | "idle"
  | "spinning-earth"
  | "clouds-closing"
  | "clouds-opening";

interface CloudTransitionOverlayProps {
  phase: CloudTransitionPhase;
  fieldName?: string;
  direction?: "to-planner" | "to-map";
}

export default function CloudTransitionOverlay({
  phase,
  fieldName,
  direction = "to-planner",
}: CloudTransitionOverlayProps) {
  if (phase === "idle") return null;

  const isSpinning = phase === "spinning-earth";
  const isClosed = phase === "clouds-closing";
  const isOpening = phase === "clouds-opening";

  const statusHeadline =
    direction === "to-map"
      ? "Returning to 3D Earth & Satellite Map..."
      : isSpinning
        ? `Locking ${fieldName || "Your Field"} on 3D Earth...`
        : "Scanning NASA Climate & Soil History...";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={statusHeadline}
      data-phase={phase}
      className={`fixed inset-0 z-[700] overflow-hidden transition-opacity duration-1000 ease-out ${
        isOpening ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
      }`}
    >
      {/* Atmospheric Mist Veil — keeps spinning 3D Earth crystal clear in Phase 1 */}
      <div
        className={`absolute inset-0 transition-all duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isClosed
            ? "bg-gradient-to-b from-[#0B1914]/92 via-[#10241C]/95 to-[#081510]/96 backdrop-blur-xl"
            : isOpening
              ? "bg-gradient-to-b from-[#0B1914]/0 via-[#10241C]/0 to-[#081510]/0 backdrop-blur-none"
              : "bg-transparent"
        }`}
      />

      {/* Orbital Targeting Reticle centered over the spinning 3D Earth during Phase 1 */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 flex items-center justify-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isSpinning ? "opacity-100 scale-100" : "opacity-0 scale-115"
        }`}
      >
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-[#6EE7B7]/40 shadow-[0_0_55px_rgba(110,231,183,0.18)] flex items-center justify-center">
          <div className="w-[82%] h-[82%] rounded-full border border-dashed border-amber-300/35 animate-spin" style={{ animationDuration: "14s" }} />
          <span className="absolute -top-2 px-2 py-0.5 rounded-full bg-[#0B1914]/90 border border-[#6EE7B7]/45 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6EE7B7]">
            Orbital Lock
          </span>
        </div>
      </div>

      {/* Sweeping Left Cloud Bank (edges gather during spin, engulf smoothly during close) */}
      <div
        aria-hidden="true"
        className={`absolute inset-y-[-10%] -left-[22%] w-[86%] will-change-transform transition-all duration-[1700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isClosed
            ? "translate-x-[15%] scale-105 opacity-100"
            : isOpening
              ? "-translate-x-[118%] scale-110 opacity-0"
              : "-translate-x-[72%] opacity-60"
        }`}
      >
        <div
          className="w-full h-full rounded-[45%] blur-2xl"
          style={{
            background:
              "radial-gradient(circle at 60% 45%, rgba(236, 245, 241, 0.94) 0%, rgba(188, 222, 206, 0.72) 46%, rgba(16, 40, 31, 0.35) 75%, transparent 100%)",
          }}
        />
      </div>

      {/* Sweeping Right Cloud Bank */}
      <div
        aria-hidden="true"
        className={`absolute inset-y-[-10%] -right-[22%] w-[86%] will-change-transform transition-all duration-[1700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isClosed
            ? "-translate-x-[15%] scale-105 opacity-100"
            : isOpening
              ? "translate-x-[118%] scale-110 opacity-0"
              : "translate-x-[72%] opacity-60"
        }`}
      >
        <div
          className="w-full h-full rounded-[45%] blur-2xl"
          style={{
            background:
              "radial-gradient(circle at 40% 55%, rgba(242, 248, 245, 0.94) 0%, rgba(176, 214, 198, 0.72) 46%, rgba(16, 40, 31, 0.35) 75%, transparent 100%)",
          }}
        />
      </div>

      {/* Top Sweeping Cloud Canopy */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-[-10%] -top-[20%] h-[68%] will-change-transform transition-all duration-[1700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isClosed
            ? "translate-y-[8%] opacity-90"
            : isOpening
              ? "-translate-y-[110%] opacity-0"
              : "-translate-y-[82%] opacity-40"
        }`}
      >
        <div
          className="w-full h-full rounded-b-[50%] blur-2xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 55%, rgba(236, 247, 242, 0.9) 0%, rgba(167, 243, 208, 0.3) 55%, rgba(11, 25, 20, 0.65) 100%)",
          }}
        />
      </div>

      {/* Rising Bottom Cloud Puff Billow */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-[-10%] -bottom-[20%] h-[76%] will-change-transform transition-all duration-[1700ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isClosed
            ? "-translate-y-[8%] opacity-95"
            : isOpening
              ? "translate-y-[110%] opacity-0"
              : "translate-y-[74%] opacity-50"
        }`}
      >
        <div
          className="w-full h-full rounded-t-[50%] blur-xl"
          style={{
            background:
              "radial-gradient(ellipse at 50% 45%, rgba(235, 245, 240, 0.92) 0%, rgba(110, 231, 183, 0.28) 55%, rgba(11, 25, 20, 0.72) 100%)",
          }}
        />
      </div>

      {/* Status HUD — Smoothly anchored at bottom across all phases to prevent snapping */}
      <div
        className={`relative z-10 h-full flex flex-col items-center justify-end pb-8 sm:pb-12 px-4 sm:px-6 text-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpening ? "opacity-0 translate-y-4 scale-95" : "opacity-100 translate-y-0 scale-100"
        }`}
      >
        <div className="max-w-lg w-full rounded-3xl bg-[#0D2119]/90 border border-[#6EE7B7]/45 shadow-2xl px-5 py-5 backdrop-blur-xl space-y-2.5">
          <div className="flex items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#6EE7B7]/15 border border-[#6EE7B7]/40 flex items-center justify-center text-[#6EE7B7]">
              {isSpinning ? (
                <Globe2
                  className="w-6 h-6 animate-spin"
                  style={{ animationDuration: "3s" }}
                />
              ) : (
                <Cloud className="w-6 h-6 animate-pulse" />
              )}
            </div>
            <Satellite className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>

          <h2 className="text-lg sm:text-2xl font-extrabold text-[#F7FAF6] tracking-tight">
            {statusHeadline}
          </h2>

          <div className="pt-0.5 flex items-center justify-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#6EE7B7]">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              NASA Earth Telemetry
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
