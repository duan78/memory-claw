/**
 * English locale patterns for MemoryClaw
 */

import type { LocalePatterns } from "./index.js";

export const en: LocalePatterns = {
  languageCode: "en",
  languageName: "English",

  // Triggers for memory capture
  triggers: [
    // Explicit memory instructions
    /remember|recall|memorize|keep in mind/i,
    /don'?t forget|never forget/i,
    /note (?:this|that|down)|take note/i,
    /save|store|archive|record/i,

    // Preferences & choices
    /i (?:prefer|like|love|hate|want|wish|choose|avoid)/i,
    /my (?:preference|choice|favorite|option)/i,
    /that'?s my\s+/i,
    /no\s+/i,
    /rather than|instead of/i,

    // Decisions & agreements
    /we (?:decided|decide|use|will use|take|choose|adopt)/i,
    /decision (?:made|final|set)/i,
    /we agree|agreed\s*:\s*/i,
    /it'?s (?:decided|chosen|validated|confirmed)/i,
    /concluded|accepted|validated/i,

    // Facts & rules
    /always|never|important|essential|crucial|critical/i,
    /must (?:do|be)|have to|need to/i,
    /attention (?:to|:)|⚠️|note (?:well|that)/i,
    /remember that/i,
    /know that/i,

    // Entities & people
    /'?s (?:name|called)|my name is|i am|i'?m/i,
    /this is\s+(?:a|an|the)\s+(?:client|contact|person)/i,

    // Technical keywords
    /config(?:uration)?|parameters?|settings?\b/i,
    /server|hosting|VPS|dedicated/i,
    /domain|DNS|SSL|HTTPS?\b/i,
    /project|task|ticket\b/i,
    /bug|error|problem|issue\b/i,
    /API|endpoint|webhook|REST|GraphQL\b/i,
    /database|DB\b/i,
    /deployment|production|staging\b/i,

    // Web & SEO specific
    /SEO|ranking|position\b/i,
    /keywords?\b/i,
    /content|article|blog|page\b/i,
    /optimize|optimization|performance|speed\b/i,
    /analytics|stats|statistics\b/i,
    /CMS|WordPress|Shopify\b/i,
    /HTML|CSS|JavaScript|JS|TS\b/i,
    /framework|library|bundle|build\b/i,

    // Hosting & infrastructure
    /nginx|apache|caddy|server\b/i,
    /certificate|SSL|TLS|HTTPS\b/i,
    /hosting|host\b/i,
    /backup|restore\b/i,
    /curl|wget|ssh|ftp|sftp\b/i,

    // Contact info
    /\+\d{10,}/,
    /[\w.-]+@[\w.-]+\.\w+/,
    /https?:\/\/[^\s]+/,
  ],

  // Patterns to skip (system noise, tags, etc.)
  skipPatterns: [
    /<relevant-memories>/i,
    /<\/relevant-memories>/i,
    /<[\w-]+>/i,
    /<[\w-]+\s+[^>]*>/i,
    /Sender \(untrusted\)/i,
    /^\[.*\]\s*user\s+\w+\s*/i,
    /^system\s*:\s*/i,
    /^assistant\s*:\s*/i,
    /^user\s*:\s*/i,
    /^\s*[-*+#]\s*\d*\.\s*/i,
    /^\s*\d+\.\s+/,
    /^(Treat every|Do not follow)/i,
    /^(the|a|an|this|that|these|those)\s+(memory|fact|info)\s/i,
    /<instruction[^>]*>|<system[^>]*>|<prompt[^>]*>/i,
    /\[INST\]|\[\/INST\]|\[SYSTEM\]/i,
    /<\|.*?\|>/g,
  ],

  // Low-value content patterns
  lowValuePatterns: [
    /^(ok|yes|no|thanks|please)\b[.!]?$/i,
    /^(i don'?t know|idk)\b[.!]?$/i,
    /^(understood|got it)\b[.!]?$/i,
    /^(great|perfect)\b[.!]?$/i,
    /^(ok|thanks)\s*[.!]*$/i,
  ],

  // Prompt injection patterns
  injectionPatterns: [
    /ignore (?:all|previous|the|this|that)/i,
    /system prompt|initial prompt/i,
    /you are (?:now|currently|no longer)/i,
    /new (?:role|context|instruction)/i,
    /override|bypass|circumvent/i,
    /hidden (?:instruction|command|prompt)/i,
    /forget (?:everything|all instructions)/i,
    /exec|execute|run (?:command|cmd|bash)/i,
    /eval\(|eval\s+/i,
    /\$_GET|\$_POST|\$_REQUEST/i,
    new RegExp(";.*rm\\s+-rf|&&.*rm\\s+-rf", "i"),
  ],

  // Important keyword patterns (bonus score)
  importanceKeywordPatterns: [
    /important|essential|crucial|critical/i,
    /always|never/i,
    /priority|urgent|urgency/i,
    /mandatory|required/i,
    /note (?:well|that)/i,
    /remember (?:well|that)/i,
  ],

  // Category detection patterns
  categoryOverrides: {
    preference: [
      /prefer|like|love|hate|want|choose|avoid/i,
      /my (?:preference|choice|favorite)/i,
      /that'?s my\s+/i,
    ],
    decision: [
      /decided|decide|we use|we take|we choose|we adopt|agreed|validated|confirmed/i,
      /decision (?:made|final)/i,
      /concluded|accepted/i,
    ],
    entity: [
      /\+\d{10,}|@[\w.-]+\.\w+|'?s (?:name|called)|my name is/i,
      /this is\s+(?:a|an)\s+(?:client|contact|person)/i,
    ],
    seo: [
      /SEO|ranking|keywords?|backlinks?|analytics|stats|content/i,
      /Google|position|optimization/i,
    ],
    technical: [
      /config|parameters?|settings?|server|hosting|VPS|domain|DNS|SSL|deployment/i,
      /nginx|apache|caddy|certificate|hosting/i,
    ],
    workflow: [
      /project|task|ticket|workflow|process/i,
      /always|never|must|attention/i,
    ],
    debug: [
      /bug|error|problem|issue|panic|crash/i,
    ],
  },

  // Language-specific characteristics for detection
  characteristics: {
    commonWords: ["the", "a", "an", "of", "to", "in", "is", "it", "you", "that", "he", "was", "for", "on", "are", "as", "with", "his", "they", "i", "at", "be", "this", "have", "from", "or", "one", "had", "by", "word", "but", "not", "what", "all", "were", "we", "when", "your", "can", "said", "there", "use", "an", "each", "which", "she", "do", "how", "their", "if"],
    accentedChars: null, // No accented characters in English
    commonPatterns: [
      /(?:it'?s|that'?s|there'?s|here'?s|what'?s|who'?s|where'?s|when'?s|why'?s|how'?s)/i,
      /(?:don'?t|doesn'?t|won'?t|can'?t|couldn'?t|shouldn'?t|wouldn'?t)/i,
    ],
  },
};
