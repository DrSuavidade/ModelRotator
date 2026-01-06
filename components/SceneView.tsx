import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import JSZip from 'jszip';
import { SceneRef, AppStatus, ExportFormat, LightingConfig, RenderConfig } from '../types';

interface SceneViewProps {
  onStatusChange: (status: AppStatus, detail?: string) => void;
  onProgress: (current: number, total: number) => void;
  lightingConfig: LightingConfig;
  renderConfig: RenderConfig;
}

const SceneView = forwardRef<SceneRef, SceneViewProps>(({ onStatusChange, onProgress, lightingConfig, renderConfig }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Three.js instances refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const turntableRef = useRef<THREE.Group | null>(null);
  const innerGroupRef = useRef<THREE.Group | null>(null);
  const rafRef = useRef<number | null>(null);

  // Lights Refs
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const light1Ref = useRef<THREE.DirectionalLight | null>(null); // Key
  const light2Ref = useRef<THREE.SpotLight | null>(null); // Rim
  const light3Ref = useRef<THREE.DirectionalLight | null>(null); // Fill

  // Materials Cache for Toon Swap
  const originalMaterialsCache = useRef<Map<string, THREE.Material | THREE.Material[]>>(new Map());
  const gradientTextureRef = useRef<THREE.Texture | null>(null);
  
  // State refs for logic that doesn't trigger re-renders but needs persistence
  const isAutoRotatingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const renderConfigRef = useRef(renderConfig); // Ref to access latest config in loops/events

  // Update ref when prop changes
  useEffect(() => {
    renderConfigRef.current = renderConfig;
  }, [renderConfig]);
  
  // Initialize Three.js
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // SCENE
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02); // Matches bg-slate-900
    sceneRef.current = scene;

    // CAMERA
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.5, 4);
    cameraRef.current = camera;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true, 
      antialias: true, // Will be disabled for pixel style via pixelRatio
      preserveDrawingBuffer: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    // CONTROLS
    const controls = new OrbitControls(camera, canvasRef.current);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.enableRotate = false; 
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controlsRef.current = controls;

    // LIGHTING SETUP
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const light1 = new THREE.DirectionalLight(0xffffff, 0);
    light1.position.set(2, 5, 2);
    scene.add(light1);
    light1Ref.current = light1;

    const light2 = new THREE.SpotLight(0xffffff, 0);
    light2.position.set(-2, 3, -5);
    light2.lookAt(0, 0, 0);
    scene.add(light2);
    light2Ref.current = light2;

    const light3 = new THREE.DirectionalLight(0xffffff, 0);
    light3.position.set(-5, 2, 2);
    scene.add(light3);
    light3Ref.current = light3;

    // GROUPS
    const turntable = new THREE.Group();
    scene.add(turntable);
    turntableRef.current = turntable;

    const innerGroup = new THREE.Group();
    turntable.add(innerGroup);
    innerGroupRef.current = innerGroup;

    // PREPARE TOON GRADIENT
    // 3 tones: Shadow, Mid, Highlight
    const colors = new Uint8Array([0, 0, 0, 128, 128, 128, 255, 255, 255]);
    const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.needsUpdate = true;
    gradientTextureRef.current = gradientMap;

    // ANIMATION LOOP
    const animate = () => {
      if (isRecordingRef.current) return;

      rafRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) controlsRef.current.update();

      if (isAutoRotatingRef.current && turntableRef.current) {
        turntableRef.current.rotation.y += 0.005;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // CUSTOM RESIZE HANDLER FOR PIXELATION
    const updateSize = () => {
       if (!cameraRef.current || !rendererRef.current || !canvasRef.current) return;
       
       const { style, pixelSize } = renderConfigRef.current;
       const width = window.innerWidth;
       const height = window.innerHeight;

       // Fix camera aspect
       cameraRef.current.aspect = width / height;
       cameraRef.current.updateProjectionMatrix();

       if (style === 'pixel') {
         // Low res rendering
         const divisor = Math.max(1, pixelSize);
         rendererRef.current.setSize(width / divisor, height / divisor, false); // false = do not update canvas style width/height
         rendererRef.current.domElement.style.width = width + 'px';
         rendererRef.current.domElement.style.height = height + 'px';
         rendererRef.current.domElement.style.imageRendering = 'pixelated';
         // Disable AA for crisp pixels
         rendererRef.current.setPixelRatio(1);
       } else {
         // Standard high res
         rendererRef.current.setSize(width, height, true);
         rendererRef.current.domElement.style.imageRendering = 'auto';
         rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
       }
    };

    window.addEventListener('resize', updateSize);
    // Store updateSize on the ref so we can call it from the effect
    (rendererRef.current as any).updateSize = updateSize;

    // INPUT HANDLERS
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      canvasRef.current?.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !innerGroupRef.current || !cameraRef.current) return;
      
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      const speed = 0.005;
      innerGroupRef.current.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), dx * speed);
      const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraRef.current.quaternion);
      innerGroupRef.current.rotateOnWorldAxis(camRight, dy * speed);
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDraggingRef.current = false;
      canvasRef.current?.releasePointerCapture(e.pointerId);
    };

    canvasRef.current.addEventListener('pointerdown', handlePointerDown);
    canvasRef.current.addEventListener('pointermove', handlePointerMove);
    canvasRef.current.addEventListener('pointerup', handlePointerUp);
    canvasRef.current.addEventListener('pointerleave', handlePointerUp);

    return () => {
      window.removeEventListener('resize', updateSize);
      canvasRef.current?.removeEventListener('pointerdown', handlePointerDown);
      canvasRef.current?.removeEventListener('pointermove', handlePointerMove);
      canvasRef.current?.removeEventListener('pointerup', handlePointerUp);
      canvasRef.current?.removeEventListener('pointerleave', handlePointerUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      gradientMap.dispose();
    };
  }, []);

  // HANDLE RENDER STYLE CHANGES (Material Swap & Resize)
  useEffect(() => {
    if (!rendererRef.current || !innerGroupRef.current) return;

    // 1. Handle Pixel/Resizing
    if ((rendererRef.current as any).updateSize) {
      (rendererRef.current as any).updateSize();
    }

    // 2. Handle Material Swap
    const traverseAndSwap = () => {
       innerGroupRef.current?.traverse((child) => {
         if (child instanceof THREE.Mesh) {
            // Cache original if not exists
            if (!originalMaterialsCache.current.has(child.uuid)) {
              originalMaterialsCache.current.set(child.uuid, child.material);
            }

            const originalMat = originalMaterialsCache.current.get(child.uuid);

            if (renderConfig.style === 'toon') {
               // Create Toon Material if current is not toon
               if (!(child.material instanceof THREE.MeshToonMaterial)) {
                 const oldMat = Array.isArray(originalMat) ? originalMat[0] : originalMat;
                 
                 const toonMat = new THREE.MeshToonMaterial({
                   gradientMap: gradientTextureRef.current,
                   color: (oldMat as any).color || 0xffffff,
                   map: (oldMat as any).map || null,
                   normalMap: (oldMat as any).normalMap || null,
                   transparent: oldMat.transparent,
                   opacity: oldMat.opacity,
                   side: oldMat.side
                 });
                 child.material = toonMat;
               }
            } else {
               // Restore Original
               child.material = originalMat;
            }
         }
       });
    };

    traverseAndSwap();

  }, [renderConfig]);


  // Sync Lighting with Props
  useEffect(() => {
    if (!ambientLightRef.current || !light1Ref.current || !light2Ref.current || !light3Ref.current) return;

    const { count, intensity, colors } = lightingConfig;
    const m = intensity / 20; 

    ambientLightRef.current.intensity = 0.2 + (m * 0.1);

    if (count >= 1) {
      light1Ref.current.visible = true;
      light1Ref.current.intensity = 1.5 * m;
      light1Ref.current.color.set(colors[0]);
    } else {
      light1Ref.current.visible = false;
    }

    if (count >= 2) {
      light2Ref.current.visible = true;
      light2Ref.current.intensity = 2.0 * m;
      light2Ref.current.color.set(colors[1]);
    } else {
      light2Ref.current.visible = false;
    }

    if (count >= 3) {
      light3Ref.current.visible = true;
      light3Ref.current.intensity = 1.0 * m;
      light3Ref.current.color.set(colors[2]);
    } else {
      light3Ref.current.visible = false;
    }

  }, [lightingConfig]);

  // API exposed to parent
  useImperativeHandle(ref, () => ({
    loadModel: async (src: string | File) => {
      if (!sceneRef.current || !innerGroupRef.current || !cameraRef.current || !controlsRef.current) return;

      onStatusChange(AppStatus.LOADING);
      
      const loader = new GLTFLoader();
      let url = '';
      
      if (src instanceof File) {
        url = URL.createObjectURL(src);
      } else {
        url = src;
      }

      try {
        const gltf = await loader.loadAsync(url);
        
        // Reset rotation on new load
        innerGroupRef.current.rotation.set(0, 0, 0);
        originalMaterialsCache.current.clear(); // Clear cache for new model

        // Cleanup previous model
        const innerGroup = innerGroupRef.current;
        while (innerGroup.children.length > 0) {
          const child = innerGroup.children[0];
          // Dispose geometries/materials
          if (child instanceof THREE.Mesh) {
             child.geometry.dispose();
             if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
             else child.material.dispose();
          }
          innerGroup.remove(child);
        }
        
        const model = gltf.scene;
        
        // Centering Logic
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        model.position.x += (model.position.x - center.x);
        model.position.y += (model.position.y - center.y);
        model.position.z += (model.position.z - center.z);
        
        const box2 = new THREE.Box3().setFromObject(model);
        const minY = box2.min.y;
        model.position.y -= minY;

        innerGroup.add(model);

        // Pre-cache original materials immediately
        model.traverse(child => {
          if (child instanceof THREE.Mesh) {
             originalMaterialsCache.current.set(child.uuid, child.material);
          }
        });
        
        // Apply Toon material if active
        if (renderConfigRef.current.style === 'toon') {
           model.traverse(child => {
             if (child instanceof THREE.Mesh) {
                const originalMat = originalMaterialsCache.current.get(child.uuid);
                const oldMat = Array.isArray(originalMat) ? originalMat[0] : originalMat;
                const toonMat = new THREE.MeshToonMaterial({
                   gradientMap: gradientTextureRef.current,
                   color: (oldMat as any).color || 0xffffff,
                   map: (oldMat as any).map || null,
                   normalMap: (oldMat as any).normalMap || null,
                   transparent: oldMat.transparent,
                   opacity: oldMat.opacity,
                   side: oldMat.side
                 });
                 child.material = toonMat;
             }
           });
        }

        // Adjust Camera
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 2.0; 
        
        cameraRef.current.position.set(0, size.y / 2, cameraZ);
        controlsRef.current.target.set(0, size.y / 2, 0);
        controlsRef.current.update();

        if (src instanceof File) URL.revokeObjectURL(url);
        
        onStatusChange(AppStatus.LOADED);
        isAutoRotatingRef.current = true;
      } catch (error) {
        console.error(error);
        onStatusChange(AppStatus.ERROR, "Failed to load model");
      }
    },

    toggleAutoRotate: (active: boolean) => {
      isAutoRotatingRef.current = active;
    },

    resetCamera: () => {
      if (controlsRef.current) controlsRef.current.reset();
      if (innerGroupRef.current) innerGroupRef.current.rotation.set(0, 0, 0);
    },

    startRecording: async (format: ExportFormat) => {
      if (!canvasRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current || !turntableRef.current) return;
      
      isRecordingRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      
      onStatusChange(AppStatus.RECORDING);

      // --- SAVE ORIGINAL STATE ---
      const originalSize = new THREE.Vector2();
      rendererRef.current.getSize(originalSize);
      const originalPixelRatio = rendererRef.current.getPixelRatio();
      const originalAspect = cameraRef.current.aspect;
      const originalCamPos = cameraRef.current.position.clone();
      const originalControlsTarget = controlsRef.current!.target.clone();

      // --- CONFIGURE FOR RECORDING (1080x1080) ---
      const targetSize = 1080;
      const { style, pixelSize } = renderConfigRef.current;
      
      // Determine render size (for pixel effect we render small then scale up)
      let renderW = targetSize;
      let renderH = targetSize;
      if (style === 'pixel') {
          renderW = Math.max(2, Math.floor(targetSize / pixelSize));
          renderH = Math.max(2, Math.floor(targetSize / pixelSize));
      }

      // Configure Renderer for Output
      rendererRef.current.setPixelRatio(1);
      rendererRef.current.setSize(renderW, renderH, false); // false = keep canvas CSS size
      
      // Configure Camera for Square Aspect
      cameraRef.current.aspect = 1;
      cameraRef.current.updateProjectionMatrix();

      // Auto-Frame Object for Square Aspect
      if (innerGroupRef.current.children.length > 0) {
        const box = new THREE.Box3().setFromObject(innerGroupRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        // 1.35 multiplier for tighter but safe "prestige" framing
        const cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.35;
        
        // Maintain viewing angle direction but adjust distance
        const direction = new THREE.Vector3().subVectors(originalCamPos, originalControlsTarget).normalize();
        const newPos = center.clone().add(direction.multiplyScalar(cameraDist));
        
        cameraRef.current.position.copy(newPos);
        cameraRef.current.lookAt(center);
        controlsRef.current!.target.copy(center);
        controlsRef.current!.update();
      }

      // --- PREPARE COMPOSITION ---
      // We need a shadow canvas to draw the frame into.
      // If Pixel mode: draw renderW/H -> 1080x1080 with nearest neighbor
      // If Standard mode: draw 1080x1080 -> 1080x1080
      const shadowCanvas = document.createElement('canvas');
      shadowCanvas.width = targetSize;
      shadowCanvas.height = targetSize;
      const ctx = shadowCanvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false; // Critical for pixel art look scaling

      // --- RECORDING VARIABLES ---
      const fps = 6;
      const totalFrames = 24; 
      const intervalMs = 1000 / fps;
      let frameIndex = 0;

      let mediaRecorder: MediaRecorder | null = null;
      let chunks: Blob[] = [];
      let stream: MediaStream | null = null;
      let pngBlobs: Blob[] = [];

      const cleanupAndRestore = () => {
         // Restore Renderer
         if (rendererRef.current) {
            rendererRef.current.setSize(originalSize.x, originalSize.y, true); // true = restore canvas style
            rendererRef.current.setPixelRatio(originalPixelRatio);
            // Re-apply style-based resizing logic if needed (Pixel mode resizing for UI)
            if ((rendererRef.current as any).updateSize) {
               (rendererRef.current as any).updateSize();
            }
         }
         
         // Restore Camera
         if (cameraRef.current) {
             cameraRef.current.aspect = originalAspect;
             cameraRef.current.position.copy(originalCamPos);
             cameraRef.current.updateProjectionMatrix();
         }
         
         // Restore Controls
         if (controlsRef.current) {
            controlsRef.current.target.copy(originalControlsTarget);
            controlsRef.current.update();
         }
         
         // Restart Loop
         const animate = () => {
             if (isRecordingRef.current) return;
             rafRef.current = requestAnimationFrame(animate);
             if (controlsRef.current) controlsRef.current.update();
             if (isAutoRotatingRef.current && turntableRef.current) turntableRef.current.rotation.y += 0.005;
             if (rendererRef.current && sceneRef.current && cameraRef.current) rendererRef.current.render(sceneRef.current, cameraRef.current);
        };
        animate();
      };

      if (format === 'webm') {
        stream = shadowCanvas.captureStream(fps); 
        const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        let selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
        
        if (!selectedMime) {
          onStatusChange(AppStatus.ERROR, "MediaRecorder not supported");
          isRecordingRef.current = false;
          cleanupAndRestore();
          return;
        }

        mediaRecorder = new MediaRecorder(stream, { 
          mimeType: selectedMime,
          videoBitsPerSecond: 5000000 // Higher bitrate for 1080p
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: selectedMime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'turntable-1080p.webm';
          a.click();
          URL.revokeObjectURL(url);
          
          onStatusChange(AppStatus.DONE);
          isRecordingRef.current = false;
          cleanupAndRestore();
        };

        mediaRecorder.start();
      }

      const finishRecording = async () => {
        if (format === 'webm' && mediaRecorder) {
          mediaRecorder.stop();
        } else if (format === 'png') {
          onStatusChange(AppStatus.PROCESSING, "Zipping PNGs...");
          const zip = new JSZip();
          pngBlobs.forEach((blob, i) => {
            zip.file(`frame_${String(i).padStart(3, '0')}.png`, blob);
          });
          
          try {
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'turntable-sequence-1080p.zip';
            a.click();
            URL.revokeObjectURL(url);
            onStatusChange(AppStatus.DONE);
          } catch (e) {
            console.error(e);
            onStatusChange(AppStatus.ERROR, "Failed to zip files");
          }
          
          isRecordingRef.current = false;
          cleanupAndRestore();
        }
      };

      const recordStep = async () => {
        if (frameIndex >= totalFrames) {
          await finishRecording();
          return;
        }

        onProgress(frameIndex + 1, totalFrames);

        const angle = (frameIndex / totalFrames) * Math.PI * 2;
        turntableRef.current!.rotation.y = angle;

        // Render scene
        rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
        
        // Draw result to shadow canvas (handles scaling for pixel art)
        ctx.clearRect(0, 0, targetSize, targetSize);
        ctx.drawImage(rendererRef.current!.domElement, 0, 0, renderW, renderH, 0, 0, targetSize, targetSize);

        if (format === 'webm') {
           // Tick the stream
           // @ts-ignore
           if (stream && stream.getVideoTracks()[0].requestFrame) {
                // @ts-ignore
                stream.getVideoTracks()[0].requestFrame(); 
           }
        } else if (format === 'png') {
          const blob = await new Promise<Blob | null>(resolve => shadowCanvas.toBlob(resolve, 'image/png'));
          if (blob) pngBlobs.push(blob);
        }

        frameIndex++;
        setTimeout(recordStep, intervalMs); 
      };

      recordStep();
    }
  }));

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      <canvas ref={canvasRef} className="block w-full h-full outline-none" />
    </div>
  );
});

export default SceneView;