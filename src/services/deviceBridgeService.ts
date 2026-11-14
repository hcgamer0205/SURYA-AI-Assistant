/**
 * SURYA Native & Web Device Telemetry Bridge
 * Reads authentic Battery, Connectivity, Bluetooth Audio, Foreground Service,
 * Notification, and Permission states across Android WebView & Modern Browsers.
 */

import { DeviceTelemetry, TabType } from '../types/surya';

type TelemetryListener = (telemetry: DeviceTelemetry) => void;
type DeepActionListener = (tab: TabType, action: string) => void;

class DeviceBridgeService {
  private telemetry: DeviceTelemetry = {
    platform: 'web',
    batteryLevel: null,
    isCharging: null,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    networkType: 'unknown',
    bluetoothAudioConnected: false,
    handsFreeServiceRunning: false,
    updatedAt: new Date().toISOString(),
  };

  private listeners: TelemetryListener[] = [];
  private deepActionListeners: DeepActionListener[] = [];
  private pollTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.refreshTelemetry();

      window.addEventListener('online', () => this.refreshTelemetry());
      window.addEventListener('offline', () => this.refreshTelemetry());

      window.addEventListener('onHandsFreeServiceState', (e: any) => {
        const running = Boolean(e?.detail?.running);
        this.telemetry = {
          ...this.telemetry,
          handsFreeServiceRunning: running,
          updatedAt: new Date().toISOString(),
        };
        this.notify();
      });

      window.addEventListener('onSuryaDeepAction', (e: any) => {
        const action = String(e?.detail?.action || '').toLowerCase();
        let targetTab: TabType = 'core';
        if (action === 'optics' || action === 'vision') targetTab = 'optics';
        else if (action === 'productivity' || action === 'tasks' || action === 'agenda') targetTab = 'productivity';
        else if (action === 'voice' || action === 'chat') targetTab = 'chat';

        for (const cb of this.deepActionListeners) {
          cb(targetTab, action);
        }
      });

      this.pollTimer = setInterval(() => this.refreshTelemetry(), 15000);
    }
  }

  public isNativeAndroid(): boolean {
    const bridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    return Boolean(bridge && typeof bridge.isNativeAndroid === 'function' && bridge.isNativeAndroid());
  }

  public async refreshTelemetry(): Promise<DeviceTelemetry> {
    if (typeof window === 'undefined') return this.telemetry;

    const bridge = (window as any).AndroidSuryaBridge;
    if (bridge && typeof bridge.getDeviceTelemetry === 'function') {
      try {
        const raw = bridge.getDeviceTelemetry();
        const parsed = JSON.parse(raw);
        if (!parsed.error) {
          this.telemetry = {
            platform: 'android',
            batteryLevel: typeof parsed.batteryLevel === 'number' && parsed.batteryLevel >= 0 ? parsed.batteryLevel : null,
            isCharging: typeof parsed.isCharging === 'boolean' ? parsed.isCharging : null,
            online: Boolean(parsed.online),
            networkType: parsed.networkType || 'connected',
            bluetoothAudioConnected: Boolean(parsed.bluetoothAudioConnected),
            handsFreeServiceRunning: Boolean(parsed.handsFreeServiceRunning),
            sdkVersion: parsed.sdkVersion,
            deviceModel: parsed.deviceModel,
            updatedAt: new Date().toISOString(),
          };
          this.notify();
          return this.telemetry;
        }
      } catch (e) {
        console.warn('[DeviceBridge] Android telemetry parse warning:', e);
      }
    }

    // Browser telemetry fallback (real browser APIs only, never faked)
    const nav: any = navigator;
    let batteryLevel: number | null = this.telemetry.batteryLevel;
    let isCharging: boolean | null = this.telemetry.isCharging;
    if (typeof nav.getBattery === 'function') {
      try {
        const bat = await nav.getBattery();
        batteryLevel = Math.round((bat.level ?? 0) * 100);
        isCharging = Boolean(bat.charging);
      } catch {}
    }

    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    const netType = !navigator.onLine ? 'offline' : conn?.effectiveType || conn?.type || 'online';

    this.telemetry = {
      platform: 'web',
      batteryLevel,
      isCharging,
      online: navigator.onLine,
      networkType: String(netType),
      bluetoothAudioConnected: false,
      handsFreeServiceRunning: false,
      updatedAt: new Date().toISOString(),
    };
    this.notify();
    return this.telemetry;
  }

  public getTelemetry(): DeviceTelemetry {
    return { ...this.telemetry };
  }

  public subscribe(cb: TelemetryListener): () => void {
    this.listeners.push(cb);
    cb({ ...this.telemetry });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public onDeepAction(cb: DeepActionListener): () => void {
    this.deepActionListeners.push(cb);
    return () => {
      this.deepActionListeners = this.deepActionListeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    const snap = { ...this.telemetry };
    for (const cb of this.listeners) {
      cb(snap);
    }
  }

  public startHandsFreeService(): boolean {
    const bridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (bridge && typeof bridge.startHandsFreeForegroundService === 'function') {
      try {
        const ok = Boolean(bridge.startHandsFreeForegroundService());
        this.refreshTelemetry();
        return ok;
      } catch {
        return false;
      }
    }
    return false;
  }

  public stopHandsFreeService(): void {
    const bridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (bridge && typeof bridge.stopHandsFreeForegroundService === 'function') {
      try {
        bridge.stopHandsFreeForegroundService();
        this.refreshTelemetry();
      } catch {}
    }
  }

  public requestNativePermissions(): boolean {
    const bridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (bridge && typeof bridge.requestRuntimePermissions === 'function') {
      bridge.requestRuntimePermissions();
      return true;
    }
    return false;
  }

  public sendNotification(title: string, body: string): boolean {
    const bridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (bridge && typeof bridge.sendLocalNotification === 'function') {
      return Boolean(bridge.sendLocalNotification(title, body));
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body });
      return true;
    }
    return false;
  }

  public launchApp(packageName: string, action?: string, dataUri?: string): boolean {
    const bridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (bridge && typeof bridge.launchIntent === 'function') {
      try {
        return Boolean(
          bridge.launchIntent(
            action || 'android.intent.action.VIEW',
            dataUri || '',
            packageName || ''
          )
        );
      } catch {
        return false;
      }
    }
    return false;
  }
}

export const deviceBridgeService = new DeviceBridgeService();
