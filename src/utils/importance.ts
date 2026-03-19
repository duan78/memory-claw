/**
 * Memory Claw v2.4.0 - Importance Calculation Utilities
 *
 * @version 2.4.0
 * @author duan78
 */

import type { MemorySource } from "../types.js";
import { CATEGORY_IMPORTANCE, SOURCE_IMPORTANCE } from "../config.js";

// Important Keyword Patterns (bonus +0.1)
const IMPORTANCE_KEYWORD_PATTERNS = [
  /important|essentiel|crucial|critique/i,
  /toujours|jamais|always|never/i,
  /prioritaire|urgent|urgence/i,
  /obligatoire|requis|required/i,
  /note (?:bien|ça|cela)|note that/i,
  /rappelle(?:-toi| vous) (?:bien|que)/i,
];

/**
 * Calculate dynamic importance for a memory entry
 *
 * v2.4.0: Updated length bonus to match captureMinChars=50
 *
 * @param text - The text content
 * @param category - The detected category
 * @param source - The capture source
 * @returns Importance score between 0.1 and 1.0
 */
export function calculateImportance(
  text: string,
  category: string,
  source: MemorySource
): number {
  if (!text || typeof text !== "string") return 0.5;

  const normalized = text.toLowerCase();
  const trimmed = text.trim();

  // Base importance from category
  let importance = CATEGORY_IMPORTANCE[category] || 0.5;

  // Adjust by source
  const sourceMultiplier = SOURCE_IMPORTANCE[source] || 0.7;
  importance = importance * 0.8 + sourceMultiplier * 0.2;

  // v2.4.0: Length bonus adjusted for captureMinChars=50
  // Short precise facts (50-300 chars) get bonus, long verbose content gets penalty
  const length = trimmed.length;
  if (length >= 50 && length <= 300) {
    importance += 0.05; // Sweet spot for concise factual content
  } else if (length > 1000) {
    importance -= 0.1; // Too long, likely verbose
  }

  // Keyword bonus for importance indicators
  for (const pattern of IMPORTANCE_KEYWORD_PATTERNS) {
    if (pattern.test(normalized)) {
      importance += 0.1;
      break; // Only apply once
    }
  }

  // Density bonus: factual content (names, dates, numbers) > fluff
  const hasEntity = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(text); // Proper names
  const hasNumber = /\b\d{4,}\b/.test(text); // Years, large numbers
  const hasSpecific = /(?:est|sont|:|->|=)/.test(text); // Definitions/mappings

  if (hasEntity || hasNumber || hasSpecific) {
    importance += 0.05;
  }

  // Penalty for questions (uncertainty)
  if (/\?$/.test(trimmed) || /^(?:quoi|qui|où|comment|pourquoi|what|where|when|how|why)/i.test(normalized)) {
    importance -= 0.2;
  }

  // Penalty for vague expressions
  if (/^(?:je pense|je crois|il me semble|maybe|perhaps|probably)\b/i.test(normalized)) {
    importance -= 0.15;
  }

  // Clamp to valid range
  return Math.max(0.1, Math.min(1.0, importance));
}

/**
 * Get the importance keyword patterns for locale integration
 */
export function getImportanceKeywordPatterns(): RegExp[] {
  return [...IMPORTANCE_KEYWORD_PATTERNS];
}
