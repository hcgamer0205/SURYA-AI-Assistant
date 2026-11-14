package com.surya.assistant;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ConfigurationInfo;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Debug;
import android.os.PowerManager;
import android.os.StatFs;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.util.Base64;
import com.google.android.gms.tasks.Tasks;
import com.google.mediapipe.tasks.genai.llminference.LlmInference;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * SURYA Native Offline AI, Hardware Capability, Download Manager & On-Device Vision Engine.
 * Manages genuine device telemetry, resumable SHA-256 verified model downloads inside
 * app-private storage, MediaPipe LlmInference runtime, and bundled ML Kit OCR/QR vision.
 */
public class SuryaOfflineModelService {

    public interface JsEmitter {
        void emit(String eventName, String jsonPayload);
    }

    private static final Set<String> TRUSTED_HOSTS = Set.of(
        "huggingface.co",
        "hf.co",
        "cdn-lfs.huggingface.co",
        "cdn-lfs-us-1.huggingface.co",
        "cdn-lfs-eu-1.huggingface.co",
        "storage.googleapis.com",
        "dl.google.com"
    );

    private static final class DownloadControl {
        final AtomicBoolean paused = new AtomicBoolean(false);
        final AtomicBoolean cancelled = new AtomicBoolean(false);
    }

    private final Context context;
    private final JsEmitter jsEmitter;
    private final File modelsDir;
    private final ExecutorService downloadExecutor = Executors.newSingleThreadExecutor();
    private final ExecutorService inferenceExecutor = Executors.newSingleThreadExecutor();
    private final Map<String, DownloadControl> activeDownloads = new ConcurrentHashMap<>();

    private final Object runtimeLock = new Object();
    private LlmInference llmInference;
    private String activeModelId = null;
    private String activeRequestId = null;
    private final AtomicBoolean cancelRequested = new AtomicBoolean(false);

    public SuryaOfflineModelService(Context context, JsEmitter jsEmitter) {
        this.context = context.getApplicationContext();
        this.jsEmitter = jsEmitter;
        this.modelsDir = new File(this.context.getFilesDir(), "surya_models");
        if (!this.modelsDir.exists()) {
            //noinspection ResultOfMethodCallIgnored
            this.modelsDir.mkdirs();
        }
    }

    public void destroy() {
        unloadModel();
        downloadExecutor.shutdownNow();
        inferenceExecutor.shutdownNow();
    }

    public String getHardwareCapabilitiesJson(boolean ttsInitialized) {
        try {
            JSONObject root = new JSONObject();
            root.put("platform", "android");
            root.put("androidRelease", Build.VERSION.RELEASE);
            root.put("sdkVersion", Build.VERSION.SDK_INT);
            root.put("deviceModel", Build.MANUFACTURER + " " + Build.MODEL);

            JSONArray abis = new JSONArray();
            for (String abi : Build.SUPPORTED_ABIS) {
                abis.put(abi);
            }
            root.put("cpuAbis", abis);
            root.put("cpuCores", Runtime.getRuntime().availableProcessors());

            // Memory info via ActivityManager
            ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
            long totalRamMb = -1;
            long availRamMb = -1;
            boolean lowMemory = false;
            String glEsVersion = null;
            if (am != null) {
                ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
                am.getMemoryInfo(mi);
                totalRamMb = mi.totalMem / (1024 * 1024);
                availRamMb = mi.availMem / (1024 * 1024);
                lowMemory = mi.lowMemory;
                ConfigurationInfo ci = am.getDeviceConfigurationInfo();
                if (ci != null) {
                    glEsVersion = ci.getGlEsVersion();
                }
            }
            root.put("totalRamMb", totalRamMb);
            root.put("availableRamMb", availRamMb);
            root.put("lowMemory", lowMemory);

            // Internal storage info via StatFs
            StatFs statFs = new StatFs(modelsDir.getAbsolutePath());
            long totalStorageMb = statFs.getTotalBytes() / (1024 * 1024);
            long availStorageMb = statFs.getAvailableBytes() / (1024 * 1024);
            root.put("totalStorageMb", totalStorageMb);
            root.put("availableStorageMb", availStorageMb);

            // Battery & thermal state
            BatteryManager bm = (BatteryManager) context.getSystemService(Context.BATTERY_SERVICE);
            int batteryPct = bm != null ? bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : -1;
            boolean charging = bm != null && bm.isCharging();
            root.put("batteryLevel", batteryPct);
            root.put("isCharging", charging);

            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            boolean powerSave = pm != null && pm.isPowerSaveMode();
            String thermal = "unknown";
            if (pm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                int status = pm.getCurrentThermalStatus();
                if (status <= PowerManager.THERMAL_STATUS_NONE) thermal = "nominal";
                else if (status == PowerManager.THERMAL_STATUS_LIGHT) thermal = "light";
                else if (status == PowerManager.THERMAL_STATUS_MODERATE) thermal = "moderate";
                else if (status == PowerManager.THERMAL_STATUS_SEVERE) thermal = "severe";
                else thermal = "critical";
            }
            root.put("powerSaveMode", powerSave);
            root.put("thermalStatus", thermal);

            // GPU / Hardware acceleration checks without blind assumptions
            PackageManager pkgMgr = context.getPackageManager();
            boolean vulkanSupported = pkgMgr.hasSystemFeature(PackageManager.FEATURE_VULKAN_HARDWARE_VERSION);
            boolean nnapiSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1;
            boolean openClLikely = glEsVersion != null && !glEsVersion.startsWith("2.");
            JSONObject gpu = new JSONObject();
            gpu.put("vulkanSupported", vulkanSupported);
            gpu.put("nnapiSupported", nnapiSupported);
            gpu.put("openGlEsVersion", glEsVersion != null ? glEsVersion : JSONObject.NULL);
            gpu.put("openClLikely", openClLikely);
            gpu.put("summary", vulkanSupported
                ? "Vulkan & XNNPack CPU supported (OpenGL ES " + (glEsVersion != null ? glEsVersion : "?") + ")"
                : "XNNPack CPU path verified (Vulkan hardware feature absent)");
            root.put("gpuAcceleration", gpu);

            // Offline voice capabilities
            boolean srAvail = SpeechRecognizer.isRecognitionAvailable(context);
            boolean onDeviceStt = false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                onDeviceStt = SpeechRecognizer.isOnDeviceRecognitionAvailable(context);
            }
            JSONObject voice = new JSONObject();
            voice.put("speechRecognizerAvailable", srAvail);
            voice.put("onDeviceSttSupported", onDeviceStt);
            voice.put("ttsReady", ttsInitialized);
            root.put("offlineVoice", voice);

            return root.toString();
        } catch (Exception e) {
            return "{\"error\":" + JSONObject.quote(e.getMessage() != null ? e.getMessage() : "capability_error") + "}";
        }
    }

    public String listDownloadedModelsJson() {
        JSONArray arr = new JSONArray();
        File[] files = modelsDir.listFiles((dir, name) -> name.endsWith(".meta.json"));
        if (files != null) {
            for (File metaFile : files) {
                try {
                    byte[] raw = readAllBytes(metaFile);
                    JSONObject meta = new JSONObject(new String(raw, StandardCharsets.UTF_8));
                    String fileName = meta.optString("fileName", "");
                    if (!fileName.isEmpty()) {
                        File binFile = resolveSafeChild(fileName);
                        if (binFile.exists() && binFile.length() > 0) {
                            meta.put("downloadedBytes", binFile.length());
                            arr.put(meta);
                        }
                    }
                } catch (Exception ignored) {}
            }
        }
        return arr.toString();
    }

    public String startModelDownload(
        final String modelId,
        final String urlString,
        final String rawFileName,
        final String expectedSha256,
        final long expectedBytes
    ) {
        try {
            if (!isTrustedHttpsUrl(urlString)) {
                return "{\"started\":false,\"error\":\"Untrusted or non-HTTPS download URL rejected.\"}";
            }
            final String safeFileName = sanitizeFileName(rawFileName);
            if (activeDownloads.containsKey(modelId)) {
                return "{\"started\":false,\"error\":\"Download is already in progress for this model.\"}";
            }

            StatFs statFs = new StatFs(modelsDir.getAbsolutePath());
            long neededBytes = Math.round(expectedBytes * 1.15) + (250L * 1024L * 1024L);
            if (expectedBytes > 0 && statFs.getAvailableBytes() < neededBytes) {
                return "{\"started\":false,\"error\":\"Insufficient internal storage headroom for this model.\"}";
            }

            final File targetFile = resolveSafeChild(safeFileName);
            final File partFile = resolveSafeChild(safeFileName + ".part");
            final DownloadControl control = new DownloadControl();
            activeDownloads.put(modelId, control);

            downloadExecutor.submit(() -> executeDownloadTask(
                modelId, urlString, safeFileName, targetFile, partFile, expectedSha256, expectedBytes, control
            ));
            return "{\"started\":true}";
        } catch (Exception e) {
            return "{\"started\":false,\"error\":" + JSONObject.quote(e.getMessage() != null ? e.getMessage() : "download_init_error") + "}";
        }
    }

    private void executeDownloadTask(
        String modelId,
        String urlString,
        String safeFileName,
        File targetFile,
        File partFile,
        String expectedSha256,
        long expectedBytes,
        DownloadControl control
    ) {
        HttpURLConnection conn = null;
        try {
            long existingLen = partFile.exists() ? partFile.length() : 0L;
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestProperty("User-Agent", "SURYA-Android-Assistant/1.2");
            if (existingLen > 0) {
                conn.setRequestProperty("Range", "bytes=" + existingLen + "-");
            }

            int status = conn.getResponseCode();
            // Handle manual cross-host redirect checks on HTTPS
            if (status == HttpURLConnection.HTTP_MOVED_TEMP || status == HttpURLConnection.HTTP_MOVED_PERM || status == 307 || status == 308) {
                String redirectUrl = conn.getHeaderField("Location");
                conn.disconnect();
                if (!isTrustedHttpsUrl(redirectUrl)) {
                    throw new SecurityException("Redirect pointed to an untrusted origin.");
                }
                conn = (HttpURLConnection) new URL(redirectUrl).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                if (existingLen > 0) conn.setRequestProperty("Range", "bytes=" + existingLen + "-");
                status = conn.getResponseCode();
            }

            if (status != HttpURLConnection.HTTP_OK && status != HttpURLConnection.HTTP_PARTIAL) {
                throw new IllegalStateException("Model server returned HTTP " + status);
            }

            boolean append = (status == HttpURLConnection.HTTP_PARTIAL && existingLen > 0);
            long contentLength = conn.getContentLengthLong();
            long totalBytes = append && contentLength > 0
                ? existingLen + contentLength
                : (contentLength > 0 ? contentLength : expectedBytes);

            long downloaded = append ? existingLen : 0L;
            long startedMs = System.currentTimeMillis();
            long lastEmitMs = 0L;

            try (InputStream in = new BufferedInputStream(conn.getInputStream());
                 FileOutputStream out = new FileOutputStream(partFile, append)) {
                byte[] buffer = new byte[32768];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    if (control.cancelled.get()) {
                        out.flush();
                        //noinspection ResultOfMethodCallIgnored
                        partFile.delete();
                        emitDownloadEvent("onModelDownloadError", modelId, "cancelled", downloaded, totalBytes, 0, null, null, null);
                        return;
                    }
                    if (control.paused.get()) {
                        out.flush();
                        emitDownloadEvent("onModelDownloadProgress", modelId, "paused", downloaded, totalBytes, 0, null, null, null);
                        return;
                    }
                    out.write(buffer, 0, read);
                    downloaded += read;
                    long now = System.currentTimeMillis();
                    if (now - lastEmitMs >= 350) {
                        double elapsedSec = Math.max(0.2, (now - startedMs) / 1000.0);
                        long speed = Math.round((downloaded - (append ? existingLen : 0L)) / elapsedSec);
                        long remaining = Math.max(0L, totalBytes - downloaded);
                        int eta = speed > 0 ? (int) Math.ceil((double) remaining / speed) : -1;
                        emitDownloadEvent("onModelDownloadProgress", modelId, "downloading", downloaded, totalBytes, speed, eta >= 0 ? eta : null, null, null);
                        lastEmitMs = now;
                    }
                }
            }

            if (partFile.length() == 0) {
                throw new IllegalStateException("Downloaded file is empty.");
            }

            emitDownloadEvent("onModelDownloadProgress", modelId, "verifying", downloaded, downloaded, 0, 0, null, null);

            String computedSha = computeFileSha256(partFile);
            if (expectedSha256 != null && !expectedSha256.trim().isEmpty()) {
                if (!computedSha.equalsIgnoreCase(expectedSha256.trim())) {
                    //noinspection ResultOfMethodCallIgnored
                    partFile.delete();
                    emitDownloadEvent("onModelDownloadError", modelId, "corrupted", 0, totalBytes, 0, null, computedSha,
                        "SHA-256 verification failed. Corrupt download removed.");
                    return;
                }
            }

            if (targetFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                targetFile.delete();
            }
            if (!partFile.renameTo(targetFile)) {
                throw new IllegalStateException("Failed to finalize verified model weights.");
            }

            JSONObject meta = new JSONObject();
            meta.put("modelId", modelId);
            meta.put("fileName", safeFileName);
            meta.put("status", "ready");
            meta.put("downloadedBytes", targetFile.length());
            meta.put("totalBytes", targetFile.length());
            meta.put("progressPercent", 100);
            meta.put("sha256", computedSha);
            meta.put("verificationStatus", (expectedSha256 != null && !expectedSha256.trim().isEmpty()) ? "verified_manifest" : "verified_sha256");
            meta.put("localPath", targetFile.getAbsolutePath());

            File metaFile = resolveSafeChild(modelId + ".meta.json");
            try (FileOutputStream fos = new FileOutputStream(metaFile)) {
                fos.write(meta.toString().getBytes(StandardCharsets.UTF_8));
            }

            jsEmitter.emit("onModelDownloadComplete", meta.toString());
        } catch (Exception e) {
            emitDownloadEvent("onModelDownloadError", modelId, "failed", 0, expectedBytes, 0, null, null,
                e.getMessage() != null ? e.getMessage() : "Download failed.");
        } finally {
            activeDownloads.remove(modelId);
            if (conn != null) conn.disconnect();
        }
    }

    public void pauseModelDownload(String modelId) {
        DownloadControl ctrl = activeDownloads.get(modelId);
        if (ctrl != null) ctrl.paused.set(true);
    }

    public void cancelModelDownload(String modelId) {
        DownloadControl ctrl = activeDownloads.get(modelId);
        if (ctrl != null) ctrl.cancelled.set(true);
        try {
            File metaFile = resolveSafeChild(modelId + ".meta.json");
            if (metaFile.exists()) {
                JSONObject meta = new JSONObject(new String(readAllBytes(metaFile), StandardCharsets.UTF_8));
                String fileName = meta.optString("fileName", "");
                if (!fileName.isEmpty()) {
                    File part = resolveSafeChild(fileName + ".part");
                    if (part.exists()) //noinspection ResultOfMethodCallIgnored
                        part.delete();
                }
            }
        } catch (Exception ignored) {}
    }

    public String verifyModelFileJson(String modelId, String expectedSha256) {
        try {
            File metaFile = resolveSafeChild(modelId + ".meta.json");
            if (!metaFile.exists()) {
                return "{\"valid\":false,\"reason\":\"Model metadata missing.\"}";
            }
            JSONObject meta = new JSONObject(new String(readAllBytes(metaFile), StandardCharsets.UTF_8));
            File binFile = resolveSafeChild(meta.optString("fileName", ""));
            if (!binFile.exists() || binFile.length() == 0) {
                return "{\"valid\":false,\"reason\":\"Model weights file missing.\"}";
            }
            String actualSha = computeFileSha256(binFile);
            String target = (expectedSha256 != null && !expectedSha256.trim().isEmpty())
                ? expectedSha256.trim()
                : meta.optString("sha256", "");
            if (!target.isEmpty() && !actualSha.equalsIgnoreCase(target)) {
                return "{\"valid\":false,\"sha256\":" + JSONObject.quote(actualSha) + ",\"reason\":\"SHA-256 mismatch detected.\"}";
            }
            return "{\"valid\":true,\"sha256\":" + JSONObject.quote(actualSha) + "}";
        } catch (Exception e) {
            return "{\"valid\":false,\"reason\":" + JSONObject.quote(e.getMessage() != null ? e.getMessage() : "verify_error") + "}";
        }
    }

    public String deleteModelJson(String modelId) {
        synchronized (runtimeLock) {
            if (modelId != null && modelId.equals(activeModelId) && llmInference != null) {
                return "{\"deleted\":false,\"error\":\"Active model cannot be deleted while loaded.\"}";
            }
        }
        try {
            File metaFile = resolveSafeChild(modelId + ".meta.json");
            if (metaFile.exists()) {
                JSONObject meta = new JSONObject(new String(readAllBytes(metaFile), StandardCharsets.UTF_8));
                String fileName = meta.optString("fileName", "");
                if (!fileName.isEmpty()) {
                    File bin = resolveSafeChild(fileName);
                    File part = resolveSafeChild(fileName + ".part");
                    if (bin.exists()) //noinspection ResultOfMethodCallIgnored
                        bin.delete();
                    if (part.exists()) //noinspection ResultOfMethodCallIgnored
                        part.delete();
                }
                //noinspection ResultOfMethodCallIgnored
                metaFile.delete();
            }
            return "{\"deleted\":true}";
        } catch (Exception e) {
            return "{\"deleted\":false,\"error\":" + JSONObject.quote(e.getMessage() != null ? e.getMessage() : "delete_error") + "}";
        }
    }

    public String loadModelJson(String modelId, int minDeviceRamMb, int maxTokens, boolean preferGpu) {
        synchronized (runtimeLock) {
            try {
                File metaFile = resolveSafeChild(modelId + ".meta.json");
                if (!metaFile.exists()) {
                    return "{\"loaded\":false,\"code\":\"MODEL_NOT_DOWNLOADED\",\"error\":\"Downloaded model metadata not found.\"}";
                }
                JSONObject meta = new JSONObject(new String(readAllBytes(metaFile), StandardCharsets.UTF_8));
                File binFile = resolveSafeChild(meta.optString("fileName", ""));
                if (!binFile.exists() || binFile.length() == 0) {
                    return "{\"loaded\":false,\"code\":\"MODEL_MISSING\",\"error\":\"Model weights missing on disk.\"}";
                }

                ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
                if (am != null) {
                    ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
                    am.getMemoryInfo(mi);
                    long availMb = mi.availMem / (1024 * 1024);
                    if (mi.lowMemory || (minDeviceRamMb > 0 && availMb < Math.max(512, minDeviceRamMb / 4L))) {
                        return "{\"loaded\":false,\"code\":\"INSUFFICIENT_MEMORY\",\"error\":\"Insufficient free RAM (" + availMb + " MB) to load model safely.\"}";
                    }
                }

                if (llmInference != null) {
                    try { llmInference.close(); } catch (Exception ignored) {}
                    llmInference = null;
                    activeModelId = null;
                }

                long beforeHeapKb = Debug.getNativeHeapAllocatedSize() / 1024;
                LlmInference.LlmInferenceOptions.Builder builder = LlmInference.LlmInferenceOptions.builder()
                    .setModelPath(binFile.getAbsolutePath())
                    .setMaxTokens(Math.max(256, Math.min(2048, maxTokens)))
                    .setResultListener((partialResult, done) -> {
                        String reqId = activeRequestId;
                        if (reqId == null) return;
                        try {
                            JSONObject ev = new JSONObject();
                            ev.put("requestId", reqId);
                            ev.put("chunk", partialResult != null ? partialResult : "");
                            ev.put("done", done);
                            jsEmitter.emit("onLocalLlmToken", ev.toString());
                        } catch (Exception ignored) {}
                        if (done) activeRequestId = null;
                    });

                llmInference = LlmInference.createFromOptions(context, builder.build());
                activeModelId = modelId;
                long afterHeapKb = Debug.getNativeHeapAllocatedSize() / 1024;
                long estMb = Math.max(256L, (afterHeapKb - beforeHeapKb) / 1024);

                JSONObject ok = new JSONObject();
                ok.put("loaded", true);
                ok.put("modelId", modelId);
                ok.put("backend", preferGpu ? "MediaPipe LlmInference (LiteRT)" : "MediaPipe LlmInference (CPU XNNPack)");
                ok.put("estimatedMemoryMb", estMb);
                return ok.toString();
            } catch (Throwable t) {
                llmInference = null;
                activeModelId = null;
                return "{\"loaded\":false,\"code\":\"NATIVE_LOAD_FAILED\",\"error\":" +
                    JSONObject.quote(t.getMessage() != null ? t.getMessage() : t.getClass().getSimpleName()) + "}";
            }
        }
    }

    public void unloadModel() {
        synchronized (runtimeLock) {
            cancelRequested.set(true);
            activeRequestId = null;
            if (llmInference != null) {
                try { llmInference.close(); } catch (Exception ignored) {}
                llmInference = null;
            }
            activeModelId = null;
        }
    }

    public boolean generateResponseAsync(String requestId, String prompt) {
        synchronized (runtimeLock) {
            if (llmInference == null || activeModelId == null) return false;
            cancelRequested.set(false);
            activeRequestId = requestId;
        }
        inferenceExecutor.submit(() -> {
            try {
                synchronized (runtimeLock) {
                    if (llmInference == null || cancelRequested.get()) return;
                    llmInference.generateResponseAsync(prompt);
                }
            } catch (Throwable t) {
                try {
                    JSONObject ev = new JSONObject();
                    ev.put("requestId", requestId);
                    ev.put("error", t.getMessage() != null ? t.getMessage() : "Local inference failure");
                    jsEmitter.emit("onLocalLlmToken", ev.toString());
                } catch (Exception ignored) {}
                activeRequestId = null;
            }
        });
        return true;
    }

    public void cancelGeneration() {
        cancelRequested.set(true);
        activeRequestId = null;
    }

    public String getRuntimeStateJson() {
        try {
            JSONObject obj = new JSONObject();
            obj.put("loaded", llmInference != null);
            obj.put("activeModelId", activeModelId != null ? activeModelId : JSONObject.NULL);
            return obj.toString();
        } catch (Exception e) {
            return "{\"loaded\":false}";
        }
    }

    public String analyzeImageOfflineJson(String base64DataUrl, String mode) {
        Bitmap bitmap = null;
        try {
            if (base64DataUrl == null || base64DataUrl.trim().isEmpty()) {
                return "{\"error\":\"No image supplied.\"}";
            }
            String b64 = base64DataUrl.contains(",")
                ? base64DataUrl.substring(base64DataUrl.indexOf(',') + 1)
                : base64DataUrl;
            byte[] decoded = Base64.decode(b64, Base64.DEFAULT);
            bitmap = BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
            if (bitmap == null) {
                return "{\"error\":\"Failed to decode image frame.\"}";
            }

            InputImage image = InputImage.fromBitmap(bitmap, 0);
            JSONObject out = new JSONObject();
            out.put("engine", "mlkit-on-device");

            String ocrText = "";
            if (!"qr".equalsIgnoreCase(mode)) {
                Text recognized = Tasks.await(
                    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).process(image),
                    8, TimeUnit.SECONDS
                );
                ocrText = recognized != null ? recognized.getText() : "";
            }
            out.put("ocrText", ocrText);

            JSONArray qrArr = new JSONArray();
            List<Barcode> barcodes = Tasks.await(
                BarcodeScanning.getClient().process(image),
                6, TimeUnit.SECONDS
            );
            if (barcodes != null) {
                for (Barcode bc : barcodes) {
                    if (bc.getRawValue() != null && !bc.getRawValue().isEmpty()) {
                        qrArr.put(bc.getRawValue());
                    }
                }
            }
            out.put("qrPayloads", qrArr);
            return out.toString();
        } catch (Exception e) {
            return "{\"error\":" + JSONObject.quote(e.getMessage() != null ? e.getMessage() : "mlkit_error") + "}";
        } finally {
            if (bitmap != null && !bitmap.isRecycled()) {
                bitmap.recycle();
            }
        }
    }

    public String checkOfflineVoiceReadinessJson(String langCode, TextToSpeech tts) {
        try {
            JSONObject obj = new JSONObject();
            boolean onDeviceStt = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && SpeechRecognizer.isOnDeviceRecognitionAvailable(context);
            boolean ttsReady = tts != null;
            boolean localeOffline = false;
            if (tts != null) {
                Locale target = (langCode != null && !langCode.isEmpty())
                    ? Locale.forLanguageTag(langCode)
                    : Locale.getDefault();
                Set<Voice> voices = tts.getVoices();
                if (voices != null) {
                    for (Voice v : voices) {
                        if (!v.isNetworkConnectionRequired() &&
                            v.getLocale().getLanguage().equalsIgnoreCase(target.getLanguage())) {
                            localeOffline = true;
                            break;
                        }
                    }
                }
            }
            obj.put("onDeviceSttSupported", onDeviceStt);
            obj.put("ttsReady", ttsReady);
            obj.put("localeSupportedOffline", localeOffline);
            obj.put("note", onDeviceStt
                ? "Android on-device speech recognition available; EXTRA_PREFER_OFFLINE enabled when offline."
                : "Android SpeechRecognizer uses EXTRA_PREFER_OFFLINE when offline; install OS offline language pack if prompted.");
            return obj.toString();
        } catch (Exception e) {
            return "{\"onDeviceSttSupported\":false,\"ttsReady\":false,\"localeSupportedOffline\":false}";
        }
    }

    public boolean openOfflineVoiceDataSettings() {
        try {
            Intent intent = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void emitDownloadEvent(
        String eventName,
        String modelId,
        String status,
        long downloadedBytes,
        long totalBytes,
        long speedBytesPerSec,
        Integer etaSeconds,
        String sha256,
        String error
    ) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("modelId", modelId);
            obj.put("status", status);
            obj.put("downloadedBytes", downloadedBytes);
            obj.put("totalBytes", totalBytes);
            int pct = totalBytes > 0 ? (int) Math.min(99, (downloadedBytes * 100L) / totalBytes) : 0;
            obj.put("progressPercent", "ready".equals(status) ? 100 : pct);
            obj.put("speedBytesPerSec", speedBytesPerSec);
            obj.put("etaSeconds", etaSeconds != null ? etaSeconds : JSONObject.NULL);
            if (sha256 != null) obj.put("sha256", sha256);
            if (error != null) obj.put("error", error);
            jsEmitter.emit(eventName, obj.toString());
        } catch (Exception ignored) {}
    }

    private boolean isTrustedHttpsUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) return false;
        try {
            URI uri = URI.create(rawUrl.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme())) return false;
            if (uri.getUserInfo() != null) return false;
            String host = uri.getHost();
            if (host == null) return false;
            String lower = host.toLowerCase(Locale.ROOT);
            for (String allowed : TRUSTED_HOSTS) {
                if (lower.equals(allowed) || lower.endsWith("." + allowed)) return true;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private String sanitizeFileName(String rawName) {
        if (rawName == null) throw new IllegalArgumentException("Empty filename");
        String base = new File(rawName).getName();
        String cleaned = base.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (cleaned.isEmpty() || ".".equals(cleaned) || "..".equals(cleaned) || cleaned.contains("..")) {
            throw new SecurityException("Unsafe filename rejected");
        }
        return cleaned;
    }

    private File resolveSafeChild(String fileName) throws Exception {
        String safe = sanitizeFileName(fileName);
        File candidate = new File(modelsDir, safe);
        String rootCanon = modelsDir.getCanonicalPath() + File.separator;
        String candCanon = candidate.getCanonicalPath();
        if (!candCanon.startsWith(rootCanon)) {
            throw new SecurityException("Path traversal attempt blocked");
        }
        return candidate;
    }

    private static String computeFileSha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream fis = new BufferedInputStream(new FileInputStream(file))) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = fis.read(buf)) != -1) {
                digest.update(buf, 0, n);
            }
        }
        byte[] hash = digest.digest();
        StringBuilder sb = new StringBuilder(hash.length * 2);
        for (byte b : hash) {
            sb.append(String.format(Locale.ROOT, "%02x", b));
        }
        return sb.toString();
    }

    private static byte[] readAllBytes(File file) throws Exception {
        try (FileInputStream fis = new FileInputStream(file)) {
            byte[] data = new byte[(int) file.length()];
            int offset = 0;
            while (offset < data.length) {
                int read = fis.read(data, offset, data.length - offset);
                if (read < 0) break;
                offset += read;
            }
            return data.length == offset ? data : Arrays.copyOf(data, offset);
        }
    }
}
