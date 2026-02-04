import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useImperativeHandle,
  forwardRef
} from "react";
import { KineticEvent, AspectRatio, ProjectSettings, RenderMode } from "../types";

interface PreviewPlayerProps {
  events: KineticEvent[];
  settings: ProjectSettings;
  isPlaying: boolean;
  onTogglePlay: (val: boolean) => void;
  onTimeUpdate: (time: number) => void;
  onEnd: () => void;
  onTransformUpdate?: (
    transform: Partial<ProjectSettings["globalTransform"]>
  ) => void;
}

export interface PreviewPlayerHandle {
  getCanvas: () => HTMLDivElement | null;
  reset: () => void;
  exportVideo: (onProgress: (p: number) => void) => Promise<Blob>;
}

/* ---------- Shared Animation Math ---------- */

function computeCaptionState(ev: KineticEvent, t: number) {
  const elapsed = t - ev.startTime;
  let scale = ev.scale || 1;
  let opacity = 1;

  if (ev.motionType === "scale-snap" && elapsed < 0.4) {
    const p = Math.max(0, elapsed / 0.4);
    scale *= 1.4 - p * 0.4;
    opacity = Math.min(1, p * 2);
  }

  if (ev.motionType === "bounce" && elapsed < 0.5) {
    const p = elapsed / 0.5;
    scale *= 1 + Math.sin(p * Math.PI) * 0.1;
  }

  if (ev.motionType === "smash" && elapsed < 0.6) {
    const p = elapsed / 0.6;
    scale *= 2.5 - p * 1.5;
  }

  if (ev.motionType === "stamp" && elapsed < 0.3) {
    const p = elapsed / 0.3;
    scale *= 1.3 - p * 0.3;
    opacity = Math.min(1, p * 4);
  }

  return { scale, opacity };
}

/* ---------- Component ---------- */

export const PreviewPlayer = forwardRef<
  PreviewPlayerHandle,
  PreviewPlayerProps
>((props, ref) => {
  const {
    events,
    settings,
    isPlaying,
    onTogglePlay,
    onTimeUpdate,
    onEnd,
    onTransformUpdate
  } = props;

  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ---------- Imperative API ---------- */

  useImperativeHandle(ref, () => ({
    getCanvas: () => containerRef.current,
    reset: () => {
      setCurrentTime(0);
      startRef.current = 0;
      onTogglePlay(false);
    },
    exportVideo: async (onProgress) => {
      const fps = settings.renderMode === RenderMode.UHD60 ? 60 : 30;
      const frameDuration = 1000 / fps;

      let width = 1920;
      let height = 1080;

      if (settings.renderMode === RenderMode.UHD60) {
        width = 3840;
        height = 2160;
      }

      if (settings.aspectRatio === AspectRatio.Portrait) {
        [width, height] = [height, width];
      }
      if (settings.aspectRatio === AspectRatio.Square) {
        width = height = settings.renderMode === RenderMode.UHD60 ? 2160 : 1080;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas error");

      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond:
          settings.renderMode === RenderMode.UHD60 ? 60_000_000 : 20_000_000
      });

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);

      const duration =
        (events[events.length - 1]?.endTime ?? 0) + 0.3;
      const totalFrames = Math.ceil(duration * fps);

      recorder.start();

      let frame = 0;
      let lastTime = performance.now();

      return new Promise<Blob>((resolve) => {
        const render = (now: number) => {
          if (now - lastTime < frameDuration) {
            requestAnimationFrame(render);
            return;
          }
          lastTime = now;

          const t = frame / fps;

          ctx.fillStyle = settings.chromaColor;
          ctx.fillRect(0, 0, width, height);

          const ev = events.find(
            (e) => t >= e.startTime && t <= e.endTime
          );

          if (ev) {
            const { scale, opacity } = computeCaptionState(ev, t);

            const baseFont = (width + height) / 25;
            const sizeMap: Record<string, number> = {
              Oversized: 2.4,
              Huge: 1.9,
              Large: 1.4,
              Medium: 1,
              Small: 0.7
            };

            const fontSize =
              baseFont *
              (sizeMap[ev.relativeSize] || 1) *
              settings.globalTransform.scale;

            ctx.font = `900 ${fontSize}px "${
              ev.fontFamily || settings.primaryFont || "Inter"
            }"`;
            ctx.fillStyle = ev.color;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const cx =
              width / 2 +
              settings.globalTransform.x * (width / 400);
            const cy =
              height / 2 +
              settings.globalTransform.y * (height / 600);

            const x = cx + ev.screenPosition.x * (width / 100);
            const y = cy + ev.screenPosition.y * (height / 100);

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.fillText(ev.text.toUpperCase(), 0, 0);
            ctx.restore();
          }

          frame++;
          onProgress((frame / totalFrames) * 100);

          if (frame <= totalFrames) {
            requestAnimationFrame(render);
          } else {
            recorder.stop();
            recorder.onstop = () =>
              resolve(new Blob(chunks, { type: "video/webm" }));
          }
        };

        requestAnimationFrame(render);
      });
    }
  }));

  /* ---------- Preview Clock ---------- */

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startRef.current = 0;
      return;
    }

    const tick = (now: number) => {
      if (!startRef.current)
        startRef.current = now - currentTime * 1000;

      const t = (now - startRef.current) / 1000;
      setCurrentTime(t);
      onTimeUpdate(t);

      const end = events[events.length - 1]?.endTime ?? 0;
      if (t > end + 0.1) {
        onEnd();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [isPlaying, events]);

  const activeEvent = useMemo(
    () => events.find((e) => currentTime >= e.startTime && currentTime <= e.endTime),
    [events, currentTime]
  );

  const containerStyle = useMemo(() => {
    if (settings.aspectRatio === AspectRatio.Portrait)
      return "aspect-[9/16] h-[600px]";
    if (settings.aspectRatio === AspectRatio.Square)
      return "aspect-square h-[500px]";
    return "aspect-[16/9] w-full max-w-[800px]";
  }, [settings.aspectRatio]);

  /* ---------- Render ---------- */

  return (
    <div className="flex flex-col items-center w-full">
      <div
        ref={containerRef}
        className={`${containerStyle} relative overflow-hidden rounded-3xl border-8`}
        style={{ backgroundColor: settings.chromaColor }}
      >
        {activeEvent && (
          <div
            className="absolute uppercase font-black text-center"
            style={{
              left: `calc(50% + ${activeEvent.screenPosition.x}%)`,
              top: `calc(50% + ${activeEvent.screenPosition.y}%)`,
              transform: "translate(-50%, -50%)",
              color: activeEvent.color,
              fontFamily:
                activeEvent.fontFamily || settings.primaryFont || "inherit",
              fontSize: "2.5rem",
              lineHeight: "0.85"
            }}
          >
            {activeEvent.text}
          </div>
        )}
      </div>
    </div>
  );
});
