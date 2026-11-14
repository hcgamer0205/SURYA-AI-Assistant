package com.surya.assistant;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Visible Foreground Service for SURYA Hands-Free Voice Mode.
 * Displays a persistent status notification whenever active listening is enabled.
 * Never records or listens silently without user initiation.
 */
public class SuryaHandsFreeService extends Service {

    public static final String CHANNEL_ID = "surya_handsfree_channel";
    public static final String ACTION_STOP_HANDSFREE = "com.surya.assistant.ACTION_STOP_HANDSFREE";
    public static final String BROADCAST_HANDSFREE_STOPPED = "com.surya.assistant.HANDSFREE_STOPPED";
    private static final int NOTIFICATION_ID = 7001;

    public static volatile boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP_HANDSFREE.equals(intent.getAction())) {
            isRunning = false;
            sendBroadcast(new Intent(BROADCAST_HANDSFREE_STOPPED).setPackage(getPackageName()));
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this,
            0,
            openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, SuryaHandsFreeService.class);
        stopIntent.setAction(ACTION_STOP_HANDSFREE);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("SURYA Hands-Free Active")
            .setContentText("Listening for wake phrase 'Hey SURYA'. Tap Stop to disable microphone.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(openPendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "Stop Mic", stopPendingIntent)
            .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        isRunning = true;
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        isRunning = false;
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "SURYA Hands-Free Voice",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Visible active microphone status when SURYA Hands-Free Mode is enabled.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
