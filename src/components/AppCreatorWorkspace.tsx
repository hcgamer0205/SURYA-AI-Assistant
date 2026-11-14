import React, { useState, useEffect } from 'react';
import {
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
import { intelligenceRouter } from '../services/intelligenceRouter';
import { localInferenceRuntime } from '../services/localInferenceRuntime';
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
      const fallback: GeneratedApp = {
        id: 'app_local_starter',
        name: 'Quick Counter Starter',
        description: 'Local starter workspace ready for live preview and editing.',
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
<body class="bg-slate-950 text-slate-100 p-6 font-sans">
  <h1 class="text-lg font-semibold text-amber-300">SURYA Studio Preview</h1>
  <p class="text-xs text-slate-400 mt-1">Describe an app above to build with Gemini, or edit source in the Code tab.</p>
  <button onclick="document.getElementById('out').innerText = 'Updated at ' + new Date().toLocaleTimeString()" class="mt-4 px-4 py-2 rounded-lg bg-amber-400 text-slate-950 font-medium text-xs">Test Interaction</button>
  <p id="out" class="mt-3 text-xs font-mono text-blue-300"></p>
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

  const extractHtmlBlock = (raw: string): string => {
    const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1].trim()) return fenced[1].trim();
    return raw.trim();
  };

  const handleGenerateApp = async (templatePrompt?: string) => {
    const prompt = (templatePrompt || promptInput).trim();
    if (!prompt || isGenerating) return;

    soundFx.playClick();
    setIsGenerating(true);
    const routerSnap = intelligenceRouter.getEffectiveStatus();
    const useLocal = routerSnap.mode === 'offline' || !routerSnap.networkOnline;
    setStatusMessage(
      useLocal ? 'Generating app locally with active on-device model...' : 'Creating application with Gemini...'
    );
    setDebugDiagnosis(null);
    setSandboxErrors([]);

    try {
      const appName = templatePrompt || prompt.slice(0, 36);
      if (useLocal) {
        const localOut = await localInferenceRuntime.generateResponse(
          `Return ONLY a complete single-file HTML5 app with inline Tailwind/CSS and vanilla JS for: ${prompt}`
        );
        const html = extractHtmlBlock(localOut.text);
        const generated: GeneratedApp = {
          id: `app_local_${Date.now()}`,
          name: appName,
          description: `Generated offline by ${localOut.modelName}`,
          category: 'Offline Studio',
          version: '1.0.0',
          prompt,
          status: 'ready',
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          files: [{ path: 'index.html', language: 'html', content: html }],
          previewHtml: html,
        };
        if (currentApp) pushSnapshot(currentApp, `Before "${appName}"`);
        setCurrentApp(generated);
        setApps((prev) => [generated, ...prev]);
        setSelectedFileIdx(0);
        setPromptInput('');
        setStatusMessage(`Created "${generated.name}" locally (${localOut.modelName}).`);
        soundFx.playAuthorize();
        return;
      }

      const res = await apiService.generateStudioApp(prompt, appName, 'Custom');
      if (currentApp) pushSnapshot(currentApp, `Before "${appName}"`);
      setCurrentApp(res.app);
      setApps((prev) => [res.app, ...prev.filter((a) => a.id !== res.app.id)]);
      setSelectedFileIdx(0);
      setPromptInput('');
      setStatusMessage(res.message || `Created ${res.app.name}`);
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
    setStatusMessage('Updating application...');
    pushSnapshot(currentApp, `Before edit: "${modifyInput.slice(0, 30)}"`);

    const routerSnap = intelligenceRouter.getEffectiveStatus();
    const useLocal = routerSnap.mode === 'offline' || !routerSnap.networkOnline;

    try {
      if (useLocal) {
        const currentHtml = currentApp.files[0]?.content || currentApp.previewHtml || '';
        const localOut = await localInferenceRuntime.generateResponse(
          `Update this HTML app according to: "${modifyInput.trim()}". Return ONLY the updated complete HTML.\n\n${currentHtml}`
        );
        const patched = extractHtmlBlock(localOut.text);
        const updatedFiles = currentApp.files.map((f, idx) =>
          idx === 0 ? { ...f, content: patched } : f
        );
        setCurrentApp({
          ...currentApp,
          files: updatedFiles,
          previewHtml: patched,
          lastModified: new Date().toISOString(),
        });
        setModifyInput('');
        setStatusMessage(`Updated locally (${localOut.modelName}).`);
        soundFx.playAuthorize();
        return;
      }

      const res = await apiService.modifyStudioApp(currentApp.id, modifyInput.trim());
      setCurrentApp(res.app);
      setModifyInput('');
      setStatusMessage('Application updated.');
      soundFx.playAuthorize();
    } catch (err: any) {
      soundFx.playAbort();
      setStatusMessage(`Update failed: ${err?.message || 'Failed'}`);
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
    setStatusMessage('Checking code with AI Debugger...');

    const routerSnap = intelligenceRouter.getEffectiveStatus();
    const useLocal = routerSnap.mode === 'offline' || !routerSnap.networkOnline;

    try {
      if (useLocal) {
        const localOut = await localInferenceRuntime.generateResponse(
          `Inspect and fix any JavaScript or HTML issues (${sandboxErrors.join('; ') || 'none reported'}). Return corrected HTML.\n\n${htmlSource}`
        );
        const patched = extractHtmlBlock(localOut.text);
        pushSnapshot(currentApp, 'Before Local AI Debug');
        const updatedFiles = currentApp.files.map((f, idx) =>
          idx === 0 ? { ...f, content: patched } : f
        );
        setCurrentApp({
          ...currentApp,
          files: updatedFiles,
          previewHtml: patched,
          lastModified: new Date().toISOString(),
        });
        setDebugDiagnosis({
          diagnosis: `Inspected locally via ${localOut.modelName}`,
          fixes: ['Applied local code review suggestions'],
        });
        setSandboxErrors([]);
        setStatusMessage('Local debug review applied.');
        soundFx.playAuthorize();
        return;
      }

      const res = await apiService.debugStudioApp(htmlSource, sandboxErrors.join('\n'), currentApp.description);
      pushSnapshot(currentApp, 'Before AI Debug Fix');
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
      setStatusMessage('Debug fixes applied.');
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
    setStatusMessage(`Restored snapshot from ${new Date(snap.timestamp).toLocaleTimeString()}`);
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
    setStatusMessage('Exported standalone HTML file.');
  };

  const handleInspectGithub = async () => {
    if (!repoInput.trim()) return;
    const routerSnap = intelligenceRouter.getEffectiveStatus();
    if (routerSnap.mode === 'offline' || !routerSnap.networkOnline) {
      setStatusMessage('GitHub repository inspection is an Online-Only feature and requires internet access.');
      return;
    }
    soundFx.playClick();
    setIsLoadingGithub(true);
    try {
      const data = await apiService.inspectGithubRepo(repoInput.trim());
      setGithubData(data);
      soundFx.playAuthorize();
    } catch (err: any) {
      soundFx.playAbort();
      setStatusMessage(`GitHub error: ${err?.message}`);
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
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Clean Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">SURYA Studio</h2>
          <p className="text-xs text-slate-400">Create apps, preview live, or check GitHub builds</p>
        </div>
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'preview', label: 'Preview' },
              { id: 'code', label: 'Code' },
              { id: 'github', label: 'GitHub' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                soundFx.playClick();
                setStudioTab(t.id);
                if (t.id === 'github' && !githubData) handleInspectGithub();
              }}
              className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                studioTab === t.id
                  ? 'bg-[#d4a84f] text-slate-950 font-semibold'
                  : 'bg-[#121826] border border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Create App & Recent Projects */}
      <div className="p-4 rounded-2xl bg-[#121826] border border-slate-800/80 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Describe an app to create..."
            className="flex-1 min-w-[200px] min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#d4a84f]"
          />
          <button
            type="button"
            onClick={() => handleGenerateApp()}
            disabled={isGenerating || !promptInput.trim()}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-[#d4a84f] hover:bg-[#e0b65f] disabled:opacity-40 text-slate-950 text-xs font-semibold flex items-center gap-1.5"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isGenerating ? 'Creating...' : 'Create App'}</span>
          </button>
        </div>

        {/* My Projects / Recent Projects */}
        {apps.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs text-slate-400 block">Recent Projects</span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {apps.map((appItem) => (
                <button
                  key={appItem.id}
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setCurrentApp(appItem);
                    setSelectedFileIdx(0);
                  }}
                  className={`min-h-[34px] px-3 py-1 rounded-xl text-xs whitespace-nowrap border transition-colors ${
                    currentApp?.id === appItem.id
                      ? 'bg-[#1a2438] border-[#d4a84f]/60 text-slate-100 font-medium'
                      : 'bg-[#0b0f17] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {appItem.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="px-3.5 py-2.5 rounded-xl bg-[#121826] border border-slate-800 text-xs text-slate-200">
          {statusMessage}
        </div>
      )}

      {/* PREVIEW TAB */}
      {studioTab === 'preview' && currentApp && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-[#121826] border border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{currentApp.name}</h3>
              <p className="text-xs text-slate-400">{currentApp.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAIDebug}
                disabled={isDebugging}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#0b0f17] border border-slate-700 hover:border-slate-600 text-[#60a5fa] text-xs font-medium flex items-center gap-1.5"
              >
                <Bug className={`w-3.5 h-3.5 ${isDebugging ? 'animate-spin' : ''}`} />
                <span>{isDebugging ? 'Checking...' : 'AI Debug'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportHtml}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[#0b0f17] border border-slate-700 hover:border-slate-600 text-[#d4a84f] text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export HTML</span>
              </button>
            </div>
          </div>

          {sandboxErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-950/35 border border-rose-500/30 text-xs text-rose-200">
              Runtime errors: {sandboxErrors.join(' | ')}
            </div>
          )}

          {debugDiagnosis && (
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
              <span className="font-medium text-emerald-300 block">
                Diagnosis: {debugDiagnosis.diagnosis}
              </span>
              <ul className="list-disc pl-4 text-slate-300">
                {debugDiagnosis.fixes.map((f, idx) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#070a12] h-80">
            <iframe
              srcDoc={instrumentedHtml}
              sandbox="allow-scripts"
              title="SURYA Studio Preview"
              className="w-full h-full border-0"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={modifyInput}
              onChange={(e) => setModifyInput(e.target.value)}
              placeholder="Ask SURYA to update this app..."
              className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#121826] border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#d4a84f]"
            />
            <button
              type="button"
              onClick={handleModifyApp}
              disabled={isGenerating || !modifyInput.trim()}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#121826] hover:bg-slate-800 border border-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5 text-[#d4a84f]" />
              <span>Update</span>
            </button>
          </div>
        </div>
      )}

      {/* CODE TAB */}
      {studioTab === 'code' && currentApp && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 p-3.5 rounded-2xl bg-[#121826] border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {currentApp.files.map((f, idx) => (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setSelectedFileIdx(idx)}
                  className={`px-3 py-1 rounded-lg font-mono text-xs flex items-center gap-1 ${
                    selectedFileIdx === idx
                      ? 'bg-[#d4a84f] text-slate-950 font-semibold'
                      : 'bg-[#0b0f17] text-slate-300 border border-slate-800'
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
              className="w-full p-3 rounded-xl bg-[#0b0f17] border border-slate-800 font-mono text-xs text-slate-100 focus:outline-none focus:border-[#d4a84f]"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-[#121826] border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
              <History className="w-4 h-4 text-[#d4a84f]" />
              <span>Version History</span>
            </div>
            {versionHistory.length === 0 ? (
              <p className="text-xs text-slate-400">
                Snapshots are saved automatically whenever you generate, update, or debug.
              </p>
            ) : (
              <div className="space-y-2">
                {versionHistory.map((snap) => (
                  <div key={snap.id} className="p-2.5 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-1">
                    <span className="text-xs font-medium text-slate-200 block">{snap.note}</span>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
                      <span>{new Date(snap.timestamp).toLocaleTimeString()}</span>
                      <button
                        type="button"
                        onClick={() => handleRollback(snap)}
                        className="text-[#d4a84f] hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GITHUB TAB */}
      {studioTab === 'github' && (
        <div className="p-4 rounded-2xl bg-[#121826] border border-slate-800 space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="owner/repo"
              className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs font-mono text-slate-100"
            />
            <button
              type="button"
              onClick={handleInspectGithub}
              disabled={isLoadingGithub}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[#d4a84f] text-slate-950 text-xs font-semibold flex items-center gap-1.5"
            >
              <GitBranch className={`w-4 h-4 ${isLoadingGithub ? 'animate-spin' : ''}`} />
              <span>{isLoadingGithub ? 'Loading...' : 'Inspect Repo'}</span>
            </button>
          </div>

          {githubData && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{githubData.fullName}</h3>
                  <p className="text-xs text-slate-400">{githubData.description || 'Repository'}</p>
                </div>
                <a
                  href={githubData.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#121826] border border-slate-700 text-[#d4a84f] text-xs flex items-center gap-1"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-2">
                  <span className="text-xs font-medium text-[#60a5fa] block">Recent Commits</span>
                  {githubData.recentCommits.map((c) => (
                    <div key={c.sha} className="text-xs border-b border-slate-800/70 pb-1.5">
                      <span className="font-mono text-[#d4a84f] mr-1.5">{c.sha}</span>
                      <span className="text-slate-200">{c.message}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-2">
                  <span className="text-xs font-medium text-emerald-300 block">Workflow Runs</span>
                  {githubData.recentBuilds.map((b) => (
                    <div key={b.id} className="text-xs border-b border-slate-800/70 pb-1.5 flex items-center justify-between">
                      <span className="text-slate-200 truncate pr-2">
                        #{b.runNumber} {b.name}
                      </span>
                      <span
                        className={`text-[11px] shrink-0 ${
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
