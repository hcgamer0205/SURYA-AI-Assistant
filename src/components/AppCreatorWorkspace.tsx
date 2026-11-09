import React, { useState } from 'react';
import {
  Code2,
  Play,
  Download,
  Layers,
  Sparkles,
  FileCode,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { GeneratedApp, AppFile } from '../types/surya';
import { soundFx } from '../services/soundFx';

export const AppCreatorWorkspace: React.FC = () => {
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  // Default initial generated app: SuryaTube video sharing platform
  const [currentApp, setCurrentApp] = useState<GeneratedApp>({
    id: 'app_suryatube',
    name: 'SuryaTube — Tactical Video Platform',
    description: 'Autonomous video discovery platform with solar holographic styling and offline playback queues.',
    category: 'Entertainment',
    version: '1.0.0',
    prompt: 'Create an app like YouTube with solar holographic dark UI',
    status: 'ready',
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    files: [
      {
        path: 'index.html',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SuryaTube</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #070503; color: #fef3c7; }
    header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #120c04; border-bottom: 1px solid #f59e0b44; }
    .brand { font-weight: 800; font-size: 16px; color: #f59e0b; letter-spacing: 1px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; padding: 16px; }
    .card { background: #1a1107; border: 1px solid #f59e0b22; border-radius: 12px; overflow: hidden; }
    .thumb { height: 130px; background: linear-gradient(135deg, #f59e0b33, #ea580c22); display: flex; align-items: center; justify-content: center; font-size: 28px; }
    .info { padding: 12px; }
    .title { font-size: 13px; font-weight: 700; margin-bottom: 4px; color: #fff; }
    .meta { font-size: 11px; color: #d97706; }
  </style>
</head>
<body>
  <header>
    <div class="brand">☀️ SURYATUBE</div>
    <div style="font-size: 11px; color: #d97706; font-family: monospace;">SANDBOXED APP</div>
  </header>
  <div class="grid">
    <div class="card">
      <div class="thumb">🚀</div>
      <div class="info">
        <div class="title">Next-Gen Solar AI Architecture</div>
        <div class="meta">SURYA Labs • 142K views</div>
      </div>
    </div>
    <div class="card">
      <div class="thumb">⚡</div>
      <div class="info">
        <div class="title">Zero-Latency Android Intent Routing</div>
        <div class="meta">Mobile Engineering • 89K views</div>
      </div>
    </div>
  </div>
</body>
</html>`,
      },
    ],
    previewHtml: '',
  });

  const handleGenerateApp = (templateName?: string) => {
    soundFx.playClick();
    setIsGenerating(true);

    const targetName = templateName || promptInput || 'Custom Assistant Dashboard';

    setTimeout(() => {
      setIsGenerating(false);
      soundFx.playAuthorize();

      const newApp: GeneratedApp = {
        id: `app_${Date.now()}`,
        name: targetName.includes('Music')
          ? 'SolarBeats — Audio Studio'
          : targetName.includes('Note')
          ? 'SuryaNotes — Tactical Task Board'
          : targetName,
        description: `Custom sandboxed application synthesized from prompt: "${targetName}"`,
        category: 'Productivity',
        version: '1.0.0',
        prompt: targetName,
        status: 'ready',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        files: [
          {
            path: 'index.html',
            language: 'html',
            content: `<!DOCTYPE html>
<html>
<head>
  <title>${targetName}</title>
  <style>
    body { background: #050811; color: #e2e8f0; font-family: sans-serif; padding: 20px; }
    h1 { color: #f59e0b; font-size: 18px; }
    p { font-size: 13px; color: #94a3b8; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; background: #f59e0b22; color: #f59e0b; font-size: 11px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="badge">SURYA STUDIO SANDBOX</div>
  <h1>${targetName}</h1>
  <p>Active and responding. Generated using SURYA sandboxed template architecture.</p>
</body>
</html>`,
          },
        ],
        previewHtml: '',
      };

      setCurrentApp(newApp);
      setPromptInput('');
    }, 1200);
  };

  const handleExportCode = () => {
    soundFx.playAuthorize();
    const code = currentApp.files[0]?.content || '';
    navigator.clipboard?.writeText(code);
    alert('Application code copied to clipboard for export.');
  };

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider text-amber-300 uppercase">
            SURYA STUDIO — APP CREATOR WORKSPACE
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40">
          SANDBOXED ISOLATION
        </span>
      </div>

      {/* Generator Prompt Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
        <span className="text-xs font-mono font-bold text-slate-300 block uppercase">
          Describe App to Build or Extend
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="e.g. Build an app like YouTube, notes board, or crypto tracker..."
            className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => handleGenerateApp()}
            disabled={isGenerating}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isGenerating ? 'BUILDING...' : 'GENERATE'}</span>
          </button>
        </div>

        {/* Quick App Templates */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          {['YouTube Clone', 'SolarBeats Player', 'Notes Board', 'Crypto Tracker'].map((tpl) => (
            <button
              key={tpl}
              onClick={() => handleGenerateApp(tpl)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono whitespace-nowrap transition-colors"
            >
              + {tpl}
            </button>
          ))}
        </div>
      </div>

      {/* App Meta & Actions */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">{currentApp.name}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{currentApp.description}</p>
        </div>
        <button
          onClick={handleExportCode}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>EXPORT</span>
        </button>
      </div>

      {/* Live Sandboxed Iframe Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>SANDBOXED INTERACTIVE RUNTIME</span>
          <span className="text-emerald-400">SANDBOX: ALLOW-SCRIPTS</span>
        </div>
        <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl h-64">
          <iframe
            srcDoc={currentApp.files[0]?.content || ''}
            sandbox="allow-scripts"
            title="Generated App Sandboxed Preview"
            className="w-full h-full border-0"
          />
        </div>
      </div>

      {/* Code Viewer */}
      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <div className="flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-amber-400" />
            <span>index.html (Generated Source)</span>
          </div>
          <span className="text-[10px] text-slate-500">Read-only sandbox preview</span>
        </div>
        <pre className="p-2.5 rounded-lg bg-slate-900 font-mono text-[10px] text-slate-300 overflow-x-auto max-h-36">
          {currentApp.files[0]?.content}
        </pre>
      </div>
    </div>
  );
};
