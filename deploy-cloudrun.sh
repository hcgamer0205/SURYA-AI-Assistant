#!/usr/bin/env bash
set -euo pipefail

# Deploy independent public SURYA Express backend to Google Cloud Run.
# Usage:
#   export GCP_PROJECT_ID="your-project-id"
#   export GEMINI_API_KEY="your-gemini-api-key"
#   export SURYA_API_TOKEN="optional-client-bearer-token"
#   ./deploy-cloudrun.sh

SERVICE_NAME="${SERVICE_NAME:-surya-ai-backend}"
REGION="${REGION:-asia-east1}"
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID before running}"
GEMINI_KEY="${GEMINI_API_KEY:?Set GEMINI_API_KEY before running}"
API_TOKEN="${SURYA_API_TOKEN:-}"

gcloud config set project "$PROJECT_ID"

ENV_VARS="NODE_ENV=production,GEMINI_API_KEY=${GEMINI_KEY}"
if [ -n "$API_TOKEN" ]; then
  ENV_VARS="${ENV_VARS},SURYA_API_TOKEN=${API_TOKEN}"
fi

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars "$ENV_VARS"

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')"
echo ""
echo "Deployed SURYA backend URL: $SERVICE_URL"
echo "Test health: curl -i \"$SERVICE_URL/api/health\""
echo "Set GitHub Repository Variable VITE_API_BASE_URL=$SERVICE_URL before building Android APK."
