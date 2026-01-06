export enum AppStatus {
  IDLE = "No model loaded",
  LOADING = "Loading...",
  LOADED = "Loaded",
  RECORDING = "Recording...",
  PROCESSING = "Processing...",
  DONE = "Done — downloading",
  ERROR = "Error"
}

export type ExportFormat = 'webm' | 'png';

export interface LightingConfig {
  count: number;
  intensity: number;
  colors: [string, string, string];
}

export type RenderStyle = 'standard' | 'toon' | 'pixel';

export interface RenderConfig {
  style: RenderStyle;
  pixelSize: number; // For pixel style, divisor of resolution
}

export interface SceneRef {
  loadModel: (src: string | File) => Promise<void>;
  startRecording: (format: ExportFormat) => void;
  toggleAutoRotate: (active: boolean) => void;
  resetCamera: () => void;
}

export interface ModelSource {
  type: 'file' | 'url';
  value: File | string;
}