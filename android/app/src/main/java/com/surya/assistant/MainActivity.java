package com.surya.assistant;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import androidx.annotation.NonNull;
import androidx.core.content.FileProvider;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import java.io.File;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.Executor;
import com.getcapacitor.BridgeActivity;

/**
 * SURYA Mobile Assistant Native Android Bridge Activity (SDK 36, Java 21)
 * High-performance multilingual voice bridge, genuine BiometricPrompt authentication,
 * intent launcher, and secure FileProvider APK installation.
 */
public class MainActivity extends BridgeActivity {

    private TextToSpeech tts;
    private SpeechRecognizer speechRecognizer;
    private Handler mainHandler;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mainHandler = new Handler(Looper.getMainLooper());

        // Initialize Android TextToSpeech with multilingual locale support
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(Locale.getDefault());
                tts.setPitch(1.0f);
                tts.setSpeechRate(1.1f);
            }
        });

        // Attach native JavascriptInterface to WebView
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.addJavascriptInterface(new AndroidSuryaNativeBridge(), "AndroidSuryaBridge");
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
        }
        super.onDestroy();
    }

    /**
     * Native JavascriptInterface exposed to SURYA frontend
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

        /**
         * Set TextToSpeech Language Code (e.g. "hi-IN", "ta-IN", "ja-JP", "en-US")
         */
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

        /**
         * Real Android Biometric or Device Credential Authentication
         */
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

        /**
         * Check if biometric hardware or device credential is enrolled
         */
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

        /**
         * Native Multilingual Speech Recognition
         */
        @JavascriptInterface
        public void startListening(String languageCode) {
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
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);

                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        sendJsEvent("onNativeSpeechReady", "{}");
                    }
                    @Override
                    public void onBeginningOfSpeech() {}
                    @Override
                    public void onRmsChanged(float rmsdB) {}
                    @Override
                    public void onBufferReceived(byte[] buffer) {}
                    @Override
                    public void onEndOfSpeech() {}
                    @Override
                    public void onError(int error) {
                        sendJsEvent("onNativeSpeechError", "{\"code\":" + error + "}");
                    }
                    @Override
                    public void onResults(Bundle results) {
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            String text = matches.get(0).replace("\"", "\\\"");
                            sendJsEvent("onNativeSpeechResult", "{\"text\":\"" + text + "\",\"isFinal\":true}");
                        }
                    }
                    @Override
                    public void onPartialResults(Bundle partialResults) {
                        ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (matches != null && !matches.isEmpty()) {
                            String text = matches.get(0).replace("\"", "\\\"");
                            sendJsEvent("onNativeSpeechResult", "{\"text\":\"" + text + "\",\"isFinal\":false}");
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

        /**
         * Native Android Text-to-Speech
         */
        @JavascriptInterface
        public void speakText(String text) {
            mainHandler.post(() -> {
                if (tts != null && text != null) {
                    tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "surya_tts");
                }
            });
        }

        @JavascriptInterface
        public void stopSpeaking() {
            mainHandler.post(() -> {
                if (tts != null) {
                    tts.stop();
                }
            });
        }

        /**
         * Dispatch Android Intent via SURYA App Hub
         */
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

        /**
         * Dispatch APK update through Android Package Installer & FileProvider
         */
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
    }

    private void notifyWebAuthResult(final String challengeId, final boolean success, final String message) {
        String script = String.format(
            "window.dispatchEvent(new CustomEvent('androidBiometricResult', { detail: { challengeId: '%s', success: %b, message: '%s' } }));",
            challengeId, success, message
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
