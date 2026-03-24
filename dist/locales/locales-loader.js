/**
 * Locale loader and combiner for MemoryClaw
 * v2.3.0: Supports 11 languages
 *
 * Loads and combines patterns from multiple languages
 */
// Import all locales (v2.3.0: 11 languages)
import { fr } from "./fr.js";
import { en } from "./en.js";
import { es } from "./es.js";
import { de } from "./de.js";
import { zh } from "./zh.js";
import { it } from "./it.js";
import { pt } from "./pt.js";
import { ru } from "./ru.js";
import { ja } from "./ja.js";
import { ko } from "./ko.js";
import { ar } from "./ar.js";
// Available locales registry (v2.3.0: 11 languages)
export const availableLocales = {
    fr, // Français
    en, // English
    es, // Español
    de, // Deutsch
    zh, // 中文
    it, // Italiano (NEW v2.3.0)
    pt, // Português (NEW v2.3.0)
    ru, // Русский (NEW v2.3.0)
    ja, // 日本語 (NEW v2.3.0)
    ko, // 한국어 (NEW v2.3.0)
    ar, // العربية (NEW v2.3.0)
};
/**
 * Load and combine patterns from specified locales
 * @param localeCodes - Array of locale codes to load (e.g., ["fr", "en"])
 * @returns Combined locale patterns
 */
export function loadLocales(localeCodes) {
    const defaultLocale = fr; // French is our primary/complete locale
    if (!localeCodes || localeCodes.length === 0) {
        return defaultLocale;
    }
    // Start with French as base (most complete)
    const combined = {
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
        if (code === "fr")
            continue;
        // Merge arrays
        combined.triggers.push(...locale.triggers);
        combined.skipPatterns.push(...locale.skipPatterns);
        combined.lowValuePatterns.push(...locale.lowValuePatterns);
        combined.injectionPatterns.push(...locale.injectionPatterns);
        combined.importanceKeywordPatterns.push(...locale.importanceKeywordPatterns);
        // Merge category overrides
        for (const [category, patterns] of Object.entries(locale.categoryOverrides)) {
            if (patterns) {
                if (!combined.categoryOverrides[category]) {
                    combined.categoryOverrides[category] = [];
                }
                combined.categoryOverrides[category].push(...patterns);
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
 * v2.3.0: Supports 11 languages
 * @param text - Text to analyze
 * @returns Detected language code
 */
export function detectLanguage(text) {
    if (!text || typeof text !== "string") {
        return "unknown";
    }
    // Quick script-specific checks first (don't rely on whitespace)
    // Chinese (CJK)
    const cjkMatch = text.match(/[\u4e00-\u9fff]/g);
    if (cjkMatch && cjkMatch.length > 2) {
        return "zh";
    }
    // Japanese (Hiragana/Katakana)
    const jpMatch = text.match(/[\u3040-\u309F\u30A0-\u30FF]/g);
    if (jpMatch && jpMatch.length > 2) {
        return "ja";
    }
    // Korean (Hangul)
    const koMatch = text.match(/[\uAC00-\uD7A3]/g);
    if (koMatch && koMatch.length > 2) {
        return "ko";
    }
    // Arabic
    const arMatch = text.match(/[\u0600-\u06FF]/g);
    if (arMatch && arMatch.length > 2) {
        return "ar";
    }
    // Cyrillic (Russian)
    const ruMatch = text.match(/[\u0400-\u04FF]/g);
    if (ruMatch && ruMatch.length > 2) {
        return "ru";
    }
    const normalized = text.toLowerCase();
    const words = normalized.split(/\s+/).filter((w) => w.length > 2);
    if (words.length === 0) {
        return "unknown";
    }
    // Score each language (Latin-based languages)
    const scores = {
        fr: 0,
        en: 0,
        es: 0,
        de: 0,
        it: 0,
        pt: 0,
        zh: 0, // Already detected above
        ru: 0, // Already detected above
        ja: 0, // Already detected above
        ko: 0, // Already detected above
        ar: 0, // Already detected above
    };
    // Check common words and patterns for each locale
    for (const [code, locale] of Object.entries(availableLocales)) {
        // Skip non-Latin scripts (already detected above)
        if (["zh", "ja", "ko", "ar", "ru"].includes(code))
            continue;
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
export function getLocale(code) {
    return availableLocales[code];
}
/**
 * Get all available locale codes
 * @returns Array of available locale codes
 */
export function getAvailableLocales() {
    return Object.keys(availableLocales);
}
/**
 * Get all supported languages with their names
 * v2.3.0: Returns 11 languages
 * @returns Map of language code to name
 */
export function getSupportedLanguages() {
    const result = {};
    for (const [code, locale] of Object.entries(availableLocales)) {
        result[code] = locale.languageName;
    }
    return result;
}
// Default export with French as primary
export default fr;
