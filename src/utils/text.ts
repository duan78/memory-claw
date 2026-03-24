/**
 * Memory Claw v2.4.24 - Text Processing Utilities
 *
 * v2.4.24 improvements:
 * - Added shared cleanSenderMetadata function for consistent metadata cleaning
 * - Enhanced normalizeText with better whitespace handling
 * - Improved metadata cleaning patterns from v2.4.21
 *
 * @version 2.4.24
 * @author duan78
 */

/**
 * Normalize text by trimming, collapsing whitespace, and limiting newlines
 * v2.4.24: Enhanced with better whitespace and newline handling
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * v2.4.24: Enhanced sender metadata cleaning (shared utility)
 * Removes "Sender (untrusted metadata)" prefixes and other noise from content
 *
 * This function consolidates the metadata cleaning logic from plugin-entry.ts
 * and fix-embeddings.js into a single shared utility for consistency.
 *
 * Patterns include:
 * - JSON metadata blocks with ```json wrapper
 * - Inline JSON objects after "Sender (untrusted metadata):"
 * - Multi-line JSON objects
 * - Timestamp patterns (ISO, US, and custom formats)
 * - System message prefixes (System:, Assistant:, User:, Tool:, Function:)
 * - Tool call artifacts
 * - Additional metadata headers (From:, To:, Subject:, Date:, Message-ID:)
 * - System artifacts ([INST], [SYSTEM], instruction tags, etc.)
 */
export function cleanSenderMetadata(text: string): string {
  if (!text || typeof text !== "string") return text;

  // Remove sender metadata prefixes at the start of text
  const patterns = [
    // JSON metadata blocks with ```json wrapper (regardless of position)
    /(?:Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*```json[^`]*```/gi,

    // Also match without json identifier
    /(?:Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*```[^`]*```/gi,

    // More aggressive patterns to catch JSON metadata blocks
    /^(Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*```[^`]*```.*$/gim,

    // FIX for inline JSON after "Sender (untrusted metadata):"
    // Matches: "Sender (untrusted metadata): {...}" where {...} is any JSON object
    /^(?:Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*\{[^}]*\}\s*/gim,

    // FIX for multi-line JSON objects after "Sender (untrusted metadata):"
    // Matches JSON objects that span multiple lines
    /^(?:Sender|Conversation\s*info)\s*\(untrusted\s*metadata\):\s*\{[\s\S]*?\n\}\s*/gim,

    // FIX for simple "Sender:" prefix with inline JSON
    /^Sender\s*:\s*\{[^}]*\}\s*/gim,

    // FIX for "Sender:" or "Sender (untrusted):" followed by any text until newline
    /^(?:Sender\s*\(untrusted\)|Sender)\s*:\s*.+\n?/gim,

    // Enhanced timestamp patterns - catch more variations
    /^\[\w+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+[^\]]+\]\s*/g, // [Mon 2026-03-23 15:52 GMT+1]
    /^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*/g, // [2026-03-23 15:52:30]
    /^\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\w+\]\s*/g, // [03/23/2026 15:52 GMT]
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[A-Z]+\s*/g, // 2026-03-23 15:52:30 GMT

    // System message prefixes
    /^System\s*:\s*/gi,
    /^Assistant\s*:\s*/gi,
    /^User\s*:\s*/gi,
    /^Tool\s*:\s*/gi,
    /^Function\s*:\s*/gi,

    // Tool call artifacts
    /^Tool\s+Call\s*:\s*/gi,
    /^Function\s+Call\s*:\s*/gi,
    /^Result\s*:\s*/gi,
    /^Error\s*:\s*/gi,

    // Additional metadata headers
    /^From\s*:\s*.+$/m, // From: someone
    /^To\s*:\s*.+$/m, // To: someone
    /^Subject\s*:\s*.+$/m, // Subject: something
    /^Date\s*:\s*.+$/m, // Date: something
    /^Message-ID\s*:\s*.+$/m, // Message-ID: xxx

    // Sender/recipient patterns
    /^Sender\s*:\s*\{\s*\}/gim,
    /^From\s*\(untrusted\)/gim,

    // Empty metadata objects
    /^\{\s*\}\s*/g,

    // Additional patterns for system artifacts
    /^\[INST\]/gi,
    /^\[\/INST\]/gi,
    /^\[SYSTEM\]/gi,
    /^<\|.*?\|>/g,
    /<instruction[^>]*>/gi,
    /<system[^>]*>/gi,
    /<prompt[^>]*>/gi,

    // JSON metadata patterns
    /^\s*\{\s*"role"\s*:\s*"tool"/gi,
    /^\s*\{\s*"role"\s*:\s*"system"/gi,
    /^\s*\{\s*"tool_call_id"/gi,
    /^\s*\{\s*"function"/gi,
  ];

  let cleaned = text;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.trim();
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
