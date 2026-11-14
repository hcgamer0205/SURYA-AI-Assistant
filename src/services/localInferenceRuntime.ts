/**
 * SURYA Local Inference Runtime Singleton
 * Manages loading, unloading, token streaming, and memory guardrails for downloaded offline models.
 */

import { LocalInferenceRuntime } from './offlineModelRuntimeCore.js';
import { OFFLINE_MODEL_CATALOG } from './offlineModelHelpers.js';
import { deviceCapabilityService } from './deviceCapabilityService';
import { modelDownloadManager } from './modelDownloadManager';

const getNativeBridge = () =>
  typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge || null : null;

export const localInferenceRuntime = new LocalInferenceRuntime({
  getModelManifest: (id: string) => OFFLINE_MODEL_CATALOG.find((m) => m.id === id) || null,
  getDownloadState: (id: string) => modelDownloadManager.getState(id),
  getDeviceSnapshot: () => deviceCapabilityService.getSnapshot(),
  nativeBridgeProvider: getNativeBridge,
});

if (typeof window !== 'undefined') {
  window.addEventListener('onLocalLlmToken', (e: any) => {
    if (e?.detail) {
      localInferenceRuntime.handleNativeTokenEvent(e.detail);
    }
  });
}
