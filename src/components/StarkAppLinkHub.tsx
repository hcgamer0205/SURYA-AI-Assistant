import React, { useState, useEffect } from 'react';
import {
  Globe,
  Settings,
  Navigation,
  Camera,
  Phone,
  Wifi,
  ShieldAlert,
  ExternalLink,
  Play,
  Search,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { StarkApp, RiskLevel } from '../types/surya';
import { apiService } from '../services/apiService';
import { soundFx } from '../services/soundFx';

interface StarkAppLinkHubProps {
  onRequestVeronicaAuth: (app: StarkApp, onAuthorized: () => void) => void;
}

export const StarkAppLinkHub: React.FC<StarkAppLinkHubProps> = ({ onRequestVeronicaAuth }) => {
  const [apps, setApps] = useState<StarkApp[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [launchStatus, setLaunchStatus] = useState<{ id: string; msg: string; success: boolean } | null>(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const data = await apiService.getStarkApps();
      setApps(data.apps);
    } catch (err) {
      console.warn('Failed to fetch apps:', err);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Globe':
        return <Globe className="w-5 h-5 text-cyan-400" />;
      case 'Settings':
        return <Settings className="w-5 h-5 text-slate-300" />;
      case 'Navigation':
        return <Navigation className="w-5 h-5 text-emerald-400" />;
      case 'Camera':
        return <Camera className="w-5 h-5 text-amber-400" />;
      case 'Phone':
        return <Phone className="w-5 h-5 text-indigo-400" />;
      case 'Wifi':
        return <Wifi className="w-5 h-5 text-blue-400" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      default:
        return <ExternalLink className="w-5 h-5 text-cyan-400" />;
    }
  };

  const handleLaunch = (app: StarkApp) => {
    soundFx.playClick();

    if (app.riskLevel === 'HIGH') {
      // Must trigger Veronica authorization workflow
      onRequestVeronicaAuth(app, async () => {
        dispatchIntent(app, true);
      });
      return;
    }

    dispatchIntent(app, false);
  };

  const dispatchIntent = async (app: StarkApp, authorized: boolean) => {
    try {
      const res = await apiService.launchStarkApp(
        app.id,
        undefined,
        authorized ? 'challenge_auth' : undefined,
        authorized ? 'token_auth' : undefined
      );
      soundFx.playAuthorize();
      setLaunchStatus({
        id: app.id,
        msg: `Dispatched Android Intent for ${app.name}`,
        success: true,
      });

      // If running on a browser/PWA, attempt to open link if web-compatible
      if (app.scheme && app.scheme.startsWith('https://')) {
        window.open(app.scheme, '_blank');
      }

      setTimeout(() => setLaunchStatus(null), 4000);
    } catch (err: any) {
      soundFx.playAbort();
      setLaunchStatus({
        id: app.id,
        msg: err.message || 'Intent dispatch denied.',
        success: false,
      });
      setTimeout(() => setLaunchStatus(null), 5000);
    }
  };

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.package.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || app.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const categories = ['all', 'Communication', 'System', 'Navigation', 'Sensors', 'Security'];

  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-cyan-400" />
          <h2 className="text-sm font-mono font-bold tracking-wider text-cyan-400 uppercase">
            STARK APP LINK HUB
          </h2>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          ANDROID SDK 36 INTENT BUS
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search package intents or deep links..."
          className="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Category Segmented Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              soundFx.playClick();
              setSelectedCategory(cat);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Launch Status Banner */}
      {launchStatus && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-xs font-mono animate-fade-in ${
            launchStatus.success
              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
          }`}
        >
          {launchStatus.success ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{launchStatus.msg}</span>
        </div>
      )}

      {/* App Intent Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[60vh] pr-1">
        {filteredApps.map((app) => (
          <div
            key={app.id}
            className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center shrink-0 border border-slate-700/60 group-hover:border-cyan-400/40">
                {getIcon(app.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-100 truncate">
                    {app.name}
                  </h3>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      app.riskLevel === 'HIGH'
                        ? 'bg-rose-950 text-rose-400 border border-rose-700/50'
                        : app.riskLevel === 'MEDIUM'
                        ? 'bg-amber-950 text-amber-400 border border-amber-700/50'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                    }`}
                  >
                    {app.riskLevel} RISK
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {app.description}
                </p>
                <p className="text-[10px] font-mono text-cyan-400/80 truncate mt-1">
                  pkg: {app.package}
                </p>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">
                {app.category}
              </span>
              <button
                onClick={() => handleLaunch(app)}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                  app.riskLevel === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>DISPATCH INTENT</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
