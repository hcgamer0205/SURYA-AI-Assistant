import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Eye, ShieldCheck, Crosshair, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import { soundFx } from '../services/soundFx';

export const StandardOpticsHUD: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [telemetryResult, setTelemetryResult] = useState<string | null>(null);
  const [opticalSensors, setOpticalSensors] = useState({
    fps: 30,
    focalLength: '24mm eq.',
    exposure: '+0.0 EV',
    orientation: 'MOBILE_PORTRAIT',
    isoEstimate: '100',
  });

  // Initialize camera stream
  const startCamera = async () => {
    setCameraError(null);
    soundFx.playRadarSweep();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera MediaDevices API not available in this environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.warn('[StandardOptics] Camera stream error:', err);
      setCameraError(
        err.message || 'Camera permission denied or camera device unavailable on this device.'
      );
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Capture frame and send to Gemini Vision
  const captureAndAnalyze = async () => {
    soundFx.playRadarSweep();
    setIsAnalyzing(true);
    setTelemetryResult(null);

    let base64Image = '';

    if (streamActive && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        base64Image = canvas.toDataURL('image/jpeg', 0.85);
      }
    }

    // Fallback if camera stream is blocked (e.g. sandbox restriction)
    if (!base64Image) {
      // Create a simulated HUD optical calibration frame
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#070f1e';
        ctx.fillRect(0, 0, 400, 300);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 40, 320, 220);
        ctx.fillStyle = '#00f0ff';
        ctx.font = '16px monospace';
        ctx.fillText('SURYA OPTICS CALIBRATION TARGET', 60, 150);
        base64Image = canvas.toDataURL('image/jpeg', 0.85);
      }
    }

    try {
      const res = await apiService.analyzeOpticalScene(
        base64Image,
        'Analyze this view through SURYA Standard Optics HUD. Identify items, assess distance benignly, and generate clean structured telemetry.'
      );
      setTelemetryResult(res.telemetry);
      soundFx.playAuthorize();
    } catch (err: any) {
      setTelemetryResult(`Optical Analysis Error: ${err.message || 'Failed to inspect scene.'}`);
      soundFx.playAbort();
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* HUD Header Banner */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider text-cyan-400 uppercase">
            STANDARD OPTICS // AR HUD
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>BENIGN TELEMETRY ONLY</span>
        </div>
      </div>

      {/* Camera / AR Viewport Container */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/30 shadow-lg shadow-cyan-950/20 flex items-center justify-center">
        {/* Hidden Canvas for Frame Grab */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            streamActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Fallback Viewport when Camera is Inactive or Denied */}
        {!streamActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-cyber-radial">
            <Crosshair className="w-12 h-12 text-cyan-400/40 mb-3 animate-pulse" />
            <p className="text-xs font-mono text-cyan-300 font-semibold mb-1">
              OPTICAL SENSOR STANDBY
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mb-4">
              {cameraError || 'Activate camera feed to enable live holographic scene inspection.'}
            </p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-mono text-xs font-semibold flex items-center gap-2 hover:bg-cyan-500/30 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>ENABLE SENSOR FEED</span>
            </button>
          </div>
        )}

        {/* Holographic AR HUD Overlays (Crosshairs, Reticles, Corner Brackets) */}
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
          {/* Corner Brackets */}
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 border-t-2 border-l-2 border-cyan-400/70" />
            <div className="text-[10px] font-mono text-cyan-300/80 bg-slate-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              FOV: {opticalSensors.focalLength} · {opticalSensors.fps} FPS
            </div>
            <div className="w-8 h-8 border-t-2 border-r-2 border-cyan-400/70" />
          </div>

          {/* Center Reticle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              {/* Outer Reticle Ring */}
              <div className="absolute inset-0 rounded-full border border-cyan-400/40 border-dashed animate-spin-slow" />
              {/* Inner Crosshair Lines */}
              <div className="w-16 h-0.5 bg-cyan-400/60" />
              <div className="h-16 w-0.5 bg-cyan-400/60 absolute" />
              {/* Central Target Point */}
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-sm shadow-cyan-400" />
            </div>
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="flex justify-between items-end">
            <div className="w-8 h-8 border-b-2 border-l-2 border-cyan-400/70" />
            <div className="text-[10px] font-mono text-cyan-300/80 bg-slate-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              EXP: {opticalSensors.exposure} · ISO: {opticalSensors.isoEstimate}
            </div>
            <div className="w-8 h-8 border-b-2 border-r-2 border-cyan-400/70" />
          </div>
        </div>

        {/* Scan Line Animation when Analyzing */}
        {isAnalyzing && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400 animate-scan-line pointer-events-none" />
        )}
      </div>

      {/* Scan Control Action Strip */}
      <div className="flex items-center gap-3">
        <button
          onClick={captureAndAnalyze}
          disabled={isAnalyzing}
          className={`flex-1 min-h-[48px] px-4 py-3 rounded-xl font-mono text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${
            isAnalyzing
              ? 'bg-cyan-950/60 border border-cyan-400/50 text-cyan-300'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
          }`}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>PROCESSING OPTICAL FIELD...</span>
            </>
          ) : (
            <>
              <Crosshair className="w-4 h-4" />
              <span>SCAN TARGET FIELD WITH GEMINI</span>
            </>
          )}
        </button>

        {streamActive && (
          <button
            onClick={stopCamera}
            className="min-h-[48px] px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono"
            title="Pause Camera"
          >
            STANDBY
          </button>
        )}
      </div>

      {/* Optical Telemetry Analysis Results Card */}
      {telemetryResult && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
              OPTICAL SCENE TELEMETRY REPORT
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {new Date().toLocaleTimeString()}
            </span>
          </div>
          <div className="text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto pr-2">
            {telemetryResult}
          </div>
        </div>
      )}
    </div>
  );
};
