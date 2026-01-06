import React, { useState } from 'react';
import { AppStatus, ExportFormat, LightingConfig, RenderConfig, RenderStyle } from '../types';

interface UIOverlayProps {
  status: AppStatus;
  statusDetail?: string;
  isRecording: boolean;
  recordingProgress: { current: number; total: number } | null;
  onFileSelect: (file: File) => void;
  onLoadSample: () => void;
  onToggleRotate: () => void;
  onStartRecord: () => void;
  autoRotate: boolean;
  hasModel: boolean;
  exportFormat: ExportFormat;
  onSetExportFormat: (format: ExportFormat) => void;
  lightingConfig: LightingConfig;
  onLightingChange: (config: LightingConfig) => void;
  renderConfig: RenderConfig;
  onRenderConfigChange: (config: RenderConfig) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  status,
  statusDetail,
  isRecording,
  recordingProgress,
  onFileSelect,
  onLoadSample,
  onToggleRotate,
  onStartRecord,
  autoRotate,
  hasModel,
  exportFormat,
  onSetExportFormat,
  lightingConfig,
  onLightingChange,
  renderConfig,
  onRenderConfigChange
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);

  const handleLightColorChange = (index: number, color: string) => {
    const newColors = [...lightingConfig.colors] as [string, string, string];
    newColors[index] = color;
    onLightingChange({ ...lightingConfig, colors: newColors });
  };

  const styles: { id: RenderStyle; label: string }[] = [
    { id: 'standard', label: 'Standard' },
    { id: 'toon', label: 'Toon Shade' },
    { id: 'pixel', label: 'Pixelized' },
  ];

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 md:p-12 text-slate-300 select-none">
      
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto relative z-20">
        
        {/* Style Picker (Top Left) */}
        <div className="relative">
          <button 
            onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
            className="group flex items-center gap-2 text-yellow-600/80 hover:text-yellow-500 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            <div className="flex flex-col items-start">
               <span className="font-display tracking-widest text-[10px] uppercase text-slate-500">Style</span>
               <span className="font-display tracking-wider text-sm border-b border-transparent group-hover:border-yellow-500/50 pb-0.5">
                 {styles.find(s => s.id === renderConfig.style)?.label || 'Standard'}
               </span>
            </div>
          </button>
          
          {isStyleMenuOpen && (
             <div className="absolute top-12 left-0 w-48 bg-slate-900/90 border border-slate-700 backdrop-blur-md p-2 shadow-2xl rounded-sm animate-in fade-in slide-in-from-top-2 duration-200">
                {styles.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onRenderConfigChange({...renderConfig, style: s.id});
                      setIsStyleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${renderConfig.style === s.id ? 'text-yellow-500 bg-yellow-900/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    {s.label}
                  </button>
                ))}
                
                {renderConfig.style === 'pixel' && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50 px-2 pb-1">
                     <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                       <span>Pixel Size</span>
                       <span>{renderConfig.pixelSize}px</span>
                     </div>
                     <input 
                       type="range" 
                       min="2" 
                       max="24" 
                       step="1"
                       value={renderConfig.pixelSize}
                       onChange={(e) => onRenderConfigChange({...renderConfig, pixelSize: Number(e.target.value)})}
                       className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                     />
                  </div>
                )}
             </div>
          )}
        </div>
        
        {/* Settings (Top Right) */}
        <div className="relative">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`w-10 h-10 rounded-full border bg-slate-900/50 backdrop-blur-sm flex items-center justify-center transition-all ${isSettingsOpen ? 'border-yellow-600/50 text-yellow-500' : 'border-slate-700 text-slate-400 hover:text-yellow-500 hover:border-yellow-600/50'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </button>

          {/* Settings Dropdown */}
          {isSettingsOpen && (
            <div className="absolute top-12 right-0 w-64 bg-slate-900/90 border border-slate-700 backdrop-blur-md p-5 shadow-2xl rounded-sm flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200">
               <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                 <span className="font-display text-xs uppercase tracking-widest text-slate-400">Lighting</span>
               </div>
               
               {/* Intensity */}
               <div className="flex flex-col gap-2">
                 <div className="flex justify-between text-xs text-slate-500 uppercase tracking-wider">
                   <span>Intensity</span>
                   <span>{Math.round(lightingConfig.intensity)}%</span>
                 </div>
                 <input 
                   type="range" 
                   min="0" 
                   max="100" 
                   value={lightingConfig.intensity}
                   onChange={(e) => onLightingChange({...lightingConfig, intensity: Number(e.target.value)})}
                   className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                 />
               </div>

               {/* Light Count */}
               <div className="flex flex-col gap-2">
                 <div className="flex justify-between text-xs text-slate-500 uppercase tracking-wider">
                   <span>Sources</span>
                   <span>{lightingConfig.count}</span>
                 </div>
                 <input 
                   type="range" 
                   min="1" 
                   max="3" 
                   step="1"
                   value={lightingConfig.count}
                   onChange={(e) => onLightingChange({...lightingConfig, count: Number(e.target.value)})}
                   className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-600"
                 />
               </div>

               {/* Colors */}
               <div className="flex flex-col gap-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Colors</div>
                  <div className="flex gap-2">
                    {Array.from({length: 3}).map((_, i) => (
                      <div key={i} className={`relative group w-8 h-8 rounded-full border border-slate-600 overflow-hidden ${i >= lightingConfig.count ? 'opacity-20 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-yellow-500/50'}`}>
                        <input 
                          type="color" 
                          value={lightingConfig.colors[i]}
                          disabled={i >= lightingConfig.count}
                          onChange={(e) => handleLightColorChange(i, e.target.value)}
                          className="absolute inset-[-50%] w-[200%] h-[200%] p-0 border-0 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Control Cluster */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-6 pointer-events-auto">
        
        {/* Bottom Left: Controls */}
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div className="flex items-center gap-3">
             {/* File Input */}
             <label className={`
               px-4 py-2 border border-slate-700 bg-slate-900/60 backdrop-blur-md text-xs tracking-wider uppercase font-display cursor-pointer transition-all
               ${isRecording ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500 hover:bg-slate-800'}
             `}>
               <span className="text-slate-400">Load .glb</span>
               <input 
                 type="file" 
                 accept=".glb" 
                 className="hidden" 
                 disabled={isRecording}
                 onChange={(e) => {
                   if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
                   e.target.value = '';
                 }} 
               />
             </label>

             <button 
               onClick={onLoadSample}
               disabled={isRecording}
               className={`
                 px-4 py-2 border border-slate-700 bg-slate-900/60 backdrop-blur-md text-xs tracking-wider uppercase font-display transition-all
                 ${isRecording ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500 hover:bg-slate-800 text-slate-400'}
               `}
             >
               Load Sample
             </button>
             
             <button 
                onClick={onToggleRotate}
                disabled={isRecording || !hasModel}
                className={`
                  w-10 h-9 flex items-center justify-center border border-slate-700 bg-slate-900/60 backdrop-blur-md transition-all
                  ${autoRotate ? 'text-yellow-500 border-yellow-900/50' : 'text-slate-500'}
                  ${(isRecording || !hasModel) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-800'}
                `}
                title="Toggle Auto-Rotate"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
             </button>
          </div>
        </div>

        {/* Center Status */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center pointer-events-none md:bottom-12">
            <div className="font-display text-xs tracking-[0.2em] text-slate-500 uppercase">Status</div>
            <div className="text-sm text-yellow-600/90 font-light mt-1 min-w-[200px] flex flex-col items-center">
              <span>{status}</span>
              {statusDetail && <span className="text-slate-500 text-xs normal-case mt-1 max-w-xs">{statusDetail}</span>}
              {isRecording && recordingProgress && (
                <div className="mt-2 text-xs font-mono text-slate-400">
                  Frame {recordingProgress.current}/{recordingProgress.total}
                </div>
              )}
            </div>
        </div>

        {/* Bottom Right: Action */}
        <div className="w-full md:w-auto flex flex-col items-end gap-2">
          {/* Format Toggle */}
          <div className="flex gap-2 text-[10px] tracking-widest font-display uppercase">
            <button 
              onClick={() => onSetExportFormat('webm')}
              disabled={isRecording}
              className={`pb-0.5 border-b transition-colors ${exportFormat === 'webm' ? 'text-yellow-500 border-yellow-500/50' : 'text-slate-600 border-transparent hover:text-slate-400'}`}
            >
              Video
            </button>
            <span className="text-slate-700">/</span>
            <button 
              onClick={() => onSetExportFormat('png')}
              disabled={isRecording}
              className={`pb-0.5 border-b transition-colors ${exportFormat === 'png' ? 'text-yellow-500 border-yellow-500/50' : 'text-slate-600 border-transparent hover:text-slate-400'}`}
            >
              Sequence
            </button>
          </div>

          <button
            onClick={onStartRecord}
            disabled={!hasModel || isRecording}
            className={`
              relative group overflow-hidden px-8 py-3 border bg-slate-900/80 backdrop-blur-md transition-all duration-500
              ${(!hasModel || isRecording) ? 'border-slate-800 opacity-50 cursor-not-allowed' : 'border-yellow-900/40 hover:border-yellow-600/60 cursor-pointer'}
            `}
          >
            <div className={`absolute inset-0 bg-yellow-900/10 translate-y-full transition-transform duration-300 ${(!hasModel || isRecording) ? '' : 'group-hover:translate-y-0'}`}></div>
            <div className="relative flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-yellow-600'}`}></div>
              <span className={`font-display text-sm tracking-widest uppercase ${(!hasModel || isRecording) ? 'text-slate-600' : 'text-slate-200'}`}>
                {isRecording 
                  ? 'Recording...' 
                  : (exportFormat === 'webm' ? 'Record 4s @ 6fps' : 'Capture 24 PNGs')
                }
              </span>
            </div>
          </button>
        </div>
      </div>
      
      {/* Decorative Lines */}
      <div className="absolute bottom-24 left-12 right-12 h-px bg-gradient-to-r from-transparent via-slate-700/30 to-transparent pointer-events-none hidden md:block"></div>
    </div>
  );
};

export default UIOverlay;