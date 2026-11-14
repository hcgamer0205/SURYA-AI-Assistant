package com.surya.assistant;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * Android Home Screen Widget Provider for quick-launching SURYA Voice, Optics, or Command Center.
 */
public class SuryaWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.surya_widget);

            Intent rootIntent = new Intent(context, MainActivity.class);
            rootIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent rootPending = PendingIntent.getActivity(
                context,
                10,
                rootIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_root, rootPending);

            Intent voiceIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("surya://assistant?action=voice"), context, MainActivity.class);
            voiceIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent voicePending = PendingIntent.getActivity(
                context,
                11,
                voiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_btn_voice, voicePending);

            Intent visionIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("surya://assistant?action=optics"), context, MainActivity.class);
            visionIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent visionPending = PendingIntent.getActivity(
                context,
                12,
                visionIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_btn_vision, visionPending);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
