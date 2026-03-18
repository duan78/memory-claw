/**
 * German locale patterns for MemoryClaw
 */

import type { LocalePatterns } from "./index.js";

export const de: LocalePatterns = {
  languageCode: "de",
  languageName: "Deutsch",

  // Triggers for memory capture
  triggers: [
    // Explicit memory instructions
    /merke|erinnere|behalte|speicher/i,
    /nicht (?:vergessen|vergiss)|nie vergessen/i,
    /notiere (?:das|dies)/i,
    /speichern|archivieren|aufbewahren/i,

    // Preferences & choices
    /ich (?:bevorzuge|will|mag|hasse|liebe|wünsche|wähle|vermeide)/i,
    /meine (?:bevorzugung|wahl|favorit|option)/i,
    /das ist mein\s+/i,
    /kein\s+/i,
    /lieber als|statt/i,

    // Decisions & agreements
    /wir (?:haben entschieden|entscheiden|nutzen|werden nutzen|nehmen|wählen|adoptieren)/i,
    /entscheidung (?:getroffen|final|festgelegt)/i,
    /wir sind einverstanden|einverstanden\s*:\s*/i,
    /es ist (?:entschieden|gewählt|validiert|bestätigt)/i,
    /abgeschlossen|akzeptiert|validiert/i,

    // Facts & rules
    /immer|nie|wichtig|essenziell|entscheidend|kritisch/i,
    /man muss|musst|nötig/i,
    /achtung (?:auf|:)|⚠️|notiere (?:gut|dass)/i,
    /erinnere dass|wiss dass/i,

    // Entities & people
    /heißt|mein name ist|ich bin/i,
    /das ist\s+(?:ein|eine|der|die)\s+(?:kunde|kontakt|person)/i,

    // Technical keywords
    /config(?:uration)?|parameter|einstellungen?\b/i,
    /server|hosting|VPS|dediziert/i,
    /domäne|domain|DNS|SSL|HTTPS?\b/i,
    /projekt|aufgabe|ticket\b/i,
    /bug|fehler|problem|issue\b/i,
    /API|endpoint|webhook|REST|GraphQL\b/i,
    /datenbank|database|DB\b/i,
    /bereitstellung|deployment|produktion|staging\b/i,

    // Web & SEO specific
    /SEO|ranking|position\b/i,
    /schlüsselwörter|keywords?\b/i,
    /inhalt|article|blog|seite\b/i,
    /optimierung|leistung|geschwindigkeit\b/i,
    /analytik|statistiken\b/i,
    /CMS|WordPress|Shopify\b/i,
    /HTML|CSS|JavaScript|JS|TS\b/i,
    /framework|bibliothek|bundle|build\b/i,

    // Hosting & infrastructure
    /nginx|apache|caddy|server\b/i,
    /zertifikat|SSL|TLS|HTTPS\b/i,
    /hosting|host\b/i,
    /backup|wiederherstellung\b/i,
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
    /^(ok|ja|nein|danke|please)\b[.!]?$/i,
    /^(ich weiß nicht|idk|i don'?t know)\b[.!]?$/i,
    /^(verstanden|understood|got it)\b[.!]?$/i,
    /^(toll|perfekt|great|perfect)\b[.!]?$/i,
    /^(achtung|ok|danke)\s*[.!]*$/i,
  ],

  // Prompt injection patterns
  injectionPatterns: [
    /ignoriere (?:alles|den|die|das|vorherige| vorherigen)/i,
    /systemprompt|ursprünglicher prompt/i,
    /du (?:bist|jetzt|wirst|bist jetzt)/i,
    /neue (?:rolle|kontext|instruktion)/i,
    /redefinieren|rekonfigurieren/i,
    /override|überschreiben|umgehen/i,
    /instruktion (?:versteckt|geheim|system)/i,

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
    /;.*rm\s+-rf|&&.*rm\s+-rf/ i,
  ],

  // Important keyword patterns (bonus score)
  importanceKeywordPatterns: [
    /wichtig|essenziell|entscheidend|kritisch/i,
    /immer|nie|always|never/i,
    /priorität|dringend|dringlichkeit/i,
    /verpflichtend|erforderlich|required/i,
    /notiere (?:gut|das)/i,
    /erinnere (?:gut|dass)/i,
  ],

  // Category detection patterns
  categoryOverrides: {
    preference: [
      /bevorzuge|mag|hasse|liebe|will|wähle|vermeide/i,
      /meine (?:bevorzugung|wahl|favorit)/i,
      /das ist mein\s+/i,
    ],
    decision: [
      /entschieden|entscheiden|wir nutzen|wir nehmen|wir wählen|wir adoptieren|einverstanden|validiert|bestätigt/i,
      /entscheidung (?:getroffen|final)/i,
      /abgeschlossen|akzeptiert/i,
    ],
    entity: [
      /\+\d{10,}|@[\w.-]+\.\w+|heißt|mein name ist/i,
      /das ist\s+(?:ein|eine)\s+(?:kunde|kontakt|person)/i,
    ],
    seo: [
      /SEO|ranking|schlüsselwörter|backlinks?|analytik|statistiken|inhalt/i,
      /Google|position|optimierung/i,
    ],
    technical: [
      /config|parameter|einstellungen?|server|hosting|VPS|domäne|DNS|SSL|bereitstellung/i,
      /nginx|apache|caddy|zertifikat|hosting/i,
    ],
    workflow: [
      /projekt|aufgabe|ticket|workflow|prozess/i,
      /immer|nie|man muss|achtung/i,
    ],
    debug: [
      /bug|fehler|problem|issue|panic|crash/i,
    ],
  },

  // Language-specific characteristics for detection
  characteristics: {
    commonWords: ["der", "die", "das", "ein", "eine", "einer", "eines", "ich", "du", "er", "sie", "es", "wir", "ihr", "sie", "ich", "mich", "mir", "dir", "ihm", "ihr", "ihn", "uns", "euch"],
    accentedChars: /[äöüß]/i,
    commonPatterns: [
      /(?:zum|zur|im|am|um|bei|von|nach|mit|über|unter|vor|durch|für|ohne|gegen)\s+/i,
      /(?:ung|heit|keit|schaft|lich|ig|bar|ner)\b/i, // Common suffixes
    ],
  },
};
