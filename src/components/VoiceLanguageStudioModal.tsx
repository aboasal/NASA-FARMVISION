"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Globe2,
  Play,
  Sliders,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import {
  LANGUAGE_LIST,
  LANGUAGES,
  getSampleVoiceSentence,
  type AppLanguage,
} from "@/lib/i18n";
import {
  VOICE_PERSONAS,
  getAvailableVoices,
  speakText,
  stopSpeaking,
  type VoiceHelperSettings,
  type VoicePersonaId,
} from "@/lib/speech";

interface VoiceLanguageStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceSettings: VoiceHelperSettings;
  onUpdateSettings: (next: Partial<VoiceHelperSettings>) => void;
}

export default function VoiceLanguageStudioModal({
  isOpen,
  onClose,
  voiceSettings,
  onUpdateSettings,
}: VoiceLanguageStudioModalProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [customPhrase, setCustomPhrase] = useState("");
  const [speakingBadge, setSpeakingBadge] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const sync = () => setVoices(getAvailableVoices());
    sync();
    window.speechSynthesis?.addEventListener?.("voiceschanged", sync);
    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", sync);
    };
  }, [isOpen]);

  const langPrefix = voiceSettings.lang.toLowerCase();
  const matchingVoices = useMemo(
    () =>
      voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix)),
    [langPrefix, voices]
  );
  const otherVoices = useMemo(
    () =>
      voices.filter((v) => !v.lang.toLowerCase().startsWith(langPrefix)),
    [langPrefix, voices]
  );

  if (!isOpen) return null;

  const playTestSpeech = (
    override?: Partial<VoiceHelperSettings>,
    badgeId?: string,
    overrideName?: string
  ) => {
    const lang = override?.lang ?? voiceSettings.lang;
    const personaId = override?.persona ?? voiceSettings.persona;
    const phrase =
      customPhrase.trim() ||
      getSampleVoiceSentence(lang, overrideName ?? personaId);

    setSpeakingBadge(badgeId ?? "sample");
    speakText(phrase, {
      lang,
      persona: personaId,
      rate: override?.rate ?? voiceSettings.rate,
      pitch: override?.pitch ?? voiceSettings.pitch,
      voiceURI: override?.voiceURI ?? voiceSettings.voiceURI,
      onEnd: () => setSpeakingBadge(null),
    });
  };

  const handleSelectLanguage = (langId: AppLanguage) => {
    onUpdateSettings({ lang: langId, voiceURI: "" });
    playTestSpeech({ lang: langId, voiceURI: "" }, `lang-${langId}`);
  };

  const handleSelectPersona = (
    personaId: VoicePersonaId,
    alsoSpeak: boolean
  ) => {
    const preset =
      VOICE_PERSONAS.find((p) => p.id === personaId) ?? VOICE_PERSONAS[0];
    onUpdateSettings({
      persona: personaId,
      rate: preset.rate,
      pitch: preset.pitch,
    });
    if (alsoSpeak) {
      playTestSpeech(
        { rate: preset.rate, pitch: preset.pitch, persona: personaId },
        `persona-${personaId}`,
        preset.id
      );
    }
  };

  return (
    <div
      data-testid="voice-language-studio-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Language & Voice Helper Studio"
      className="fixed inset-0 z-[760] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
    >
      <div className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto scroll-slim rounded-3xl bg-[#0D2119] border-2 border-[#6EE7B7]/45 shadow-2xl p-5 sm:p-6 text-[#F7FAF6] space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#6EE7B7]/20 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#152E24] border border-[#6EE7B7]/35 text-xs font-extrabold uppercase tracking-wider text-[#6EE7B7]">
              <Globe2 className="w-3.5 h-3.5" />
              NASA &times; FARMVISION Studio
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#F7FAF6]">
              Language &amp; Voice Helper Tester
            </h2>
            <p className="text-sm text-[#C2D9CD]">
              Switch the website language and audition different voice styles to pick what works best for farmers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopSpeaking();
              onClose();
            }}
            aria-label="Close studio"
            className="p-2 rounded-full bg-[#152E24] hover:bg-[#1C3D30] border border-[#6EE7B7]/25 text-[#D4E6DC] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Language Switcher */}
        <section className="space-y-2.5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#6EE7B7]">
            1. Choose Website &amp; Voice Language
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {LANGUAGE_LIST.map((item) => {
              const active = voiceSettings.lang === item.id;
              return (
                <button
                  key={item.id}
                  data-testid={`lang-option-${item.id}`}
                  type="button"
                  onClick={() => handleSelectLanguage(item.id)}
                  className={`rounded-2xl border-2 p-3 text-left transition space-y-1 ${
                    active
                      ? "bg-[#6EE7B7]/18 border-[#6EE7B7] shadow-lg"
                      : "bg-[#152E24] border-[#6EE7B7]/20 hover:border-[#6EE7B7]/55"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-2 py-0.5 rounded-md bg-[#0B1914] text-xs font-extrabold text-amber-300">
                      {item.shortBadge}
                    </span>
                    {active && (
                      <CheckCircle2 className="w-4 h-4 text-[#6EE7B7] shrink-0" />
                    )}
                  </div>
                  <div className="text-sm font-extrabold text-[#F7FAF6]">
                    {item.nativeName}
                  </div>
                  <div className="text-[11px] text-[#B8D3C5]">
                    {item.name} ({item.speechLang})
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: 4 Voice Helper Personas */}
        <section className="space-y-2.5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#6EE7B7]">
            2. Test Different Voice Styles (Click Test Voice to Hear)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VOICE_PERSONAS.map((preset) => {
              const active = voiceSettings.persona === preset.id;
              const isPlaying = speakingBadge === `persona-${preset.id}`;
              return (
                <div
                  key={preset.id}
                  data-testid={`persona-card-${preset.id}`}
                  className={`rounded-2xl border-2 p-3.5 transition flex flex-col justify-between gap-3 ${
                    active
                      ? "bg-[#152E24] border-[#4ADE80]"
                      : "bg-[#10241C] border-[#6EE7B7]/25"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPersona(preset.id, true)}
                    className="text-left space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-[#F7FAF6]">
                        {preset.label}
                      </span>
                      {active && (
                        <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[#C2D9CD] leading-relaxed">
                      {preset.tagline}
                    </p>
                    <div className="text-[11px] font-bold text-[#8EC9B5]">
                      Speed {preset.rate.toFixed(2)}x &bull; Pitch {preset.pitch.toFixed(2)}
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#6EE7B7]/15">
                    {preset.recommendedForWebsite ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        Recommended
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#8FA89B]">Optional style</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSelectPersona(preset.id, true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-[#08150F] text-xs font-extrabold transition"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      {isPlaying ? "Speaking..." : "Test Voice"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Browser System Voices + Speed/Pitch Fine-Tuning */}
        <section className="rounded-2xl bg-[#152E24] border border-[#6EE7B7]/25 p-4 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#6EE7B7]">
            <Sliders className="w-4 h-4" />
            3. Browser System Voice &amp; Custom Phrase Tester
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <label
                htmlFor="system-voice-picker"
                className="block text-xs font-bold text-[#D4E6DC] mb-1"
              >
                Available Voices in This Browser ({matchingVoices.length} matching{" "}
                {LANGUAGES[voiceSettings.lang].name})
              </label>
              <select
                id="system-voice-picker"
                data-testid="system-voice-select"
                value={voiceSettings.voiceURI}
                onChange={(e) =>
                  onUpdateSettings({ voiceURI: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#0B1914] border border-[#6EE7B7]/30 text-xs sm:text-sm text-[#F7FAF6] focus:outline-none focus:ring-2 focus:ring-[#6EE7B7]"
              >
                <option value="">
                  Built-in Cloud Neural Voice ({LANGUAGES[voiceSettings.lang].nativeName}) ★ Native Audio
                </option>
                {matchingVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                    {/natural|online|google/i.test(v.name) ? " ★ Natural" : ""}
                  </option>
                ))}
                {otherVoices.slice(0, 12).map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <button
              data-testid="test-voice-sample-btn"
              type="button"
              onClick={() => playTestSpeech(undefined, "sample")}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4ADE80] hover:bg-amber-300 text-[#07150F] text-sm font-extrabold transition"
            >
              <Play className="w-4 h-4" />
              Play Sample Phrase
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#D4E6DC] mb-1">
                Voice Speed: <span className="text-[#6EE7B7]">{voiceSettings.rate.toFixed(2)}x</span>
              </label>
              <input
                type="range"
                min={0.7}
                max={1.3}
                step={0.05}
                value={voiceSettings.rate}
                onChange={(e) =>
                  onUpdateSettings({ rate: parseFloat(e.target.value) })
                }
                className="w-full accent-[#6EE7B7]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#D4E6DC] mb-1">
                Voice Pitch: <span className="text-amber-300">{voiceSettings.pitch.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={0.8}
                max={1.2}
                step={0.04}
                value={voiceSettings.pitch}
                onChange={(e) =>
                  onUpdateSettings({ pitch: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-300"
              />
            </div>
          </div>

          <div>
            <input
              type="text"
              value={customPhrase}
              onChange={(e) => setCustomPhrase(e.target.value)}
              placeholder={`Optional custom test phrase (${LANGUAGES[voiceSettings.lang].name})...`}
              className="w-full px-3 py-2 rounded-xl bg-[#0B1914] border border-[#6EE7B7]/25 text-xs sm:text-sm text-[#F7FAF6] placeholder:text-[#7DA192] focus:outline-none focus:ring-1 focus:ring-[#6EE7B7]"
            />
          </div>
        </section>

        {/* Section 4: What Is Best Recommendation */}
        <div className="rounded-2xl bg-[#10241C] border border-amber-300/35 p-4 space-y-1.5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            What Voice &amp; Language Setup Is Best for Our Farmers?
          </div>
          <p className="text-xs sm:text-sm text-[#E6F1EC] leading-relaxed">
            <strong>Best All-Around:</strong> <strong>Friendly Farm Guide (0.95x)</strong> paired with your native language (<strong>العربية ar-EG / English / Español / Français / हिन्दी</strong>). For older farmers or users who cannot read, switch to <strong>Slow &amp; Clear (0.80x)</strong>—browser <strong>Natural / Online</strong> voices (such as Microsoft Edge Natural Arabic or Google Chrome voices) give the clearest pronunciation.
          </p>
        </div>
      </div>
    </div>
  );
}
