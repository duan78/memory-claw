/**
 * Memory Claw v2.4.0 - Utilities Module
 */

export { normalizeText, calculateTextSimilarity, escapeForPrompt } from "./text.js";
export { calculateImportance, getImportanceKeywordPatterns } from "./importance.js";
export {
  setLocalePatterns,
  getAllTriggers,
  getAllSkipPatterns,
  getAllLowValuePatterns,
  getAllInjectionPatterns,
  calculateInjectionSuspicion,
  detectCategory,
  shouldCapture,
  type LocalePatterns,
} from "./capture.js";
