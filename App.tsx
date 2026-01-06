import React, { useState, useRef, useCallback } from 'react';
import SceneView from './components/SceneView';
import UIOverlay from './components/UIOverlay';
import { AppStatus, SceneRef, ExportFormat, LightingConfig, RenderConfig } from './types';

function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [statusDetail, setStatusDetail] = useState<string>("");
  const [hasModel, setHasModel] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState<{current: number, total: number} | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('webm');
  
  // Cinematic Defaults: Warm Key, Cool Rim, Soft White Fill
  const [lightingConfig, setLightingConfig] = useState<LightingConfig>({
    count: 2, 
    intensity: 50,
    colors: ['#fff0dd', '#4aa8ff', '#ffffff']
  });

  const [renderConfig, setRenderConfig] = useState<RenderConfig>({
    style: 'standard',
    pixelSize: 6
  });
  
  const sceneRef = useRef<SceneRef>(null);

  const handleStatusChange = useCallback((newStatus: AppStatus, detail?: string) => {
    setStatus(newStatus);
    if (detail) setStatusDetail(detail);
    else setStatusDetail("");

    if (newStatus === AppStatus.RECORDING) {
      // Keep UI locked
    } else if (newStatus === AppStatus.DONE) {
       setRecordingProgress(null);
    }
  }, []);

  const handleLoadSample = () => {
    if (sceneRef.current) {
      // Assuming vite public folder structure for /sample.glb
      sceneRef.current.loadModel('/sample.glb').then(() => {
        setHasModel(true);
        setAutoRotate(true);
      });
    }
  };

  const handleFileSelect = (file: File) => {
    if (sceneRef.current) {
      sceneRef.current.loadModel(file).then(() => {
        setHasModel(true);
        setAutoRotate(true);
      });
    }
  };

  const handleToggleRotate = () => {
    const nextState = !autoRotate;
    setAutoRotate(nextState);
    if (sceneRef.current) {
      sceneRef.current.toggleAutoRotate(nextState);
    }
  };

  const handleStartRecord = () => {
    if (sceneRef.current) {
      sceneRef.current.startRecording(exportFormat);
    }
  };

  const handleProgress = (current: number, total: number) => {
    setRecordingProgress({ current, total });
  };

  const isRecording = status === AppStatus.RECORDING;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 text-white">
      {/* Vignette Overlay */}
      <div className="absolute inset-0 z-20 vignette pointer-events-none"></div>
      
      {/* 3D Scene */}
      <SceneView 
        ref={sceneRef} 
        onStatusChange={handleStatusChange}
        onProgress={handleProgress}
        lightingConfig={lightingConfig}
        renderConfig={renderConfig}
      />

      {/* UI Overlay */}
      <UIOverlay 
        status={status}
        statusDetail={statusDetail}
        isRecording={isRecording}
        recordingProgress={recordingProgress}
        onFileSelect={handleFileSelect}
        onLoadSample={handleLoadSample}
        onToggleRotate={handleToggleRotate}
        onStartRecord={handleStartRecord}
        autoRotate={autoRotate}
        hasModel={hasModel}
        exportFormat={exportFormat}
        onSetExportFormat={setExportFormat}
        lightingConfig={lightingConfig}
        onLightingChange={setLightingConfig}
        renderConfig={renderConfig}
        onRenderConfigChange={setRenderConfig}
      />
    </div>
  );
}

export default App;