/**
 * SURYA Local Android Intent Command Router
 * Executes device application commands locally with 0ms network latency.
 * Never opens unexpected browser popups in embedded iframes; dispatches
 * AndroidSuryaBridge intents natively or emits clean in-app fallback events.
 */

export interface LocalCommandResult {
  isLocal: boolean;
  appId?: string;
  appName?: string;
  packageName?: string;
  intentAction?: string;
  intentUri?: string;
  fallbackUrl?: string;
  responseMessage?: string;
}

export class LocalIntentRouter {
  public static matchLocalCommand(input: string, currentLanguage = 'en'): LocalCommandResult {
    if (!input || typeof input !== 'string') {
      return { isLocal: false };
    }

    const clean = input
      .trim()
      .toLowerCase()
      .replace(/[?!.,;:'"\/\\-]/g, ' ')
      .replace(/\s+/g, ' ');

    const stripped = clean
      .replace(/^(hey|hi|hello|ok|okay)?\s*(surya|soorya|surya ai)\s*/i, '')
      .replace(/\s*(please|zara|kripya)\s*/gi, ' ')
      .trim();

    const youtubeRegex =
      /(open\s+youtube|launch\s+youtube|play\s+youtube|start\s+youtube|youtube\s+kholo|youtube\s+chalao|youtube\s+open|यूट्यूब\s*खोलो|यूट्यूब\s*चलाओ|यूट्यूब\s*शुरू|ইউটিউব\s*খুলুন|யூடியூப்\s*திற|యూట్యూబ్\s*ఓపెన్|abrir\s+youtube|ouvrir\s+youtube)/i;

    if (youtubeRegex.test(stripped) || stripped === 'youtube' || stripped === 'यूट्यूब') {
      return {
        isLocal: true,
        appId: 'app_youtube',
        appName: 'YouTube',
        packageName: 'com.google.android.youtube',
        intentAction: 'android.intent.action.VIEW',
        intentUri: 'vnd.youtube:',
        fallbackUrl: 'https://www.youtube.com',
        responseMessage:
          currentLanguage === 'hi'
            ? 'यूट्यूब खोला जा रहा है...'
            : currentLanguage === 'ta'
            ? 'யூடியூப் திறக்கப்படுகிறது...'
            : currentLanguage === 'te'
            ? 'యూట్యూబ్ తెరవబడుతోంది...'
            : 'Launching YouTube...',
      };
    }

    const browserRegex =
      /(open\s+(chrome|browser|internet|web)|launch\s+(chrome|browser)|chrome\s+kholo|browser\s+kholo|ब्राउज़र\s*खोलो|इंटरनेट\s*खोलो|ब्राउजर\s*खोलो|क्रोम\s*खोलो)/i;
    if (browserRegex.test(stripped) || stripped === 'chrome' || stripped === 'browser') {
      return {
        isLocal: true,
        appId: 'app_browser',
        appName: 'Chrome Web Browser',
        packageName: 'com.android.chrome',
        intentAction: 'android.intent.action.VIEW',
        intentUri: 'https://www.google.com',
        fallbackUrl: 'https://www.google.com',
        responseMessage: currentLanguage === 'hi' ? 'वेब ब्राउज़र खोला जा रहा है...' : 'Launching Web Browser...',
      };
    }

    const mapsRegex =
      /(open\s+maps?|launch\s+maps?|google\s+maps?|navigate|directions|maps?\s+kholo|मैप\s*खोलो|नक्शा\s*खोलो|रास्ता\s*दिखाओ|नेविगेशन\s*खोलो)/i;
    if (mapsRegex.test(stripped) || stripped === 'maps' || stripped === 'map') {
      return {
        isLocal: true,
        appId: 'app_maps',
        appName: 'Google Maps',
        packageName: 'com.google.android.apps.maps',
        intentAction: 'android.intent.action.VIEW',
        intentUri: 'geo:0,0?q=',
        fallbackUrl: 'https://maps.google.com',
        responseMessage: currentLanguage === 'hi' ? 'गूगल मैप्स खोला जा रहा है...' : 'Launching Google Maps...',
      };
    }

    const cameraRegex =
      /(open\s+camera|launch\s+camera|take\s+(a\s+)?picture|take\s+(a\s+)?photo|camera\s+kholo|फोटो\s*खींचो|कैमरा\s*खोलो|कैमरा\s*शुरू)/i;
    if (cameraRegex.test(stripped) || stripped === 'camera') {
      return {
        isLocal: true,
        appId: 'app_camera',
        appName: 'Camera',
        packageName: 'com.android.camera',
        intentAction: 'android.media.action.IMAGE_CAPTURE',
        intentUri: '',
        responseMessage: currentLanguage === 'hi' ? 'कैमरा खोला जा रहा है...' : 'Activating Optical Camera...',
      };
    }

    const settingsRegex = /(open\s+settings?|launch\s+settings?|device\s+settings?|settings?\s+kholo|सेटिंग्स\s*खोलो|सेटिंग\s*खोलो)/i;
    if (settingsRegex.test(stripped) || stripped === 'settings') {
      return {
        isLocal: true,
        appId: 'app_settings',
        appName: 'Android Settings',
        packageName: 'com.android.settings',
        intentAction: 'android.settings.SETTINGS',
        intentUri: '',
        responseMessage: currentLanguage === 'hi' ? 'डिवाइस सेटिंग्स खोली जा रही हैं...' : 'Opening Android Settings...',
      };
    }

    const dialerRegex = /(open\s+(dialer|phone)|call\s+someone|phone\s+kholo|dialer\s+kholo|फोन\s*खोलो|डायल\s*खोलो|कॉल\s*खोलो)/i;
    if (dialerRegex.test(stripped) || stripped === 'phone' || stripped === 'dialer') {
      return {
        isLocal: true,
        appId: 'app_phone',
        appName: 'Phone Dialer',
        packageName: 'com.android.dialer',
        intentAction: 'android.intent.action.DIAL',
        intentUri: 'tel:',
        responseMessage: currentLanguage === 'hi' ? 'फोन डायलर खोला जा रहा है...' : 'Opening Phone Dialer...',
      };
    }

    const wifiRegex = /(wifi\s+settings?|open\s+wifi|wi-fi\s+settings?|wifi\s+kholo|वाईफाई\s*खोलो)/i;
    if (wifiRegex.test(stripped) || stripped === 'wifi') {
      return {
        isLocal: true,
        appId: 'app_wifi_settings',
        appName: 'Wi-Fi Settings',
        packageName: 'com.android.settings',
        intentAction: 'android.settings.WIFI_SETTINGS',
        intentUri: '',
        responseMessage: currentLanguage === 'hi' ? 'वाईफाई सेटिंग्स खोली जा रही हैं...' : 'Opening Wi-Fi Settings...',
      };
    }

    const whatsappRegex = /(open\s+whatsapp|launch\s+whatsapp|whatsapp\s+kholo|व्हाट्सएप\s*खोलो|वॉट्सऐप\s*खोलो)/i;
    if (whatsappRegex.test(stripped) || stripped === 'whatsapp') {
      return {
        isLocal: true,
        appId: 'app_whatsapp',
        appName: 'WhatsApp',
        packageName: 'com.whatsapp',
        intentAction: 'android.intent.action.VIEW',
        intentUri: 'whatsapp://',
        fallbackUrl: 'https://web.whatsapp.com',
        responseMessage: currentLanguage === 'hi' ? 'व्हाट्सएप खोला जा रहा है...' : 'Launching WhatsApp...',
      };
    }

    return { isLocal: false };
  }

  public static async executeLocalCommand(command: LocalCommandResult): Promise<{ success: boolean; detail: string }> {
    if (!command.isLocal) {
      return { success: false, detail: 'Not a local command' };
    }

    const nativeBridge = typeof window !== 'undefined' ? (window as any).AndroidSuryaBridge : null;
    if (nativeBridge && typeof nativeBridge.launchIntent === 'function') {
      try {
        const launched = nativeBridge.launchIntent(
          command.intentAction || 'android.intent.action.VIEW',
          command.intentUri || '',
          command.packageName || ''
        );
        if (launched) {
          return { success: true, detail: `Native intent dispatched for ${command.appName}` };
        }
      } catch (err) {
        console.warn('Native intent failed:', err);
      }
    }

    if (typeof window !== 'undefined' && command.fallbackUrl) {
      window.dispatchEvent(
        new CustomEvent('suryaExternalFallback', {
          detail: { appName: command.appName, url: command.fallbackUrl },
        })
      );
      return {
        success: true,
        detail: `Web fallback ready for ${command.appName}: ${command.fallbackUrl}`,
      };
    }

    return {
      success: true,
      detail: `Prepared local action for ${command.appName}`,
    };
  }
}

export const localIntentRouter = LocalIntentRouter;
