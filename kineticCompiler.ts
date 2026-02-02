import { KineticEvent, ProjectSettings, FontMode } from "./types";

/**
 * Deterministic kinetic compiler
 * No AI. Fully rule-based. Fully owned.
 */

const BASE_WPM = 155;
const BASE_WORD_DURATION = 60 / BASE_WPM; // ≈ 0.38s

const isSentenceEnd = (word: string) => /[.!?]$/.test(word);
const isComma = (word: string) => /,$/.test(word);
const isColon = (word: string) => /:$/.test(word);
const isLongWord = (word: string) => word.replace(/[^a-zA-Z]/g, "").length >= 8;

export const generateKineticTimeline = (
  script: string,
  settings: ProjectSettings
): KineticEvent[] => {
  const words = script.split(/\s+/);
  const timeline: KineticEvent[] = [];

  let currentTime = 0;

  words.forEach((rawWord, index) => {
    const cleanWord = rawWord.trim();
    if (!cleanWord) return;

    let duration = BASE_WORD_DURATION;
    let postPause = 0;

    if (isLongWord(cleanWord)) duration *= 1.25;
    if (isSentenceEnd(cleanWord)) postPause += 0.4;
    if (isComma(cleanWord)) postPause += 0.2;
    if (isColon(cleanWord)) postPause += 0.3;

    const isPrimary = cleanWord.length >= 6 || isSentenceEnd(cleanWord);

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
      text: cleanWord,
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
  });

  return timeline;
};

const randomSafePosition = () =>
  round((Math.random() * 75 - 37.5));

const round = (n: number) =>
  Math.round(n * 1000) / 1000;
