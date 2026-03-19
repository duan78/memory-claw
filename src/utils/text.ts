/**
 * Memory Claw v2.4.0 - Text Processing Utilities
 *
 * @version 2.4.0
 * @author duan78
 */

/**
 * Normalize text by trimming, collapsing whitespace, and limiting newlines
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Calculate Jaccard similarity between two texts
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1.toLowerCase());
  const normalized2 = normalizeText(text2.toLowerCase());

  if (normalized1 === normalized2) return 1.0;
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return 0.9;

  const words1 = normalized1.split(/\s+/);
  const words2 = normalized2.split(/\s+/);
  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Escape text for safe inclusion in prompts
 */
export function escapeForPrompt(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
