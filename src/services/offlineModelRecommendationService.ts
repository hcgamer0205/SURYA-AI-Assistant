/**
 * SURYA Offline Model Recommendation Service
 * Evaluates verified open-weight models against real detected hardware capabilities
 * and builds safe Lightweight, Balanced, and Advanced tier picks.
 */

import {
  OFFLINE_MODEL_CATALOG,
  OfflineModelManifest,
  ModelCompatibilityAssessment,
  RecommendedTiersResult,
  evaluateModelCompatibility,
  buildRecommendedTiers,
} from './offlineModelHelpers.js';
import { deviceCapabilityService } from './deviceCapabilityService';

class OfflineModelRecommendationService {
  public getCatalog(): OfflineModelManifest[] {
    return [...OFFLINE_MODEL_CATALOG];
  }

  public assessModel(modelId: string): ModelCompatibilityAssessment | null {
    const model = OFFLINE_MODEL_CATALOG.find((m) => m.id === modelId);
    if (!model) return null;
    return evaluateModelCompatibility(model, deviceCapabilityService.getSnapshot());
  }

  public getRecommendations(): RecommendedTiersResult {
    return buildRecommendedTiers(deviceCapabilityService.getSnapshot(), OFFLINE_MODEL_CATALOG);
  }
}

export const offlineModelRecommendationService = new OfflineModelRecommendationService();
