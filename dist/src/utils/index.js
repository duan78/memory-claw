/**
 * Memory Claw v2.4.24 - Utilities Module
 *
 * v2.4.24: Added cleanSenderMetadata export for shared metadata cleaning
 */
export { normalizeText, cleanSenderMetadata, calculateTextSimilarity, escapeForPrompt } from "./text.js";
export { calculateImportance, getImportanceKeywordPatterns } from "./importance.js";
export { setLocalePatterns, getAllTriggers, getAllSkipPatterns, getAllLowValuePatterns, getAllInjectionPatterns, calculateInjectionSuspicion, detectCategory, shouldCapture, isJsonMetadata, } from "./capture.js";
