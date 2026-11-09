/**
 * SURYA Voice Command Parser
 * Interprets contextual spoken directives for UI redesign, theme preview/apply/undo,
 * Suryadev voice profile switching, language changes, model selector, and local app launches.
 */

import { uiThemeEngine } from './uiThemeEngine';
import { voiceProfileManager, VOICE_PROFILES } from './voiceProfileManager';
import { localIntentRouter } from './localIntentRouter';
import { SuryaThemeConfig } from '../types/suryaTheme';

export interface ParsedVoiceAction {
  handledLocally: boolean;
  category: 'ui_redesign' | 'ui_confirm' | 'ui_undo' | 'voice_control' | 'model_control' | 'local_app' | 'none';
  spokenResponse?: string;
  actionSummary?: string;
  themePreview?: SuryaThemeConfig;
  targetApp?: string;
  newLanguage?: string;
  newVoiceProfile?: string;
}

export class VoiceCommandParser {
  /**
   * Parse user input to determine if it is an immediate local command
   */
  public static parse(rawInput: string): ParsedVoiceAction {
    if (!rawInput || typeof rawInput !== 'string') {
      return { handledLocally: false, category: 'none' };
    }

    const text = rawInput.trim();
    const lower = text.toLowerCase().replace(/^[,\s.!?]+|[,\s.!?]+$/g, '');

    // 0. STOP SPEAKING COMMANDS
    // e.g. "stop speaking", "quiet", "be quiet", "shut up", "चुप", "शांत हो जाओ", "बोलना बंद करो"
    if (
      /^(stop speaking|shut up|be quiet|quiet|stop talking|stop audio|chup|shant|चुप|शांत|बोलना\s*बंद\s*करो)$/i.test(lower) ||
      lower.includes('stop speaking') ||
      lower.includes('बोलना बंद करो')
    ) {
      return {
        handledLocally: true,
        category: 'voice_control',
        spokenResponse: '', // silent immediate stop
        actionSummary: 'Speech terminated immediately.',
      };
    }

    // 1. CONFIRMATION COMMANDS ("Apply it", "apply", "लागू करो", "theek hai")
    if (
      uiThemeEngine.isPreviewActive() &&
      /^(apply it|apply this|apply|confirm|looks good|save it|keep it|लागू करो|ठीक है|apply karo)$/i.test(lower)
    ) {
      const committed = uiThemeEngine.commitPreview();
      return {
        handledLocally: true,
        category: 'ui_confirm',
        spokenResponse: `Applied. The ${committed.name} interface configuration is now permanent.`,
        actionSummary: `Applied theme: ${committed.name}`,
      };
    }

    // 2. UNDO / REVERT COMMANDS ("Undo that", "undo", "revert", "वापस लो", "undo karo")
    if (
      /^(undo that|undo|revert|cancel redesign|go back|restore previous|पिछला बदलाव वापस लो|वापस लो|undo karo|cancel karo)$/i.test(lower) ||
      lower.includes('undo the last redesign') ||
      lower.includes('undo the last change')
    ) {
      const didUndo = uiThemeEngine.undo();
      const current = uiThemeEngine.getCurrentTheme();
      if (didUndo) {
        return {
          handledLocally: true,
          category: 'ui_undo',
          spokenResponse: `Previous interface restored. Now displaying ${current.name}.`,
          actionSummary: `Restored theme: ${current.name}`,
        };
      } else {
        return {
          handledLocally: true,
          category: 'ui_undo',
          spokenResponse: 'No previous interface changes in history to undo.',
          actionSummary: 'Nothing to undo.',
        };
      }
    }

    // 3. RESET TO DEFAULT COMMANDS ("Restore original UI", "Reset theme", "डिफ़ॉल्ट करो")
    if (
      /^(restore the original ui|restore original ui|reset ui|reset theme|default theme|restore default|मूल रूप में लाओ|डिफ़ॉल्ट करो)$/i.test(lower) ||
      lower.includes('restore the original ui') ||
      lower.includes('reset to default')
    ) {
      const def = uiThemeEngine.resetToDefault();
      return {
        handledLocally: true,
        category: 'ui_redesign',
        spokenResponse: 'Original Suryadev Radiant Solar interface restored to default settings.',
        actionSummary: `Reset to ${def.name}`,
      };
    }

    // 4. UI REDESIGN VOICE COMMANDS
    // 4a. Golden Suryadev-inspired Theme
    if (
      lower.includes('golden suryadev') ||
      lower.includes('suryadev-inspired') ||
      lower.includes('suryadev theme') ||
      lower.includes('solar theme') ||
      lower.includes('golden and radiant') ||
      lower.includes('सूर्य देव थीम') ||
      lower.includes('गोल्डन थीम')
    ) {
      uiThemeEngine.previewTheme('suryadev-radiant');
      const theme = uiThemeEngine.getCurrentTheme();
      return {
        handledLocally: true,
        category: 'ui_redesign',
        themePreview: theme,
        spokenResponse: 'Golden Suryadev Radiant Solar theme generated. Review the preview and say "Apply it" or "Undo that".',
        actionSummary: 'Previewing Suryadev — Radiant Solar Theme',
      };
    }

    // 4b. Futuristic Holographic AI / Sci-Fi
    if (
      lower.includes('futuristic holographic') ||
      lower.includes('holographic ai') ||
      lower.includes('futuristic ui') ||
      lower.includes('sci-fi') ||
      lower.includes('hologram theme') ||
      lower.includes('साइबर थीम') ||
      lower.includes('होलोग्राफिक')
    ) {
      uiThemeEngine.previewTheme('futuristic-hologram');
      const theme = uiThemeEngine.getCurrentTheme();
      return {
        handledLocally: true,
        category: 'ui_redesign',
        themePreview: theme,
        spokenResponse: 'Futuristic Holographic Cyber HUD generated. Review the preview and say "Apply it" or "Undo that".',
        actionSummary: 'Previewing Holographic Cyber HUD',
      };
    }

    // 4c. Iron Man HUD Theme
    if (
      lower.includes('iron man') ||
      lower.includes('stark armor') ||
      lower.includes('arc reactor') ||
      lower.includes('crimson theme')
    ) {
      uiThemeEngine.previewTheme('iron-man-hud');
      const theme = uiThemeEngine.getCurrentTheme();
      return {
        handledLocally: true,
        category: 'ui_redesign',
        themePreview: theme,
        spokenResponse: 'Iron Man Armor HUD theme configured with Arc Reactor crimson and gold telemetry. Say "Apply it" to confirm.',
        actionSummary: 'Previewing Iron Man — Armor HUD',
      };
    }

    // 4d. Sacred Saffron Theme
    if (
      lower.includes('saffron') ||
      lower.includes('accent color to saffron') ||
      lower.includes('भगवा') ||
      lower.includes('केसरिया')
    ) {
      uiThemeEngine.previewTheme('solar-saffron');
      const theme = uiThemeEngine.getCurrentTheme();
      return {
        handledLocally: true,
        category: 'ui_redesign',
        themePreview: theme,
        spokenResponse: 'Sacred Saffron solar theme configured. Say "Apply it" to lock in the radiant accents.',
        actionSummary: 'Previewing Sacred Saffron Theme',
      };
    }

    // 4e. Minimalist Theme
    if (
      lower.includes('minimalist') ||
      lower.includes('minimal') ||
      lower.includes('clean and simple') ||
      lower.includes('सादा थीम')
    ) {
      uiThemeEngine.previewTheme('minimalist-dark');
      const theme = uiThemeEngine.getCurrentTheme();
      return {
        handledLocally: true,
        category: 'ui_redesign',
        themePreview: theme,
        spokenResponse: 'Minimalist obsidian configuration ready. Distractions reduced, micro-borders enabled. Say "Apply it" to confirm.',
        actionSummary: 'Previewing Minimalist Obsidian Theme',
      };
    }

    // 4f. Specific layout adjustments:
    // "Move assistant orb to the center"
    if (lower.includes('orb to the center') || lower.includes('center the orb')) {
      uiThemeEngine.previewTheme({ orb: { ...uiThemeEngine.getCurrentTheme().orb, position: 'center' } });
      return {
        handledLocally: true,
        category: 'ui_redesign',
        spokenResponse: 'Assistant orb repositioned to the central focal coordinate. Say "Apply it" to save.',
        actionSummary: 'Orb Position: Center',
      };
    }

    // "Make sidebar transparent" / "make navigation transparent"
    if (lower.includes('transparent') && (lower.includes('sidebar') || lower.includes('panel') || lower.includes('navigation'))) {
      uiThemeEngine.previewTheme({ layout: { ...uiThemeEngine.getCurrentTheme().layout, sidebarTransparency: 0.3 } });
      return {
        handledLocally: true,
        category: 'ui_redesign',
        spokenResponse: 'Translucent glassmorphism applied to navigation panels. Say "Apply it" to keep this change.',
        actionSummary: 'Navigation Transparency Increased',
      };
    }

    // "Add animated particles and glowing borders"
    if (lower.includes('particles') || lower.includes('glowing borders') || lower.includes('animated particles')) {
      uiThemeEngine.previewTheme({
        effects: {
          ...uiThemeEngine.getCurrentTheme().effects,
          particles: true,
          glassmorphism: 'radiant',
        },
      });
      return {
        handledLocally: true,
        category: 'ui_redesign',
        spokenResponse: 'Radiant animated particles and high-glow borders enabled. Say "Apply it" to confirm.',
        actionSummary: 'Animated Particles & Glow Enabled',
      };
    }

    // "Make the UI more compact"
    if (lower.includes('compact') && (lower.includes('ui') || lower.includes('interface') || lower.includes('layout'))) {
      uiThemeEngine.previewTheme({
        layout: { ...uiThemeEngine.getCurrentTheme().layout, density: 'compact' },
        accessibility: { ...uiThemeEngine.getCurrentTheme().accessibility, fontScale: 'compact' },
      });
      return {
        handledLocally: true,
        category: 'ui_redesign',
        spokenResponse: 'Interface density set to compact mode for high-information density. Say "Apply it" to confirm.',
        actionSummary: 'UI Density: Compact',
      };
    }

    // General "redesign your entire interface"
    if (lower.includes('redesign your entire interface') || lower.includes('redesign your ui') || lower.includes('इंटरफ़ेस बदलो')) {
      // Toggle to an alternate majestic theme to demonstrate dynamic redesign
      const currentId = uiThemeEngine.getActiveTheme().id;
      const targetId = currentId === 'suryadev-radiant' ? 'futuristic-hologram' : 'suryadev-radiant';
      uiThemeEngine.previewTheme(targetId);
      const theme = uiThemeEngine.getCurrentTheme();
      return {
        handledLocally: true,
        category: 'ui_redesign',
        themePreview: theme,
        spokenResponse: `Redesign generated: ${theme.name}. Review the new layout and say "Apply it" or "Undo that".`,
        actionSummary: `Previewing ${theme.name}`,
      };
    }

    // 5. VOICE & LANGUAGE CONTROLS
    // "Speak Hindi" / "हिंदी में बोलो"
    if (
      lower.includes('speak hindi') ||
      lower.includes('switch to hindi') ||
      lower.includes('हिंदी में बोलो') ||
      lower.includes('hindi mein bolo')
    ) {
      voiceProfileManager.setLanguage('hi-IN');
      voiceProfileManager.setProfile('hindi-command');
      return {
        handledLocally: true,
        category: 'voice_control',
        newLanguage: 'hi-IN',
        spokenResponse: 'नमस्ते! अब मैं हिन्दी में बातचीत करूँगा। सूर्या आपकी सेवा में तत्पर है।',
        actionSummary: 'Voice Language: Hindi (hi-IN) — Hindi Command Profile',
      };
    }

    // "Switch to Japanese" / "Speak Japanese"
    if (lower.includes('speak japanese') || lower.includes('switch to japanese') || lower.includes('日本語で話して')) {
      voiceProfileManager.setLanguage('ja-JP');
      return {
        handledLocally: true,
        category: 'voice_control',
        newLanguage: 'ja-JP',
        spokenResponse: '承知いたしました。日本語で対応いたします。スーリヤ、準備完了です。',
        actionSummary: 'Voice Language: Japanese (ja-JP)',
      };
    }

    // "Use Indian English"
    if (lower.includes('indian english') || lower.includes('subcontinental accent')) {
      voiceProfileManager.setProfile('indian-english');
      voiceProfileManager.setLanguage('en-IN');
      return {
        handledLocally: true,
        category: 'voice_control',
        newVoiceProfile: 'indian-english',
        spokenResponse: 'Switched to Indian English neural voice profile. Standing by for instructions.',
        actionSummary: 'Voice Profile: Indian English',
      };
    }

    // "Change your voice to a calmer version" / "calm intelligence"
    if (lower.includes('calmer version') || lower.includes('calm intelligence') || lower.includes('calm voice')) {
      voiceProfileManager.setProfile('calm-intelligence');
      return {
        handledLocally: true,
        category: 'voice_control',
        newVoiceProfile: 'calm-intelligence',
        spokenResponse: 'Calm Intelligence voice profile activated. Speech rate calibrated for measured focus.',
        actionSummary: 'Voice Profile: Calm Intelligence',
      };
    }

    // "Use the strongest available Hindi voice" / "radiant command"
    if (lower.includes('strongest available') || lower.includes('radiant command') || lower.includes('suryadev voice')) {
      voiceProfileManager.setProfile('suryadev-radiant');
      return {
        handledLocally: true,
        category: 'voice_control',
        newVoiceProfile: 'suryadev-radiant',
        spokenResponse: 'Suryadev — Radiant Command profile engaged. Authority and resonance online.',
        actionSummary: 'Voice Profile: Suryadev — Radiant Command',
      };
    }

    // "Speak faster"
    if (lower.includes('speak faster') || lower.includes('तेज़ बोलो') || lower.includes('speed up speech')) {
      const curr = voiceProfileManager.getSettings();
      voiceProfileManager.setRate(curr.rate + 0.15);
      return {
        handledLocally: true,
        category: 'voice_control',
        spokenResponse: `Speech rate increased to ${voiceProfileManager.getSettings().rate.toFixed(2)}x.`,
        actionSummary: 'Speech Rate Increased',
      };
    }

    // "Speak slower"
    if (lower.includes('speak slower') || lower.includes('धीमे बोलो') || lower.includes('slow down speech')) {
      const curr = voiceProfileManager.getSettings();
      voiceProfileManager.setRate(curr.rate - 0.15);
      return {
        handledLocally: true,
        category: 'voice_control',
        spokenResponse: `Speech rate decreased to ${voiceProfileManager.getSettings().rate.toFixed(2)}x.`,
        actionSummary: 'Speech Rate Decreased',
      };
    }

    // 6. LOCAL ANDROID INTENT / APP LAUNCH ROUTING (YouTube, Chrome, Settings, Maps, etc.)
    // Guaranteed 0ms local execution without invoking Gemini
    const localMatch = localIntentRouter.matchLocalCommand(rawInput);
    if (localMatch.isLocal && localMatch.appName) {
      localIntentRouter.executeLocalCommand(localMatch);
      return {
        handledLocally: true,
        category: 'local_app',
        targetApp: localMatch.appName,
        spokenResponse: localMatch.responseMessage || `Launching ${localMatch.appName} now.`,
        actionSummary: `Dispatched local Android intent: ${localMatch.appName}`,
      };
    }

    // Not a local system command — proceed to Gemini AI model
    return { handledLocally: false, category: 'none' };
  }
}

export const voiceCommandParser = VoiceCommandParser;
