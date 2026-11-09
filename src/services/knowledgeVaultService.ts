/**
 * SURYA Knowledge Vault Service
 * Personal knowledge management system storing research notes, documents,
 * technical manuals, and articles with topic indexing and grounded Q&A retrieval.
 */

export interface VaultDocument {
  id: string;
  title: string;
  topic: string;
  content: string;
  summary: string;
  tags: string[];
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const VAULT_STORAGE_KEY = 'surya_knowledge_vault_v2';

class KnowledgeVaultService {
  private documents: VaultDocument[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(VAULT_STORAGE_KEY);
      if (saved) {
        this.documents = JSON.parse(saved);
      } else {
        this.documents = [
          {
            id: 'doc_1',
            title: 'SURYA Android Architecture & Intent Routing',
            topic: 'System Architecture',
            content:
              'SURYA uses a deterministic local intent router for Android applications like YouTube, Chrome, Maps, Camera, Settings, and WhatsApp. Local commands run with 0ms network latency without invoking Gemini AI models. High-risk actions are guarded by Veronica Protocol with a 3-second abort countdown and Android BiometricPrompt authentication.',
            summary: 'Deterministic local routing specification ensuring zero latency for local apps.',
            tags: ['Android', 'Performance', 'Architecture'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'doc_2',
            title: 'Suryadev Radiant Solar Philosophy & Voice Identity',
            topic: 'Voice Personality',
            content:
              'The Suryadev voice profile represents radiance, authoritativeness, and cosmic clarity. Calibrated with a deep, resonant pitch (0.92) and 1.05x cadence, it delivers composed, majestic responses in both English and Hindi without cartoonish distortion.',
            summary: 'Design criteria for the Suryadev — Radiant Command voice identity.',
            tags: ['Voice', 'Suryadev', 'Multilingual'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'doc_3',
            title: 'Universal UI Customization via Natural Voice',
            topic: 'UI Customization',
            content:
              'The UI Theme Engine validates all spoken and manual redesigns against strict accessibility constraints. Essential navigation bars and security buttons can never be disabled. Themes support undo/redo history, live preview confirmation, and JSON import/export.',
            summary: 'Configuration-driven UI customization engine specifications.',
            tags: ['UI', 'VoiceControl', 'Accessibility'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('[KnowledgeVaultService] Error loading vault:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(this.documents));
    } catch (e) {}
  }

  public getDocuments(): VaultDocument[] {
    return [...this.documents];
  }

  public searchDocuments(query: string): VaultDocument[] {
    if (!query) return this.getDocuments();
    const q = query.toLowerCase();
    return this.documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(q) ||
        doc.topic.toLowerCase().includes(q) ||
        doc.content.toLowerCase().includes(q) ||
        doc.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  public addDocument(title: string, topic: string, content: string, summary: string, tags: string[] = []): VaultDocument {
    const newDoc: VaultDocument = {
      id: `doc_${Date.now()}`,
      title,
      topic,
      content,
      summary,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documents.unshift(newDoc);
    this.saveToStorage();
    return newDoc;
  }

  public deleteDocument(id: string): boolean {
    const prev = this.documents.length;
    this.documents = this.documents.filter((d) => d.id !== id);
    if (this.documents.length !== prev) {
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Grounded Question Answering over personal documents
   */
  public queryKnowledge(question: string): { answer: string; sources: string[] } {
    const matches = this.searchDocuments(question);
    if (matches.length === 0) {
      return {
        answer: 'No relevant documents found in the Knowledge Vault for this query.',
        sources: [],
      };
    }

    const primaryDoc = matches[0];
    return {
      answer: `According to "${primaryDoc.title}": ${primaryDoc.summary} Specifically, ${primaryDoc.content.slice(0, 160)}...`,
      sources: matches.map((m) => m.title),
    };
  }
}

export const knowledgeVaultService = new KnowledgeVaultService();
