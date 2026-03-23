/**
 * Type definitions for locale patterns
 * Exported for locale files to import
 *
 * Matches the LocalePatterns interface from locales-loader.ts
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
    fact?: RegExp[];
  };
  characteristics: {
    commonWords: string[];
    accentedChars: RegExp | null;
    commonPatterns: RegExp[];
  };
}
