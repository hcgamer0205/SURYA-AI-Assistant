import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Scan,
  Languages,
  RefreshCw,
  Send,
  Upload,
  Mic,
  FileText,
  QrCode,
  Volume2,
  Eye,
  Clock,
} from 'lucide-react';
import { soundFx } from '../services/soundFx';
import { apiService } from '../services/apiService';
import { voiceService } from '../services/voiceService';
import { intelligenceRouter } from '../services/intelligenceRouter';
import { localInferenceRuntime } from '../services/localInferenceRuntime';
import { VisionAnalysisResult, VisionEntity } from '../types/surya';

type VisionMode = 'general' | 'ocr' | 'translate' | 'document' | 'qr';

interface RecentVisionEntry {
  id: string;
  mode: VisionMode;
  summary: string;
  timestamp: string;
}

const RECENT_VISION_KEY = 'surya_vision_recent_v1';

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
    'Enable camera or upload an image to analyze scenes, extract text, translate signs, scan documents, or read QR codes.'
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

  const [recentActivity, setRecentActivity] = useState<RecentVisionEntry[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_VISION_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const recordRecent = (mode: VisionMode, summary: string) => {
    const entry: RecentVisionEntry = {
      id: `vis_${Date.now()}`,
      mode,
      summary,
      timestamp: new Date().toISOString(),
    };
    setRecentActivity((prev) => {
      const next = [entry, ...prev].slice(0, 5);
      try {
        localStorage.setItem(RECENT_VISION_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const startCamera = async () => {
    setCameraError(null);
    setUploadedPreview(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera unavailable here. Upload an image to analyze with Vision.');
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
      setCameraError('Camera permission denied or unavailable. Upload an image to continue.');
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

  const runOfflineVisionAnalysis = async (
    frame: string,
    activeMode: VisionMode
  ): Promise<boolean> => {
    const bridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    const browserQr = await runBarcodeDetectorIfSupported(frame);

    if (bridge && typeof bridge.analyzeImageOffline === 'function') {
      try {
        const raw = bridge.analyzeImageOffline(frame, activeMode);
        const parsed = JSON.parse(raw);
        if (parsed && !parsed.error) {
          const text = String(parsed.ocrText || '').trim();
          const qr = Array.from(
            new Set([
              ...browserQr,
              ...(Array.isArray(parsed.qrPayloads) ? parsed.qrPayloads : []),
            ])
          );
          const fields: { label: string; value: string }[] = [];
          if (text && (activeMode === 'document' || activeMode === 'ocr')) {
            text.split(/\r?\n/).forEach((line) => {
              const idx = line.indexOf(':');
              if (idx > 0 && idx < 32) {
                fields.push({
                  label: line.slice(0, idx).trim(),
                  value: line.slice(idx + 1).trim(),
                });
              }
            });
          }

          const summary = parsed.summary
            ? `${parsed.summary} (On-device ML Kit)`
            : text
            ? `Extracted ${text.split(/\s+/).length} words on-device.`
            : qr.length > 0
            ? `Decoded ${qr.length} barcode/QR item(s) on-device.`
            : 'No readable Latin text or barcode detected on-device.';

          setSceneSummary(summary);
          setDetectedEntities([]);
          setOcrText(text);
          setOcrTranslation('');
          setDocumentFields(fields.slice(0, 12));
          setQrPayloads(qr);
          setHudAdvisory(
            activeMode === 'general' || activeMode === 'translate'
              ? 'Processed locally via ML Kit OCR & Barcode. Full open-scene captioning and multi-language translation require online mode.'
              : 'Processed 100% on-device via Google ML Kit.'
          );
          recordRecent(activeMode, summary);
          soundFx.playAuthorize();
          return true;
        }
      } catch (e) {
        console.warn('[VisionHUD] Offline native ML Kit parse warning:', e);
      }
    }

    if (browserQr.length > 0) {
      const summary = `Decoded ${browserQr.length} QR/barcode payload(s) locally in browser.`;
      setSceneSummary(summary);
      setDetectedEntities([]);
      setOcrText('');
      setOcrTranslation('');
      setDocumentFields([]);
      setQrPayloads(browserQr);
      setHudAdvisory('Decoded locally via browser BarcodeDetector. Full OCR and scene vision require Android APK or online mode.');
      recordRecent(activeMode, summary);
      soundFx.playAuthorize();
      return true;
    }

    return false;
  };

  const handleAnalyze = async (overrideMode?: VisionMode) => {
    const activeMode = overrideMode || visionMode;
    setVisionMode(activeMode);
    soundFx.playClick();
    setAnalysisError(null);

    const frame = captureCurrentImageBase64();
    if (!frame) {
      setAnalysisError('Enable the camera or upload an image first.');
      return;
    }

    setIsAnalyzing(true);
    setSceneSummary('Analyzing image...');

    const routerSnap = intelligenceRouter.getEffectiveStatus();
    const shouldUseOfflineFirst =
      routerSnap.mode === 'offline' ||
      !routerSnap.networkOnline ||
      (routerSnap.mode === 'auto' && (activeMode === 'qr' || activeMode === 'ocr') && !routerSnap.networkOnline);

    try {
      if (shouldUseOfflineFirst) {
        const handled = await runOfflineVisionAnalysis(frame, activeMode);
        if (!handled) {
          setAnalysisError(
            'Offline scene analysis is limited in a browser without native Android ML Kit. Connect online or run in Android APK for bundled offline OCR & QR.'
          );
          soundFx.playAbort();
        }
        return;
      }

      const nativeQr = activeMode === 'qr' ? await runBarcodeDetectorIfSupported(frame) : [];
      const res = await apiService.analyzeVisionStructured(frame, activeMode, targetLanguage);
      const data: VisionAnalysisResult = res.analysis;

      const summary = data.summary || 'Image analyzed.';
      setSceneSummary(summary);
      setDetectedEntities(Array.isArray(data.entities) ? data.entities : []);
      setOcrText(data.ocrText || '');
      setOcrTranslation(data.ocrTranslation || '');
      setDocumentFields(Array.isArray(data.documentFields) ? data.documentFields : []);
      const combinedQr = [...nativeQr, ...(Array.isArray(data.qrPayloads) ? data.qrPayloads : [])];
      setQrPayloads(Array.from(new Set(combinedQr)));
      setHudAdvisory(data.hudAdvisory || '');
      recordRecent(activeMode, summary);
      soundFx.playAuthorize();
    } catch (err: any) {
      // Automatic fallback to native offline ML Kit if network dropped mid-request
      const handled = await runOfflineVisionAnalysis(frame, activeMode);
      if (!handled) {
        soundFx.playAbort();
        setAnalysisError(err?.message || 'Vision analysis failed.');
      }
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

    const routerSnap = intelligenceRouter.getEffectiveStatus();
    try {
      if (routerSnap.mode === 'offline' || !routerSnap.networkOnline) {
        const contextText = [
          ocrText ? `Extracted OCR text: ${ocrText}` : '',
          qrPayloads.length > 0 ? `QR/Barcodes: ${qrPayloads.join(', ')}` : '',
          documentFields.length > 0
            ? `Document fields: ${documentFields.map((f) => `${f.label}=${f.value}`).join('; ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n');

        if (!contextText) {
          throw new Error(
            'Run OCR or QR scan offline first so local text is available for Q&A (open scene captioning requires online mode).'
          );
        }
        const localRes = await localInferenceRuntime.generateResponse(
          `Based strictly on this extracted image text:\n${contextText}\n\nQuestion: ${qText.trim()}`
        );
        setQaThread((prev) => [...prev, { q: qText.trim(), a: `${localRes.text} (${localRes.modelName})` }]);
        soundFx.playAuthorize();
        voiceService.speak(localRes.text);
        return;
      }

      const res = await apiService.askVisionQuestion(frame, qText.trim());
      setQaThread((prev) => [...prev, { q: qText.trim(), a: res.answer }]);
      soundFx.playAuthorize();
      voiceService.speak(res.answer);
    } catch (err: any) {
      soundFx.playAbort();
      setQaThread((prev) => [
        ...prev,
        { q: qText.trim(), a: `Unable to answer visual question: ${err?.message || 'Unavailable'}` },
      ]);
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

  const modes: { id: VisionMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'general', label: 'Scene', icon: Eye },
    { id: 'ocr', label: 'Text (OCR)', icon: FileText },
    { id: 'translate', label: 'Translate', icon: Languages },
    { id: 'document', label: 'Document', icon: Scan },
    { id: 'qr', label: 'QR / Code', icon: QrCode },
  ];

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-4 py-4 space-y-4 pb-24">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      {/* Clean Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Vision</h2>
          <p className="text-xs text-slate-400">
            Scene analysis, text recognition, translation, and QR scanning
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (streamActive ? stopCamera() : startCamera())}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#121826] border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5 text-[#60a5fa]" />
            <span>{streamActive ? 'Stop Camera' : 'Camera'}</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#121826] border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-[#d4a84f]" />
            <span>Upload Image</span>
          </button>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {modes.map((m) => {
            const Icon = m.icon;
            const active = visionMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleAnalyze(m.id)}
                disabled={isAnalyzing}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#60a5fa] text-slate-950 border-[#60a5fa]'
                    : 'bg-[#121826] text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <select
          aria-label="Translation target language"
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#121826] border border-slate-800 text-xs text-slate-200"
        >
          <option value="English">Translate to English</option>
          <option value="Hindi">Translate to Hindi</option>
          <option value="Japanese">Translate to Japanese</option>
          <option value="Spanish">Translate to Spanish</option>
          <option value="French">Translate to French</option>
          <option value="Tamil">Translate to Tamil</option>
        </select>
      </div>

      {/* Viewport */}
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#070a12] border border-slate-800 flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
        />

        {!streamActive && uploadedPreview && (
          <img
            src={uploadedPreview}
            alt="Uploaded frame"
            className="w-full h-full object-contain bg-[#070a12]"
          />
        )}

        {!streamActive && !uploadedPreview && (
          <div className="p-6 text-center space-y-3 z-10">
            <Camera className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400 max-w-sm">
              {cameraError || 'Camera preview is paused.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#60a5fa] text-slate-950 text-xs font-medium"
              >
                Enable Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-[#121826] border border-slate-700 text-slate-200 text-xs font-medium"
              >
                Upload Image
              </button>
            </div>
          </div>
        )}

        {/* Clean Entity Overlay */}
        {detectedEntities.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {detectedEntities.map((obj, i) => {
              const top = Math.max(0, Math.min(88, obj.box?.ymin ?? 20));
              const left = Math.max(0, Math.min(88, obj.box?.xmin ?? 20));
              const width = Math.max(10, Math.min(100 - left, (obj.box?.xmax ?? 70) - left));
              const height = Math.max(10, Math.min(100 - top, (obj.box?.ymax ?? 70) - top));
              return (
                <div
                  key={obj.id || i}
                  className="absolute border border-[#60a5fa]/80 rounded-lg bg-[#60a5fa]/10 p-1 text-[11px] text-slate-100"
                  style={{ top: `${top}%`, left: `${left}%`, width: `${width}%`, height: `${height}%` }}
                >
                  <span className="bg-[#0b0f17]/90 px-1.5 py-0.5 rounded text-[10px] inline-block">
                    {obj.label} ({Math.round((obj.confidence || 0.9) * 100)}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => handleAnalyze(visionMode)}
          disabled={isAnalyzing}
          className="min-h-[44px] py-2.5 px-3 rounded-xl bg-[#d4a84f] hover:bg-[#e0b65f] disabled:opacity-50 text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 transition-colors active:scale-98"
        >
          {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
          <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Frame'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleAnalyze('translate')}
          disabled={isAnalyzing}
          className="min-h-[44px] py-2.5 px-3 rounded-xl bg-[#121826] hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-medium flex items-center justify-center gap-2 transition-colors active:scale-98"
        >
          <Languages className="w-4 h-4 text-[#60a5fa]" />
          <span>Translate ({targetLanguage})</span>
        </button>
      </div>

      {analysisError && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-200">
          {analysisError}
        </div>
      )}

      {/* Results Card */}
      <div className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Analysis Results</span>
          <button
            type="button"
            onClick={() => voiceService.speak(`${sceneSummary} ${ocrTranslation || ocrText}`)}
            className="text-xs text-[#d4a84f] flex items-center gap-1 hover:underline"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Read aloud</span>
          </button>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed">{sceneSummary}</p>

        {hudAdvisory && <p className="text-xs text-[#60a5fa]">{hudAdvisory}</p>}

        {ocrText && (
          <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-1">
            <span className="text-xs font-medium text-slate-400 block">Extracted Text</span>
            <p className="text-xs text-slate-100 whitespace-pre-wrap">{ocrText}</p>
          </div>
        )}

        {ocrTranslation && (
          <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-1">
            <span className="text-xs font-medium text-[#d4a84f] block">
              Translation ({targetLanguage})
            </span>
            <p className="text-xs text-slate-100 whitespace-pre-wrap">{ocrTranslation}</p>
          </div>
        )}

        {documentFields.length > 0 && (
          <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-2">
            <span className="text-xs font-medium text-emerald-400 block">Document Fields</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {documentFields.map((df, idx) => (
                <div key={idx} className="text-xs px-2.5 py-1.5 rounded-lg bg-[#121826] border border-slate-800">
                  <span className="text-slate-400">{df.label}: </span>
                  <span className="text-slate-100 font-medium">{df.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {qrPayloads.length > 0 && (
          <div className="p-3 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-1">
            <span className="text-xs font-medium text-[#60a5fa] block">Decoded QR / Barcodes</span>
            {qrPayloads.map((q, i) => (
              <p key={i} className="text-xs font-mono text-slate-200 break-all">
                {q}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Visual Q&A */}
      <div className="space-y-2.5">
        {qaThread.map((item, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-[#121826] border border-slate-800 text-xs space-y-1">
            <div className="font-medium text-[#60a5fa]">You: {item.q}</div>
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
                ? 'bg-[#60a5fa] text-slate-950 border-[#60a5fa]'
                : 'bg-[#121826] text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Ask about this image or camera view..."
            className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#121826] border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#60a5fa]"
          />
          <button
            type="submit"
            disabled={!questionInput.trim() || isAskingVision}
            aria-label="Send visual question"
            className="min-h-[44px] min-w-[44px] px-4 rounded-xl bg-[#60a5fa] disabled:opacity-40 text-slate-950 flex items-center justify-center"
          >
            {isAskingVision ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Recent Activity</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setRecentActivity([]);
                try {
                  localStorage.removeItem(RECENT_VISION_KEY);
                } catch {}
              }}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="px-3 py-2 rounded-xl bg-[#0b0f17] border border-slate-800/70 flex items-start justify-between gap-3"
              >
                <p className="text-xs text-slate-300 line-clamp-1">{item.summary}</p>
                <span className="text-[11px] text-slate-500 shrink-0 uppercase">{item.mode}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
