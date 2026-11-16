import { NextRequest } from "next/server";

const SUPPORTED_TTS_LANGS = new Set(["en", "ar", "es", "fr", "hi"]);
const MAX_CHUNK_CHARS = 180;

const PERSONA_LOCALE_MAP: Record<string, Record<string, string>> = {
  en: {
    "friendly-guide": "en-US",
    "slow-clear": "en-GB",
    "nasa-mission": "en-AU",
    "outdoor-bright": "en-IN",
  },
  es: {
    "friendly-guide": "es-MX",
    "slow-clear": "es-ES",
    "nasa-mission": "es-US",
    "outdoor-bright": "es-ES",
  },
  fr: {
    "friendly-guide": "fr-FR",
    "slow-clear": "fr-CA",
    "nasa-mission": "fr-FR",
    "outdoor-bright": "fr-CA",
  },
  ar: {
    "friendly-guide": "ar",
    "slow-clear": "ar",
    "nasa-mission": "ar",
    "outdoor-bright": "ar",
  },
  hi: {
    "friendly-guide": "hi",
    "slow-clear": "hi",
    "nasa-mission": "hi",
    "outdoor-bright": "hi",
  },
};

function resolveTtsLocale(baseLang: string, persona: string): string {
  const safeBase = SUPPORTED_TTS_LANGS.has(baseLang) ? baseLang : "en";
  return PERSONA_LOCALE_MAP[safeBase]?.[persona] ?? safeBase;
}

/**
 * Splits spoken text into <=180-char segments at natural punctuation or spaces
 * so multi-sentence explanations synthesize reliably without truncation.
 */
function chunkTextForTts(input: string, maxLen = MAX_CHUNK_CHARS): string[] {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > maxLen) {
    const slice = remaining.slice(0, maxLen);
    let breakAt = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("؟ "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf("। "),
      slice.lastIndexOf(", "),
      slice.lastIndexOf("، ")
    );
    if (breakAt >= Math.floor(maxLen * 0.35)) {
      breakAt += 1;
    } else {
      breakAt = slice.lastIndexOf(" ");
      if (breakAt <= 0) {
        breakAt = maxLen;
      }
    }

    const part = remaining.slice(0, breakAt).trim();
    if (part) chunks.push(part);
    remaining = remaining.slice(breakAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawLang = (searchParams.get("lang") ?? "en").toLowerCase().trim();
  const baseLang = rawLang.split("-")[0];
  const persona = (searchParams.get("persona") ?? "friendly-guide")
    .toLowerCase()
    .trim();
  const tl = resolveTtsLocale(baseLang, persona);
  const text = (searchParams.get("text") ?? "").trim().slice(0, 1400);

  if (!text) {
    return new Response(JSON.stringify({ error: "Missing text parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const chunks = chunkTextForTts(text);
  const buffers: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    for (const chunk of chunks) {
      const upstreamUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(
        tl
      )}&q=${encodeURIComponent(chunk)}`;

      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Referer: "https://translate.google.com/",
        },
        cache: "force-cache",
      });

      if (!upstreamRes.ok) {
        return new Response(
          JSON.stringify({
            error: `Upstream TTS failed with status ${upstreamRes.status}`,
          }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      const arr = new Uint8Array(await upstreamRes.arrayBuffer());
      buffers.push(arr);
      totalBytes += arr.byteLength;
    }

    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const buf of buffers) {
      combined.set(buf, offset);
      offset += buf.byteLength;
    }

    return new Response(combined, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "TTS synthesis error",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
