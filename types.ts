export enum Tone {
  Investigative = 'investigative',
  Motivational = 'motivational',
  Cinematic = 'cinematic',
  Aggressive = 'aggressive',
  Podcast = 'podcast',
  Calm = 'calm'
}

export enum AspectRatio {
  Portrait = '9:16',
  Landscape = '16:9',
  Square = '1:1'
}

export enum ChromaColor {
  Green = '#00FF00',
  Blue = '#0000FF',
  Black = '#000000'
}

export enum FontMode {
  Single = 'Single Font Mode',
  Combination = 'Font Combination Mode',
  Auto = 'Auto Font Mode'
}

export enum RenderMode {
  HD30 = '30 FPS HD Local',
  UHD60 = '60 FPS UHD 4k'
}

export type RelativeSize = 'Oversized' | 'Huge' | 'Large' | 'Medium' | 'Small';
export type MotionType = 'scale-snap' | 'bounce' | 'slide-snap' | 'stretch-in' | 'smash' | 'glitch' | 'stamp';
export type WordRole = 'PRIMARY' | 'SECONDARY';

export interface KineticEvent {
  text: string;
  role: WordRole;
  section?: string; 
  fontWeight: 'normal' | 'bold' | 'extra-bold' | 'black';
  fontFamily?: string;
  relativeSize: RelativeSize;
  scale: number;
  color: string;
  screenPosition: { x: number; y: number }; 
  motionType: MotionType;
  startTime: number;
  endTime: number;
  duration: number;
  prePause: number;
  postPause: number;
}

export interface ProjectSettings {
  tone: Tone;
  language: string;
  aspectRatio: AspectRatio;
  chromaColor: ChromaColor;
  fontMode: FontMode;
  renderMode: RenderMode;
  primaryFont: string;
  secondaryFont: string;
  primaryTextColor: string;
  highlightColor: string;
  scaleRange: { min: number; max: number };
  globalTransform: {
    scale: number;
    x: number;
    y: number;
  };
}