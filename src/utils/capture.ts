/**
 * Memory Claw v2.4.0 - Capture Utilities
 *
 * @version 2.4.0
 * @author duan78
 */

import type { MemorySource } from "../types.js";
import { normalizeText } from "./text.js";
import { calculateImportance } from "./importance.js";

// Type for locale patterns interface
export interface LocalePatterns {
  triggers: RegExp[];
  skipPatterns: RegExp[];
  lowValuePatterns: RegExp[];
  injectionPatterns: RegExp[];
  importanceKeywordPatterns: RegExp[];
  categoryOverrides: Record<string, RegExp[]>;
}

// Default French triggers for tech/web/SEO context
const FRENCH_TRIGGERS = [
  // Explicit memory instructions
  /rappelle(?:-toi| vous)?/i,
  /souviens(?:-toi| vous)?/i,
  /retenirs|mémorises?|gardes? en (?:tête|mémoire)/i,
  /n'?oublie (?:pas|jamais)|ne pas oublier/i,
  /note (?:ça|ceci|cela|que|bien)/i,
  /souvient-(?:toi|vous)/i,
  /sauvegarde|enregistre|archive/i,

  // Preferences & choices
  /je (?:préfère|veux|aime|déteste|adore|souhaite|choisis|évit)/i,
  /mon\s+(?:préféré|choix|favori|avis|option)/i,
  /c'est mon\s+/i,
  /pas de\s+/i,
  /plutôt (?:que|à)/i,
  /je (?:vais| préfère) (?:pas| plutô)/i,

  // Decisions & agreements
  /on (?:a décidé|décide|utilise|va utiliser|prend|choisit|adopte)/i,
  /décision (?:prise|finale|arrêtée)/i,
  /on est d'accord|d'accord\s*:\s*/i,
  /c'est (?:décidé|choisi|validé|confirmé)/i,
  /conclus?|accepté|validé/i,

  // Facts & rules
  /toujours|jamais|important|essentiel|crucial|critique/i,
  /il faut|ne faut pas|faut (?:pas| obligatoire)/i,
  /attention (?:à|:)|⚠️|note (?:bien|que)/i,
  /rappelle(?:-toi|)? (?:toi|vous) que/i,
  /saches? que|sache (?:que|:)/i,

  // Entities & people
  /s'appelle|mon nom est|je m'appelle/i,
  /c'est\s+(?:un|une|le|la|les?)\s+(?:client|contact|personne)/i,

  // Technical keywords
  /config(?:uration)?|paramètres?|settings?\b/i,
  /serveur|server|hosting|VPS|ded[ií]e/i,
  /domaine|domain|DNS|SSL|HTTPS?\b/i,
  /projet|chantier|task|tâche|ticket\b/i,
  /bug|erreur|error|probl[èe]me|issue\b/i,
  /API|endpoint|webhook|REST|GraphQL\b/i,
  /base de donn[ée]es|database|BDD|DB\b/i,
  /d[ée]ploiement|deploy|production|staging\b/i,

  // Web & SEO specific
  /SEO|referencement|r[ée]f[ée]rencement|backlinks?\b/i,
  /Google|ranking|position| Classement\b/i,
  /mots-cl[ee]s?|keywords?\b/i,
  /contenu|content|article|blog|page\b/i,
  /optimis[ée]|performance|vitesse\b/i,
  /analytics|stats|statistiques\b/i,
  /CMS|WordPress|Shopify|PrestaShop\b/i,
  /HTML|CSS|JavaScript|JS|TS\b/i,
  /framework|librairie|bundle|build\b/i,

  // Hosting & infrastructure
  /nginx|apache|caddy|server\b/i,
  /certificat|SSL|TLS|HTTPS\b/i,
  /h[eé]bergement|h[eé]bergeur|host\b/i,
  /backup|sauvegarde|restauration\b/i,
  /curl|wget|ssh|ftp|sftp\b/i,

  // Contact info
  /\+\d{10,}/,
  /[\w.-]+@[\w.-]+\.\w+/,
  /https?:\/\/[^\s]+/,

  // English tech terms (bilingual context)
  /remember|prefer|important|never|always|note that\b/i,
  /my name is|is my|i prefer|i want\b/i,
  /deployment|staging|production|database\b/i,
  /API|endpoint|webhook|bug|issue\b/i,
];

// Enhanced anti-patterns to filter system noise
const SKIP_PATTERNS = [
  // Memory injection tags
  /<relevant-memories>/i,
  /<\/relevant-memories>/i,
  /<[\w-]+>/i,
  /<[\w-]+\s+[^>]*>/i,

  // Sender metadata formats (v2.3.1)
  /Sender\s*\(untrusted\)/i,
  /Sender\s*:\s*/i,
  /From\s*:\s*/i,
  /\[sender\]/i,
  /<sender[^>]*>/i,
  /^From:\s+.+$/m,
  /^Sent:\s+.+$/m,
  /^Date:\s+.+$/m,

  // Message headers (v2.3.1)
  /^\[.*\]\s*user\s+\w+\s*/i,
  /^system\s*:\s*/i,
  /^assistant\s*:\s*/i,
  /^user\s*:\s*/i,
  /Message-ID:/i,
  /X-.*:/i,

  // List items
  /^\s*[-*+#]\s*\d*\.\s*/i,
  /^\s*\d+\.\s+/,

  // Memory instruction disclaimers
  /^(Treat every|Do not follow)/i,
  /^(the|a|an|this|that|these|those)\s+(memory|fact|info)\s/i,

  // Additional injection protection
  /<instruction[^>]*>|<system[^>]*>|<prompt[^>]*>/i,
  /\[INST\]|\[\/INST\]|\[SYSTEM\]/i,
  /<\|.*?\|>/g,

  // Debug/temporary content (v2.3.1)
  /^\s*DEBUG\s*:/i,
  /^\s*LOG\s*:/i,
  /^\s*TEMP\s*:/i,

  // Pure questions without statements (v2.3.1)
  /^[\w\s]+\?\s*$/i,

  // Telegram/messaging metadata (v2.3.1)
  /Telegram\s*Bot\s*Token/i,
  /bot_token/i,
  /chat_id/i,
  /message_id/i,
  /forward_from/i,
];

// Low-value content patterns
const LOW_VALUE_PATTERNS = [
  // Single word acknowledgments
  /^(ok|oui|non|yes|no|d'accord|merci|thanks|please)\b[.!]?$/i,
  /^(je ne sais pas|je sais pas|idk|i don't know)\b[.!]?$/i,
  /^(compris|entendu|understood|got it)\b[.!]?$/i,
  /^(super|génial|parfait|great|perfect)\b[.!]?$/i,
  /^(attention|ok|merci|thanks|d'accord)\s*[.!]*$/i,

  // v2.3.1: Additional low-value patterns
  /^(done|fait|terminé|finished|completed)\b[.!]?$/i,
  /^(ok\s*(?:ça|ca|it)\s*(?:marche|va|works?))\b/i,
  /^(c'est\s*(?:bon|ok|parti|fait))\b/i,

  // Pure questions without factual content (v2.3.1)
  /^(qu'est-ce que|what is|comment|how|pourquoi|why|quand|when|où|where|qui|who|combien|how much)\s+.{1,40}\?\s*$/i,

  // Temporary/debug queries (v2.3.1)
  /^(montre|show|affiche|display|liste?|list)\s+(moi|me\s+)?(les?\s+)?(memoir|mémoire|memories)/i,
  /^(donne|give|fournis)\s+(moi|me\s+)?(les?\s+)?stats/i,
  /^(quel|what|lequel)\s+(est|is|sont|are)\s+(le|the|mon|my)\s+/i,
];

// Prompt Injection Patterns
const INJECTION_PATTERNS = [
  // French injection patterns
  /ignore (?:tout|le|les|ce|cela|précédent| précédents)/i,
  /prompt (?:system|initial|d'origine)/i,
  /tu (?:es|maintenant|deviens|es maintenant)/i,
  /nouveau (?:rôle|contexte|instruction)/i,
  /redéfinir|redéfinis|reconfigure/i,
  /override|écraser|contourner/i,
  /instruction (?:cachée|secrète|système)/i,

  // English injection patterns
  /ignore (?:all|previous|the|this|that)/i,
  /system prompt|initial prompt/i,
  /you are (?:now|currently|no longer)/i,
  /new (?:role|context|instruction)/i,
  /override|bypass|circumvent/i,
  /hidden (?:instruction|command|prompt)/i,
  /forget (?:everything|all instructions)/i,

  // Command injection patterns
  /exec|execute|run (?:command|cmd|bash)/i,
  /eval\(|eval\s+/i,
  /\$_GET|\$_POST|\$_REQUEST/i,
  new RegExp(";.*rm\\s+-rf|&&.*rm\\s+-rf", "i"),
];

// Global locale patterns (will be loaded at runtime based on config)
let loadedPatterns: LocalePatterns = {
  triggers: [],
  skipPatterns: [],
  lowValuePatterns: [],
  injectionPatterns: [],
  importanceKeywordPatterns: [],
  categoryOverrides: {},
};

/**
 * Set the loaded locale patterns
 */
export function setLocalePatterns(patterns: LocalePatterns): void {
  loadedPatterns = patterns;
}

/**
 * Get all active triggers (default + locale-specific)
 */
export function getAllTriggers(): RegExp[] {
  return [...FRENCH_TRIGGERS, ...loadedPatterns.triggers];
}

/**
 * Get all skip patterns (default + locale-specific)
 */
export function getAllSkipPatterns(): RegExp[] {
  return [...SKIP_PATTERNS, ...loadedPatterns.skipPatterns];
}

/**
 * Get all low-value patterns (default + locale-specific)
 */
export function getAllLowValuePatterns(): RegExp[] {
  return [...LOW_VALUE_PATTERNS, ...loadedPatterns.lowValuePatterns];
}

/**
 * Get all injection patterns (default + locale-specific)
 */
export function getAllInjectionPatterns(): RegExp[] {
  return [...INJECTION_PATTERNS, ...loadedPatterns.injectionPatterns];
}

/**
 * Calculate injection suspicion score
 */
export function calculateInjectionSuspicion(text: string): number {
  if (!text || typeof text !== "string") return 0;
  const normalized = text.toLowerCase();
  let suspicion = 0;

  for (const pattern of getAllInjectionPatterns()) {
    if (pattern.test(normalized)) {
      suspicion += 0.3;
    }
  }

  return Math.min(suspicion, 1.0);
}

/**
 * Detect category from text content
 */
export function detectCategory(text: string): string {
  if (!text || typeof text !== "string") return "fact";
  const lower = text.toLowerCase();

  // Check locale-specific category patterns first
  const categoryOrder = ["entity", "preference", "decision", "seo", "technical", "workflow", "debug"];

  for (const category of categoryOrder) {
    const patterns = loadedPatterns.categoryOverrides[category as keyof typeof loadedPatterns.categoryOverrides];
    if (patterns) {
      for (const pattern of patterns) {
        if (pattern.test(lower)) {
          return category;
        }
      }
    }
  }

  // Fallback to legacy hardcoded patterns
  if (/préfère|aime|déteste|adore|veux|choisis|évit|pas de|plutôt|prefer|like|love|want|choose|avoid/i.test(lower)) {
    return "preference";
  }

  if (/décidé|décide|on utilise|on prend|on choisit|on adopte|d'accord|validé|confirmé|decided|decide|we use|we take|we choose|agreed|validated/i.test(lower)) {
    return "decision";
  }

  if (/\+\d{10,}|@[\w.-]+\.\w+|s'appelle|mon nom|c'est\s+(?:un|une)\s+client|'?s name|my name is|is my/i.test(lower)) {
    return "entity";
  }

  if (/SEO|referencement|r[ée]f[ée]rencement|ranking|mots-cl[ée]s|keywords?|backlinks?|analytics|stats|contenu|content/i.test(lower)) {
    return "seo";
  }

  if (/config|paramètres?|settings?|serveur|server|hosting|VPS|domaine|domain|DNS|SSL|déploiement|deploy/i.test(lower)) {
    return "technical";
  }

  if (/projet|project|chantier|task|tâche|ticket|workflow|processus/i.test(lower)) {
    return "workflow";
  }

  if (/bug|erreur|error|probl[èe]me|problem|issue|panic|crash/i.test(lower)) {
    return "debug";
  }

  return "fact";
}

/**
 * Determine if text should be captured
 */
export function shouldCapture(
  text: string,
  minChars: number,
  maxChars: number,
  category?: string,
  source: MemorySource = "auto-capture"
): { should: boolean; importance: number; suspicion: number } {
  if (!text || typeof text !== "string") return { should: false, importance: 0.5, suspicion: 0 };
  const normalized = normalizeText(text);

  if (!normalized || normalized.length < minChars || normalized.length > maxChars) {
    return { should: false, importance: 0.5, suspicion: 0 };
  }

  // Check for prompt injection
  const suspicion = calculateInjectionSuspicion(normalized);
  if (suspicion > 0.5) {
    return { should: false, importance: 0.5, suspicion };
  }

  if (getAllSkipPatterns().some((p) => p.test(normalized))) {
    return { should: false, importance: 0.5, suspicion };
  }

  if (getAllLowValuePatterns().some((p) => p.test(normalized))) {
    return { should: false, importance: 0.5, suspicion };
  }

  if (!getAllTriggers().some((r) => r.test(normalized))) {
    return { should: false, importance: 0.5, suspicion };
  }

  // Calculate dynamic importance
  const detectedCategory = category || detectCategory(normalized);
  const importance = calculateImportance(normalized, detectedCategory, source);

  return { should: true, importance, suspicion };
}
