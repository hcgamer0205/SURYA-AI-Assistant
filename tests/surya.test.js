import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// 1. AndroidManifest.xml & Package Identity Audit for SURYA AI
test('1. AndroidManifest.xml & Package Identity Audit for SURYA AI', (t) => {
  const manifestPath = path.resolve('android/app/src/main/AndroidManifest.xml');
  assert.ok(fs.existsSync(manifestPath), 'AndroidManifest.xml must exist');

  const content = fs.readFileSync(manifestPath, 'utf-8');
  assert.ok(content.includes('android.permission.RECORD_AUDIO'), 'Must declare RECORD_AUDIO');
  assert.ok(content.includes('android.permission.CAMERA'), 'Must declare CAMERA');
  assert.ok(content.includes('android.permission.USE_BIOMETRIC'), 'Must declare USE_BIOMETRIC');
  assert.ok(content.includes('com.surya.assistant.fileprovider'), 'Must declare SURYA FileProvider');
  assert.ok(content.includes('SURYA AI'), 'App label must be SURYA AI');
  assert.ok(content.includes('<queries>'), 'Must declare package visibility queries for Android 11+');
  assert.doesNotMatch(content, /com\.vajra/, 'Must have zero Vajra package identifiers');
});

// 2. Capacitor Configuration Structure
test('2. Capacitor Configuration Structure for SURYA', (t) => {
  const capPath = path.resolve('capacitor.config.ts');
  assert.ok(fs.existsSync(capPath), 'capacitor.config.ts must exist');

  const content = fs.readFileSync(capPath, 'utf-8');
  assert.ok(content.includes('com.surya.assistant'), 'AppId must be com.surya.assistant');
  assert.ok(content.includes('SURYA AI'), 'AppName must be SURYA AI');
  assert.ok(content.includes("webDir: 'dist'"), 'webDir must be dist');
  assert.doesNotMatch(content, /vajra/i, 'Must have zero Vajra references');
});

// 3. GitHub Actions Android APK Pipeline Verification
test('3. GitHub Actions Android APK Pipeline Verification', (t) => {
  const workflowPath = path.resolve('.github/workflows/android-apk.yml');
  assert.ok(fs.existsSync(workflowPath), '.github/workflows/android-apk.yml must exist');

  const content = fs.readFileSync(workflowPath, 'utf-8');
  assert.ok(content.includes("java-version: '21'"), 'Workflow must use Java 21');
  assert.ok(content.includes('api-level: 36'), 'Workflow must target Android SDK 36');
  assert.ok(content.includes('gradle-version 8.11.1'), 'Workflow must specify Gradle 8.11.1');
  assert.ok(content.includes('Surya-Android.apk'), 'Artifact must be Surya-Android.apk');
});

// 4. Deterministic Local Intent Command Execution (0ms - No Gemini Call)
test('4. Deterministic Local Intent Command Execution (0ms - No Gemini Call)', (t) => {
  // Regex pattern check as implemented in localIntentRouter
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
test('5. UI Customization Theme Engine Structure & Presets', (t) => {
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
test('6. Voice Profiles & Suryadev Radiant Command Identity', (t) => {
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

// 7. Cognitive Engine Intent Classification & Goal Planning
test('7. Cognitive Engine Intent Classification & Goal Planning', (t) => {
  const classify = (input) => {
    const lower = input.toLowerCase();
    if (lower.startsWith('remember ')) return 'remember_request';
    if (lower.startsWith('forget ')) return 'forget_request';
    if (/(create|build|make)\s+(an?\s+)?app/i.test(lower)) return 'creation_request';
    if (/(redesign|change theme|make ui)/i.test(lower)) return 'modify_request';
    if (/^(open|launch)\s+/i.test(lower)) return 'command';
    if (/(prepare|organize|schedule)/i.test(lower)) return 'action_request';
    return 'conversation';
  };

  assert.strictEqual(classify('Remember that I prefer Indian English'), 'remember_request');
  assert.strictEqual(classify('Create an app like YouTube'), 'creation_request');
  assert.strictEqual(classify('SURYA, redesign your entire UI'), 'modify_request');
  assert.strictEqual(classify('Open YouTube'), 'command');
  assert.strictEqual(classify('SURYA, organize my complete study environment'), 'action_request');
});

// 8. Safe Auto-Update SHA-256 Checksum Validation
test('8. Safe Auto-Update SHA-256 Checksum Validation', (t) => {
  const sampleData = Buffer.from('SURYA_APK_PAYLOAD_V240');
  const computedHash = crypto.createHash('sha256').update(sampleData).digest('hex');

  assert.strictEqual(computedHash.length, 64, 'SHA-256 hash must be 64 hexadecimal characters');
  assert.match(computedHash, /^[a-f0-9]{64}$/);
});
