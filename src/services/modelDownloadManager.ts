/**
 * SURYA Android-Compatible Model Download Manager Singleton
 * Syncs with native AndroidSuryaBridge download events or executes verified streamed downloads.
 */

import { ModelDownloadManager } from './offlineModelRuntimeCore.js';
import { OFFLINE_MODEL_CATALOG } from './offlineModelHelpers.js';
import { deviceCapabilityService } from './deviceCapabilityService';
import { localInferenceRuntime } from './localInferenceRuntime';

const getNativeBridge = () =>
  typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge || null : null;

export const modelDownloadManager = new ModelDownloadManager({
  catalog: OFFLINE_MODEL_CATALOG,
  getDeviceSnapshot: () => deviceCapabilityService.getSnapshot(),
  isModelActiveCheck: (modelId: string) => localInferenceRuntime.isModelActive(modelId),
  nativeBridgeProvider: getNativeBridge,
});

if (typeof window !== 'undefined') {
  const syncInventory = () => {
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.listDownloadedModels === 'function') {
      try {
        const raw = bridge.listDownloadedModels();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          modelDownloadManager.syncNativeModelInventory(parsed);
        }
      } catch {}
    }
  };

  syncInventory();

  window.addEventListener('onModelDownloadProgress', (e: any) => {
    if (e?.detail) modelDownloadManager.syncNativeDownloadEvent(e.detail);
  });
  window.addEventListener('onModelDownloadComplete', (e: any) => {
    if (e?.detail) {
      modelDownloadManager.syncNativeDownloadEvent(e.detail);
      deviceCapabilityService.refresh().catch(() => {});
    }
  });
  window.addEventListener('onModelDownloadError', (e: any) => {
    if (e?.detail) modelDownloadManager.syncNativeDownloadEvent(e.detail);
  });
}
