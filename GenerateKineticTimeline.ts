import { KineticEvent, ProjectSettings, Tone, FontMode } from "./types";

/**
 * Deterministic Kinetic Timeline Compiler
 * Fully local. No external AI services.
 * GitHub-safe and 100% owned.
 */

export const generateKineticTimeline = async (
  script: string,
  settings: ProjectSettings
): Promise<KineticEvent[]> => {

  // ---------------- FONT RULES (UNCHANGED INTENT) ----------------
  let fontInstructions = "";
  if (settings.fontMode === FontMode.Single) {
    fontInstructions = `Use ONLY '${settings.primaryFont}' for every word.`;
  } else if (settings.fontMode === FontMode.Combination) {
    fontInstructions = `Use '${settings.primaryFont}' for PRIMARY words and '${settings.secondaryFont}' for SECONDARY words.`;
  } else {
    fontInstructions = `Creative font choice allowed but consistent within phrases.`;
  }

  // ---------------- CORE CONSTANTS (FROM YOUR PROMPT) ----------------
  const BASE_WPM = 155;
  const BASE_WORD_DURATION = 60 / BASE_WPM; // ≈ 0.38s
  const SAFE_ZONE_LIMIT = 37.5;

  // ---------------- HELPERS ----------------
  const isSentenceEnd = (w: string) => /[.!?]$/.test(w);
  const isComma = (w: string) => /,$/.test(w);
  const isColon = (w: string) => /:$/.test(w);
  const isLongWord = (w: string) =>
    w.replace(/[^a-zA-Z]/g, "").length >= 8;

  const randomSafePosition = () =>
    round(Math.random() * SAFE_ZONE_LIMIT * 2 - SAFE_ZONE_LIMIT);

  const round = (n: number) =>
    Math.round(n * 1000) / 1000;

  // ---------------- TOKENIZATION ----------------
  const words = script.split(/\s+/).filter(Boolean);

  const timeline: KineticEvent[] = [];
  let currentTime = 0;

  // ---------------- MAIN COMPILATION LOOP ----------------
  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    let duration = BASE_WORD_DURATION;
    let postPause = 0;

    // Adaptive timing rules (FROM YOUR PROMPT)
    if (isLongWord(word)) duration *= 1.25;
    if (isSentenceEnd(word)) postPause += 0.4;
    if (isComma(word)) postPause += 0.2;
    if (isColon(word)) postPause += 0.3;

    const isPrimary =
      word.length >= 6 || isSentenceEnd(word);

    const scale = isPrimary
      ? settings.scaleRange.max
      : settings.scaleRange.min;

    const fontFamily =
      settings.fontMode === FontMode.Single
        ? settings.primaryFont
        : settings.fontMode === FontMode.Combination
        ? isPrimary
          ? settings.primaryFont
          : settings.secondaryFont
        : settings.primaryFont;

    const event: KineticEvent = {
      text: word,
      role: isPrimary ? "PRIMARY" : "SECONDARY",
      section: "auto",
      fontWeight: isPrimary ? "black" : "normal",
      fontFamily,
      relativeSize: isPrimary ? "Huge" : "Medium",
      scale,
      color: "#FFFFFF",
      screenPosition: {
        x: randomSafePosition(),
        y: randomSafePosition()
      },
      motionType: isPrimary ? "smash" : "scale-snap",
      startTime: round(currentTime),
      endTime: round(currentTime + duration),
      duration: round(duration),
      prePause: 0,
      postPause: round(postPause)
    };

    timeline.push(event);
    currentTime += duration + postPause;
  }

  return timeline;
};
