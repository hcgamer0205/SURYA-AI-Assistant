/**
 * SURYA Offline AI Core Engines (ESM + JSDoc/.d.ts)
 * Implements Download Manager state machine, Local Runtime lifecycle,
 * and Unified Intelligence Router without faking inference or bypassing safety gates.
 */

import {
  OFFLINE_MODEL_CATALOG,
  evaluateModelCompatibility,
  buildRecommendedTiers,
  isTrustedModelUrl,
  sanitizeModelFilename,
  verifyDigestMatch,
} from './offlineModelHelpers.js';

export class LocalRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LocalRuntimeError';
    this.code = code;
  }
}

/**
 * Download Manager supporting explicit operator confirmation, storage headroom verification,
 * duplicate protection, real progress/speed/ETA, pause/resume/cancel, SHA-256 verification,
 * corrupt file rejection, and active-model delete protection.
 */
export class ModelDownloadManager {
  constructor(options = {}) {
    this.catalog = options.catalog || OFFLINE_MODEL_CATALOG;
    this.getDeviceSnapshot = options.getDeviceSnapshot || (() => ({ platform: 'web' }));
    this.isModelActiveCheck = options.isModelActiveCheck || (() => false);
    this.nativeBridgeProvider = options.nativeBridgeProvider || (() => null);
    this.webFetcher = options.webFetcher || (typeof fetch !== 'undefined' ? fetch : null);
    this.storageStore = options.storageStore || createMemoryOrBrowserStore();
    this.digestCalculator = options.digestCalculator || computeSha256Hex;

    this.downloads = new Map();
    this.activeControllers = new Map();
    this.listeners = new Set();

    this.hydrateRecords();
  }

  hydrateRecords() {
    const saved = this.storageStore.listRecords();
    for (const rec of saved) {
      this.downloads.set(rec.modelId, {
        ...rec,
        speedBytesPerSec: 0,
        etaSeconds: null,
      });
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getAllStates());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snap = this.getAllStates();
    for (const cb of this.listeners) {
      try {
        cb(snap);
      } catch {}
    }
  }

  getModel(modelId) {
    return this.catalog.find((m) => m.id === modelId) || null;
  }

  getState(modelId) {
    const rec = this.downloads.get(modelId);
    if (rec) return { ...rec };
    return {
      modelId,
      status: 'not_downloaded',
      downloadedBytes: 0,
      totalBytes: this.getModel(modelId)?.sizeBytes || 0,
      progressPercent: 0,
      speedBytesPerSec: 0,
      etaSeconds: null,
      sha256: null,
      verificationStatus: 'unverified',
      localPath: null,
      error: null,
      updatedAt: null,
    };
  }

  getAllStates() {
    const out = {};
    for (const model of this.catalog) {
      out[model.id] = this.getState(model.id);
    }
    for (const [id, rec] of this.downloads.entries()) {
      if (!out[id]) out[id] = { ...rec };
    }
    return out;
  }

  getDownloadedModels() {
    return Array.from(this.downloads.values())
      .filter((r) => r.status === 'ready')
      .map((r) => ({ ...r }));
  }

  getTotalDownloadedBytes() {
    let total = 0;
    for (const rec of this.downloads.values()) {
      if (rec.status === 'ready') {
        total += rec.downloadedBytes || rec.totalBytes || 0;
      }
    }
    return total;
  }

  /**
   * Step 1: Validates compatibility, URL trust, duplicate status, and storage headroom,
   * transitioning model into 'awaiting_confirmation' (never starts large downloads silently).
   */
  requestDownloadConfirmation(modelId) {
    const model = this.getModel(modelId);
    if (!model) {
      throw new Error(`Model "${modelId}" was not found in the verified catalog.`);
    }

    const urlCheck = isTrustedModelUrl(model.sourceUrl);
    if (!urlCheck.valid) {
      throw new Error(urlCheck.reason || 'Untrusted model URL.');
    }

    const safeName = sanitizeModelFilename(model.fileName);
    const current = this.getState(modelId);

    if (current.status === 'downloading' || current.status === 'verifying') {
      throw new Error(`"${model.displayName}" is already downloading.`);
    }
    if (current.status === 'ready') {
      throw new Error(`"${model.displayName}" is already downloaded and verified.`);
    }

    const device = this.getDeviceSnapshot();
    const assessment = evaluateModelCompatibility(model, device);
    if (!assessment.canDownload) {
      throw new Error(assessment.blockers.join(' '));
    }

    const pendingRecord = {
      ...current,
      modelId,
      fileName: safeName,
      status: 'awaiting_confirmation',
      totalBytes: model.sizeBytes,
      error: null,
      updatedAt: new Date().toISOString(),
    };
    this.downloads.set(modelId, pendingRecord);
    this.notify();

    return {
      model,
      assessment,
      record: pendingRecord,
    };
  }

  cancelConfirmation(modelId) {
    const rec = this.downloads.get(modelId);
    if (rec && rec.status === 'awaiting_confirmation') {
      this.downloads.delete(modelId);
      this.notify();
    }
  }

  /**
   * Step 2: Operator explicitly confirms download (requires explicitConfirmed: true).
   */
  async confirmAndStartDownload(modelId, options = {}) {
    if (options.explicitConfirmed !== true) {
      throw new Error('Explicit user confirmation is required before downloading offline AI models.');
    }

    const model = this.getModel(modelId);
    if (!model) {
      throw new Error(`Unknown model ID: ${modelId}`);
    }

    const existing = this.getState(modelId);
    if (existing.status === 'downloading' || existing.status === 'verifying') {
      throw new Error(`Duplicate download blocked: "${model.displayName}" is already in progress.`);
    }
    if (existing.status === 'ready') {
      throw new Error(`"${model.displayName}" is already installed.`);
    }

    const urlCheck = isTrustedModelUrl(model.sourceUrl);
    if (!urlCheck.valid) {
      throw new Error(urlCheck.reason);
    }
    const safeFileName = sanitizeModelFilename(model.fileName);

    const device = this.getDeviceSnapshot();
    const assessment = evaluateModelCompatibility(model, device);
    if (!assessment.canDownload) {
      const errRec = {
        ...existing,
        modelId,
        status: 'failed',
        error: assessment.blockers.join(' '),
        updatedAt: new Date().toISOString(),
      };
      this.downloads.set(modelId, errRec);
      this.notify();
      throw new Error(errRec.error);
    }

    const bridge = this.nativeBridgeProvider();
    if (bridge && typeof bridge.startModelDownload === 'function') {
      this.downloads.set(modelId, {
        ...existing,
        modelId,
        fileName: safeFileName,
        status: 'downloading',
        totalBytes: model.sizeBytes,
        error: null,
        updatedAt: new Date().toISOString(),
      });
      this.notify();

      const raw = bridge.startModelDownload(
        modelId,
        urlCheck.normalizedUrl,
        safeFileName,
        model.expectedSha256 || '',
        model.sizeBytes
      );
      const res = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (res && res.started === false) {
        const failed = {
          ...this.getState(modelId),
          status: 'failed',
          error: res.error || 'Native Android downloader rejected start request.',
          updatedAt: new Date().toISOString(),
        };
        this.downloads.set(modelId, failed);
        this.notify();
        throw new Error(failed.error);
      }
      return this.getState(modelId);
    }

    // Standard streamed download (browser or Node test adapter)
    return this.runStreamDownload(model, urlCheck.normalizedUrl, safeFileName, existing.downloadedBytes || 0);
  }

  async runStreamDownload(model, url, safeFileName, resumeOffset = 0) {
    if (!this.webFetcher) {
      throw new Error('No fetch implementation available for model download.');
    }

    const controller = new AbortController();
    this.activeControllers.set(model.id, { controller, paused: false, cancelled: false });

    const startTime = Date.now();
    let downloadedBytes = resumeOffset;
    const expectedTotal = model.sizeBytes;

    this.downloads.set(model.id, {
      modelId: model.id,
      fileName: safeFileName,
      status: 'downloading',
      downloadedBytes,
      totalBytes: expectedTotal,
      progressPercent: expectedTotal > 0 ? Math.min(99, Math.round((downloadedBytes / expectedTotal) * 100)) : 0,
      speedBytesPerSec: 0,
      etaSeconds: null,
      sha256: null,
      verificationStatus: 'pending',
      localPath: null,
      error: null,
      updatedAt: new Date().toISOString(),
    });
    this.notify();

    try {
      const headers = {};
      if (resumeOffset > 0) {
        headers.Range = `bytes=${resumeOffset}-`;
      }

      const response = await this.webFetcher(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`Download failed with HTTP ${response.status}`);
      }

      const contentLengthHeader = Number(response.headers?.get?.('content-length') || 0);
      const totalBytes =
        response.status === 206 && contentLengthHeader > 0
          ? resumeOffset + contentLengthHeader
          : contentLengthHeader > 0
          ? contentLengthHeader
          : expectedTotal;

      const chunks = [];
      if (response.status !== 206 && resumeOffset > 0) {
        downloadedBytes = 0;
      }

      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value && value.byteLength > 0) {
            chunks.push(value);
            downloadedBytes += value.byteLength;
            const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
            const speed = Math.round(downloadedBytes / elapsedSec);
            const remaining = Math.max(0, totalBytes - downloadedBytes);
            const eta = speed > 0 ? Math.ceil(remaining / speed) : null;
            const pct = totalBytes > 0 ? Math.min(99, Math.round((downloadedBytes / totalBytes) * 100)) : 0;

            this.downloads.set(model.id, {
              ...this.getState(model.id),
              status: 'downloading',
              downloadedBytes,
              totalBytes,
              progressPercent: pct,
              speedBytesPerSec: speed,
              etaSeconds: eta,
              updatedAt: new Date().toISOString(),
            });
            this.notify();
          }
        }
      } else {
        const buf = new Uint8Array(await response.arrayBuffer());
        chunks.push(buf);
        downloadedBytes += buf.byteLength;
      }

      const merged = concatUint8Arrays(chunks);
      if (merged.byteLength === 0) {
        throw new Error('Downloaded model file is empty or incomplete.');
      }

      this.downloads.set(model.id, {
        ...this.getState(model.id),
        status: 'verifying',
        downloadedBytes: merged.byteLength,
        totalBytes: merged.byteLength,
        progressPercent: 100,
        speedBytesPerSec: 0,
        etaSeconds: 0,
        updatedAt: new Date().toISOString(),
      });
      this.notify();

      const actualSha = await this.digestCalculator(merged);
      const verification = verifyDigestMatch(actualSha, model.expectedSha256);

      if (!verification.valid) {
        await this.storageStore.removePayload(model.id);
        const corruptRec = {
          modelId: model.id,
          fileName: safeFileName,
          status: 'corrupted',
          downloadedBytes: 0,
          totalBytes: expectedTotal,
          progressPercent: 0,
          speedBytesPerSec: 0,
          etaSeconds: null,
          sha256: actualSha,
          verificationStatus: 'failed',
          localPath: null,
          error: verification.reason,
          updatedAt: new Date().toISOString(),
        };
        this.downloads.set(model.id, corruptRec);
        this.storageStore.saveRecord(corruptRec);
        this.notify();
        throw new Error(verification.reason);
      }

      const localPath = `surya_models/${safeFileName}`;
      await this.storageStore.savePayload(model.id, merged);

      const readyRec = {
        modelId: model.id,
        fileName: safeFileName,
        status: 'ready',
        downloadedBytes: merged.byteLength,
        totalBytes: merged.byteLength,
        progressPercent: 100,
        speedBytesPerSec: 0,
        etaSeconds: 0,
        sha256: verification.sha256,
        verificationStatus: verification.mode === 'pinned_verified' ? 'verified_manifest' : 'verified_sha256',
        localPath,
        error: null,
        updatedAt: new Date().toISOString(),
      };

      this.downloads.set(model.id, readyRec);
      this.storageStore.saveRecord(readyRec);
      this.notify();
      return { ...readyRec };
    } catch (err) {
      const meta = this.activeControllers.get(model.id);
      if (meta?.paused) {
        const pausedRec = {
          ...this.getState(model.id),
          status: 'paused',
          speedBytesPerSec: 0,
          etaSeconds: null,
          error: null,
          updatedAt: new Date().toISOString(),
        };
        this.downloads.set(model.id, pausedRec);
        this.storageStore.saveRecord(pausedRec);
        this.notify();
        return { ...pausedRec };
      }
      if (meta?.cancelled) {
        await this.storageStore.removePayload(model.id);
        this.storageStore.deleteRecord(model.id);
        this.downloads.delete(model.id);
        this.notify();
        return this.getState(model.id);
      }

      const prev = this.getState(model.id);
      if (prev.status === 'corrupted') {
        throw err;
      }

      const failedRec = {
        ...prev,
        status: 'failed',
        speedBytesPerSec: 0,
        etaSeconds: null,
        error: err?.message || 'Model download interrupted.',
        updatedAt: new Date().toISOString(),
      };
      this.downloads.set(model.id, failedRec);
      this.storageStore.saveRecord(failedRec);
      this.notify();
      throw err;
    } finally {
      this.activeControllers.delete(model.id);
    }
  }

  pauseDownload(modelId) {
    const bridge = this.nativeBridgeProvider();
    if (bridge && typeof bridge.pauseModelDownload === 'function') {
      bridge.pauseModelDownload(modelId);
    }
    const ctrl = this.activeControllers.get(modelId);
    if (ctrl) {
      ctrl.paused = true;
      ctrl.controller.abort();
    }
    const cur = this.getState(modelId);
    if (cur.status === 'downloading') {
      const updated = {
        ...cur,
        status: 'paused',
        speedBytesPerSec: 0,
        etaSeconds: null,
        updatedAt: new Date().toISOString(),
      };
      this.downloads.set(modelId, updated);
      this.storageStore.saveRecord(updated);
      this.notify();
    }
  }

  async resumeDownload(modelId) {
    const cur = this.getState(modelId);
    if (cur.status !== 'paused' && cur.status !== 'failed') {
      throw new Error(`Cannot resume download in state "${cur.status}".`);
    }
    return this.confirmAndStartDownload(modelId, { explicitConfirmed: true });
  }

  async cancelDownload(modelId) {
    const bridge = this.nativeBridgeProvider();
    if (bridge && typeof bridge.cancelModelDownload === 'function') {
      try {
        bridge.cancelModelDownload(modelId);
      } catch {}
    }
    const ctrl = this.activeControllers.get(modelId);
    if (ctrl) {
      ctrl.cancelled = true;
      ctrl.controller.abort();
    }
    await this.storageStore.removePayload(modelId);
    this.storageStore.deleteRecord(modelId);
    this.downloads.delete(modelId);
    this.notify();
  }

  async verifyDownloadedModel(modelId) {
    const model = this.getModel(modelId);
    const cur = this.getState(modelId);
    if (!model) throw new Error('Unknown model.');

    const bridge = this.nativeBridgeProvider();
    if (bridge && typeof bridge.verifyModelFile === 'function') {
      const raw = bridge.verifyModelFile(modelId, model.expectedSha256 || '');
      const parsed = JSON.parse(raw);
      if (!parsed.valid) {
        const corrupted = {
          ...cur,
          status: 'corrupted',
          verificationStatus: 'failed',
          error: parsed.reason || 'Checksum verification failed.',
          updatedAt: new Date().toISOString(),
        };
        this.downloads.set(modelId, corrupted);
        this.notify();
        return { valid: false, reason: corrupted.error };
      }
      const ok = {
        ...cur,
        status: 'ready',
        sha256: parsed.sha256 || cur.sha256,
        verificationStatus: 'verified_sha256',
        error: null,
        updatedAt: new Date().toISOString(),
      };
      this.downloads.set(modelId, ok);
      this.notify();
      return { valid: true, sha256: ok.sha256 };
    }

    const bytes = await this.storageStore.readPayload(modelId);
    if (!bytes) {
      return { valid: false, reason: 'Model weights missing or corrupted in storage.' };
    }
    const sha = await this.digestCalculator(bytes);
    const check = verifyDigestMatch(sha, model.expectedSha256 || cur.sha256);
    if (!check.valid) {
      const corrupted = {
        ...cur,
        status: 'corrupted',
        verificationStatus: 'failed',
        error: check.reason,
        updatedAt: new Date().toISOString(),
      };
      this.downloads.set(modelId, corrupted);
      this.storageStore.saveRecord(corrupted);
      this.notify();
    }
    return check;
  }

  async deleteModel(modelId) {
    if (this.isModelActiveCheck(modelId)) {
      throw new Error('Cannot delete the currently active local model. Unload or switch models first.');
    }

    const bridge = this.nativeBridgeProvider();
    if (bridge && typeof bridge.deleteDownloadedModel === 'function') {
      const raw = bridge.deleteDownloadedModel(modelId);
      const res = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (res && res.deleted === false) {
        throw new Error(res.error || 'Failed to delete model from device storage.');
      }
    }

    await this.storageStore.removePayload(modelId);
    this.storageStore.deleteRecord(modelId);
    this.downloads.delete(modelId);
    this.notify();
    return true;
  }

  syncNativeDownloadEvent(detail) {
    if (!detail || !detail.modelId) return;
    const prev = this.getState(detail.modelId);
    const updated = {
      ...prev,
      ...detail,
      updatedAt: new Date().toISOString(),
    };
    if (updated.status === 'cancelled') {
      this.downloads.delete(detail.modelId);
    } else {
      this.downloads.set(detail.modelId, updated);
      if (updated.status === 'ready') {
        this.storageStore.saveRecord(updated);
      }
    }
    this.notify();
  }

  syncNativeModelInventory(nativeList) {
    if (!Array.isArray(nativeList)) return;
    for (const item of nativeList) {
      if (!item?.modelId) continue;
      this.downloads.set(item.modelId, {
        ...this.getState(item.modelId),
        ...item,
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
    }
    this.notify();
  }
}

/**
 * Local Inference Runtime Manager
 * Strictly executes via native Android MediaPipe LlmInference bridge or an explicitly
 * registered real Web/Node engine. Never fakes tokens or simulates LLM output.
 */
export class LocalInferenceRuntime {
  constructor(options = {}) {
    this.getModelManifest = options.getModelManifest || ((id) => OFFLINE_MODEL_CATALOG.find((m) => m.id === id) || null);
    this.getDownloadState = options.getDownloadState;
    this.getDeviceSnapshot = options.getDeviceSnapshot || (() => ({ platform: 'web' }));
    this.nativeBridgeProvider = options.nativeBridgeProvider || (() => null);
    this.webEngine = options.webEngine || null;

    this.state = {
      status: 'unloaded', // unloaded | loading | ready | generating | error
      activeModelId: null,
      activeModelName: null,
      executionBackend: 'none',
      loadedAt: null,
      lastError: null,
      estimatedMemoryMb: 0,
    };
    this.listeners = new Set();
    this.pendingGenerations = new Map();
  }

  setWebEngine(engine) {
    this.webEngine = engine;
  }

  getState() {
    return { ...this.state };
  }

  isModelActive(modelId) {
    return Boolean(
      this.state.activeModelId === modelId &&
      (this.state.status === 'ready' || this.state.status === 'loading' || this.state.status === 'generating')
    );
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snap = this.getState();
    for (const cb of this.listeners) {
      try {
        cb(snap);
      } catch {}
    }
  }

  async loadModel(modelId) {
    const manifest = this.getModelManifest(modelId);
    if (!manifest) {
      throw new LocalRuntimeError('UNKNOWN_MODEL', `Unknown local model "${modelId}".`);
    }

    const dl = this.getDownloadState ? this.getDownloadState(modelId) : null;
    if (!dl || dl.status !== 'ready') {
      throw new LocalRuntimeError(
        'MODEL_NOT_DOWNLOADED',
        `Model "${manifest.displayName}" is not downloaded and verified yet.`
      );
    }

    const device = this.getDeviceSnapshot();
    if (device?.thermalStatus === 'critical') {
      throw new LocalRuntimeError(
        'THERMAL_THROTTLE',
        'Device temperature is critical. Pause heavy inference until thermal levels normalize.'
      );
    }

    if (
      typeof device?.availableRamMb === 'number' &&
      device.availableRamMb > 0 &&
      device.availableRamMb < manifest.estimatedRuntimeRamMb * 0.65
    ) {
      throw new LocalRuntimeError(
        'INSUFFICIENT_MEMORY',
        `Only ${device.availableRamMb} MB RAM available; "${manifest.displayName}" requires ~${manifest.estimatedRuntimeRamMb} MB headroom.`
      );
    }

    // Unload currently loaded model cleanly before switching
    if (this.state.activeModelId && this.state.activeModelId !== modelId) {
      await this.unloadModel();
    }

    this.state = {
      ...this.state,
      status: 'loading',
      activeModelId: modelId,
      activeModelName: manifest.displayName,
      lastError: null,
    };
    this.notify();

    const bridge = this.nativeBridgeProvider();
    if (bridge && typeof bridge.loadLocalModel === 'function') {
      try {
        const preferGpu = Boolean(device?.gpuAcceleration?.vulkanSupported || device?.gpuAcceleration?.openClLikely);
        const raw = bridge.loadLocalModel(
          modelId,
          manifest.minDeviceRamMb,
          Math.min(1024, manifest.contextLength),
          preferGpu
        );
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!parsed?.loaded) {
          throw new LocalRuntimeError(
            parsed?.code || 'NATIVE_LOAD_FAILED',
            parsed?.error || 'Native LiteRT runtime failed to initialize the model.'
          );
        }

        this.state = {
          status: 'ready',
          activeModelId: modelId,
          activeModelName: manifest.displayName,
          executionBackend: parsed.backend || 'MediaPipe LlmInference (Android)',
          loadedAt: new Date().toISOString(),
          lastError: null,
          estimatedMemoryMb: parsed.estimatedMemoryMb || manifest.estimatedRuntimeRamMb,
        };
        this.notify();
        return this.getState();
      } catch (err) {
        const msg = err?.message || 'Failed to load model natively.';
        this.state = {
          status: 'error',
          activeModelId: null,
          activeModelName: null,
          executionBackend: 'none',
          loadedAt: null,
          lastError: msg,
          estimatedMemoryMb: 0,
        };
        this.notify();
        throw err instanceof LocalRuntimeError ? err : new LocalRuntimeError('NATIVE_LOAD_FAILED', msg);
      }
    }

    if (this.webEngine && typeof this.webEngine.loadModel === 'function') {
      await this.webEngine.loadModel(manifest, dl);
      this.state = {
        status: 'ready',
        activeModelId: modelId,
        activeModelName: manifest.displayName,
        executionBackend: this.webEngine.backendName || 'Local Web Engine',
        loadedAt: new Date().toISOString(),
        lastError: null,
        estimatedMemoryMb: manifest.estimatedRuntimeRamMb,
      };
      this.notify();
      return this.getState();
    }

    const unavailableErr = new LocalRuntimeError(
      'RUNTIME_UNAVAILABLE',
      `Model weights for "${manifest.displayName}" are stored locally, but no native Android LiteRT/MediaPipe runtime or Web engine is present in this environment.`
    );
    this.state = {
      status: 'error',
      activeModelId: null,
      activeModelName: null,
      executionBackend: 'none',
      loadedAt: null,
      lastError: unavailableErr.message,
      estimatedMemoryMb: 0,
    };
    this.notify();
    throw unavailableErr;
  }

  async unloadModel() {
    this.cancelGeneration();
    const bridge = this.nativeBridgeProvider();
    if (bridge && typeof bridge.unloadLocalModel === 'function') {
      try {
        bridge.unloadLocalModel();
      } catch {}
    }
    if (this.webEngine && typeof this.webEngine.unloadModel === 'function') {
      try {
        await this.webEngine.unloadModel();
      } catch {}
    }
    this.state = {
      status: 'unloaded',
      activeModelId: null,
      activeModelName: null,
      executionBackend: 'none',
      loadedAt: null,
      lastError: null,
      estimatedMemoryMb: 0,
    };
    this.notify();
  }

  async generateResponse(prompt, options = {}) {
    if (this.state.status !== 'ready' || !this.state.activeModelId) {
      throw new LocalRuntimeError(
        'NO_ACTIVE_MODEL',
        'No offline AI model is loaded. Download and activate a compatible model in System Settings -> Offline AI.'
      );
    }

    const device = this.getDeviceSnapshot();
    if (device?.thermalStatus === 'critical') {
      throw new LocalRuntimeError('THERMAL_THROTTLE', 'Paused due to critical device temperature.');
    }

    const manifest = this.getModelManifest(this.state.activeModelId);
    const systemPrompt = options.systemPrompt || '';
    const trimmedPrompt = systemPrompt ? `${systemPrompt}\n\nUser: ${prompt}\nAssistant:` : prompt;

    this.state = { ...this.state, status: 'generating', lastError: null };
    this.notify();

    const startMs = Date.now();
    try {
      const bridge = this.nativeBridgeProvider();
      if (bridge && typeof bridge.generateLocalLlmResponse === 'function') {
        const requestId = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const fullText = await new Promise((resolve, reject) => {
          let accumulated = '';
          const timeoutId = setTimeout(() => {
            this.pendingGenerations.delete(requestId);
            reject(new LocalRuntimeError('GENERATION_TIMEOUT', 'On-device inference timed out.'));
          }, options.timeoutMs || 120000);

          this.pendingGenerations.set(requestId, {
            onChunk: (chunk) => {
              accumulated += chunk;
              options.onChunk?.(accumulated);
            },
            onDone: () => {
              clearTimeout(timeoutId);
              this.pendingGenerations.delete(requestId);
              resolve(accumulated);
            },
            onError: (msg) => {
              clearTimeout(timeoutId);
              this.pendingGenerations.delete(requestId);
              reject(new LocalRuntimeError('GENERATION_ERROR', msg || 'On-device generation failed.'));
            },
          });

          const started = bridge.generateLocalLlmResponse(requestId, trimmedPrompt);
          if (!started) {
            clearTimeout(timeoutId);
            this.pendingGenerations.delete(requestId);
            reject(new LocalRuntimeError('GENERATION_ERROR', 'Native bridge failed to start inference.'));
          }
        });

        this.state = { ...this.state, status: 'ready' };
        this.notify();
        return {
          text: String(fullText || '').trim(),
          modelId: manifest?.id || this.state.activeModelId,
          modelName: manifest?.displayName || this.state.activeModelName,
          backend: this.state.executionBackend,
          latencyMs: Date.now() - startMs,
        };
      }

      if (this.webEngine && typeof this.webEngine.generate === 'function') {
        const output = await this.webEngine.generate(trimmedPrompt, {
          onChunk: options.onChunk,
          signal: options.signal,
        });
        this.state = { ...this.state, status: 'ready' };
        this.notify();
        return {
          text: String(output || '').trim(),
          modelId: manifest?.id || this.state.activeModelId,
          modelName: manifest?.displayName || this.state.activeModelName,
          backend: this.state.executionBackend,
          latencyMs: Date.now() - startMs,
        };
      }

      throw new LocalRuntimeError('RUNTIME_UNAVAILABLE', 'No active local inference backend is attached.');
    } catch (err) {
      const recoveredState = this.state.activeModelId ? 'ready' : 'error';
      this.state = {
        ...this.state,
        status: recoveredState,
        lastError: err?.message || 'Inference failure',
      };
      this.notify();
      throw err;
    }
  }

  handleNativeTokenEvent(detail) {
    if (!detail || !detail.requestId) return;
    const handler = this.pendingGenerations.get(detail.requestId);
    if (!handler) return;
    if (detail.error) {
      handler.onError(detail.error);
      return;
    }
    if (typeof detail.chunk === 'string' && detail.chunk.length > 0) {
      handler.onChunk(detail.chunk);
    }
    if (detail.done) {
      handler.onDone();
    }
  }

  cancelGeneration() {
    const bridge = this.nativeBridgeProvider();
    if (bridge && typeof bridge.cancelLocalLlmGeneration === 'function') {
      try {
        bridge.cancelLocalLlmGeneration();
      } catch {}
    }
    for (const [reqId, h] of this.pendingGenerations.entries()) {
      h.onError('Generation cancelled by user.');
      this.pendingGenerations.delete(reqId);
    }
    if (this.state.status === 'generating') {
      this.state = { ...this.state, status: 'ready' };
      this.notify();
    }
  }
}

/**
 * Unified Intelligence Router
 * Supports AUTO / ONLINE / OFFLINE modes, prevents silent cloud leakage in Offline mode,
 * preserves conversation history cleanly across transitions, and attributes the exact source model.
 */
export class IntelligenceRouter {
  constructor(options = {}) {
    this.mode = options.initialMode || 'auto'; // 'auto' | 'online' | 'offline'
    this.isOnlineCheck = options.isOnlineCheck || (() => true);
    this.localRuntime = options.localRuntime;
    this.cloudHandler = options.cloudHandler;
    this.localToolsHandler = options.localToolsHandler || null;
    this.listeners = new Set();
  }

  getMode() {
    return this.mode;
  }

  setMode(mode) {
    if (mode !== 'auto' && mode !== 'online' && mode !== 'offline') {
      throw new Error(`Invalid intelligence mode "${mode}".`);
    }
    this.mode = mode;
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getEffectiveStatus());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const status = this.getEffectiveStatus();
    for (const cb of this.listeners) {
      try {
        cb(status);
      } catch {}
    }
  }

  getEffectiveStatus() {
    const networkOnline = Boolean(this.isOnlineCheck());
    const runtime = this.localRuntime ? this.localRuntime.getState() : { status: 'unloaded', activeModelName: null };
    const localReady = runtime.status === 'ready' || runtime.status === 'generating';

    let activePath = 'offline-tools';
    if (this.mode === 'offline') {
      activePath = localReady ? 'on-device-llm' : 'offline-tools';
    } else if (this.mode === 'online') {
      activePath = networkOnline ? 'cloud-gemini' : 'offline-unavailable';
    } else {
      activePath = networkOnline ? 'cloud-gemini' : localReady ? 'on-device-llm' : 'offline-tools';
    }

    return {
      mode: this.mode,
      networkOnline,
      localReady,
      activeLocalModelId: runtime.activeModelId || null,
      activeLocalModelName: runtime.activeModelName || null,
      activePath,
    };
  }

  async routeMessage(input, context = {}) {
    const status = this.getEffectiveStatus();

    // 1. Offline Strict Mode or Offline Auto-Fallback -> ZERO cloud requests permitted
    if (this.mode === 'offline' || (this.mode === 'auto' && !status.networkOnline)) {
      // Deterministic Knowledge Vault / Memory / Utility handler answers immediately offline
      const toolResult = this.localToolsHandler ? await this.localToolsHandler(input, context) : null;

      if (toolResult && toolResult.answeredLocally) {
        return {
          text: toolResult.text,
          source: 'local-tools',
          modelLabel: toolResult.modelLabel || 'SURYA Local Knowledge & Tools',
          latencyMs: toolResult.latencyMs || 5,
          handledOffline: true,
        };
      }

      if (status.localReady && this.localRuntime) {
        const promptWithHistory = buildCompactOfflinePrompt(input, context, toolResult?.vaultSnippet);
        const res = await this.localRuntime.generateResponse(promptWithHistory, {
          onChunk: context.onStreamChunk,
          systemPrompt:
            'You are SURYA running completely offline on the user device. Be accurate, concise, and honest.',
        });
        return {
          text: res.text,
          source: 'on-device-llm',
          modelLabel: `On-Device · ${res.modelName}`,
          latencyMs: res.latencyMs,
          handledOffline: true,
        };
      }

      return {
        text:
          this.mode === 'offline'
            ? 'SURYA is in Offline Privacy Mode and no local AI model is currently loaded. Deterministic tasks, notes, reminders, local app launches, and Knowledge Vault search still work. Download & activate an offline model under System Settings -> Offline AI for conversational reasoning.'
            : 'No internet connection detected and no offline AI model is loaded yet. Local commands, tasks, notes, and Knowledge Vault remain available; download an offline model in System Settings -> Offline AI for full offline chat.',
        source: 'local-tools',
        modelLabel: 'Offline Assistant Notice',
        latencyMs: 2,
        handledOffline: true,
      };
    }

    // 2. Online Mode (or Auto Mode while online)
    if (!status.networkOnline && this.mode === 'online') {
      throw new Error(
        'SURYA is set to Online Only mode, but no internet connection is detected. Switch to Auto or Offline mode to use on-device capabilities.'
      );
    }

    if (!this.cloudHandler) {
      throw new Error('Cloud AI handler is not configured.');
    }

    try {
      const cloudRes = await this.cloudHandler(input, context);
      return {
        text: cloudRes.text,
        source: 'cloud-gemini',
        modelLabel: `Cloud · ${cloudRes.model || context.model || 'Gemini'}`,
        latencyMs: cloudRes.latencyMs || 0,
        ttftMs: cloudRes.ttftMs,
        handledOffline: false,
      };
    } catch (err) {
      // In Auto mode, gracefully fall back to loaded local LLM if cloud backend is unreachable
      if (this.mode === 'auto' && status.localReady && this.localRuntime) {
        const fallbackPrompt = buildCompactOfflinePrompt(input, context);
        const localRes = await this.localRuntime.generateResponse(fallbackPrompt, {
          onChunk: context.onStreamChunk,
          systemPrompt:
            'Cloud backend was unreachable. You are SURYA answering offline on the user device.',
        });
        return {
          text: localRes.text,
          source: 'on-device-llm',
          modelLabel: `Auto Fallback · ${localRes.modelName}`,
          latencyMs: localRes.latencyMs,
          handledOffline: true,
        };
      }
      throw err;
    }
  }
}

function buildCompactOfflinePrompt(input, context = {}, vaultSnippet = '') {
  const sections = [];
  if (Array.isArray(context.userMemories) && context.userMemories.length > 0) {
    sections.push(
      `Personal Context: ${context.userMemories.slice(0, 4).map((m) => `${m.key}=${m.value}`).join('; ')}`
    );
  }
  if (vaultSnippet) {
    sections.push(`Vault Context: ${vaultSnippet}`);
  }
  const recent = Array.isArray(context.history)
    ? context.history.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-4)
    : [];
  if (recent.length > 0) {
    sections.push(
      `Recent Conversation:\n${recent.map((m) => `${m.role === 'user' ? 'User' : 'SURYA'}: ${m.content}`).join('\n')}`
    );
  }
  sections.push(`Current Request: ${input}`);
  return sections.join('\n\n');
}

function concatUint8Arrays(chunks) {
  const total = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function computeSha256Hex(uint8) {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const hashBuf = await globalThis.crypto.subtle.digest('SHA-256', uint8);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Node fallback
  const nodeCrypto = await import('node:crypto');
  return nodeCrypto.createHash('sha256').update(uint8).digest('hex');
}

function createMemoryOrBrowserStore() {
  const RECORDS_KEY = 'surya_offline_models_records_v1';
  const payloads = new Map();
  let memoryRecords = {};

  return {
    listRecords() {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const raw = window.localStorage.getItem(RECORDS_KEY);
          if (raw) return Object.values(JSON.parse(raw));
        } catch {}
      }
      return Object.values(memoryRecords);
    },
    saveRecord(rec) {
      memoryRecords[rec.modelId] = rec;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const cur = JSON.parse(window.localStorage.getItem(RECORDS_KEY) || '{}');
          cur[rec.modelId] = rec;
          window.localStorage.setItem(RECORDS_KEY, JSON.stringify(cur));
        } catch {}
      }
    },
    deleteRecord(modelId) {
      delete memoryRecords[modelId];
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const cur = JSON.parse(window.localStorage.getItem(RECORDS_KEY) || '{}');
          delete cur[modelId];
          window.localStorage.setItem(RECORDS_KEY, JSON.stringify(cur));
        } catch {}
      }
    },
    async savePayload(modelId, uint8) {
      payloads.set(modelId, uint8);
    },
    async readPayload(modelId) {
      return payloads.get(modelId) || null;
    },
    async removePayload(modelId) {
      payloads.delete(modelId);
    },
  };
}
