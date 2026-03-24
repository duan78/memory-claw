/**
 * Memory Claw v2.4.21 - Capture Utilities
 *
 * v2.4.21: Enhanced metadata cleaning and capture quality
 * - Added more system artifact patterns to metadata cleaning
 * - Improved JSON metadata detection with edge cases
 * - Better handling of instruction tags and prompts
 * - Enhanced vector detection for LanceDB FixedSizeList format
 *
 * v2.4.19: Fixed metadata cleaning across all storage paths
 * - Manual storage (mclaw_store) now cleans metadata
 * - Import function (mclaw_import) now cleans metadata
 * - All storage paths consistently use cleanSenderMetadata()
 *
 * v2.4.17: Lowered minImportance default from 0.30 to 0.25 for better factual content capture
 *
 * v2.4.15: Enhanced content filtering
 * - Added JSON metadata block detection and filtering
 * - Added 30-character minimum length enforcement
 * - Improved filtering for tool call results and system messages
 * - Enhanced metadata header detection
 *
 * v2.4.12: Production capture fix
 * - Lowered default minImportance from 0.45 to 0.30
 * - Relaxed aggressive Telegram skip patterns that blocked legitimate conversations
 *
 * v2.4.7: Fixed RegExp global flag issue in injection patterns
 *
 * v2.4.6: Production release - removed DEBUG logging, restored proper thresholds
 *
 * v2.4.3: Relaxed trigger requirements - triggers now boost importance instead of being required
 *
 * @version 2.4.21
 * @author duan78
 */
import { normalizeText } from "./text.js";
import { calculateImportance } from "./importance.js";
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
// v2.4.15: Added JSON block filtering and improved noise detection
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
    /<\|.*?\|>/,
    // Debug/temporary content (v2.3.1)
    /^\s*DEBUG\s*:/i,
    /^\s*LOG\s*:/i,
    /^\s*TEMP\s*:/i,
    // Pure questions without statements (v2.3.1)
    /^[\w\s]+\?\s*$/i,
    // v2.4.12: Relaxed Telegram patterns - only skip pure metadata lines, not actual conversations
    // Old patterns were too aggressive and blocked legitimate user messages containing these terms
    /(?:^|\s)Telegram\s*Bot\s*Token\s*(?:=|:)\s*\w+/i,
    /(?:^|\s)bot_token\s*(?:=|:)\s*\w+/i,
    /(?:^|\s)chat_id\s*(?:=|:)\s*-?\d+/i,
    // Removed: message_id, forward_from - too broad, blocked valid conversations
    // v2.4.15: JSON metadata blocks - FIXED to be more specific and avoid false positives
    // Only skip lines that are pure JSON metadata (tool calls, system messages)
    // Don't skip legitimate user messages that happen to contain JSON-like content
    /^\s*\{\s*"role"\s*:\s*"tool"/i,
    /^\s*\{\s*"role"\s*:\s*"system"/i,
    /^\s*\{\s*"tool_call_id"/i,
    /^\s*\{\s*"function"/i,
    // v2.4.15: Metadata headers and system patterns - FIXED to be less aggressive
    /^(timestamp|created_at|updated_at|id|uuid|message_id|session_id|parent_id)\s*[:=]\s*\d+/i,
    /^\s*(```json|```)\s*$/i,
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
let loadedPatterns = {
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
export function setLocalePatterns(patterns) {
    loadedPatterns = patterns;
}
/**
 * Get all active triggers (default + locale-specific)
 */
export function getAllTriggers() {
    return [...FRENCH_TRIGGERS, ...loadedPatterns.triggers];
}
/**
 * Get all skip patterns (default + locale-specific)
 */
export function getAllSkipPatterns() {
    return [...SKIP_PATTERNS, ...loadedPatterns.skipPatterns];
}
/**
 * Get all low-value patterns (default + locale-specific)
 */
export function getAllLowValuePatterns() {
    return [...LOW_VALUE_PATTERNS, ...loadedPatterns.lowValuePatterns];
}
/**
 * Get all injection patterns (default + locale-specific)
 */
export function getAllInjectionPatterns() {
    return [...INJECTION_PATTERNS, ...loadedPatterns.injectionPatterns];
}
/**
 * Calculate injection suspicion score
 */
export function calculateInjectionSuspicion(text) {
    if (!text || typeof text !== "string")
        return 0;
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
export function detectCategory(text) {
    if (!text || typeof text !== "string")
        return "fact";
    const lower = text.toLowerCase();
    // Check locale-specific category patterns first
    const categoryOrder = ["entity", "preference", "decision", "seo", "technical", "workflow", "debug"];
    for (const category of categoryOrder) {
        const patterns = loadedPatterns.categoryOverrides[category];
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
 * v2.4.15: Detect if text is a JSON metadata block or tool result
 *
 * FIXED: Made detection more specific to avoid false positives
 * - Only filter pure JSON objects (not text containing JSON snippets)
 * - Check for role: tool/system specifically
 * - Check for tool_calls fields
 */
export function isJsonMetadata(text) {
    if (!text || typeof text !== "string")
        return false;
    const trimmed = text.trim();
    // Must be a complete JSON object or array (start AND end with braces)
    if (!(trimmed.startsWith("{") && trimmed.endsWith("}")) &&
        !(trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        return false;
    }
    // Check for specific JSON metadata patterns that indicate system/tool content
    const jsonMetadataPatterns = [
        // Tool call results: has tool_call_id, result, or function fields at top level
        /"(tool_call_id|function|function_name|function_arguments|result)"\s*:/i,
        // System messages with role: system
        /"role"\s*:\s*"system"/i,
        // Tool role (not user/assistant)
        /"role"\s*:\s*"tool"/i,
        // tool_calls array
        /"tool_calls"\s*:\s*\[/i,
    ];
    for (const pattern of jsonMetadataPatterns) {
        if (pattern.test(trimmed))
            return true;
    }
    return false;
}
/**
 * Production capture function with proper filtering thresholds.
 * v2.4.15: Enhanced filtering for JSON blocks, system messages, and 30-char minimum.
 */
export function shouldCapture(text, minChars, maxChars, category, source = "auto-capture", minImportance = 0.25 // v2.4.17: Lowered from 0.30 to 0.25 for better factual content capture
) {
    if (!text || typeof text !== "string") {
        return { should: false, importance: 0.5, suspicion: 0 };
    }
    const normalized = normalizeText(text);
    // v2.4.15: Enforce minimum 30 character length
    const MIN_LENGTH = 30;
    if (!normalized || normalized.length < Math.max(MIN_LENGTH, minChars) || normalized.length > maxChars) {
        return { should: false, importance: 0.5, suspicion: 0 };
    }
    // v2.4.15: Filter out JSON metadata blocks and tool results
    if (isJsonMetadata(normalized)) {
        return { should: false, importance: 0.5, suspicion: 0 };
    }
    // Injection check
    const suspicion = calculateInjectionSuspicion(normalized);
    if (suspicion > 0.5) {
        return { should: false, importance: 0.5, suspicion };
    }
    // Skip patterns check
    if (getAllSkipPatterns().some((p) => p.test(normalized))) {
        return { should: false, importance: 0.5, suspicion };
    }
    // Low value patterns check
    if (getAllLowValuePatterns().some((p) => p.test(normalized))) {
        return { should: false, importance: 0.5, suspicion };
    }
    // Calculate importance
    const detectedCategory = category || detectCategory(normalized);
    let importance = calculateImportance(normalized, detectedCategory, source);
    // Trigger patterns boost importance
    if (getAllTriggers().some((r) => r.test(normalized))) {
        importance = Math.min(1.0, importance + 0.15);
    }
    // Importance threshold check
    if (importance < minImportance) {
        return { should: false, importance, suspicion };
    }
    return { should: true, importance, suspicion };
}
