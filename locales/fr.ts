/**
 * French locale patterns for MemoryClaw
 * Primary language - most complete patterns
 */

import type { LocalePatterns } from "./index.js";

export const fr: LocalePatterns = {
  languageCode: "fr",
  languageName: "Français",

  // Triggers for memory capture
  triggers: [
    // Explicit memory instructions
    /rappelle(?:-toi| vous)?/i,
    /souviens(?:-toi| vous)?/i,
    /retenirs?|mémorises?|gardes? en (?:tête|mémoire)/i,
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
    /^(ok|oui|non|yes|no|d'accord|merci|thanks|please)\b[.!]?$/i,
    /^(je ne sais pas|je sais pas|idk|i don't know)\b[.!]?$/i,
    /^(compris|entendu|understood|got it)\b[.!]?$/i,
    /^(super|génial|parfait|great|perfect)\b[.!]?$/i,
    /^(attention|ok|merci|thanks|d'accord)\s*[.!]*$/i,
  ],

  // Prompt injection patterns
  injectionPatterns: [
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
    /;.*rm\s+-rf|&&.*rm\s+-rf/i,
  ],

  // Important keyword patterns (bonus score)
  importanceKeywordPatterns: [
    /important|essentiel|crucial|critique/i,
    /toujours|jamais|always|never/i,
    /prioritaire|urgent|urgence/i,
    /obligatoire|requis|required/i,
    /note (?:bien|ça|cela)|note that/i,
    /rappelle(?:-toi| vous) (?:bien|que)/i,
  ],

  // Category detection patterns
  categoryOverrides: {
    preference: [
      /préfère|aime|déteste|adore|veux|choisis|évit|pas de|plutôt/i,
      /mon\s+(?:préféré|choix|favori|avis)/i,
      /c'est mon\s+/i,
    ],
    decision: [
      /décidé|décide|on utilise|on prend|on choisit|on adopte|d'accord|validé|confirmé/i,
      /décision (?:prise|finale|arrêtée)/i,
      /conclus?|accepté/i,
    ],
    entity: [
      /\+\d{10,}|@[\w.-]+\.\w+|s'appelle|mon nom|c'est\s+(?:un|une)\s+client/i,
      /c'est\s+(?:un|une|le|la)\s+(?:client|contact|personne)/i,
    ],
    seo: [
      /SEO|referencement|ranking|mots-cl[ée]s|keywords?|backlinks?|analytics|stats|contenu/i,
      /Google|position| Classement|optimis[ée]/i,
    ],
    technical: [
      /config|paramètres?|settings?|serveur|hosting|VPS|domaine|DNS|SSL|déploiement|deploy/i,
      /nginx|apache|caddy|certificat|h[eé]bergement|h[eé]bergeur/i,
    ],
    workflow: [
      /projet|chantier|task|tâche|ticket|workflow|processus/i,
      /toujours|jamais|il faut|attention/i,
    ],
    debug: [
      /bug|erreur|error|probl[èe]me|issue|panic|crash/i,
    ],
  },

  // Language-specific characteristics for detection
  characteristics: {
    commonWords: ["le", "la", "les", "un", "une", "des", "je", "tu", "il", "elle", "nous", "vous", "ils", "elles"],
    accentedChars: /[àâäéèêëïîôùûüÿç]/i,
    commonPatterns: [
      /(?:qu'|l'|d'|n'|j'|s'|c'|jusqu'|puisqu'|parce que|lorsque|pendant que)/i,
      /(?:-toi|-vous|-moi|-lui|-leur|-nous)$/i,
    ],
  },
};
