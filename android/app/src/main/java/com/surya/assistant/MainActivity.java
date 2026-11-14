package com.surya.assistant;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executor;
import org.json.JSONObject;

/**
 * SURYA Mobile Assistant Native Android Bridge Activity (SDK 36, Java 21)
 * High-performance multilingual voice bridge, Foreground Hands-Free service bridge,
 * device telemetry, BiometricPrompt authentication, notifications, and deep actions.
 */
public class MainActivity extends BridgeActivity {

    private static final String ALERTS_CHANNEL_ID = "surya_alerts_channel";
    private TextToSpeech tts;
    private boolean ttsInitialized = false;
    private SpeechRecognizer speechRecognizer;
    private Handler mainHandler;
    private BroadcastReceiver handsFreeStopReceiver;
    private SuryaOfflineModelService offlineModelService;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mainHandler = new Handler(Looper.getMainLooper());
        offlineModelService = new SuryaOfflineModelService(this, this::sendJsEvent);
        createAlertsNotificationChannel();

        // Initialize Android TextToSpeech with completion callbacks
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                ttsInitialized = true;
                tts.setLanguage(Locale.getDefault());
                tts.setPitch(1.0f);
                tts.setSpeechRate(1.06f);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {
                        sendJsEvent("onNativeTtsStart", "{\"utteranceId\":" + JSONObject.quote(utteranceId) + "}");
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        sendJsEvent("onNativeTtsDone", "{\"utteranceId\":" + JSONObject.quote(utteranceId) + "}");
                    }

                    @Override
                    public void onError(String utteranceId) {
                        sendJsEvent("onNativeTtsDone", "{\"utteranceId\":" + JSONObject.quote(utteranceId) + ",\"error\":true}");
                    }
                });
            }
        });

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.addJavascriptInterface(new AndroidSuryaNativeBridge(), "AndroidSuryaBridge");
        }

        handsFreeStopReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (speechRecognizer != null) {
                    try {
                        speechRecognizer.cancel();
                    } catch (Exception ignored) {}
                }
                sendJsEvent("onHandsFreeServiceState", "{\"running\":false,\"stoppedByUserNotification\":true}");
            }
        };

        IntentFilter filter = new IntentFilter(SuryaHandsFreeService.BROADCAST_HANDSFREE_STOPPED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(handsFreeStopReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(handsFreeStopReceiver, filter);
        }

        handleDeepLinkIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
    }

    private void handleDeepLinkIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri data = intent.getData();
        String action = data.getQueryParameter("action");
        if (action != null && !action.isEmpty()) {
            final String safeAction = JSONObject.quote(action);
            mainHandler.postDelayed(() -> sendJsEvent("onSuryaDeepAction", "{\"action\":" + safeAction + "}"), 600);
        }
    }

    @Override
    public void onDestroy() {
        if (handsFreeStopReceiver != null) {
            try {
                unregisterReceiver(handsFreeStopReceiver);
            } catch (Exception ignored) {}
        }
        if (offlineModelService != null) {
            offlineModelService.destroy();
        }
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
        }
        super.onDestroy();
    }

    private void createAlertsNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                ALERTS_CHANNEL_ID,
                "SURYA Reminders & Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Proactive reminders, automation updates, and device status notifications.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Native JavascriptInterface exposed to SURYA frontend as window.AndroidSuryaBridge
     */
    public class AndroidSuryaNativeBridge {

        @JavascriptInterface
        public boolean isNativeAndroid() {
            return true;
        }

        @JavascriptInterface
        public int getAndroidSdkVersion() {
            return Build.VERSION.SDK_INT;
        }

        @JavascriptInterface
        public boolean isHandsFreeServiceRunning() {
            return SuryaHandsFreeService.isRunning;
        }

        @JavascriptInterface
        public boolean startHandsFreeForegroundService() {
            if (ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                requestRuntimePermissions();
                return false;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    MainActivity.this,
                    new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                    103
                );
            }
            Intent serviceIntent = new Intent(MainActivity.this, SuryaHandsFreeService.class);
            ContextCompat.startForegroundService(MainActivity.this, serviceIntent);
            sendJsEvent("onHandsFreeServiceState", "{\"running\":true}");
            return true;
        }

        @JavascriptInterface
        public boolean stopHandsFreeForegroundService() {
            Intent serviceIntent = new Intent(MainActivity.this, SuryaHandsFreeService.class);
            stopService(serviceIntent);
            SuryaHandsFreeService.isRunning = false;
            sendJsEvent("onHandsFreeServiceState", "{\"running\":false}");
            return true;
        }

        @JavascriptInterface
        public void requestRuntimePermissions() {
            mainHandler.post(() -> {
                List<String> needed = new ArrayList<>();
                if (ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(android.Manifest.permission.RECORD_AUDIO);
                }
                if (ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(android.Manifest.permission.CAMERA);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                    ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(android.Manifest.permission.POST_NOTIFICATIONS);
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                    ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(android.Manifest.permission.BLUETOOTH_CONNECT);
                }
                if (!needed.isEmpty()) {
                    ActivityCompat.requestPermissions(MainActivity.this, needed.toArray(new String[0]), 102);
                }
            });
        }

        @JavascriptInterface
        public String getDeviceTelemetry() {
            try {
                JSONObject json = new JSONObject();

                // Battery
                BatteryManager bm = (BatteryManager) getSystemService(Context.BATTERY_SERVICE);
                int batteryPct = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : -1;
                boolean charging = bm != null && bm.isCharging();
                json.put("batteryLevel", batteryPct);
                json.put("isCharging", charging);

                // Connectivity
                String networkType = "offline";
                boolean isOnline = false;
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) {
                    Network active = cm.getActiveNetwork();
                    NetworkCapabilities caps = active != null ? cm.getNetworkCapabilities(active) : null;
                    if (caps != null) {
                        isOnline = caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
                        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                            networkType = "wifi";
                        } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                            networkType = "cellular";
                        } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                            networkType = "ethernet";
                        } else {
                            networkType = "connected";
                        }
                    }
                }
                json.put("online", isOnline);
                json.put("networkType", networkType);

                // Bluetooth audio route check
                boolean bluetoothAudio = false;
                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                if (am != null) {
                    AudioDeviceInfo[] outputs = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                    for (AudioDeviceInfo dev : outputs) {
                        int type = dev.getType();
                        if (type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                            type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                            type == AudioDeviceInfo.TYPE_BLE_HEADSET) {
                            bluetoothAudio = true;
                            break;
                        }
                    }
                }
                json.put("bluetoothAudioConnected", bluetoothAudio);
                json.put("handsFreeServiceRunning", SuryaHandsFreeService.isRunning);
                json.put("sdkVersion", Build.VERSION.SDK_INT);
                json.put("deviceModel", Build.MANUFACTURER + " " + Build.MODEL);
                return json.toString();
            } catch (Exception e) {
                return "{\"error\":\"telemetry_unavailable\"}";
            }
        }

        @JavascriptInterface
        public boolean sendLocalNotification(String title, String body) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                    ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    return false;
                }
                Intent intent = new Intent(MainActivity.this, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                PendingIntent pending = PendingIntent.getActivity(
                    MainActivity.this,
                    20,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, ALERTS_CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title != null ? title : "SURYA Notification")
                    .setContentText(body != null ? body : "")
                    .setAutoCancel(true)
                    .setContentIntent(pending)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT);

                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.notify((int) (System.currentTimeMillis() % 100000), builder.build());
                    return true;
                }
                return false;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean setVoiceLanguage(String langCode) {
            if (tts == null || langCode == null) return false;
            try {
                Locale loc = Locale.forLanguageTag(langCode);
                int result = tts.setLanguage(loc);
                return result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void requestBiometricAuth(final String challengeId, final String actionId, final String title, final String subtitle) {
            mainHandler.post(() -> {
                Executor executor = ContextCompat.getMainExecutor(MainActivity.this);
                BiometricPrompt biometricPrompt = new BiometricPrompt(MainActivity.this, executor, new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        notifyWebAuthResult(challengeId, false, "ERROR_" + errorCode + ": " + errString);
                    }

                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        notifyWebAuthResult(challengeId, true, "AUTHENTICATED_BIOMETRIC_OR_DEVICE_CREDENTIAL");
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                        notifyWebAuthResult(challengeId, false, "BIOMETRIC_FAILED_RETRY");
                    }
                });

                BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title != null ? title : "SURYA Security Authorization")
                        .setSubtitle(subtitle != null ? subtitle : "Verify your identity with Biometrics or Device Screen Lock")
                        .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL)
                        .build();

                biometricPrompt.authenticate(promptInfo);
            });
        }

        @JavascriptInterface
        public String checkBiometricCapability() {
            BiometricManager biometricManager = BiometricManager.from(MainActivity.this);
            int canAuthenticate = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL
            );

            switch (canAuthenticate) {
                case BiometricManager.BIOMETRIC_SUCCESS:
                    return "AVAILABLE";
                case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                    return "NO_HARDWARE";
                case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                    return "HARDWARE_UNAVAILABLE";
                case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                    return "NONE_ENROLLED";
                default:
                    return "UNKNOWN_STATUS";
            }
        }

        @JavascriptInterface
        public void startListening(String languageCode) {
            startListening(languageCode, false);
        }

        @JavascriptInterface
        public void startListening(String languageCode, boolean preferOffline) {
            mainHandler.post(() -> {
                if (ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(MainActivity.this, new String[]{android.Manifest.permission.RECORD_AUDIO}, 101);
                    return;
                }

                if (speechRecognizer != null) {
                    speechRecognizer.destroy();
                }

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(MainActivity.this);
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                if (languageCode != null && !languageCode.isEmpty()) {
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageCode);
                } else {
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag());
                }
                intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, preferOffline);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1600L);
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1200L);

                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        sendJsEvent("onNativeSpeechReady", "{}");
                    }
                    @Override
                    public void onBeginningOfSpeech() {
                        sendJsEvent("onNativeSpeechStart", "{}");
                    }
                    @Override
                    public void onRmsChanged(float rmsdB) {}
                    @Override
                    public void onBufferReceived(byte[] buffer) {}
                    @Override
                    public void onEndOfSpeech() {
                        sendJsEvent("onNativeSpeechEnd", "{}");
                    }
                    @Override
                    public void onError(int error) {
                        sendJsEvent("onNativeSpeechError", "{\"code\":" + error + "}");
                    }
                    @Override
                    public void onResults(Bundle results) {
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            String quoted = JSONObject.quote(matches.get(0));
                            sendJsEvent("onNativeSpeechResult", "{\"text\":" + quoted + ",\"isFinal\":true}");
                        }
                    }
                    @Override
                    public void onPartialResults(Bundle partialResults) {
                        ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            String quoted = JSONObject.quote(matches.get(0));
                            sendJsEvent("onNativeSpeechResult", "{\"text\":" + quoted + ",\"isFinal\":false}");
                        }
                    }
                    @Override
                    public void onEvent(int eventType, Bundle params) {}
                });

                speechRecognizer.startListening(intent);
            });
        }

        @JavascriptInterface
        public void stopListening() {
            mainHandler.post(() -> {
                if (speechRecognizer != null) {
                    speechRecognizer.stopListening();
                }
            });
        }

        @JavascriptInterface
        public void speakText(String text) {
            mainHandler.post(() -> {
                if (tts != null && text != null) {
                    tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "surya_tts_" + System.currentTimeMillis());
                }
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            mainHandler.post(() -> {
                if (tts != null) {
                    tts.stop();
                    sendJsEvent("onNativeTtsDone", "{\"stopped\":true}");
                }
            });
        }

        @JavascriptInterface
        public boolean launchIntent(String action, String dataUri, String packageName) {
            try {
                Intent intent = new Intent(action);
                if (dataUri != null && !dataUri.isEmpty()) {
                    intent.setData(Uri.parse(dataUri));
                }
                if (packageName != null && !packageName.isEmpty()) {
                    intent.setPackage(packageName);
                }
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return true;
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }

        @JavascriptInterface
        public boolean installApk(String filePath) {
            try {
                File file = new File(filePath);
                if (!file.exists()) return false;

                Uri apkUri = FileProvider.getUriForFile(
                    MainActivity.this,
                    "com.surya.assistant.fileprovider",
                    file
                );

                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
                return true;
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }

        // ---------------- OFFLINE AI MODEL STORE, HARDWARE INTELLIGENCE & VISION ----------------

        @JavascriptInterface
        public String getHardwareCapabilities() {
            return offlineModelService != null
                ? offlineModelService.getHardwareCapabilitiesJson(ttsInitialized)
                : "{\"error\":\"service_unavailable\"}";
        }

        @JavascriptInterface
        public String listDownloadedModels() {
            return offlineModelService != null ? offlineModelService.listDownloadedModelsJson() : "[]";
        }

        @JavascriptInterface
        public String startModelDownload(String modelId, String url, String fileName, String expectedSha256, long expectedBytes) {
            return offlineModelService != null
                ? offlineModelService.startModelDownload(modelId, url, fileName, expectedSha256, expectedBytes)
                : "{\"started\":false,\"error\":\"service_unavailable\"}";
        }

        @JavascriptInterface
        public void pauseModelDownload(String modelId) {
            if (offlineModelService != null) offlineModelService.pauseModelDownload(modelId);
        }

        @JavascriptInterface
        public void cancelModelDownload(String modelId) {
            if (offlineModelService != null) offlineModelService.cancelModelDownload(modelId);
        }

        @JavascriptInterface
        public String verifyModelFile(String modelId, String expectedSha256) {
            return offlineModelService != null
                ? offlineModelService.verifyModelFileJson(modelId, expectedSha256)
                : "{\"valid\":false,\"reason\":\"service_unavailable\"}";
        }

        @JavascriptInterface
        public String deleteDownloadedModel(String modelId) {
            return offlineModelService != null
                ? offlineModelService.deleteModelJson(modelId)
                : "{\"deleted\":false,\"error\":\"service_unavailable\"}";
        }

        @JavascriptInterface
        public String loadLocalModel(String modelId, int minDeviceRamMb, int maxTokens, boolean preferGpu) {
            return offlineModelService != null
                ? offlineModelService.loadModelJson(modelId, minDeviceRamMb, maxTokens, preferGpu)
                : "{\"loaded\":false,\"error\":\"service_unavailable\"}";
        }

        @JavascriptInterface
        public void unloadLocalModel() {
            if (offlineModelService != null) offlineModelService.unloadModel();
        }

        @JavascriptInterface
        public String getLocalModelRuntimeState() {
            return offlineModelService != null ? offlineModelService.getRuntimeStateJson() : "{\"loaded\":false}";
        }

        @JavascriptInterface
        public boolean generateLocalLlmResponse(String requestId, String prompt) {
            return offlineModelService != null && offlineModelService.generateResponseAsync(requestId, prompt);
        }

        @JavascriptInterface
        public void cancelLocalLlmGeneration() {
            if (offlineModelService != null) offlineModelService.cancelGeneration();
        }

        @JavascriptInterface
        public String analyzeImageOffline(String base64DataUrl, String mode) {
            return offlineModelService != null
                ? offlineModelService.analyzeImageOfflineJson(base64DataUrl, mode)
                : "{\"error\":\"service_unavailable\"}";
        }

        @JavascriptInterface
        public String checkOfflineVoiceReadiness(String langCode) {
            return offlineModelService != null
                ? offlineModelService.checkOfflineVoiceReadinessJson(langCode, tts)
                : "{\"onDeviceSttSupported\":false,\"ttsReady\":false}";
        }

        @JavascriptInterface
        public boolean openOfflineVoiceDataSettings() {
            return offlineModelService != null && offlineModelService.openOfflineVoiceDataSettings();
        }
    }

    private void notifyWebAuthResult(final String challengeId, final boolean success, final String message) {
        String script = String.format(
            "window.dispatchEvent(new CustomEvent('androidBiometricResult', { detail: { challengeId: %s, success: %b, message: %s } }));",
            JSONObject.quote(challengeId != null ? challengeId : ""),
            success,
            JSONObject.quote(message != null ? message : "")
        );
        mainHandler.post(() -> {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.evaluateJavascript(script, null);
            }
        });
    }

    private void sendJsEvent(String eventName, String jsonPayload) {
        String script = String.format(
            "window.dispatchEvent(new CustomEvent('%s', { detail: %s }));",
            eventName, jsonPayload
        );
        mainHandler.post(() -> {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.evaluateJavascript(script, null);
            }
        });
    }
}
