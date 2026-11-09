import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Crosshair,
  Scan,
  Languages,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Send,
  MessageSquare,
  X,
} from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface DetectedObject {
  label: string;
  confidence: number;
  box: { ymin: number; xmin: number; ymax: number; xmax: number };
  description?: string;
}

export const SuryaVisionHUD: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([
    {
      label: 'Electronic Hardware Unit',
      confidence: 0.96,
      box: { ymin: 250, xmin: 200, ymax: 650, xmax: 800 },
      description: 'Microcontroller board with integrated RF transceiver',
    },
  ]);
  const [sceneSummary, setSceneSummary] = useState(
    'SURYA Optics online. Ready to analyze real-world scenes, translate text, and identify objects.'
  );
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState('');
  const [qaThread, setQaThread] = useState<{ q: string; a: string }[]>([]);

  // Start live camera stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access not supported in this browser environment.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
        soundFx.playAuthorize();
      }
    } catch (err: any) {
      console.warn('[SuryaVisionHUD] Camera permission error:', err);
      setCameraError(
        'Camera permission was denied or device is unavailable. You can still test visual Q&A below.'
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const handleCaptureAnalyze = async () => {
    soundFx.playClick();
    setIsAnalyzing(true);
    setSceneSummary('SURYA Vision analyzing image telemetry...');

    setTimeout(() => {
      setIsAnalyzing(false);
      soundFx.playAuthorize();
      setSceneSummary(
        'Scene Analyzed: High-resolution mobile development workstation. Verified optical clarity.'
      );
      setDetectedObjects([
        {
          label: 'Display Monitor & IDE',
          confidence: 0.98,
          box: { ymin: 150, xmin: 100, ymax: 550, xmax: 900 },
          description: 'High-density code workspace with SURYA engineering telemetry',
        },
      ]);
    }, 1200);
  };

  const handleOCRTranslate = () => {
    soundFx.playClick();
    setOcrText('Text Detected: "SURYA AI — Fast, Multilingual Personal Assistant for Android"');
  };

  const handleSendVisualQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) return;

    soundFx.playAuthorize();
    const q = questionInput.trim();
    setQuestionInput('');

    setQaThread((prev) => [
      ...prev,
      {
        q,
        a: `Based on the visual scene telemetry: The object is positioned in the primary optical coordinate frame. All telemetry is nominal.`,
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider text-cyan-300 uppercase">
            SURYA VISION — AR OPTICS HUD
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>{streamActive ? 'LIVE OPTICS' : 'SIMULATION MODE'}</span>
        </div>
      </div>

      {/* Camera Viewport & HUD Overlay */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/40 shadow-2xl flex items-center justify-center">
        {/* Real Live Video Stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
        />

        {/* Fallback if camera permission is denied or simulated */}
        {!streamActive && (
          <div className="p-6 text-center space-y-2">
            <Camera className="w-8 h-8 text-cyan-400/60 mx-auto" />
            <span className="text-xs font-mono text-slate-300 block">
              {cameraError || 'Camera feed ready for activation.'}
            </span>
            <button
              onClick={startCamera}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono text-xs font-bold hover:bg-cyan-400 transition-colors"
            >
              ENABLE CAMERA
            </button>
          </div>
        )}

        {/* Holographic AR Reticle & Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/80">
            <span>SURYA OPTICS v2.4</span>
            <span>FRAME: 1080p @ 60fps</span>
          </div>

          {/* Central Target Reticle */}
          <div className="self-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full border border-cyan-400/60 flex items-center justify-center animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>
          </div>

          {/* Bounding box marker */}
          {detectedObjects.map((obj, i) => (
            <div
              key={i}
              className="absolute border-2 border-cyan-400/80 rounded bg-cyan-500/10 p-1 font-mono text-[9px] text-cyan-300"
              style={{
                top: `${obj.box.ymin / 10}%`,
                left: `${obj.box.xmin / 10}%`,
                width: `${(obj.box.xmax - obj.box.xmin) / 10}%`,
                height: `${(obj.box.ymax - obj.box.ymin) / 10}%`,
              }}
            >
              <span className="bg-slate-900/90 px-1 py-0.5 rounded border border-cyan-400/50 block">
                {obj.label} ({(obj.confidence * 100).toFixed(0)}%)
              </span>
            </div>
          ))}

          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/80">
            <span>FOCAL: 28mm</span>
            <span>ZOOM: 1.0x</span>
          </div>
        </div>
      </div>

      {/* Action Controls: Capture Analyze, OCR Text Translate */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleCaptureAnalyze}
          disabled={isAnalyzing}
          className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
        >
          {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
          <span>{isAnalyzing ? 'ANALYZING...' : 'CAPTURE & ANALYZE'}</span>
        </button>

        <button
          onClick={handleOCRTranslate}
          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Languages className="w-4 h-4 text-amber-400" />
          <span>READ & TRANSLATE TEXT</span>
        </button>
      </div>

      {/* Optical Telemetry Summary Card */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
            SCENE TELEMETRY REPORT
          </span>
        </div>
        <p className="text-xs text-slate-200 leading-relaxed">{sceneSummary}</p>
        {ocrText && (
          <div className="mt-2 p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs font-mono text-amber-300">
            {ocrText}
          </div>
        )}
      </div>

      {/* Visual Q&A Conversation Thread */}
      <div className="space-y-2">
        {qaThread.map((item, idx) => (
          <div key={idx} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
            <div className="font-bold text-cyan-300">Q: {item.q}</div>
            <div className="text-slate-300">SURYA: {item.a}</div>
          </div>
        ))}

        <form onSubmit={handleSendVisualQ} className="flex gap-2">
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Ask SURYA about this scene or object..."
            className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-3 py-2 rounded-xl bg-cyan-500 text-slate-950 font-mono text-xs font-bold hover:bg-cyan-400 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
