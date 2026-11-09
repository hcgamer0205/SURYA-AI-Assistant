import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Atom, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';
import { ScientificArticle } from '../types/surya';
import { apiService } from '../services/apiService';
import { soundFx } from '../services/soundFx';

export const ScientificKnowledge: React.FC = () => {
  const [articles, setArticles] = useState<ScientificArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<ScientificArticle | null>(null);
  const [aiDeepDive, setAiDeepDive] = useState<string | null>(null);
  const [isLoadingDeepDive, setIsLoadingDeepDive] = useState(false);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async (query?: string) => {
    try {
      const data = await apiService.getScientificArticles(query);
      setArticles(data.articles);
    } catch (e) {
      console.warn('Failed to load scientific database:', e);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    loadArticles(searchQuery);
  };

  const handleSelectArticle = (art: ScientificArticle) => {
    soundFx.playClick();
    setSelectedArticle(art);
    setAiDeepDive(null);
  };

  const handleRequestDeepDive = async (art: ScientificArticle) => {
    soundFx.playClick();
    setIsLoadingDeepDive(true);
    setAiDeepDive(null);
    try {
      const res = await apiService.sendChatMessage(
        `Provide an advanced scientific breakdown of: "${art.title}" (${art.domain}).
Explain the underlying physics/mathematics, core telemetry equation (${art.telemetryFormula}), and practical applications in high-performance engineering.`,
        []
      );
      soundFx.playAuthorize();
      setAiDeepDive(res.text);
    } catch (err: any) {
      soundFx.playAbort();
      setAiDeepDive(`Error fetching AI explanation: ${err.message}`);
    } finally {
      setIsLoadingDeepDive(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Atom className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider text-cyan-400 uppercase">
            SCIENTIFIC KNOWLEDGE ARCHIVE
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          ASTROPHYSICS · QUANTUM · CYBERNETICS
        </span>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search equations, quantum mechanics, physics..."
          className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-xl pl-9 pr-20 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase hover:bg-cyan-400"
        >
          QUERY
        </button>
      </form>

      {/* Articles List / Detail Split */}
      {!selectedArticle ? (
        <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
          {articles.map((art) => (
            <div
              key={art.id}
              onClick={() => handleSelectArticle(art)}
              className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">
                    {art.domain}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <h3 className="text-xs font-semibold text-slate-100 mt-1">
                  {art.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {art.summary}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="text-cyan-400 font-semibold truncate max-w-[240px]">
                  Formula: {art.telemetryFormula}
                </span>
                <span className="text-slate-400">INSPECT</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-3 max-h-[65vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              {selectedArticle.domain}
            </span>
            <button
              onClick={() => setSelectedArticle(null)}
              className="text-xs font-mono text-slate-400 hover:text-slate-200"
            >
              &larr; BACK TO ARCHIVE
            </button>
          </div>

          <h3 className="text-sm font-bold text-slate-100">
            {selectedArticle.title}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed">
            {selectedArticle.summary}
          </p>

          {/* Formula Telemetry Box */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300">
            <div className="text-[10px] text-slate-500 mb-1">GOVERNING RELATION:</div>
            <div className="font-bold text-cyan-200">{selectedArticle.telemetryFormula}</div>
          </div>

          {/* Key Principles */}
          <div>
            <div className="text-[11px] font-mono font-semibold text-slate-300 mb-1.5">
              AXIOMS & VERIFIED OBSERVATIONS:
            </div>
            <ul className="space-y-1">
              {selectedArticle.principles.map((pr, idx) => (
                <li key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{pr}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gemini AI Synthesis Action */}
          <div className="pt-2">
            {!aiDeepDive ? (
              <button
                onClick={() => handleRequestDeepDive(selectedArticle)}
                disabled={isLoadingDeepDive}
                className="w-full min-h-[44px] py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {isLoadingDeepDive ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>SYNTHESIZING SCIENTIFIC REPORT...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>SYNTHESIZE WITH GEMINI AI</span>
                  </>
                )}
              </button>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 text-xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed max-h-56 overflow-y-auto">
                <div className="text-[10px] text-cyan-400 font-bold mb-2">
                  GEMINI SCIENTIFIC SYNTHESIS:
                </div>
                {aiDeepDive}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
