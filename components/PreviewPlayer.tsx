
import React, { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { KineticEvent, AspectRatio, ChromaColor, ProjectSettings, RenderMode } from '../types';

interface PreviewPlayerProps {
  events: KineticEvent[];
  settings: ProjectSettings;
  isPlaying: boolean;
  onTogglePlay: (val: boolean) => void;
  onTimeUpdate: (time: number) => void;
  onEnd: () => void;
  onTransformUpdate?: (transform: Partial<ProjectSettings['globalTransform']>) => void;
}

export interface PreviewPlayerHandle {
  getCanvas: () => HTMLDivElement | null;
  reset: () => void;
  exportVideo: (onProgress: (p: number) => void) => Promise<Blob>;
}

export const PreviewPlayer = forwardRef<PreviewPlayerHandle, PreviewPlayerProps>(({
  events,
  settings,
  isPlaying,
  onTogglePlay,
  onTimeUpdate,
  onEnd,
  onTransformUpdate
}, ref) => {
  const [currentTime, setCurrentTime] = useState(0);
  const requestRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Direct Manipulation States
  const [isDragging, setIsDragging] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [isHittingSafeZone, setIsHittingSafeZone] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const transformAtStart = useRef({ x: 0, y: 0, scale: 1 });

  useImperativeHandle(ref, () => ({
    getCanvas: () => containerRef.current,
    reset: () => {
      setCurrentTime(0);
      startTimeRef.current = 0;
      onTogglePlay(false);
    },
    exportVideo: async (onProgress) => {
      await document.fonts.ready;
      
      return new Promise(async (resolve, reject) => {
        try {
          const fps = settings.renderMode === RenderMode.UHD60 ? 60 : 30;
          const is4K = settings.renderMode === RenderMode.UHD60;
          
          let width = is4K ? 3840 : 1920;
          let height = is4K ? 2160 : 1080;
          
          if (settings.aspectRatio === AspectRatio.Portrait) {
            width = is4K ? 2160 : 1080;
            height = is4K ? 3840 : 1920;
          } else if (settings.aspectRatio === AspectRatio.Square) {
            width = is4K ? 2160 : 1080;
            height = is4K ? 2160 : 1080;
          }

          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = width;
          exportCanvas.height = height;
          const ctx = exportCanvas.getContext('2d', { alpha: false });
          if (!ctx) throw new Error("Export Canvas failed");

          const stream = exportCanvas.captureStream(fps);
          const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: is4K ? 60000000 : 20000000
          });

          const chunks: BlobPart[] = [];
          recorder.ondataavailable = (e) => chunks.push(e.data);
          recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/mp4' }));
          recorder.onerror = (e) => reject(e);

          const duration = events[events.length - 1].endTime + 0.5;
          const totalFrames = Math.ceil(duration * fps);
          
          recorder.start();

          for (let i = 0; i <= totalFrames; i++) {
            const t = i / fps;
            ctx.fillStyle = settings.chromaColor;
            ctx.fillRect(0, 0, width, height);

            const ev = events.find(e => t >= e.startTime && t <= e.endTime);
            if (ev) {
              const baseFontSize = (width + height) / 25; 
              let relativeSizeMult = 1;
              switch(ev.relativeSize) {
                case 'Oversized': relativeSizeMult = 2.4; break;
                case 'Huge': relativeSizeMult = 1.9; break;
                case 'Large': relativeSizeMult = 1.4; break;
                case 'Medium': relativeSizeMult = 1.0; break;
                case 'Small': relativeSizeMult = 0.7; break;
              }

              const fontSize = baseFontSize * relativeSizeMult * settings.globalTransform.scale;
              const weight = ev.fontWeight === 'black' ? '900' : ev.fontWeight === 'extra-bold' ? '800' : '700';
              ctx.font = `${weight} ${fontSize}px "${ev.fontFamily || settings.primaryFont || 'Inter'}"`;
              ctx.fillStyle = ev.color === '#F5C6AA' ? settings.highlightColor : ev.color;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              const centerX = width / 2 + (settings.globalTransform.x * (width / 400));
              const centerY = height / 2 + (settings.globalTransform.y * (height / 600));
              const posX = centerX + (ev.screenPosition.x * (width / 100));
              const posY = centerY + (ev.screenPosition.y * (height / 100));

              let scale = ev.scale || 1;
              let opacity = 1;
              const elapsed = t - ev.startTime;
              const animDuration = 0.4;

              if (ev.motionType === 'scale-snap' && elapsed < animDuration) {
                const progress = elapsed / animDuration;
                scale *= (1.4 - (progress * 0.4));
                opacity = Math.min(1, progress * 2);
              } else if (ev.motionType === 'bounce' && elapsed < 0.5) {
                const progress = elapsed / 0.5;
                const bounce = Math.sin(progress * Math.PI) * 0.1;
                scale *= (1 + bounce);
              } else if (ev.motionType === 'smash' && elapsed < 0.6) {
                 const progress = elapsed / 0.6;
                 scale *= (2.5 - (progress * 1.5));
              } else if (ev.motionType === 'stamp' && elapsed < 0.3) {
                 const progress = elapsed / 0.3;
                 scale *= (1.3 - (progress * 0.3));
                 opacity = Math.min(1, progress * 4);
              }

              ctx.save();
              ctx.translate(posX, posY);
              ctx.scale(scale, scale);
              ctx.globalAlpha = opacity;
              ctx.fillText(ev.text.toUpperCase(), 0, 0);
              ctx.restore();
            }

            if (i % 8 === 0) {
              onProgress((i / totalFrames) * 100);
              await new Promise(r => setTimeout(r, 0));
            }
          }
          recorder.stop();
        } catch (err) { reject(err); }
      });
    }
  }));

  const containerStyles = useMemo(() => {
    switch (settings.aspectRatio) {
      case AspectRatio.Portrait: return 'aspect-[9/16] h-[600px] max-w-[337px]';
      case AspectRatio.Landscape: return 'aspect-[16/9] w-full max-w-[800px]';
      case AspectRatio.Square: return 'aspect-square h-[500px] max-w-[500px]';
      default: return 'aspect-[16/9] w-full';
    }
  }, [settings.aspectRatio]);

  const activeEvent = useMemo(() => {
    return events.find(e => currentTime >= e.startTime && currentTime <= e.endTime);
  }, [events, currentTime]);

  useEffect(() => {
    if (isPlaying) {
      const animate = (time: number) => {
        if (!startTimeRef.current) startTimeRef.current = time - (currentTime * 1000);
        const elapsed = (time - startTimeRef.current) / 1000;
        setCurrentTime(elapsed);
        onTimeUpdate(elapsed);
        const lastEvent = events[events.length - 1];
        if (lastEvent && elapsed > lastEvent.endTime + 0.1) {
          onEnd();
          return;
        }
        requestRef.current = requestAnimationFrame(animate);
      };
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      startTimeRef.current = 0;
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, events]);

  const handleInteractionPause = () => { if (isPlaying) onTogglePlay(false); };

  const clampTransform = (x: number, y: number, scale: number) => {
    if (!containerRef.current) return { x, y, scale };
    const { offsetWidth, offsetHeight } = containerRef.current;
    const limitX = offsetWidth * 0.15; 
    const limitY = offsetHeight * 0.25;
    const clampedX = Math.max(-limitX, Math.min(limitX, x));
    const clampedY = Math.max(-limitY, Math.min(limitY, y));
    const clampedScale = Math.max(0.6, Math.min(1.8, scale));
    const hit = clampedX !== x || clampedY !== y || clampedScale !== scale;
    setIsHittingSafeZone(hit);
    return { x: clampedX, y: clampedY, scale: clampedScale };
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        const nextX = transformAtStart.current.x + dx;
        const nextY = transformAtStart.current.y + dy;
        const clamped = clampTransform(nextX, nextY, settings.globalTransform.scale);
        onTransformUpdate?.(clamped);
      } else if (isScaling) {
        const dy = dragStartPos.current.y - e.clientY;
        const scaleDelta = dy / 150; 
        const nextScale = transformAtStart.current.scale + scaleDelta;
        const clamped = clampTransform(settings.globalTransform.x, settings.globalTransform.y, nextScale);
        onTransformUpdate?.(clamped);
      }
    };
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsScaling(false);
      setIsHittingSafeZone(false);
    };
    if (isDragging || isScaling) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isScaling, onTransformUpdate, settings.globalTransform]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    handleInteractionPause();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setIsDragging(true);
    dragStartPos.current = { x: clientX, y: clientY };
    transformAtStart.current = { ...settings.globalTransform };
  };

  const startScale = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    handleInteractionPause();
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setIsScaling(true);
    dragStartPos.current = { x: 0, y: clientY };
    transformAtStart.current = { ...settings.globalTransform };
  };

  const getWeightClass = (weight: string) => {
    switch (weight) {
      case 'normal': return 'font-normal';
      case 'bold': return 'font-bold';
      case 'extra-bold': return 'font-extrabold';
      case 'black': return 'font-black';
      default: return 'font-black';
    }
  };

  const getFontSize = (size: string) => {
    const isPortrait = settings.aspectRatio === AspectRatio.Portrait;
    switch (size) {
      case 'Oversized': return isPortrait ? '4.5rem' : '6rem';
      case 'Huge': return isPortrait ? '3.5rem' : '5rem';
      case 'Large': return isPortrait ? '2.5rem' : '3.5rem';
      case 'Medium': return isPortrait ? '1.8rem' : '2.5rem';
      case 'Small': return isPortrait ? '1.2rem' : '1.5rem';
      default: return '2rem';
    }
  };

  const getAnimationClass = (type: string) => {
    if (isDragging || isScaling) return ''; 
    switch (type) {
      case 'scale-snap': return 'animate-scale-snap';
      case 'bounce': return 'animate-bounce-in';
      case 'slide-snap': return 'animate-slide-snap';
      case 'stretch-in': return 'animate-stretch-in';
      case 'smash': return 'animate-smash';
      case 'glitch': return 'animate-glitch';
      case 'stamp': return 'animate-stamp';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div 
        ref={containerRef}
        onMouseDown={handleInteractionPause}
        onTouchStart={handleInteractionPause}
        className={`${containerStyles} relative shadow-2xl rounded-3xl overflow-hidden border-8 border-[#F8E2CF] flex items-center justify-center transition-all duration-300 group`}
        style={{ backgroundColor: settings.chromaColor }}
      >
        <div className={`absolute inset-0 pointer-events-none z-10 transition-all duration-300`}>
          <div className={`absolute top-[12.5%] left-[12.5%] right-[12.5%] bottom-[12.5%] border-2 border-dashed ${isHittingSafeZone ? 'border-red-500 scale-[1.02] opacity-100' : 'border-white/10 opacity-0 group-hover:opacity-40'} rounded-lg`} />
        </div>

        <div 
          className="absolute inset-0"
          style={{ 
            transform: `scale(${settings.globalTransform.scale}) translate(${settings.globalTransform.x}px, ${settings.globalTransform.y}px)` 
          }}
        >
          {events.length > 0 ? (
            activeEvent && (
              <div 
                key={activeEvent.startTime}
                onMouseDown={startDrag}
                onTouchStart={startDrag}
                className={`
                  absolute text-center px-6 uppercase tracking-tighter cursor-move select-none group/caption
                  ${getWeightClass(activeEvent.fontWeight)}
                  ${getAnimationClass(activeEvent.motionType)}
                  ${(isDragging || isScaling) ? 'ring-2 ring-[#F5C6AA] ring-offset-4 ring-offset-transparent rounded-lg shadow-xl scale-105' : ''}
                `}
                style={{ 
                  color: activeEvent.color === '#F5C6AA' ? settings.highlightColor : activeEvent.color,
                  fontFamily: activeEvent.fontFamily || settings.primaryFont || 'inherit',
                  fontSize: getFontSize(activeEvent.relativeSize),
                  lineHeight: '0.85',
                  left: `calc(50% + ${activeEvent.screenPosition.x}%)`,
                  top: `calc(50% + ${activeEvent.screenPosition.y}%)`,
                  transform: `translate(-50%, -50%) scale(${activeEvent.scale || 1})`,
                }}
              >
                {activeEvent.text}
                
                {!isPlaying && (
                  <div 
                    onMouseDown={startScale}
                    onTouchStart={startScale}
                    className="absolute -bottom-6 -right-6 w-10 h-10 bg-[#332721] text-white rounded-full border-2 border-white flex items-center justify-center cursor-nwse-resize opacity-0 group-hover/caption:opacity-100 transition-opacity shadow-lg scale-75 hover:scale-100 z-20"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </div>
                )}
              </div>
            )
          ) : (
             <div className="relative w-full h-full flex items-center justify-center bg-[#FDF6F0] overflow-hidden">
                {/* Dossier Grid Background */}
                <div className="absolute inset-0 opacity-[0.05]" 
                     style={{ backgroundImage: 'linear-gradient(#332721 1px, transparent 1px), linear-gradient(90deg, #332721 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                
                {/* Evidence Card Floating Elements */}
                <div className="absolute inset-0 flex flex-wrap gap-12 p-16 opacity-10 pointer-events-none">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`w-28 h-36 bg-white border-2 border-[#332721] rounded shadow-md transform ${i % 2 === 0 ? 'rotate-3 translate-y-2' : '-rotate-3 -translate-y-2'}`}>
                      <div className="w-full h-1/2 bg-[#F8E2CF] border-b border-[#332721] flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#332721]/30" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
                      </div>
                      <div className="p-2 space-y-2">
                        <div className="w-3/4 h-2 bg-[#332721]/20 rounded-full" />
                        <div className="w-1/2 h-2 bg-[#332721]/20 rounded-full" />
                        <div className="w-full h-1 bg-[#F5C6AA]/30 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Animated Scanline */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-[#F5C6AA] shadow-[0_0_20px_#F5C6AA] opacity-40 animate-scanline z-30" />

                {/* Central Intelligence Dossier Visual */}
                <div className="relative z-20 flex flex-col items-center text-center scale-90 md:scale-100">
                    <div className="w-32 h-32 mb-6 relative">
                        {/* Dossier Spinner Surround */}
                        <div className="absolute inset-0 border-2 border-[#332721] border-dashed rounded-full animate-spin-slow opacity-20" />
                        <div className="absolute inset-2 border-2 border-[#F5C6AA] border-t-transparent rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-20 bg-[#332721] rounded-sm flex flex-col items-center justify-center p-2 shadow-2xl">
                                <div className="w-full h-1 bg-[#F5C6AA] mb-2" />
                                <svg className="w-8 h-8 text-[#FDF6F0] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2 px-8">
                        <div className="inline-block px-4 py-1.5 bg-[#332721] text-[#FDF6F0] text-[10px] font-black uppercase tracking-[0.4em] rounded-md shadow-lg mb-2">
                          Intelligence Unit
                        </div>
                        <h2 className="text-[#332721] font-black uppercase tracking-[0.2em] text-sm">System Standby</h2>
                        <p className="text-[#A48F84] text-[9px] font-bold uppercase tracking-widest max-w-[220px] mx-auto opacity-70 leading-relaxed">
                          The engine is awaiting script data to map motion evidence on the safe-zone canvas
                        </p>
                    </div>
                </div>

                {/* Tech Corners */}
                <div className="absolute top-6 left-6 text-[8px] font-black text-[#332721]/40 uppercase tracking-widest">Sector_001_A</div>
                <div className="absolute top-6 right-6 text-[8px] font-black text-[#332721]/40 uppercase tracking-widest tabular-nums">SCAN_ID: {Math.floor(Math.random() * 99999)}</div>
                <div className="absolute bottom-6 left-6 text-[8px] font-black text-[#332721]/40 uppercase tracking-widest">Studio_v2.0_Local</div>
             </div>
          )}
        </div>
      </div>
      
      {/* Playback Controls */}
      <div className="mt-8 flex flex-col items-center w-full max-w-md gap-6">
          <div className="flex items-center gap-8">
              <button onClick={() => setCurrentTime(0)} className="p-3 text-[#A48F84] hover:text-[#332721] transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg></button>
              <button 
                onClick={() => onTogglePlay(!isPlaying)}
                disabled={events.length === 0}
                className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-lg transition-all ${isPlaying ? 'bg-[#FCD8D4]' : 'bg-[#F5C6AA]'} text-[#332721] disabled:opacity-30 active:scale-95`}
              >
                  {isPlaying ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
              </button>
              <button onClick={() => setCurrentTime(prev => Math.min(prev + 0.5, events[events.length-1]?.endTime || 0))} className="p-3 text-[#A48F84] hover:text-[#332721] transition-colors"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zm7.868 0a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z" /></svg></button>
          </div>
          <div className="w-full flex justify-between items-center gap-4">
            <span className="text-[10px] font-bold tabular-nums text-[#A48F84]">{currentTime.toFixed(2)}s</span>
            <div className="flex-1 h-2 bg-[#F8E2CF] rounded-full overflow-hidden relative border border-white/20">
              <div className="h-full bg-[#F5C6AA] transition-all duration-75" style={{ width: `${(currentTime / (events[events.length - 1]?.endTime || 1)) * 100}%` }} />
            </div>
            <span className="text-[10px] font-bold tabular-nums text-[#A48F84]">{(events[events.length - 1]?.endTime || 0).toFixed(2)}s</span>
          </div>
      </div>

      <style>{`
        .animate-spin-slow { animation: spin 15s linear infinite; }
        @keyframes scanline { 0% { top: -5%; } 100% { top: 105%; } }
        .animate-scanline { animation: scanline 4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @keyframes scale-snap { 0% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; } 50% { transform: translate(-50%, -50%) scale(0.97); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes bounce-in { 0% { transform: translate(-50%, -40%) scale(0.7); opacity: 0; } 60% { transform: translate(-50%, -52%) scale(1.05); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes slide-snap { 0% { transform: translate(-80%, -50%); opacity: 0; } 100% { transform: translate(-50%, -50%); opacity: 1; } }
        @keyframes stretch-in { 0% { transform: translate(-50%, -50%) scaleX(1.5) scaleY(0.5); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
        @keyframes smash { 0% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; filter: blur(4px); } 30% { transform: translate(-50%, -50%) scale(1); opacity: 1; filter: blur(0); } 100% { transform: translate(-50%, -50%) scale(1); } }
        @keyframes glitch { 0% { transform: translate(-50%, -50%) skew(0deg); } 5% { transform: translate(-51%, -49%) skew(5deg); } 10% { transform: translate(-49%, -51%) skew(-5deg); } 15% { transform: translate(-50%, -50%) skew(0deg); } }
        @keyframes stamp { 0% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; } 15% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1); } }
        .animate-scale-snap { animation: scale-snap 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-slide-snap { animation: slide-snap 0.3s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .animate-stretch-in { animation: stretch-in 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
        .animate-smash { animation: smash 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-glitch { animation: glitch 0.3s ease-in-out infinite; }
        .animate-stamp { animation: stamp 0.3s cubic-bezier(0, 0, 0.2, 1) forwards; }
      `}</style>
    </div>
  );
});
