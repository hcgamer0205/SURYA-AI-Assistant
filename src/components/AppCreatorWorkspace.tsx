import React, { useState, useEffect } from 'react';
import {
  Code2,
  Download,
  Sparkles,
  FileCode,
  RefreshCw,
  Bug,
  GitBranch,
  History,
  RotateCcw,
  Wrench,
  ExternalLink,
} from 'lucide-react';
import { GeneratedApp, GithubRepoSummary, StudioVersionSnapshot } from '../types/surya';
import { apiService } from '../services/apiService';
import { soundFx } from '../services/soundFx';

export const AppCreatorWorkspace: React.FC = () => {
  const [promptInput, setPromptInput] = useState('');
  const [modifyInput, setModifyInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDebugging, setIsDebugging] = useState(false);
  const [apps, setApps] = useState<GeneratedApp[]>([]);
  const [currentApp, setCurrentApp] = useState<GeneratedApp | null>(null);
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sandboxErrors, setSandboxErrors] = useState<string[]>([]);
  const [debugDiagnosis, setDebugDiagnosis] = useState<{ diagnosis: string; fixes: string[] } | null>(null);
  const [versionHistory, setVersionHistory] = useState<StudioVersionSnapshot[]>([]);

  const [studioTab, setStudioTab] = useState<'preview' | 'code' | 'github'>('preview');
  const [repoInput, setRepoInput] = useState('hcgamer0205/SURYA-AI-Assistant');
  const [githubData, setGithubData] = useState<GithubRepoSummary | null>(null);
  const [isLoadingGithub, setIsLoadingGithub] = useState(false);

  useEffect(() => {
    loadStudioApps();
    const handleSandboxMessage = (ev: MessageEvent) => {
      if (ev.data && ev.data.type === 'SURYA_SANDBOX_ERROR') {
        setSandboxErrors((prev) => [`${ev.data.message}`, ...prev].slice(0, 6));
      }
    };
    window.addEventListener('message', handleSandboxMessage);
    return () => window.removeEventListener('message', handleSandboxMessage);
  }, []);

  const loadStudioApps = async () => {
    try {
      const res = await apiService.getStudioApps();
      if (Array.isArray(res.apps) && res.apps.length > 0) {
        setApps(res.apps);
        setCurrentApp((prev) => prev || res.apps[0]);
      }
    } catch {
      // Offline local fallback app
      const fallback: GeneratedApp = {
        id: 'app_local_starter',
        name: 'SURYA Quick Counter Workspace',
        description: 'Local offline Studio workspace ready for editing and preview.',
        category: 'Productivity',
        version: '1.0.0',
        prompt: 'Starter counter app',
        status: 'ready',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        files: [
          {
            path: 'index.html',
            language: 'html',
            content: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>SURYA App</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-slate-950 text-amber-100 p-6 font-sans">
  <h1 class="text-lg font-bold text-amber-400">SURYA Studio Runtime</h1>
  <p class="text-xs text-slate-400 mt-1">Edit code live or generate a new app using Gemini above.</p>
  <button onclick="document.getElementById('out').innerText = 'Action fired at ' + new Date().toLocaleTimeString()" class="mt-4 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs">Test Interaction</button>
  <p id="out" class="mt-3 text-xs font-mono text-cyan-300"></p>
</body>
</html>`,
          },
        ],
        previewHtml: '',
      };
      fallback.previewHtml = fallback.files[0].content;
      setApps([fallback]);
      setCurrentApp(fallback);
    }
  };

  const pushSnapshot = (app: GeneratedApp, note: string) => {
    const snap: StudioVersionSnapshot = {
      id: `ver_${Date.now()}`,
      version: app.version,
      note,
      timestamp: new Date().toISOString(),
      previewHtml: app.previewHtml || app.files[0]?.content || '',
    };
    setVersionHistory((prev) => [snap, ...prev].slice(0, 10));
  };

  const handleGenerateApp = async (templatePrompt?: string) => {
    const prompt = (templatePrompt || promptInput).trim();
    if (!prompt || isGenerating) return;

    soundFx.playClick();
    setIsGenerating(true);
    setStatusMessage('Synthesizing application with Gemini...');
    setDebugDiagnosis(null);
    setSandboxErrors([]);

    try {
      const appName = templatePrompt || prompt.slice(0, 36);
      const res = await apiService.generateStudioApp(prompt, appName, 'Custom');
      if (currentApp) pushSnapshot(currentApp, `Before "${appName}"`);
      setCurrentApp(res.app);
      setApps((prev) => [res.app, ...prev.filter((a) => a.id !== res.app.id)]);
      setSelectedFileIdx(0);
      setPromptInput('');
      setStatusMessage(res.message || `Generated ${res.app.name}`);
      soundFx.playAuthorize();
    } catch (err: any) {
      soundFx.playAbort();
      setStatusMessage(`Generation error: ${err?.message || 'Backend unavailable'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleModifyApp = async () => {
    if (!currentApp || !modifyInput.trim() || isGenerating) return;
    soundFx.playClick();
    setIsGenerating(true);
    setStatusMessage('Applying AI modification...');
    pushSnapshot(currentApp, `Before edit: "${modifyInput.slice(0, 30)}"`);

    try {
      const res = await apiService.modifyStudioApp(currentApp.id, modifyInput.trim());
      setCurrentApp(res.app);
      setModifyInput('');
      setStatusMessage('Application updated via Gemini.');
      soundFx.playAuthorize();
    } catch (err: any) {
      soundFx.playAbort();
      setStatusMessage(`Modify error: ${err?.message || 'Failed'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCodeEdit = (newContent: string) => {
    if (!currentApp) return;
    const updatedFiles = currentApp.files.map((f, idx) =>
      idx === selectedFileIdx ? { ...f, content: newContent } : f
    );
    const htmlFile = updatedFiles.find((f) => f.path.endsWith('.html'));
    setCurrentApp({
      ...currentApp,
      files: updatedFiles,
      previewHtml: htmlFile ? htmlFile.content : currentApp.previewHtml,
      lastModified: new Date().toISOString(),
    });
  };

  const handleAIDebug = async () => {
    if (!currentApp || isDebugging) return;
    const htmlSource = currentApp.files[0]?.content || currentApp.previewHtml;
    if (!htmlSource) return;

    soundFx.playClick();
    setIsDebugging(true);
    setStatusMessage('Analyzing code with SURYA AI Debugger...');

    try {
      const res = await apiService.debugStudioApp(htmlSource, sandboxErrors.join('\n'), currentApp.description);
      pushSnapshot(currentApp, 'Before AI Debug Patch');
      const updatedFiles = currentApp.files.map((f, idx) =>
        idx === 0 ? { ...f, content: res.patchedHtml } : f
      );
      setCurrentApp({
        ...currentApp,
        files: updatedFiles,
        previewHtml: res.patchedHtml,
        lastModified: new Date().toISOString(),
      });
      setDebugDiagnosis({ diagnosis: res.diagnosis, fixes: res.fixes });
      setSandboxErrors([]);
      setStatusMessage('AI Debugger applied verified fixes.');
      soundFx.playAuthorize();
    } catch (err: any) {
      soundFx.playAbort();
      setStatusMessage(`Debug failed: ${err?.message || 'Error'}`);
    } finally {
      setIsDebugging(false);
    }
  };

  const handleRollback = (snap: StudioVersionSnapshot) => {
    if (!currentApp) return;
    soundFx.playClick();
    const updatedFiles = currentApp.files.map((f, idx) =>
      idx === 0 ? { ...f, content: snap.previewHtml } : f
    );
    setCurrentApp({
      ...currentApp,
      files: updatedFiles,
      previewHtml: snap.previewHtml,
    });
    setStatusMessage(`Rolled back to snapshot from ${new Date(snap.timestamp).toLocaleTimeString()}`);
  };

  const handleExportHtml = () => {
    if (!currentApp) return;
    soundFx.playAuthorize();
    const html = currentApp.files[0]?.content || currentApp.previewHtml || '';
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentApp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Exported standalone HTML bundle.');
  };

  const handleInspectGithub = async () => {
    if (!repoInput.trim()) return;
    soundFx.playClick();
    setIsLoadingGithub(true);
    try {
      const data = await apiService.inspectGithubRepo(repoInput.trim());
      setGithubData(data);
      soundFx.playAuthorize();
    } catch (err: any) {
      soundFx.playAbort();
      setStatusMessage(`GitHub Error: ${err?.message}`);
    } finally {
      setIsLoadingGithub(false);
    }
  };

  const rawHtml = currentApp?.files[0]?.content || currentApp?.previewHtml || '';
  const errorBridgeScript = `<script>window.onerror=function(m,s,l){parent.postMessage({type:'SURYA_SANDBOX_ERROR',message:m+' (line '+l+')'},'*');};</script>`;
  const instrumentedHtml = rawHtml.includes('<head>')
    ? rawHtml.replace('<head>', `<head>${errorBridgeScript}`)
    : `${errorBridgeScript}${rawHtml}`;

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto p-4 space-y-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 pb-2.5">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-mono font-bold tracking-wider text-amber-300 uppercase">
              SURYA STUDIO — AI APP BUILDER &amp; GITHUB MONITOR
            </h2>
            <span className="text-[10px] text-slate-400">
              Real Gemini code generation · Editable multi-file explorer · Sandboxed runtime · AI Debugger
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {(['preview', 'code', 'github'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                soundFx.playClick();
                setStudioTab(t);
                if (t === 'github' && !githubData) handleInspectGithub();
              }}
              className={`min-h-[34px] px-3 py-1 rounded-lg font-mono text-[11px] font-bold uppercase ${
                studioTab === t ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-700 text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Generator Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Describe a new app to build with Gemini (e.g. Pomodoro timer with task list)..."
            className="flex-1 min-w-[220px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => handleGenerateApp()}
            disabled={isGenerating || !promptInput.trim()}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isGenerating ? 'GENERATING...' : 'BUILD APP'}</span>
          </button>
        </div>

        {/* Saved Projects Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {apps.map((appItem) => (
            <button
              key={appItem.id}
              onClick={() => {
                soundFx.playClick();
                setCurrentApp(appItem);
                setSelectedFileIdx(0);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap border ${
                currentApp?.id === appItem.id
                  ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              {appItem.name}
            </button>
          ))}
        </div>
      </div>

      {statusMessage && (
        <div className="px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-amber-200">
          {statusMessage}
        </div>
      )}

      {/* TAB 1: PREVIEW */}
      {studioTab === 'preview' && currentApp && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100">{currentApp.name}</h3>
              <p className="text-[11px] text-slate-400">{currentApp.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAIDebug}
                disabled={isDebugging}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5"
              >
                <Bug className={`w-3.5 h-3.5 ${isDebugging ? 'animate-spin' : ''}`} />
                <span>{isDebugging ? 'DEBUGGING...' : 'AI DEBUG'}</span>
              </button>
              <button
                onClick={handleExportHtml}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT HTML</span>
              </button>
            </div>
          </div>

          {sandboxErrors.length > 0 && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-[11px] font-mono text-rose-200">
              Runtime Errors Captured: {sandboxErrors.join(' | ')}
            </div>
          )}

          {debugDiagnosis && (
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs space-y-1">
              <span className="font-mono font-bold text-emerald-300 block">DIAGNOSIS: {debugDiagnosis.diagnosis}</span>
              <ul className="list-disc pl-4 text-slate-300 text-[11px]">
                {debugDiagnosis.fixes.map((f, idx) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shadow-2xl h-80">
            <iframe
              srcDoc={instrumentedHtml}
              sandbox="allow-scripts"
              title="SURYA Studio Sandboxed Preview"
              className="w-full h-full border-0"
            />
          </div>

          {/* Modify Existing App Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={modifyInput}
              onChange={(e) => setModifyInput(e.target.value)}
              placeholder="Modify current app (e.g. Add dark/light toggle or export CSV button)..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100"
            />
            <button
              onClick={handleModifyApp}
              disabled={isGenerating || !modifyInput.trim()}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>ITERATE</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-FILE CODE EDITOR & VERSION HISTORY */}
      {studioTab === 'code' && currentApp && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {currentApp.files.map((f, idx) => (
                <button
                  key={f.path}
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] flex items-center gap-1 ${
                    selectedFileIdx === idx ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  <FileCode className="w-3 h-3" />
                  <span>{f.path}</span>
                </button>
              ))}
            </div>
            <textarea
              aria-label="Editable application source code"
              value={currentApp.files[selectedFileIdx]?.content || ''}
              onChange={(e) => handleCodeEdit(e.target.value)}
              rows={16}
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
              <History className="w-4 h-4" />
              <span>VERSION HISTORY</span>
            </div>
            {versionHistory.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                Snapshots are saved automatically whenever you generate, iterate, or debug an app.
              </p>
            ) : (
              <div className="space-y-2">
                {versionHistory.map((snap) => (
                  <div key={snap.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-200 block">{snap.note}</span>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>{new Date(snap.timestamp).toLocaleTimeString()}</span>
                      <button
                        onClick={() => handleRollback(snap)}
                        className="text-amber-300 hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>ROLLBACK</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GITHUB REPOSITORY & BUILD MONITOR */}
      {studioTab === 'github' && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repo (e.g. hcgamer0205/SURYA-AI-Assistant)"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-slate-100"
            />
            <button
              onClick={handleInspectGithub}
              disabled={isLoadingGithub}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5"
            >
              <GitBranch className={`w-4 h-4 ${isLoadingGithub ? 'animate-spin' : ''}`} />
              <span>{isLoadingGithub ? 'INSPECTING...' : 'INSPECT REPO'}</span>
            </button>
          </div>

          {githubData && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{githubData.fullName}</h3>
                  <p className="text-xs text-slate-400">{githubData.description || 'SURYA Repository'}</p>
                </div>
                <a
                  href={githubData.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-amber-300 font-mono text-xs flex items-center gap-1"
                >
                  <span>OPEN</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-mono font-bold text-cyan-300 block">RECENT COMMITS</span>
                  {githubData.recentCommits.map((c) => (
                    <div key={c.sha} className="text-[11px] border-b border-slate-800/80 pb-1.5">
                      <span className="font-mono text-amber-400 mr-1.5">{c.sha}</span>
                      <span className="text-slate-200">{c.message}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-mono font-bold text-emerald-300 block">ACTIONS WORKFLOW RUNS</span>
                  {githubData.recentBuilds.map((b) => (
                    <div key={b.id} className="text-[11px] border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
                      <span className="text-slate-200 truncate pr-2">
                        #{b.runNumber} {b.name}
                      </span>
                      <span
                        className={`font-mono text-[10px] uppercase shrink-0 ${
                          b.conclusion === 'success' ? 'text-emerald-400' : 'text-amber-300'
                        }`}
                      >
                        {b.conclusion || b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
