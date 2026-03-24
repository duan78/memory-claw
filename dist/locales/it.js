/**
 * Italian locale patterns for MemoryClaw
 * Complete patterns for memory capture and categorization
 */
export const it = {
    languageCode: "it",
    languageName: "Italiano",
    // Triggers for memory capture
    triggers: [
        // Explicit memory instructions
        /ricorda|ricordati|memorizza|tieni a mente/i,
        /non dimenticare|non scordare/i,
        /nota (?:questo|questa|ciò)|segna/i,
        /salva|archivia|registra/i,
        /annota|appunta/i,
        // Preferences & choices
        /(?:io )?preferisco|voglio|mi piace|odio|amo|desidero|scelgo|evito/i,
        /la mia (?:preferenza|scelta|opinione|opzione)/i,
        /è il mio\s+/i,
        /nessun\s+/i,
        /piuttosto che|invece di/i,
        // Decisions & agreements
        /abbiamo (?:deciso|scelto|adottato)|decidiamo|usiamo|adottiamo/i,
        /decisione (?:presa|finale)/i,
        /siamo d'accordo|d'accordo\s*:\s*/i,
        /è (?:deciso|scelto|confermato|validato)/i,
        /concluso|accettato|validato/i,
        // Facts & rules
        /sempre|mai|importante|essenziale|cruciale|critico/i,
        /bisogna|è necessario|dev'essere|occorre/i,
        /attenzione (?:a|:)|⚠️|nota bene/i,
        /ricorda che|sappi che/i,
        // Entities & people
        /si chiama|il mio nome è|mi chiamo/i,
        /è\s+(?:un|una|il|la)\s+(?:cliente|contatto|persona)/i,
        // Technical keywords
        /config(?:urazione)?|parametri|impostazioni?\b/i,
        /server|hosting|VPS|dedicato/i,
        /dominio|DNS|SSL|HTTPS?\b/i,
        /progetto|attività|ticket\b/i,
        /bug|errore|problema|issue\b/i,
        /API|endpoint|webhook|REST|GraphQL\b/i,
        /database|DB\b/i,
        /deploy(?:ment)?|produzione|staging\b/i,
        // Web & SEO specific
        /SEO|posizionamento|ranking\b/i,
        /parole chiave|keywords?\b/i,
        /contenuto|articolo|blog|pagina\b/i,
        /ottimizzazione|performance|velocità\b/i,
        /analytics|statistiche\b/i,
        /CMS|WordPress|Shopify\b/i,
        /HTML|CSS|JavaScript|JS|TS\b/i,
        /framework|libreria|bundle|build\b/i,
        // Hosting & infrastructure
        /nginx|apache|caddy|server\b/i,
        /certificato|SSL|TLS|HTTPS\b/i,
        /hosting|host\b/i,
        /backup|ripristino\b/i,
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
        /^(ok|sì|no|grazie|per favore)\b[.!]?$/i,
        /^(non lo so|boh|idk)\b[.!]?$/i,
        /^(capisco|ho capito|inteso)\b[.!]?$/i,
        /^(ottimo|perfetto|grande)\b[.!]?$/i,
        /^(attenzione|ok|grazie)\s*[.!]*$/i,
    ],
    // Prompt injection patterns
    injectionPatterns: [
        /ignora (?:tutto|il|la|i|gli|questo|quello|precedente)/i,
        /prompt (?:di sistema|iniziale)/i,
        /tu (?:sei|ora|diventi|adesso sei)/i,
        /nuovo (?:ruolo|contesto|istruzione)/i,
        /ridefinisci|riconfigura/i,
        /override|sovrascrivi|aggira/i,
        /istruzione (?:nascosta|segreta|di sistema)/i,
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
        /importante|essenziale|cruciale|critico/i,
        /sempre|mai|always|never/i,
        /priorità|urgente|urgenza/i,
        /obbligatorio|richiesto|required/i,
        /nota bene|ricorda bene/i,
    ],
    // Category detection patterns
    categoryOverrides: {
        preference: [
            /preferisco|mi piace|odio|amo|voglio|scelgo|evito/i,
            /la mia (?:preferenza|scelta)/i,
            /è il mio\s+/i,
        ],
        decision: [
            /deciso|decidiamo|usiamo|adottiamo|d'accordo|validato|confermato/i,
            /decisione (?:presa|finale)/i,
            /concluso|accettato/i,
        ],
        entity: [
            /\+\d{10,}|@[\w.-]+\.\w+|si chiama|il mio nome è/i,
            /è\s+(?:un|una)\s+(?:cliente|contatto|persona)/i,
        ],
        seo: [
            /SEO|posizionamento|parole chiave|backlinks?|analytics|statistiche|contenuto/i,
            /Google|ranking|ottimizzazione/i,
        ],
        technical: [
            /config|parametri|impostazioni?|server|hosting|VPS|dominio|DNS|SSL|deploy/i,
            /nginx|apache|caddy|certificato|hosting/i,
        ],
        workflow: [
            /progetto|attività|ticket|workflow|processo/i,
            /sempre|mai|bisogna|attenzione/i,
        ],
        debug: [
            /bug|errore|problema|issue|panic|crash/i,
        ],
    },
    // Language-specific characteristics for detection
    characteristics: {
        commonWords: ["il", "lo", "la", "i", "gli", "le", "un", "una", "uno", "di", "a", "da", "in", "con", "su", "per", "tra", "fra", "io", "tu", "lui", "lei", "noi", "voi", "loro", "che", "è", "sono", "ha", "hanno"],
        accentedChars: /[àèéìòù]/i,
        commonPatterns: [
            /(?:il|lo|la|gli|le|un|una|uno)\s+\w+/i,
            /(?:zione|mento|tà|ità|anza|enza)\b/i, // Common suffixes
            /(?:non|n[e'])\s+\w+/i,
        ],
    },
};
