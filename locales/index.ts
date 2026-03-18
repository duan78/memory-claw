/**
 * Locale loader and combiner for MemoryClaw
 * Loads and combines patterns from multiple languages
 */

export interface LocalePatterns {
  languageCode: string;
  languageName: string;
  triggers: RegExp[];
  skipPatterns: RegExp[];
  lowValuePatterns: RegExp[];
  injectionPatterns: RegExp[];
  importanceKeywordPatterns: RegExp[];
  categoryOverrides: {
    preference?: RegExp[];
    decision?: RegExp[];
    entity?: RegExp[];
    seo?: RegExp[];
    technical?: RegExp[];
    workflow?: RegExp[];
    debug?: RegExp[];
  };
  characteristics: {
    commonWords: string[];
    accentedChars: RegExp | null;
    commonPatterns: RegExp[];
  };
}

// Import all locales
import { fr } from "./fr.js";
import { en } from "./en.js";
import { es } from "./es.js";
import { de } from "./de.js";
import { zh } from "./zh.js";

// Available locales registry
export const availableLocales: Record<string, LocalePatterns> = {
  fr,
  en,
  es,
  de,
  zh,
};

/**
 * Load and combine patterns from specified locales
 * @param localeCodes - Array of locale codes to load (e.g., ["fr", "en"])
 * @returns Combined locale patterns
 */
export function loadLocales(localeCodes: string[]): LocalePatterns {
  const defaultLocale = fr; // French is our primary/complete locale

  if (!localeCodes || localeCodes.length === 0) {
    return defaultLocale;
  }

  // Start with French as base (most complete)
  const combined: LocalePatterns = {
    languageCode: "multi",
    languageName: "Multilingual",
    triggers: [...defaultLocale.triggers],
    skipPatterns: [...defaultLocale.skipPatterns],
    lowValuePatterns: [...defaultLocale.lowValuePatterns],
    injectionPatterns: [...defaultLocale.injectionPatterns],
    importanceKeywordPatterns: [...defaultLocale.importanceKeywordPatterns],
    categoryOverrides: { ...defaultLocale.categoryOverrides },
    characteristics: { ...defaultLocale.characteristics },
  };

  // Add patterns from each locale
  for (const code of localeCodes) {
    const locale = availableLocales[code];
    if (!locale) {
      console.warn(`memory-claw: Unknown locale code "${code}", skipping`);
      continue;
    }

    // Skip French (already loaded as base)
    if (code === "fr") continue;

    // Merge arrays
    combined.triggers.push(...locale.triggers);
    combined.skipPatterns.push(...locale.skipPatterns);
    combined.lowValuePatterns.push(...locale.lowValuePatterns);
    combined.injectionPatterns.push(...locale.injectionPatterns);
    combined.importanceKeywordPatterns.push(...locale.importanceKeywordPatterns);

    // Merge category overrides
    for (const [category, patterns] of Object.entries(locale.categoryOverrides)) {
      if (patterns) {
        if (!combined.categoryOverrides[category as keyof typeof combined.categoryOverrides]) {
          combined.categoryOverrides[category as keyof typeof combined.categoryOverrides] = [];
        }
        (
          combined.categoryOverrides[category as keyof typeof combined.categoryOverrides] as RegExp[]
        ).push(...patterns);
      }
    }

    // Merge characteristics (keep them separate per language for detection)
    if (!combined.characteristics.commonWords.includes(locale.languageCode)) {
      combined.characteristics.commonWords.push(locale.languageCode);
    }
  }

  return combined;
}

/**
 * Detect language from text using heuristics
 * @param text - Text to analyze
 * @returns Detected language code ("fr", "en", "es", "de", "zh", or "unknown")
 */
export function detectLanguage(text: string): string {
  if (!text || typeof text !== "string") {
    return "unknown";
  }

  // Quick CJK check first (Chinese detection doesn't rely on whitespace words)
  const cjkMatch = text.match(/[\u4e00-\u9fff]/g);
  if (cjkMatch && cjkMatch.length > 2) {
    return "zh";
  }

  const normalized = text.toLowerCase();
  const words = normalized.split(/\s+/).filter((w) => w.length > 2);

  if (words.length === 0) {
    return "unknown";
  }

  // Score each language
  const scores: Record<string, number> = {
    fr: 0,
    en: 0,
    es: 0,
    de: 0,
    zh: 0,
  };

  // Check common words
  for (const [code, locale] of Object.entries(availableLocales)) {
    for (const word of words) {
      if (locale.characteristics.commonWords.includes(word)) {
        scores[code] += 1;
      }
    }

    // Check accented characters
    if (locale.characteristics.accentedChars) {
      const matches = normalized.match(locale.characteristics.accentedChars);
      if (matches) {
        scores[code] += matches.length * 2; // Accented chars are strong indicators
      }
    }

    // Check common patterns
    for (const pattern of locale.characteristics.commonPatterns) {
      if (pattern.test(normalized)) {
        scores[code] += 1;
      }
    }
  }

  // Find language with highest score
  let maxScore = 0;
  let detectedLang = "unknown";

  for (const [code, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = code;
    }
  }

  // Return unknown if no strong signal
  if (maxScore === 0) {
    return "unknown";
  }

  return detectedLang;
}

/**
 * Get locale by code
 * @param code - Locale code (e.g., "fr", "en")
 * @returns Locale patterns or undefined if not found
 */
export function getLocale(code: string): LocalePatterns | undefined {
  return availableLocales[code];
}

/**
 * Get all available locale codes
 * @returns Array of available locale codes
 */
export function getAvailableLocales(): string[] {
  return Object.keys(availableLocales);
}

// Default export with French as primary
export default fr;
