import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Crosshair,
  Scan,
  Languages,
  Sparkles,
  RefreshCw,
  Send,
  Upload,
  Mic,
  FileText,
  QrCode,
  Volume2,
} from 'lucide-react';
import { soundFx } from '../services/soundFx';
import { apiService } from '../services/apiService';
import { voiceService } from '../services/voiceService';
import { VisionAnalysisResult, VisionEntity } from '../types/surya';

type VisionMode = 'general' | 'ocr' | 'translate' | 'document' | 'qr';

export const SuryaVisionHUD: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [visionMode, setVisionMode] = useState<VisionMode>('general');
  const [targetLanguage, setTargetLanguage] = useState('Hindi');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [detectedEntities, setDetectedEntities] = useState<VisionEntity[]>([]);
  const [sceneSummary, setSceneSummary] = useState(
    'SURYA Optics ready. Enable camera or upload an image frame to perform real scene understanding, OCR translation, document scanning, or QR inspection.'
  );
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrTranslation, setOcrTranslation] = useState<string>('');
  const [qrPayloads, setQrPayloads] = useState<string[]>([]);
  const [documentFields, setDocumentFields] = useState<{ label: string; value: string }[]>([]);
  const [hudAdvisory, setHudAdvisory] = useState<string>('');

  const [questionInput, setQuestionInput] = useState('');
  const [isAskingVision, setIsAskingVision] = useState(false);
  const [qaThread, setQaThread] = useState<{ q: string; a: string }[]>([]);
  const [voiceListening, setVoiceListening] = useState(false);

  const startCamera = async () => {
    setCameraError(null);
    setUploadedPreview(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API unavailable in this environment. Upload an image frame below to analyze with Gemini Vision.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
        soundFx.playAuthorize();
      }
    } catch {
      setCameraError('Camera permission denied or unavailable. Upload an image frame below to test SURYA Vision.');
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
    const unsub = voiceService.subscribe((v) => setVoiceListening(v.isListening));
    return () => {
      stopCamera();
      unsub();
    };
  }, []);

  const captureCurrentImageBase64 = (): string | null => {
    if (uploadedPreview) return uploadedPreview;
    if (!videoRef.current || !streamActive) return capturedFrame;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedFrame(dataUrl);
    return dataUrl;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        stopCamera();
        setUploadedPreview(reader.result);
        setCapturedFrame(reader.result);
        setCameraError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const runBarcodeDetectorIfSupported = async (imgBase64: string): Promise<string[]> => {
    try {
      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (!BarcodeDetectorCtor) return [];
      const detector = new BarcodeDetectorCtor();
      const img = new Image();
      img.src = imgBase64;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const codes = await detector.detect(img);
      return codes.map((c: any) => `${c.format || 'CODE'}: ${c.rawValue}`).filter(Boolean);
    } catch {
      return [];
    }
  };

  const handleAnalyze = async (overrideMode?: VisionMode) => {
    const activeMode = overrideMode || visionMode;
    setVisionMode(activeMode);
    soundFx.playClick();
    setAnalysisError(null);

    const frame = captureCurrentImageBase64();
    if (!frame) {
      setAnalysisError('No camera stream or uploaded image available. Enable camera or upload a photo first.');
      return;
    }

    setIsAnalyzing(true);
    setSceneSummary(`Running SURYA Vision (${activeMode.toUpperCase()}) analysis...`);

    try {
      const nativeQr = activeMode === 'qr' ? await runBarcodeDetectorIfSupported(frame) : [];
      const res = await apiService.analyzeVisionStructured(frame, activeMode, targetLanguage);
      const data: VisionAnalysisResult = res.analysis;

      setSceneSummary(data.summary || 'Visual frame analyzed.');
      setDetectedEntities(Array.isArray(data.entities) ? data.entities : []);
      setOcrText(data.ocrText || '');
      setOcrTranslation(data.ocrTranslation || '');
      setDocumentFields(Array.isArray(data.documentFields) ? data.documentFields : []);
      const combinedQr = [...nativeQr, ...(Array.isArray(data.qrPayloads) ? data.qrPayloads : [])];
      setQrPayloads(Array.from(new Set(combinedQr)));
      setHudAdvisory(data.hudAdvisory || '');
      soundFx.playAuthorize();
    } catch (err: any) {
      soundFx.playAbort();
      setAnalysisError(err?.message || 'Vision analysis failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitVisualQuestion = async (qText: string) => {
    if (!qText.trim() || isAskingVision) return;
    const frame = captureCurrentImageBase64();
    setIsAskingVision(true);
    setAnalysisError(null);
    soundFx.playClick();

    try {
      const res = await apiService.askVisionQuestion(frame, qText.trim());
      setQaThread((prev) => [...prev, { q: qText.trim(), a: res.answer }]);
      soundFx.playAuthorize();
      voiceService.speak(res.answer);
    } catch (err: any) {
      soundFx.playAbort();
      setQaThread((prev) => [...prev, { q: qText.trim(), a: `Vision Q&A Error: ${err?.message || 'Unavailable'}` }]);
    } finally {
      setIsAskingVision(false);
    }
  };

  const handleSendVisualQ = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) return;
    const q = questionInput.trim();
    setQuestionInput('');
    submitVisualQuestion(q);
  };

  const handleVoiceVisionQuestion = () => {
    soundFx.playClick();
    if (voiceListening) {
      voiceService.stopListening();
    } else {
      voiceService.startListening((transcript) => {
        if (transcript) {
          submitVisualQuestion(transcript);
        }
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-4 space-y-4 pb-24">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/30 pb-2.5">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-cyan-400" />
          <div>
            <h2 className="text-sm font-mono font-bold tracking-wider text-cyan-300 uppercase">
              SURYA VISION — OPTICS & MULTIMODAL HUD
            </h2>
            <span className="text-[10px] text-slate-400">
              Non-weaponized scene analysis · OCR & Translation · Document & QR Scanner
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[36px] px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-[11px] font-mono text-slate-200 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>UPLOAD IMAGE</span>
          </button>
          <div className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-500/40">
            {streamActive ? 'LIVE CAMERA' : uploadedPreview ? 'IMAGE FRAME' : 'STANDBY'}
          </div>
        </div>
      </div>

      {/* Mode & Translation Language Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'general', label: 'SCENE', icon: Scan },
              { id: 'ocr', label: 'OCR', icon: FileText },
              { id: 'translate', label: 'TRANSLATE', icon: Languages },
              { id: 'document', label: 'DOCUMENT', icon: FileText },
              { id: 'qr', label: 'QR / CODE', icon: QrCode },
            ] as { id: VisionMode; label: string; icon: any }[]
          ).map((m) => {
            const Icon = m.icon;
            const active = visionMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleAnalyze(m.id)}
                disabled={isAnalyzing}
                className={`min-h-[36px] px-3 py-1 rounded-lg font-mono text-[11px] font-bold border flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <select
          aria-label="OCR Translation Target Language"
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
        >
          <option value="English">Translate → English</option>
          <option value="Hindi">Translate → Hindi</option>
          <option value="Japanese">Translate → Japanese</option>
          <option value="Spanish">Translate → Spanish</option>
          <option value="French">Translate → French</option>
          <option value="Tamil">Translate → Tamil</option>
        </select>
      </div>

      {/* Camera Viewport & Non-Weaponized AR Overlay */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-cyan-500/40 shadow-2xl flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
        />

        {!streamActive && uploadedPreview && (
          <img src={uploadedPreview} alt="Uploaded optical frame" className="w-full h-full object-contain bg-slate-950" />
        )}

        {!streamActive && !uploadedPreview && (
          <div className="p-6 text-center space-y-3 z-10">
            <Camera className="w-8 h-8 text-cyan-400/70 mx-auto" />
            <span className="text-xs font-mono text-slate-300 block max-w-md">
              {cameraError || 'Camera stream ready.'}
            </span>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={startCamera}
                className="min-h-[40px] px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono text-xs font-bold hover:bg-cyan-400"
              >
                ENABLE CAMERA
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-4 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-bold"
              >
                CHOOSE PHOTO
              </button>
            </div>
          </div>
        )}

        {/* Holographic AR Bounding Box Layer */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/80">
            <span>SURYA OPTICS · {visionMode.toUpperCase()}</span>
            <span>NON-WEAPONIZED ANALYTICAL HUD</span>
          </div>

          {detectedEntities.map((obj, i) => {
            const top = Math.max(0, Math.min(90, obj.box?.ymin ?? 20));
            const left = Math.max(0, Math.min(90, obj.box?.xmin ?? 20));
            const width = Math.max(10, Math.min(100 - left, (obj.box?.xmax ?? 70) - left));
            const height = Math.max(10, Math.min(100 - top, (obj.box?.ymax ?? 70) - top));
            return (
              <div
                key={obj.id || i}
                className="absolute border-2 border-cyan-400/80 rounded bg-cyan-500/10 p-1 font-mono text-[9px] text-cyan-200"
                style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%` }}
              >
                <span className="bg-slate-950/90 px-1.5 py-0.5 rounded border border-cyan-400/50 inline-block">
                  {obj.label} ({Math.round((obj.confidence || 0.9) * 100)}%)
                  {obj.estimatedDistance ? ` · ${obj.estimatedDistance}` : ''}
                </span>
              </div>
            );
          })}

          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400/80">
            <span>ENTITIES: {detectedEntities.length}</span>
            <span>TRANSLATION TARGET: {targetLanguage.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => handleAnalyze(visionMode)}
          disabled={isAnalyzing}
          className="min-h-[44px] py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
        >
          {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
          <span>{isAnalyzing ? 'ANALYZING FRAME...' : 'CAPTURE & ANALYZE'}</span>
        </button>

        <button
          onClick={() => handleAnalyze('translate')}
          disabled={isAnalyzing}
          className="min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Languages className="w-4 h-4 text-amber-400" />
          <span>OCR & TRANSLATE ({targetLanguage})</span>
        </button>
      </div>

      {analysisError && (
        <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs font-mono text-rose-200">
          {analysisError}
        </div>
      )}

      {/* Scene & Extracted Intelligence Cards */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
              OPTICAL TELEMETRY REPORT
            </span>
          </div>
          <button
            onClick={() => voiceService.speak(`${sceneSummary} ${ocrTranslation || ocrText}`)}
            className="text-[11px] font-mono text-amber-300 flex items-center gap-1 hover:underline"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>READ ALOUD</span>
          </button>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed">{sceneSummary}</p>

        {hudAdvisory && (
          <p className="text-[11px] font-mono text-cyan-300/90">{hudAdvisory}</p>
        )}

        {ocrText && (
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">EXTRACTED TEXT (OCR)</span>
            <p className="text-xs text-slate-100 whitespace-pre-wrap">{ocrText}</p>
          </div>
        )}

        {ocrTranslation && (
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 space-y-1">
            <span className="text-[10px] font-mono text-amber-400 uppercase block">
              TRANSLATION ({targetLanguage.toUpperCase()})
            </span>
            <p className="text-xs text-amber-100 whitespace-pre-wrap">{ocrTranslation}</p>
          </div>
        )}

        {documentFields.length > 0 && (
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <span className="text-[10px] font-mono text-emerald-400 uppercase block">STRUCTURED DOCUMENT FIELDS</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {documentFields.map((df, idx) => (
                <div key={idx} className="text-xs px-2 py-1 rounded bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 font-mono text-[10px]">{df.label}: </span>
                  <span className="text-slate-100 font-semibold">{df.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {qrPayloads.length > 0 && (
          <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 space-y-1">
            <span className="text-[10px] font-mono text-cyan-300 uppercase block">DECODED QR / BARCODES</span>
            {qrPayloads.map((q, i) => (
              <p key={i} className="text-xs font-mono text-cyan-100 break-all">{q}</p>
            ))}
          </div>
        )}
      </div>

      {/* Visual Q&A Thread (Voice + Text) */}
      <div className="space-y-2.5">
        {qaThread.map((item, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
            <div className="font-bold text-cyan-300">Q: {item.q}</div>
            <div className="text-slate-200 leading-relaxed">SURYA: {item.a}</div>
          </div>
        ))}

        <form onSubmit={handleSendVisualQ} className="flex gap-2">
          <button
            type="button"
            onClick={handleVoiceVisionQuestion}
            aria-label="Ask visual question by voice"
            className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center ${
              voiceListening
                ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                : 'bg-slate-900 text-cyan-400 border-slate-700 hover:border-cyan-400'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Ask SURYA about the camera view or uploaded image..."
            className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={!questionInput.trim() || isAskingVision}
            className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-cyan-500 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold hover:bg-cyan-400 flex items-center justify-center"
          >
            {isAskingVision ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
