import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, AlertTriangle, FileCode, CheckCircle2 } from 'lucide-react';
import { apiService } from '../services/apiService';
import { soundFx } from '../services/soundFx';

export const SelfImprovementReport: React.FC = () => {
  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    soundFx.playClick();
    setIsGenerating(true);
    setReport(null);
    try {
      const data = await apiService.getSelfImprovementReport();
      soundFx.playAuthorize();
      setReport(data.report);
    } catch (err: any) {
      soundFx.playAbort();
      setReport(`Diagnostic failure: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider text-cyan-400 uppercase">
            CONTROLLED SELF-IMPROVEMENT
          </h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-700/50">
          DEVELOPER SIGN-OFF REQUIRED
        </span>
      </div>

      {/* Safety Notice */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          SURYA Self-Improvement operates strictly under Human-in-the-Loop governance.
          The engine analyzes diagnostics and proposes targeted optimizations, but never executes autonomous code changes without verified developer review.
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={handleGenerateReport}
        disabled={isGenerating}
        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md shadow-cyan-500/20"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>AUDITING RUNTIME DIAGNOSTICS...</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            <span>RUN CONTROLLED CODE & PIPELINE AUDIT</span>
          </>
        )}
      </button>

      {/* Report Display */}
      {report && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[55vh] overflow-y-auto">
          <div className="flex items-center gap-2 text-cyan-400 font-bold mb-3 border-b border-slate-800 pb-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>DIAGNOSTIC ADVISORY REPORT // VERIFIED</span>
          </div>
          {report}
        </div>
      )}
    </div>
  );
};
