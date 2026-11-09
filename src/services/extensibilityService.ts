/**
 * SURYA Universal Extensibility & Natural Language Customization Engine
 * Interprets user directives to add integrations, create new apps, build custom skills,
 * and dynamically customize the SURYA platform interface.
 */

import { ExtensibilityPlan, GeneratedApp, PluginItem, CustomSkill, ThemeConfig } from '../types/surya';

export class ExtensibilityService {
  /**
   * Parse natural language command to determine if it is an extensibility/customization request
   */
  public static parseCommand(input: string, currentLang = 'en'): ExtensibilityPlan | null {
    if (!input || typeof input !== 'string') return null;

    const lower = input.trim().toLowerCase();

    // 1. APP CREATION PATTERNS
    // e.g., "create an app like youtube", "build a music player", "make a notes app", "यूट्यूब जैसा ऐप बनाओ", "notes app banao"
    const appCreationRegex =
      /(create\s+(an?\s+)?app|build\s+(an?\s+)?app|make\s+(an?\s+)?app|create\s+(a\s+)?website|build\s+(a\s+)?website|ऐप\s*बनाओ|वेबसाइट\s*बनाओ|app\s*banao|website\s*banao)/i;

    if (appCreationRegex.test(lower)) {
      let appName = 'Custom Application';
      let category = 'Productivity';
      let templateType = 'custom';

      if (lower.includes('youtube') || lower.includes('video') || lower.includes('streaming')) {
        appName = 'SuryaTube — Video Sharing Platform';
        category = 'Entertainment';
        templateType = 'youtube';
      } else if (lower.includes('music') || lower.includes('spotify') || lower.includes('audio') || lower.includes('player')) {
        appName = 'SolarBeats — Audio & Music Hub';
        category = 'Entertainment';
        templateType = 'music';
      } else if (lower.includes('note') || lower.includes('journal') || lower.includes('memo') || lower.includes('todo') || lower.includes('task')) {
        appName = 'SuryaNotes — Tactical Notes & Task Board';
        category = 'Productivity';
        templateType = 'notes';
      } else if (lower.includes('finance') || lower.includes('money') || lower.includes('budget') || lower.includes('crypto')) {
        appName = 'SolarVault — Personal Finance & Asset Tracker';
        category = 'Productivity';
        templateType = 'finance';
      } else if (lower.includes('chat') || lower.includes('bot') || lower.includes('ai')) {
        appName = 'SuryaBot Studio — Conversational AI Workspace';
        category = 'AI Services';
        templateType = 'chatbot';
      }

      return {
        type: 'app_creation',
        title: `Build Application: ${appName}`,
        targetId: `app_${Date.now()}`,
        parameters: {
          prompt: input,
          appName,
          category,
          templateType,
        },
        summary: `SURYA will generate a fully functional application (${appName}) with live interactive preview, source code files, and export options.`,
        requiresConfirmation: false,
      };
    }

    // 2. PLUGIN & INTEGRATION INSTALLATION PATTERNS
    // e.g., "add github", "integrate spotify", "add weather tool", "github जोड़ो", "github add karo"
    const pluginRegex =
      /(add|integrate|install|connect|enable)\s+(github|spotify|google drive|google calendar|gmail|weather|notion|discord|telegram|slack|smart home|youtube creator)/i;
    const hindiPluginRegex = /(github|spotify|weather|notion|telegram|slack)\s*(जोड़ो|कनेक्ट|इंटीग्रेट|add|connect)/i;

    if (pluginRegex.test(lower) || hindiPluginRegex.test(lower)) {
      let pluginId = 'github';
      let pluginName = 'GitHub Integration';

      if (lower.includes('spotify') || lower.includes('music')) {
        pluginId = 'spotify';
        pluginName = 'Spotify Integration';
      } else if (lower.includes('weather') || lower.includes('forecast')) {
        pluginId = 'weather';
        pluginName = 'Weather Telemetry Service';
      } else if (lower.includes('google drive') || lower.includes('drive')) {
        pluginId = 'google_drive';
        pluginName = 'Google Drive Integration';
      } else if (lower.includes('notion')) {
        pluginId = 'notion';
        pluginName = 'Notion Workspace Sync';
      } else if (lower.includes('telegram')) {
        pluginId = 'telegram';
        pluginName = 'Telegram Bot Bridge';
      } else if (lower.includes('youtube creator') || lower.includes('creator dashboard')) {
        pluginId = 'youtube_creator';
        pluginName = 'YouTube Creator Studio Suite';
      }

      return {
        type: 'plugin_install',
        title: `Configure Integration: ${pluginName}`,
        targetId: pluginId,
        parameters: { pluginId, pluginName },
        summary: `Connect ${pluginName} to SURYA for automated workflows, API tools, and real-time synchronization.`,
        requiresConfirmation: true,
      };
    }

    // 3. CUSTOM AI SKILL CREATION PATTERNS
    // e.g., "create a skill for managing github", "create a skill for learning japanese", "add a scientific skill"
    const skillRegex = /(create|add|build)\s+(a\s+)?(new\s+)?skill\s+(for|to|about)/i;
    const hindiSkillRegex = /स्किल\s*बनाओ|नया\s*स्किल/i;

    if (skillRegex.test(lower) || hindiSkillRegex.test(lower)) {
      const skillName = input.replace(/.*(for|about|to|skill)\s+/i, '').trim() || 'Custom Workflow Skill';
      return {
        type: 'skill_creation',
        title: `Register Custom Skill: ${skillName}`,
        targetId: `skill_${Date.now()}`,
        parameters: {
          skillName,
          instructions: `Specialized skill directive for ${skillName}.`,
        },
        summary: `Register a persistent custom capability skill into SURYA's active capability registry.`,
        requiresConfirmation: false,
      };
    }

    // 4. DYNAMIC UI CUSTOMIZATION PATTERNS
    // e.g., "change theme to blue", "change color to emerald", "make interface minimal", "थीम बदलो"
    const uiRegex = /(change|switch|set)\s+(your\s+|the\s+)?(theme|color|look|interface|ui)\s+(to\s+)?(blue|gold|cyan|green|emerald|amber|crimson|purple|minimal|cyber)/i;
    const matchUI = lower.match(uiRegex);

    if (matchUI) {
      const colorWord = matchUI[5] || 'gold';
      let targetColor: ThemeConfig['primaryColor'] = 'gold';
      if (colorWord.includes('blue') || colorWord.includes('cyan')) targetColor = 'cyan';
      if (colorWord.includes('green') || colorWord.includes('emerald')) targetColor = 'emerald';
      if (colorWord.includes('amber')) targetColor = 'amber';
      if (colorWord.includes('crimson') || colorWord.includes('red')) targetColor = 'crimson';
      if (colorWord.includes('purple')) targetColor = 'purple';

      return {
        type: 'ui_customization',
        title: `Apply Custom Theme: ${targetColor.toUpperCase()}`,
        targetId: targetColor,
        parameters: { primaryColor: targetColor },
        summary: `Instant UI transformation: adjust SURYA's palette to ${targetColor.toUpperCase()} with dynamic neon accents.`,
        requiresConfirmation: false,
      };
    }

    return null;
  }
}
