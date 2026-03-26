/**
 * Memory Claw v2.4.45 - Text Processing Utilities
 *
 * v2.4.45 improvements:
 * - Added Phase 11.2: Convert analyzer types to storage types
 * - Normalizes category/type mentions for consistency in storage
 *
 * v2.4.27 improvements:
 * - Enhanced metadata cleaning with more aggressive patterns
 * - Added support for nested JSON metadata blocks
 * - Improved handling of malformed metadata
 * - Better detection and removal of tool/system artifacts
 * - Added patterns for Claude-specific metadata formats
 *
 * @version 2.4.45
 * @author duan78
 */

/**
 * Normalize text by trimming, collapsing whitespace, and limiting newlines
 * v2.4.27: Enhanced with better whitespace and newline handling
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
 * v2.4.27: Comprehensive sender metadata cleaning (shared utility)
 * Removes ALL forms of sender metadata and system artifacts from content
 *
 * This function provides aggressive metadata cleaning to ensure:
 * - All JSON metadata blocks are removed (including nested and malformed)
 * - All system message prefixes are stripped
 * - All tool call artifacts are removed
 * - All timestamp patterns are cleaned
 * - All Claude-specific metadata formats are handled
 *
 * Patterns include (in order of application):
 * 1. JSON metadata blocks (```json wrapped, inline, multi-line, nested)
 * 2. Sender metadata prefixes (all variants)
 * 3. Timestamp patterns (ISO, US, custom, international)
 * 4. System message prefixes (System:, Assistant:, User:, Tool:, Function:)
 * 5. Tool call artifacts (all variants)
 * 6. Email-style headers (From:, To:, Subject:, Date:, Message-ID:, CC:, BCC:)
 * 7. System artifacts ([INST], [SYSTEM], instruction tags, special tokens)
 * 8. Claude-specific formats (<thinking>, <reflection>, etc.)
 * 9. Empty metadata objects and whitespace
 */
export function cleanSenderMetadata(text: string): string {
  if (!text || typeof text !== "string") return text;

  let cleaned = text;

  // Phase 1: Remove JSON metadata blocks (most aggressive patterns first)
  const jsonPatterns = [
    // JSON metadata blocks with ```json wrapper (regardless of position)
    /(?:Sender|Conversation\s*info|Context|Metadata)\s*\(untrusted\s*metadata\):\s*```json\s*\n?[\s\S]*?```\s*/gi,

    // Also match without json identifier
    /(?:Sender|Conversation\s*info|Context|Metadata)\s*\(untrusted\s*metadata\):\s*```\s*\n?[\s\S]*?```\s*/gi,

    // More aggressive patterns to catch JSON metadata blocks
    /^(Sender|Conversation\s*info|Context|Metadata)\s*\(untrusted\s*metadata\):\s*```\s*\n?[\s\S]*?```\s*$/gim,

    // FIX for inline JSON after "Sender (untrusted metadata):"
    // Matches: "Sender (untrusted metadata): {...}" where {...} is any JSON object
    /^(?:Sender|Conversation\s*info|Context|Metadata)\s*\(untrusted\s*metadata\):\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*/gim,

    // FIX for multi-line JSON objects after "Sender (untrusted metadata):"
    // Matches JSON objects that span multiple lines (with nesting support)
    /^(?:Sender|Conversation\s*info|Context|Metadata)\s*\(untrusted\s*metadata\):\s*\{[\s\S]*?\n\}\s*/gim,

    // FIX for simple "Sender:" prefix with inline JSON
    /^Sender\s*:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*/gim,

    // FIX for "Sender:" or "Sender (untrusted):" followed by any text until newline
    /^(?:Sender\s*\(untrusted\)|Sender)\s*:\s*.+\n?/gim,

    // v2.4.27: Additional patterns for metadata in different formats
    /^metadata:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*/gim,
    /^context:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*/gim,
    /^info:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\s*/gim,
  ];

  for (const pattern of jsonPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 2: Remove timestamp patterns (all variations)
  const timestampPatterns = [
    // [Mon 2026-03-23 15:52 GMT+1]
    /^\[\w+\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+[^\]]+\]\s*/g,
    // [2026-03-23 15:52:30]
    /^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*/g,
    // [03/23/2026 15:52 GMT]
    /^\[\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s+\w+\]\s*/g,
    // 2026-03-23 15:52:30 GMT
    /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[A-Z]+\s*/g,
    // v2.4.27: Additional timestamp formats
    /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s*/g,
    /^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}\s*/g,
    // ISO 8601 with timezone
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?\s*/g,
    // Unix timestamp
    /^\d{10,13}\s*/g,
  ];

  for (const pattern of timestampPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 3: Remove system message prefixes
  const systemMessagePatterns = [
    /^System\s*:\s*/gi,
    /^Assistant\s*:\s*/gi,
    /^User\s*:\s*/gi,
    /^Tool\s*:\s*/gi,
    /^Function\s*:\s*/gi,
    /^Model\s*:\s*/gi,
    /^Bot\s*:\s*/gi,
    /^Agent\s*:\s*/gi,
  ];

  for (const pattern of systemMessagePatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 4: Remove tool call artifacts
  const toolCallPatterns = [
    /^Tool\s+Call\s*:\s*/gi,
    /^Function\s+Call\s*:\s*/gi,
    /^Result\s*:\s*/gi,
    /^Error\s*:\s*/gi,
    /^Response\s*:\s*/gi,
    /^Output\s*:\s*/gi,
    // v2.4.27: Additional tool-related patterns
    /^Called\s*:\s*/gi,
    /^Executed\s*:\s*/gi,
    /^Returned\s*:\s*/gi,
  ];

  for (const pattern of toolCallPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 5: Remove email-style headers
  const headerPatterns = [
    /^From\s*:\s*.+$/m, // From: someone
    /^To\s*:\s*.+$/m, // To: someone
    /^Subject\s*:\s*.+$/m, // Subject: something
    /^Date\s*:\s*.+$/m, // Date: something
    /^Message-ID\s*:\s*.+$/m, // Message-ID: xxx
    // v2.4.27: Additional email headers
    /^CC\s*:\s*.+$/m, // CC: recipients
    /^BCC\s*:\s*.+$/m, // BCC: recipients
    /^Reply-To\s*:\s*.+$/m, // Reply-To: address
    /^References\s*:\s*.+$/m, // References: message-ids
    /^In-Reply-To\s*:\s*.+$/m, // In-Reply-To: message-id
  ];

  for (const pattern of headerPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 6: Remove system artifacts and special tokens
  const systemArtifactPatterns = [
    /^\[INST\]/gi,
    /^\[\/INST\]/gi,
    /^\[SYSTEM\]/gi,
    /^\[\/SYSTEM\]/gi,
    /^\[USER\]/gi,
    /^\[\/USER\]/gi,
    /^\[ASSISTANT\]/gi,
    /^\[\/ASSISTANT\]/gi,
    /^<\|.*?\|>/g,
    /<instruction[^>]*>/gi,
    /<\/instruction>/gi,
    /<system[^>]*>/gi,
    /<\/system>/gi,
    /<prompt[^>]*>/gi,
    /<\/prompt>/gi,
    // v2.4.27: Claude-specific special tokens
    /<thinking[^>]*>/gi,
    /<\/thinking>/gi,
    /<reflection[^>]*>/gi,
    /<\/reflection>/gi,
    /<observation[^>]*>/gi,
    /<\/observation>/gi,
    /<output[^>]*>/gi,
    /<\/output>/gi,
  ];

  for (const pattern of systemArtifactPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 7: Remove JSON metadata patterns at start of lines
  const jsonMetadataPatterns = [
    /^\s*\{\s*"role"\s*:\s*"tool"/gi,
    /^\s*\{\s*"role"\s*:\s*"system"/gi,
    /^\s*\{\s*"tool_call_id"/gi,
    /^\s*\{\s*"function_call"/gi,
    /^\s*\{\s*"function"/gi,
    // v2.4.27: Additional JSON role patterns
    /^\s*\{\s*"role"\s*:\s*"user"/gi,
    /^\s*\{\s*"role"\s*:\s*"assistant"/gi,
    /^\s*\{\s*"content"/gi,
  ];

  for (const pattern of jsonMetadataPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Phase 8: Remove empty metadata objects and clean whitespace
  cleaned = cleaned
    .replace(/^\{\s*\}\s*/g, "")
    .replace(/^\[\s*\]\s*/g, "")
    .replace(/^Sender\s*:\s*\{\s*\}/gim, "")
    .replace(/^From\s*\(untrusted\)\s*/gim, "")
    .replace(/^Metadata\s*:\s*\{\s*\}/gim, "");

  // Phase 9: Final cleanup - remove excessive whitespace and trim
  cleaned = cleaned
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  // Phase 11.2: Convert analyzer types to storage types
  // Normalizes category/type mentions to ensure consistency in storage
  cleaned = cleaned
    // Normalize category mentions
    .replace(/\b(entite|entité|entities)\b/gi, "entity")
    .replace(/\b(pref|prefs|setting|settings|config|configuration)\b/gi, "preference")
    .replace(/\b(dec|choice)\b/gi, "decision")
    .replace(/\b(tech|technicality)\b/gi, "technical")
    .replace(/\b(process|procedure)\b/gi, "workflow")
    .replace(/\b(troubleshoot|diagnostic)\b/gi, "debug")
    .replace(/\b(search.*engine.*optimization|keyword.*research)\b/gi, "seo")
    .replace(/\b(information|info)\b/gi, "fact")
    .replace(/\b(misc|miscellaneous|general)\b/gi, "other")

    // Normalize tier mentions
    .replace(/\b(core.*memory|permanent|long.*term)\b/gi, "core")
    .replace(/\b(medium.*term)\b/gi, "contextual")
    .replace(/\b(temporary|short.*term)\b/gi, "episodic")

    // Normalize source mentions
    .replace(/\b(automatic|automated)\b/gi, "auto-capture")
    .replace(/\b(agent.*complete)\b/gi, "agent_end")
    .replace(/\b(session.*complete|end.*of.*session)\b/gi, "session_end")
    .replace(/\b(hand.*crafted|user.*input)\b/gi, "manual");

  return cleaned;
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
