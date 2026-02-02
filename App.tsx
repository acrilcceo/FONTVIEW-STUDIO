
import React, { useState, useRef } from 'react';
import { Tone, AspectRatio, ChromaColor, KineticEvent, ProjectSettings, FontMode, RenderMode } from './types';
import { generateKineticTimeline } from './GenerateKineticTimeline';
import { PreviewPlayer, PreviewPlayerHandle } from './components/PreviewPlayer';

const PRESET_HIGHLIGHTS = [
  { name: 'Peach', hex: '#FCD8D4' },
  { name: 'Warm Sunset', hex: '#F5C6AA' },
  { name: 'Influencer Pink', hex: '#EC4899' },
  { name: 'Cyber Neon', hex: '#00FFCC' },
  { name: 'Royal White', hex: '#FFFFFF' },
  { name: 'Gold', hex: '#FFD700' },
];

const FONT_FAMILIES = [
  { group: 'CLEAN & MODERN', fonts: ['Montserrat', 'Poppins', 'Inter', 'Bebas Neue'] },
  { group: 'LEGIBILITY', fonts: ['Roboto', 'Helvetica', 'Verdana'] },
  { group: 'HIGH-IMPACT', fonts: ['Komika Axis', 'The Bold Font', 'Impact Label', 'Impact Label Reversed', 'Magazine Cutouts Font'] },
  { group: 'TECH/CODE', fonts: ['AA CaminoCode'] },
  { group: 'EDITORIAL', fonts: ['Temeraire Regular', 'Readhi', 'Xerox4'] },
  { group: 'CASUAL', fonts: ['Moms Typewriter', 'Normale'] },
];

const App: React.FC = () => {
  const [script, setScript] = useState('');
  const [settings, setSettings] = useState<ProjectSettings>({
    tone: Tone.Cinematic,
    language: 'English',
    aspectRatio: AspectRatio.Portrait,
    chromaColor: ChromaColor.Black,
    fontMode: FontMode.Auto,
    renderMode: RenderMode.HD30,
    primaryFont: 'Montserrat',
    secondaryFont: 'Poppins',
    primaryTextColor: '#332721',
    highlightColor: '#F5C6AA', 
    scaleRange: { min: 0.85, max: 1.4 },
    globalTransform: { scale: 1.0, x: 0, y: 0 }
  });
  const [events, setEvents] = useState<KineticEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const previewRef = useRef<PreviewPlayerHandle>(null);

  const handleGenerate = async () => {
    if (!script.trim()) { setError("Script content is missing."); return; }
    setLoading(true); setError(null); setIsPlaying(false);
    try {
      const timeline = await generateKineticTimeline(script, settings);
      setEvents(timeline);
    } catch (err: any) {
      setError(err.message || "Blueprint failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (events.length === 0 || !previewRef.current) return;
    setIsExporting(true);
    setExportProgress(0);
    setError(null);
    try {
      const blob = await previewRef.current.exportVideo((p) => setExportProgress(p));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FontView_${Date.now()}.mp4`;
      a.click();
    } catch (err: any) {
      setError("Export failed. Please try again.");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const updateTransform = (key: string, val: number) => {
    setSettings(prev => ({
      ...prev,
      globalTransform: { ...prev.globalTransform, [key]: val }
    }));
  };

  const handleManualTransform = (transform: Partial<ProjectSettings['globalTransform']>) => {
    setSettings(prev => ({
      ...prev,
      globalTransform: { ...prev.globalTransform, ...transform }
    }));
  };

  return (
    <div className="min-h-screen bg-[#FDF6F0] text-[#332721] p-6 md:p-12 max-w-7xl mx-auto selection:bg-[#FCD8D4] mb-20">
      <header className="mb-12 text-center space-y-2">
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter flex items-center justify-center gap-3">
          FONTVIEW <span className="text-[12px] px-3 py-1 bg-[#332721] text-white rounded-full tracking-[0.2em] font-black uppercase shadow-sm">STUDIO</span>
        </h1>
        <p className="text-[#A48F84] font-bold uppercase tracking-[0.4em] text-[10px]">Deterministic Motion Graphic Engine</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Control Panel */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white p-8 rounded-[40px] shadow-xl shadow-[#F8E2CF]/40 border border-[#F8E2CF] transition-all hover:shadow-[#F8E2CF]/70">
            <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#A48F84] mb-4">Content Terminal</label>
            <textarea 
              className="w-full h-44 bg-[#FDF6F0] border border-[#F8E2CF] rounded-[24px] p-6 text-[#332721] focus:ring-2 focus:ring-[#F5C6AA] focus:outline-none transition-all resize-none text-base leading-relaxed font-medium placeholder-[#A48F84]/50 shadow-inner"
              placeholder="Paste script for kinetic mapping..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
          </section>

          {/* Top 4 Core Dropdowns */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-[32px] shadow-sm border border-[#F8E2CF] hover:border-[#F5C6AA] transition-colors">
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#A48F84] mb-2">Narrative Vibe</label>
              <select className="w-full bg-transparent text-[#332721] font-black text-[11px] focus:outline-none cursor-pointer appearance-none uppercase" value={settings.tone} onChange={(e) => setSettings({...settings, tone: e.target.value as Tone})}>
                {Object.values(Tone).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="bg-white p-5 rounded-[32px] shadow-sm border border-[#F8E2CF] hover:border-[#F5C6AA] transition-colors">
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#A48F84] mb-2">Render Quality</label>
              <select className="w-full bg-transparent text-[#332721] font-black text-[11px] focus:outline-none cursor-pointer appearance-none uppercase" value={settings.renderMode} onChange={(e) => setSettings({...settings, renderMode: e.target.value as RenderMode})}>
                {Object.values(RenderMode).map(rm => <option key={rm} value={rm}>{rm}</option>)}
              </select>
            </div>
            <div className="bg-white p-5 rounded-[32px] shadow-sm border border-[#F8E2CF] hover:border-[#F5C6AA] transition-colors">
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#A48F84] mb-2">Aspect Ratio</label>
              <select className="w-full bg-transparent text-[#332721] font-black text-[11px] focus:outline-none cursor-pointer appearance-none uppercase" value={settings.aspectRatio} onChange={(e) => setSettings({...settings, aspectRatio: e.target.value as AspectRatio})}>
                {Object.values(AspectRatio).map(ar => <option key={ar} value={ar}>{ar === AspectRatio.Portrait ? 'Portrait (9:16)' : ar === AspectRatio.Landscape ? 'Landscape (16:9)' : 'Square (1:1)'}</option>)}
              </select>
            </div>
            <div className="bg-white p-5 rounded-[32px] shadow-sm border border-[#F8E2CF] hover:border-[#F5C6AA] transition-colors">
              <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#A48F84] mb-2">Font</label>
              <select className="w-full bg-transparent text-[#332721] font-black text-[11px] focus:outline-none cursor-pointer appearance-none uppercase" value={settings.fontMode} onChange={(e) => setSettings({...settings, fontMode: e.target.value as FontMode})}>
                {Object.values(FontMode).map(fm => <option key={fm} value={fm}>{fm}</option>)}
              </select>
            </div>
          </div>

          {/* Conditional Font Selection Dropdowns */}
          {settings.fontMode !== FontMode.Auto && (
            <section className="bg-white p-6 rounded-[32px] border-2 border-dashed border-[#F8E2CF] space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#A48F84] mb-2">
                    {settings.fontMode === FontMode.Single ? 'Primary Font' : 'Emphasis Font (Primary)'}
                  </label>
                  <select 
                    className="w-full bg-[#FDF6F0] border border-[#F8E2CF] rounded-[16px] p-3 text-[#332721] font-bold text-xs focus:ring-2 focus:ring-[#F5C6AA] focus:outline-none"
                    value={settings.primaryFont}
                    onChange={(e) => setSettings({...settings, primaryFont: e.target.value})}
                  >
                    {FONT_FAMILIES.map(group => (
                      <optgroup key={group.group} label={group.group}>
                        {group.fonts.map(f => <option key={f} value={f}>{f}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {settings.fontMode === FontMode.Combination && (
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#A48F84] mb-2">Support Font (Secondary)</label>
                    <select 
                      className="w-full bg-[#FDF6F0] border border-[#F8E2CF] rounded-[16px] p-3 text-[#332721] font-bold text-xs focus:ring-2 focus:ring-[#F5C6AA] focus:outline-none"
                      value={settings.secondaryFont}
                      onChange={(e) => setSettings({...settings, secondaryFont: e.target.value})}
                    >
                      {FONT_FAMILIES.map(group => (
                        <optgroup key={group.group} label={group.group}>
                          {group.fonts.map(f => <option key={f} value={f}>{f}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="bg-white p-8 rounded-[40px] border border-[#F8E2CF] space-y-6 shadow-sm">
            <div className="flex justify-between items-center mb-2">
               <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#A48F84]">Highlight Palettes</label>
            </div>
            <div className="flex flex-wrap gap-3">
              {PRESET_HIGHLIGHTS.map(color => (
                <button 
                  key={color.hex} 
                  onClick={() => setSettings({...settings, highlightColor: color.hex})}
                  className={`w-10 h-10 rounded-2xl border-2 transition-all hover:scale-110 shadow-sm ${settings.highlightColor === color.hex ? 'border-[#332721] scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
              <div className="relative w-10 h-10 rounded-2xl border-2 border-[#F8E2CF] overflow-hidden flex items-center justify-center bg-[#FDF6F0] hover:scale-110 transition-transform">
                <input 
                  type="color" 
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  value={settings.highlightColor}
                  onChange={(e) => setSettings({...settings, highlightColor: e.target.value})}
                />
                <svg className="w-5 h-5 text-[#332721]/40" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm1 2a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5zm0 4a1 1 0 000 2h10a1 1 0 100-2H5z" clipRule="evenodd"/></svg>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-[#A48F84] uppercase">Custom Hex:</span>
              <input 
                type="text" 
                value={settings.highlightColor} 
                onChange={(e) => setSettings({...settings, highlightColor: e.target.value})}
                className="bg-[#FDF6F0] border border-[#F8E2CF] rounded-lg px-3 py-1 text-[10px] font-black text-[#332721] uppercase w-24 focus:ring-2 focus:ring-[#F5C6AA] focus:outline-none"
              />
            </div>
          </section>

          <section className="bg-white p-8 rounded-[40px] border border-[#F8E2CF] space-y-6 shadow-sm">
            <div className="flex justify-between items-center">
               <label className="block text-[11px] font-black uppercase tracking-[0.2em] text-[#A48F84]">Layer Transform</label>
               <button onClick={() => setSettings({...settings, globalTransform: {scale: 1, x:0, y:0}})} className="text-[9px] font-black text-[#F5C6AA] uppercase hover:underline">Reset</button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-[#A48F84] uppercase"><span>Global Scale</span><span className="tabular-nums">{settings.globalTransform.scale.toFixed(2)}x</span></div>
                <input type="range" min="0.6" max="1.8" step="0.01" className="w-full accent-[#F5C6AA]" value={settings.globalTransform.scale} onChange={(e) => updateTransform('scale', parseFloat(e.target.value))} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-[#A48F84] uppercase"><span>X Offset</span><span className="tabular-nums">{Math.round(settings.globalTransform.x)}px</span></div>
                  <input type="range" min="-150" max="150" step="1" className="w-full accent-[#332721]" value={settings.globalTransform.x} onChange={(e) => updateTransform('x', parseInt(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-[#A48F84] uppercase"><span>Y Offset</span><span className="tabular-nums">{Math.round(settings.globalTransform.y)}px</span></div>
                  <input type="range" min="-300" max="300" step="1" className="w-full accent-[#332721]" value={settings.globalTransform.y} onChange={(e) => updateTransform('y', parseInt(e.target.value))} />
                </div>
              </div>
            </div>
          </section>

          <div className="flex gap-4">
            <button 
              onClick={handleGenerate} 
              disabled={loading || isExporting} 
              className={`flex-1 py-6 rounded-[32px] font-black text-[12px] uppercase tracking-[0.4em] transition-all relative overflow-hidden group shadow-lg ${loading || isExporting ? 'bg-[#F8E2CF] text-[#A48F84] cursor-not-allowed' : 'bg-[#332721] text-white hover:bg-black active:scale-[0.98]'}`}
            >
              {loading ? (
                  <span className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      MAPPING...
                  </span>
              ) : 'EXECUTE'}
            </button>
            <button 
              onClick={handleExport} 
              disabled={loading || isExporting || events.length === 0} 
              className={`flex-1 py-6 rounded-[32px] font-black text-[12px] uppercase tracking-[0.4em] transition-all relative overflow-hidden group shadow-lg ${loading || isExporting || events.length === 0 ? 'bg-[#F8E2CF] text-[#A48F84] cursor-not-allowed' : 'bg-[#F5C6AA] text-[#332721] hover:bg-[#FCD8D4] active:scale-[0.98]'}`}
            >
              {isExporting ? (
                  <span className="flex items-center justify-center gap-3">
                      <div className="w-4 h-4 border-2 border-[#332721]/20 border-t-[#332721] rounded-full animate-spin" />
                      {Math.round(exportProgress)}%
                  </span>
              ) : 'EXPORT MP4'}
            </button>
          </div>
          {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>}
        </div>

        {/* Right Preview Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex justify-between items-center px-4">
            <h2 className="text-[11px] font-black text-[#A48F84] uppercase tracking-[0.3em]">Studio Canvas</h2>
            <div className="flex gap-4 items-center">
              <span className="text-[9px] font-black text-[#A48F84] uppercase opacity-50">Background:</span>
              {Object.values(ChromaColor).map(color => (
                <button key={color} onClick={() => setSettings({...settings, chromaColor: color})} className={`w-5 h-5 rounded-full border-2 ${settings.chromaColor === color ? 'border-[#332721] scale-125 shadow-md' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>

          <div className="flex justify-center bg-white p-10 rounded-[60px] shadow-2xl shadow-[#F8E2CF]/30 border border-[#F8E2CF] relative overflow-hidden">
              <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-[#F8E2CF] rounded-tl-3xl pointer-events-none" />
              <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-[#F8E2CF] rounded-br-3xl pointer-events-none" />
              
              <PreviewPlayer 
                ref={previewRef} 
                events={events} 
                settings={settings} 
                isPlaying={isPlaying} 
                onTogglePlay={setIsPlaying} 
                onTimeUpdate={() => {}} 
                onEnd={() => setIsPlaying(false)}
                onTransformUpdate={handleManualTransform}
              />
          </div>

          <div className="bg-white p-6 rounded-[32px] border border-[#F8E2CF] shadow-sm">
            <h3 className="text-[11px] font-black text-[#A48F84] uppercase tracking-[0.3em] mb-4 ml-2">Render Engine Status</h3>
            <div className="flex flex-wrap gap-2">
              <div className="px-3 py-1 bg-[#FDF6F0] text-[9px] font-black text-[#332721] rounded-full uppercase border border-[#F8E2CF] flex items-center gap-2">
                <div className={`w-1.5 h-1.5 ${settings.renderMode === RenderMode.UHD60 ? 'bg-blue-400' : 'bg-green-400'} rounded-full animate-pulse`}/> 
                {settings.renderMode}
              </div>
              <div className="px-3 py-1 bg-[#FDF6F0] text-[9px] font-black text-[#332721] rounded-full uppercase border border-[#F8E2CF]">75% Safe Zone Mask</div>
              <div className="px-3 py-1 bg-[#FDF6F0] text-[9px] font-black text-[#332721] rounded-full uppercase border border-[#F8E2CF]">Snapping Active</div>
              <div className="px-3 py-1 bg-[#FDF6F0] text-[9px] font-black text-[#332721] rounded-full uppercase border border-[#F8E2CF]">
                {settings.fontMode}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-24 pt-12 border-t border-[#F8E2CF]/50 text-center space-y-6">
        <div className="space-y-2">
          <p className="text-[#332721] text-[12px] font-black uppercase tracking-[0.6em]">
            FONTVIEW STUDIO &bull; CREATOR EDITION &bull; 2026
          </p>
          <div className="w-12 h-0.5 bg-[#F5C6AA] mx-auto opacity-40 rounded-full" />
          <p className="text-[#A48F84] text-[10px] font-bold uppercase tracking-[0.4em]">
            OPTIMIZED FOR VIRAL STORYTELLING &bull; CHROMA KEY COMPATIBLE
          </p>
        </div>
        <p className="text-[#A48F84]/60 text-[9px] font-black uppercase tracking-[0.3em] hover:text-[#332721] transition-colors cursor-default">
          MADE BY SAMBIT GHOSH
        </p>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #F8E2CF; border-radius: 10px; }
        
        input[type=range] { -webkit-appearance: none; background: transparent; }
        input[type=range]::-webkit-slider-runnable-track { background: #FDF6F0; height: 6px; border-radius: 10px; border: 1px solid #F8E2CF; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 18px; width: 18px; border-radius: 50%; background: #332721; margin-top: -7px; cursor: pointer; border: 2px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.1); transition: transform 0.2s; }
        input[type=range]::-webkit-slider-thumb:active { transform: scale(0.9); }
      `}</style>
    </div>
  );
};

export default App;
