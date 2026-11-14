/**
 * SURYA Offline Capability Audit & Live Readiness Evaluator
 * Truthfully classifies every major SURYA capability as OFFLINE, PARTIAL, or ONLINE
 * along with runtime dependencies, hardware prerequisites, and genuine limitations.
 */

export type CapabilitySupportLevel = 'OFFLINE' | 'PARTIAL' | 'ONLINE';

export interface OfflineCapabilitySpec {
  id: string;
  number: number;
  name: string;
  status: CapabilitySupportLevel;
  engine: string;
  requiresDownloadedLlm: boolean;
  offlineBehavior: string;
  prerequisites: string;
  limitations: string;
}

export const OFFLINE_CAPABILITY_MATRIX: OfflineCapabilitySpec[] = [
  {
    id: 'local_llm',
    number: 1,
    name: 'Local LLM (Chat, Reasoning, Planning)',
    status: 'OFFLINE',
    engine: 'Google AI Edge MediaPipe LlmInference (LiteRT .task on Android)',
    requiresDownloadedLlm: true,
    offlineBehavior:
      'Downloads verified quantized open-weight models (SmolLM2, Gemma 3, Qwen 2.5, Phi-4 Mini) to app-private storage with SHA-256 check and executes inference completely on-device.',
    prerequisites: 'arm64-v8a Android device, sufficient free RAM (2–6 GB+) & internal storage, downloaded model.',
    limitations: 'Plain web browsers without an active native/local runtime cannot execute multi-hundred-MB .task weights.',
  },
  {
    id: 'local_wake_word',
    number: 2,
    name: 'Local Wake-Word Detection ("Hey SURYA")',
    status: 'PARTIAL',
    engine: 'Foreground Speech Matcher & SuryaHandsFreeService',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Matches "Hey SURYA" / "हे सूर्या" while foreground listening is active using device speech engine without cloud SURYA backend.',
    prerequisites: 'Microphone permission; OS offline speech pack required when network is off.',
    limitations: 'Android blocks third-party DSP screen-off hotword listening; visible foreground notification is required while armed.',
  },
  {
    id: 'offline_stt',
    number: 3,
    name: 'Offline Speech-to-Text (STT)',
    status: 'PARTIAL',
    engine: 'Android SpeechRecognizer with RecognizerIntent.EXTRA_PREFER_OFFLINE',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Passes EXTRA_PREFER_OFFLINE to Android SpeechRecognizer so downloaded OS offline language packs transcribe voice with no internet.',
    prerequisites: 'Microphone permission + device OS offline speech pack downloaded in Android Language settings.',
    limitations: 'Quality and language availability depend on Android OS offline speech packs installed on the device.',
  },
  {
    id: 'offline_tts',
    number: 4,
    name: 'Offline Text-to-Speech (Suryadev Voice Profile)',
    status: 'OFFLINE',
    engine: 'Android TextToSpeech + Web SpeechSynthesis offline voices',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Applies Suryadev pitch (0.92), cadence (1.05x), and regional language tags locally through on-device Android TTS voices.',
    prerequisites: 'Installed Android TTS voice data (en-IN / hi-IN / target locale); prompt available to install missing packs.',
    limitations: 'If user selects a locale without an installed offline voice pack, Android falls back to default voice.',
  },
  {
    id: 'local_intents',
    number: 5,
    name: 'Local Android Intent Execution',
    status: 'OFFLINE',
    engine: 'LocalIntentRouter + AndroidSuryaBridge.launchIntent',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Matches English & Hindi app-launch commands (YouTube, Chrome, Maps, Camera, Settings, Dialer, Wi-Fi, WhatsApp) deterministically in 0ms without cloud or local LLM.',
    prerequisites: 'Target Android app installed; high-risk actions remain guarded by Veronica.',
    limitations: 'Deep content search inside third-party apps still depends on what the target app supports offline.',
  },
  {
    id: 'local_productivity',
    number: 6,
    name: 'Tasks, Notes, Reminders & Automation Scheduler',
    status: 'OFFLINE',
    engine: 'LocalStorage Productivity Engine + Foreground Reminder Ticker',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Creates, toggles, searches, and deletes tasks, notes, agenda items, reminders, focus sessions, and approval-gated automations locally with local notifications.',
    prerequisites: 'Notification permission for device alert popups.',
    limitations: 'Automations marked onlyWhenOnline are skipped automatically while offline; background alarms when app is swiped closed require OS exact-alarm exemptions.',
  },
  {
    id: 'local_memory_vault',
    number: 7,
    name: 'Personal World Model & Knowledge Vault',
    status: 'OFFLINE',
    engine: 'LocalStorage Memory Index + Grounded Vault Document Search',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Stores/edits/exports user preferences and directives, adds Knowledge Vault notes, and feeds grounded local excerpts to the active model.',
    prerequisites: 'Local browser/WebView storage.',
    limitations: 'Multi-device cloud sync pauses until reconnected; retrieval uses deterministic lexical matching locally.',
  },
  {
    id: 'local_agents',
    number: 8,
    name: '10-Agent Orchestration & Verification',
    status: 'OFFLINE',
    engine: 'CognitiveEngine Local Decomposition + IntelligenceRouter',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Decomposes goals locally (deterministic + optional active local LLM), runs Vault/Task/Memory/Diagnostics steps offline, enforces approval gates, and verifies real outcomes.',
    prerequisites: 'Optional downloaded local LLM for natural-language planning enrichment.',
    limitations: 'Cloud-dependent research or server build checks report offline status rather than faking results.',
  },
  {
    id: 'local_ocr_qr',
    number: 9,
    name: 'Local OCR, QR/Barcode & Document Extraction',
    status: 'OFFLINE',
    engine: 'Google ML Kit Bundled TextRecognition & BarcodeScanning + Browser BarcodeDetector',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Extracts Latin text (OCR), structured key-value lines, and QR/barcodes directly on the Android device without network calls.',
    prerequisites: 'Camera/Upload image; native Android APK for bundled ML Kit OCR (browsers support QR via BarcodeDetector when available).',
    limitations: 'Non-Latin OCR scripts and complex table layouts remain stronger on online multimodal models unless dedicated packs are added.',
  },
  {
    id: 'ondevice_vision',
    number: 10,
    name: 'On-Device Multimodal Vision Understanding',
    status: 'PARTIAL',
    engine: 'ML Kit OCR/QR + Offline Visual Metadata Fallback',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Performs offline OCR, QR decoding, and document field extraction locally and attaches extracted text to Q&A with local LLM.',
    prerequisites: 'Android APK with bundled ML Kit.',
    limitations: 'General open-ended visual scene captioning & object bounding boxes still require an online multimodal Gemini model or a dedicated VLM bundle when online.',
  },
  {
    id: 'local_studio',
    number: 11,
    name: 'SURYA Studio Code Editing, Sandbox & Assistance',
    status: 'PARTIAL',
    engine: 'Sandboxed iframe srcDoc + Local File Editor + Active Local LLM',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Edits HTML/CSS/JS files, captures snapshots, runs the live sandboxed preview, detects runtime console errors, exports HTML, and routes code questions to the active local LLM when downloaded.',
    prerequisites: 'Downloaded local LLM for AI code generation/debugging offline.',
    limitations: 'GitHub repository commit/workflow monitoring and cloud-seeded templates require internet access.',
  },
  {
    id: 'local_diagnostics',
    number: 12,
    name: 'App Settings, Device Telemetry & Security Diagnostics',
    status: 'OFFLINE',
    engine: 'DeviceCapabilityService + AndroidSuryaBridge + Veronica Audit',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Reads real RAM, storage, CPU ABIs, battery, thermal state, GPU/Vulkan flags, offline speech readiness, and security posture locally.',
    prerequisites: 'Android APK for full OS hardware telemetry (web uses standard navigator APIs).',
    limitations: 'Server-side Gemini ping and server APK update manifests require backend connectivity.',
  },
  {
    id: 'local_history',
    number: 13,
    name: 'Local Conversation History & Search',
    status: 'OFFLINE',
    engine: 'Persistent LocalStorage Conversation Thread + Client Export/Delete',
    requiresDownloadedLlm: false,
    offlineBehavior:
      'Persists conversation history across app restarts and Online <-> Offline mode transitions, supports search, JSON export, and instant deletion.',
    prerequisites: 'Local storage.',
    limitations: 'Stored strictly on the local device.',
  },
];

export const ONLINE_ONLY_FEATURES = [
  {
    id: 'cloud_gemini',
    name: 'Cloud Gemini 4 / 3.1 Multimodal Reasoning',
    reason: 'Requires Google Gemini API via SURYA Cloud Run Express backend.',
  },
  {
    id: 'github_monitor',
    name: 'GitHub Repository & APK Build Status Inspector',
    reason: 'Fetches live commits and GitHub Actions workflow runs over HTTPS.',
  },
  {
    id: 'apk_updates',
    name: 'OTA APK Release Manifest & Server SHA-256 Check',
    reason: 'Queries remote release metadata and downloads APK binaries from GitHub/Cloud Run.',
  },
  {
    id: 'cloud_vision_translate',
    name: 'Full Scene Understanding & Multilingual Visual Translation',
    reason: 'Uses cloud multimodal Gemini Vision for object localization and complex translation beyond local Latin OCR.',
  },
];
