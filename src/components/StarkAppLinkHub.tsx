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
import { StarkApp } from '../types/surya';
import { apiService } from '../services/apiService';
import { deviceBridgeService } from '../services/deviceBridgeService';
import { intelligenceRouter } from '../services/intelligenceRouter';
import { soundFx } from '../services/soundFx';

interface StarkAppLinkHubProps {
  onRequestVeronicaAuth: (app: StarkApp, onAuthorized: () => void) => void;
}

const OFFLINE_LOCAL_APPS: StarkApp[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    package: 'com.google.android.youtube',
    scheme: 'https://youtube.com',
    action: 'android.intent.action.VIEW',
    category: 'Communication',
    icon: 'Globe',
    description: 'Open video media player',
    riskLevel: 'LOW',
  },
  {
    id: 'chrome',
    name: 'Chrome Browser',
    package: 'com.android.chrome',
    scheme: 'https://google.com',
    action: 'android.intent.action.VIEW',
    category: 'Communication',
    icon: 'Globe',
    description: 'Launch web browser',
    riskLevel: 'LOW',
  },
  {
    id: 'maps',
    name: 'Maps & Navigation',
    package: 'com.google.android.apps.maps',
    scheme: 'https://maps.google.com',
    action: 'android.intent.action.VIEW',
    category: 'Navigation',
    icon: 'Navigation',
    description: 'Open navigation maps',
    riskLevel: 'LOW',
  },
  {
    id: 'camera',
    name: 'Camera',
    package: 'android.media.action.IMAGE_CAPTURE',
    scheme: 'android.media.action.IMAGE_CAPTURE',
    action: 'android.media.action.IMAGE_CAPTURE',
    category: 'Sensors',
    icon: 'Camera',
    description: 'Launch device camera capture',
    riskLevel: 'MEDIUM',
  },
  {
    id: 'settings',
    name: 'Android Settings',
    package: 'android.settings.SETTINGS',
    scheme: 'android.settings.SETTINGS',
    action: 'android.settings.SETTINGS',
    category: 'System',
    icon: 'Settings',
    description: 'Open system settings panel',
    riskLevel: 'HIGH',
  },
  {
    id: 'wifi',
    name: 'Wi-Fi Settings',
    package: 'android.settings.WIFI_SETTINGS',
    scheme: 'android.settings.WIFI_SETTINGS',
    action: 'android.settings.WIFI_SETTINGS',
    category: 'System',
    icon: 'Wifi',
    description: 'Open wireless network controls',
    riskLevel: 'HIGH',
  },
  {
    id: 'phone',
    name: 'Phone Dialer',
    package: 'android.intent.action.DIAL',
    scheme: 'tel:',
    action: 'android.intent.action.DIAL',
    category: 'Communication',
    icon: 'Phone',
    description: 'Open Android dialer',
    riskLevel: 'MEDIUM',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    package: 'com.whatsapp',
    scheme: 'https://wa.me',
    action: 'android.intent.action.VIEW',
    category: 'Communication',
    icon: 'Globe',
    description: 'Open messaging client',
    riskLevel: 'LOW',
  },
];

export const StarkAppLinkHub: React.FC<StarkAppLinkHubProps> = ({ onRequestVeronicaAuth }) => {
  const [apps, setApps] = useState<StarkApp[]>(OFFLINE_LOCAL_APPS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [launchStatus, setLaunchStatus] = useState<{ id: string; msg: string; success: boolean } | null>(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    const snap = intelligenceRouter.getEffectiveStatus();
    if (snap.mode === 'offline' || !snap.networkOnline) {
      setApps(OFFLINE_LOCAL_APPS);
      return;
    }
    try {
      const data = await apiService.getStarkApps();
      if (Array.isArray(data.apps) && data.apps.length > 0) {
        setApps(data.apps);
      }
    } catch {
      setApps(OFFLINE_LOCAL_APPS);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Globe':
        return <Globe className="w-4 h-4 text-[#60a5fa]" />;
      case 'Settings':
        return <Settings className="w-4 h-4 text-slate-300" />;
      case 'Navigation':
        return <Navigation className="w-4 h-4 text-emerald-400" />;
      case 'Camera':
        return <Camera className="w-4 h-4 text-[#d4a84f]" />;
      case 'Phone':
        return <Phone className="w-4 h-4 text-[#60a5fa]" />;
      case 'Wifi':
        return <Wifi className="w-4 h-4 text-[#60a5fa]" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      default:
        return <ExternalLink className="w-4 h-4 text-[#60a5fa]" />;
    }
  };

  const handleLaunch = (app: StarkApp) => {
    soundFx.playClick();

    if (app.riskLevel === 'HIGH') {
      onRequestVeronicaAuth(app, async () => {
        dispatchIntent(app, true);
      });
      return;
    }

    dispatchIntent(app, false);
  };

  const dispatchIntent = async (app: StarkApp, authorized: boolean) => {
    const dispatchedLocally = deviceBridgeService.launchApp(app.package, app.action);
    if (dispatchedLocally) {
      soundFx.playAuthorize();
      setLaunchStatus({
        id: app.id,
        msg: `Dispatched local Android intent for ${app.name}.`,
        success: true,
      });
      setTimeout(() => setLaunchStatus(null), 4000);
      return;
    }

    const snap = intelligenceRouter.getEffectiveStatus();
    if (snap.mode === 'offline' || !snap.networkOnline) {
      soundFx.playAbort();
      setLaunchStatus({
        id: app.id,
        msg: `Offline browser preview: native Android intent for ${app.name} executes inside the Android APK.`,
        success: false,
      });
      setTimeout(() => setLaunchStatus(null), 5000);
      return;
    }

    try {
      await apiService.launchStarkApp(
        app.id,
        undefined,
        authorized ? 'challenge_auth' : undefined,
        authorized ? 'token_auth' : undefined
      );
      soundFx.playAuthorize();
      setLaunchStatus({
        id: app.id,
        msg: `Dispatched Android intent for ${app.name}.`,
        success: true,
      });

      if (app.scheme && app.scheme.startsWith('https://')) {
        window.dispatchEvent(
          new CustomEvent('suryaExternalFallback', {
            detail: {
              message: `Web preview fallback available for ${app.name}:`,
              url: app.scheme,
            },
          })
        );
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
    const matchesCat =
      selectedCategory === 'all' || app.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const categories = ['all', 'Communication', 'System', 'Navigation', 'Sensors', 'Security'];

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 py-4 pb-24 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#60a5fa]" />
          <h2 className="text-lg font-semibold text-slate-100">App Link Hub</h2>
        </div>
        <span className="text-xs text-slate-400">Local Android Intent Bus</span>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Android packages or actions..."
          className="w-full min-h-[42px] bg-[#121826] border border-slate-800 focus:border-[#d4a84f] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              soundFx.playClick();
              setSelectedCategory(cat);
            }}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-[#d4a84f] text-slate-950 font-semibold'
                : 'bg-[#121826] border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {launchStatus && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-xs border ${
            launchStatus.success
              ? 'bg-emerald-950/35 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/35 border-rose-500/30 text-rose-200'
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredApps.map((app) => (
          <div
            key={app.id}
            className="p-3.5 rounded-2xl bg-[#121826] border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0b0f17] border border-slate-800 flex items-center justify-center shrink-0">
                {getIcon(app.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-slate-100 truncate">{app.name}</h3>
                  <span
                    className={`text-[11px] font-medium shrink-0 ${
                      app.riskLevel === 'HIGH'
                        ? 'text-rose-300'
                        : app.riskLevel === 'MEDIUM'
                        ? 'text-[#d4a84f]'
                        : 'text-emerald-300'
                    }`}
                  >
                    {app.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{app.description}</p>
                <p className="text-[11px] font-mono text-slate-500 truncate mt-1">{app.package}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between">
              <span className="text-xs text-slate-400">{app.category}</span>
              <button
                type="button"
                onClick={() => handleLaunch(app)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
                  app.riskLevel === 'HIGH'
                    ? 'bg-rose-500/15 text-rose-200 border border-rose-500/35'
                    : 'bg-[#0b0f17] text-[#d4a84f] border border-slate-700 hover:border-[#d4a84f]'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Launch</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
