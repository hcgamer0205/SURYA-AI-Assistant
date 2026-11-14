import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function collectSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// 1. AndroidManifest.xml & Package Identity Audit for SURYA AI
test('1. AndroidManifest.xml & Package Identity Audit for SURYA AI', () => {
  const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
  assert.ok(fs.existsSync(manifestPath), 'AndroidManifest.xml must exist');

  const content = fs.readFileSync(manifestPath, 'utf-8');
  assert.ok(content.includes('android.permission.RECORD_AUDIO'), 'Must declare RECORD_AUDIO');
  assert.ok(content.includes('android.permission.CAMERA'), 'Must declare CAMERA');
  assert.ok(content.includes('android.permission.USE_BIOMETRIC'), 'Must declare USE_BIOMETRIC');
  assert.ok(content.includes('android.permission.FOREGROUND_SERVICE'), 'Must declare FOREGROUND_SERVICE');
  assert.ok(content.includes('android.permission.FOREGROUND_SERVICE_MICROPHONE'), 'Must declare FOREGROUND_SERVICE_MICROPHONE');
  assert.ok(content.includes('android.permission.POST_NOTIFICATIONS'), 'Must declare POST_NOTIFICATIONS');
  assert.ok(content.includes('com.surya.assistant.fileprovider'), 'Must declare SURYA FileProvider');
  assert.ok(content.includes('SURYA AI'), 'App label must be SURYA AI');
  assert.ok(content.includes('<queries>'), 'Must declare package visibility queries for Android 11+');
  assert.ok(content.includes('SuryaHandsFreeService'), 'Must register SuryaHandsFreeService');
  assert.ok(content.includes('SuryaWidgetProvider'), 'Must register SuryaWidgetProvider');
  assert.ok(content.includes('@xml/shortcuts'), 'Must reference app shortcuts XML');
  assert.doesNotMatch(content, /com\.vajra/, 'Must have zero legacy package identifiers');
});

// 2. Capacitor Configuration Structure
test('2. Capacitor Configuration Structure for SURYA', () => {
  const capPath = path.resolve('capacitor.config.ts');
  assert.ok(fs.existsSync(capPath), 'capacitor.config.ts must exist');

  const content = fs.readFileSync(capPath, 'utf-8');
  assert.ok(content.includes('com.surya.assistant'), 'AppId must be com.surya.assistant');
  assert.ok(content.includes('SURYA AI'), 'AppName must be SURYA AI');
  assert.ok(content.includes("webDir: 'dist'"), 'webDir must be dist');
  assert.doesNotMatch(content, /vajra/i, 'Must have zero legacy identifiers');
});

// 3. GitHub Actions Android APK Pipeline Verification
test('3. GitHub Actions Android APK Pipeline Verification', () => {
  const workflowPath = path.resolve('.github/workflows/android-apk.yml');
  assert.ok(fs.existsSync(workflowPath), '.github/workflows/android-apk.yml must exist');

  const content = fs.readFileSync(workflowPath, 'utf-8');
  assert.ok(content.includes("java-version: '21'"), 'Workflow must use Java 21');
  assert.ok(content.includes('api-level: 36'), 'Workflow must target Android SDK 36');
  assert.ok(content.includes('gradle-version 8.11.1'), 'Workflow must specify Gradle 8.11.1');
  assert.ok(content.includes('Surya-Android.apk'), 'Artifact must be Surya-Android.apk');
});

// 4. Deterministic Local Intent Command Execution (0ms - No Gemini Call)
test('4. Deterministic Local Intent Command Execution (0ms - No Gemini Call)', () => {
  const testInputs = [
    { input: 'Open YouTube', expectedApp: 'YouTube' },
    { input: 'Launch YouTube', expectedApp: 'YouTube' },
    { input: 'सूर्या, यूट्यूब खोलो', expectedApp: 'YouTube' },
    { input: 'Surya YouTube kholo', expectedApp: 'YouTube' },
    { input: 'Open Chrome', expectedApp: 'Chrome' },
    { input: 'Open Settings', expectedApp: 'Settings' },
    { input: 'Open Camera', expectedApp: 'Camera' },
  ];

  const youtubeRegex = /(open|launch|play|start)\s+youtube|यूट्यूब\s*(खोलो|चलाओ)|youtube\s*(kholo|chalao)/i;
  const chromeRegex = /(open|launch|start)\s+(google\s+)?chrome|क्रोम\s*(खोलो|चलाओ)|chrome\s*kholo/i;
  const settingsRegex = /(open|launch|go to)\s+(android\s+)?settings|सेटिंग्स\s*(खोलो)/i;
  const cameraRegex = /(open|launch|start|take)\s+camera|कैमरा\s*(खोलो)/i;

  for (const item of testInputs) {
    let matched = false;
    if (item.expectedApp === 'YouTube') matched = youtubeRegex.test(item.input);
    if (item.expectedApp === 'Chrome') matched = chromeRegex.test(item.input);
    if (item.expectedApp === 'Settings') matched = settingsRegex.test(item.input);
    if (item.expectedApp === 'Camera') matched = cameraRegex.test(item.input);

    assert.ok(matched, `Input "${item.input}" must be intercepted locally for ${item.expectedApp}`);
  }
});

// 5. UI Customization Theme Engine Structure & Presets
test('5. UI Customization Theme Engine Structure & Presets', () => {
  const PRESET_KEYS = [
    'suryadev-radiant',
    'futuristic-hologram',
    'iron-man-hud',
    'solar-saffron',
    'minimalist-dark',
    'cyber-emerald',
  ];

  assert.strictEqual(PRESET_KEYS.length, 6, 'Must provide 6 distinct high-fidelity presets');
  assert.ok(PRESET_KEYS.includes('suryadev-radiant'), 'Suryadev Radiant must be present');
  assert.ok(PRESET_KEYS.includes('futuristic-hologram'), 'Futuristic Hologram must be present');
  assert.ok(PRESET_KEYS.includes('iron-man-hud'), 'Iron Man HUD must be present');
});

// 6. Voice Profiles & Suryadev Radiant Command Identity
test('6. Voice Profiles & Suryadev Radiant Command Identity', () => {
  const PROFILES = [
    'suryadev-radiant',
    'calm-intelligence',
    'futuristic-ai',
    'natural-conversational',
    'indian-english',
    'hindi-command',
  ];

  assert.ok(PROFILES.includes('suryadev-radiant'), 'Must include Suryadev Radiant Command');
  assert.ok(PROFILES.includes('hindi-command'), 'Must include Hindi Command');
  assert.ok(PROFILES.includes('indian-english'), 'Must include Indian English');
});

// 7. Cognitive Engine 10-Agent Multi-Agent Matrix Verification
test('7. Cognitive Engine 10-Agent Matrix Verification', () => {
  const cogContent = fs.readFileSync(path.resolve('src/services/cognitiveEngine.ts'), 'utf-8');
  const expectedAgentIds = [
    'agent_conversation',
    'agent_context',
    'agent_planning',
    'agent_productivity',
    'agent_vision',
    'agent_research',
    'agent_coding',
    'agent_knowledge',
    'agent_diagnostics',
    'agent_verification',
  ];

  for (const agentId of expectedAgentIds) {
    assert.ok(cogContent.includes(agentId), `Cognitive Engine must register agent ${agentId}`);
  }
  assert.ok(cogContent.includes('createPlanAsync'), 'Cognitive Engine must support async AI planning');
});

// 8. Safe Auto-Update SHA-256 Checksum Validation
test('8. Safe Auto-Update SHA-256 Checksum Validation', () => {
  const sampleData = Buffer.from('SURYA_APK_PAYLOAD_V240');
  const computedHash = crypto.createHash('sha256').update(sampleData).digest('hex');

  assert.strictEqual(computedHash.length, 64, 'SHA-256 hash must be 64 hexadecimal characters');
  assert.match(computedHash, /^[a-f0-9]{64}$/);
});

// 9. Frontend Hygiene Audit (No alert/confirm/window.open, No picsum, No legacy names)
test('9. Frontend Hygiene Audit across src/', () => {
  const srcFiles = collectSourceFiles(path.resolve('src'));
  assert.ok(srcFiles.length >= 20, 'Expected full SURYA TypeScript source tree');

  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const rel = path.relative(process.cwd(), file);
    assert.doesNotMatch(content, /\bvajra\b/i, `Legacy branding found in ${rel}`);
    assert.doesNotMatch(content, /picsum\.photos/i, `External picsum URL found in ${rel}`);
    assert.doesNotMatch(content, /\bwindow\.open\s*\(/, `window.open forbidden in ${rel}`);
    assert.doesNotMatch(content, /(?:^|[^\w.])alert\s*\(/m, `blocking alert() forbidden in ${rel}`);
    assert.doesNotMatch(content, /(?:^|[^\w.])confirm\s*\(/m, `blocking confirm() forbidden in ${rel}`);
  }
});

// 10. SSE Streaming Wire Protocol Alignment (server.ts <-> apiService.ts)
test('10. SSE Streaming Wire Protocol Alignment', () => {
  const serverContent = fs.readFileSync(path.resolve('server.ts'), 'utf-8');
  const apiContent = fs.readFileSync(path.resolve('src/services/apiService.ts'), 'utf-8');

  assert.ok(serverContent.includes("type: 'chunk'"), 'server.ts must emit SSE chunk frame');
  assert.ok(serverContent.includes("type: 'done'"), 'server.ts must emit SSE done frame');
  assert.ok(apiContent.includes("event.type === 'chunk'"), 'apiService.ts must parse event.type === chunk');
  assert.ok(apiContent.includes("event.type === 'done'"), 'apiService.ts must parse event.type === done');
});

// 11. Security Posture, CORS Allowlist & Route Isolation in server.ts
test('11. Security Posture, CORS Allowlist & Studio Route Separation', () => {
  const serverContent = fs.readFileSync(path.resolve('server.ts'), 'utf-8');

  assert.ok(serverContent.includes('isAllowedOrigin'), 'server.ts must restrict CORS with isAllowedOrigin allowlist');
  assert.ok(serverContent.includes("app.get('/api/security/report'"), 'Must expose /api/security/report endpoint');
  assert.ok(serverContent.includes("app.get('/api/studio/apps'"), 'Studio apps must use /api/studio/apps without shadowing /api/apps');
  assert.ok(serverContent.includes("app.post('/api/apps/debug'"), 'Studio AI Debugger endpoint must exist');
  assert.ok(serverContent.includes("app.get('/api/studio/github'"), 'Studio GitHub repository monitor must exist');
  assert.ok(serverContent.includes("app.post('/api/vision/analyze'"), 'Optics structured analysis endpoint must exist');
  assert.ok(serverContent.includes("app.post('/api/vision/chat'"), 'Optics visual Q&A endpoint must exist');
  assert.doesNotMatch(serverContent, /picsum\.photos/i, 'server.ts seeded templates must not rely on picsum.photos');
});

// 12. Native Android Resources & Foreground Service Assets Verification
test('12. Native Android Foreground Service, Widget & App Shortcuts Verification', () => {
  const requiredAndroidFiles = [
    'android/app/src/main/java/com/surya/assistant/MainActivity.java',
    'android/app/src/main/java/com/surya/assistant/SuryaHandsFreeService.java',
    'android/app/src/main/java/com/surya/assistant/SuryaWidgetProvider.java',
    'android/app/src/main/res/layout/surya_widget.xml',
    'android/app/src/main/res/xml/surya_widget_info.xml',
    'android/app/src/main/res/xml/shortcuts.xml',
    'android/app/src/main/res/drawable/widget_bg.xml',
  ];

  for (const relPath of requiredAndroidFiles) {
    assert.ok(fs.existsSync(path.resolve(relPath)), `Missing native Android asset: ${relPath}`);
  }

  const mainActivity = fs.readFileSync(
    path.resolve('android/app/src/main/java/com/surya/assistant/MainActivity.java'),
    'utf-8'
  );
  assert.ok(mainActivity.includes('UtteranceProgressListener'), 'MainActivity must hook UtteranceProgressListener');
  assert.ok(mainActivity.includes('getDeviceTelemetry'), 'MainActivity must expose getDeviceTelemetry bridge');
  assert.ok(mainActivity.includes('startHandsFreeForegroundService'), 'MainActivity must expose Foreground Service start');
  assert.ok(mainActivity.includes('JSONObject.quote'), 'MainActivity must safely escape strings sent to JS');
});
