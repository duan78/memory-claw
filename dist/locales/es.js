/**
 * Spanish locale patterns for MemoryClaw
 */
export const es = {
    languageCode: "es",
    languageName: "Español",
    // Triggers for memory capture
    triggers: [
        // Explicit memory instructions
        /recuerda|acuerdate|memoriza|guarda/i,
        /no (?:olvides|olvidar)/i,
        /nota (?:esto|eso)/i,
        /guarda|salva|archiva/i,
        // Preferences & choices
        /prefiero|quiero|me gusta|odio|amo|deseo|elijo|evito/i,
        /mi (?:preferida|elección|favorita|opinión)/i,
        /es mi\s+/i,
        /no\s+/i,
        /más que|en lugar de/i,
        // Decisions & agreements
        /hemos (?:decidido|decidimos|usar|usaremos|tomado|elegido|adoptado)/i,
        /decisión (?:tomada|final|definitiva)/i,
        /estamos de acuerdo|de acuerdo\s*:\s*/i,
        /está (?:decidido|elegido|validado|confirmado)/i,
        /concluido|aceptado|validado/i,
        // Facts & rules
        /siempre|nunca|importante|esencial|crucial|crítico/i,
        /hay que|es necesario|debe/i,
        /atención (?:a|:)|⚠️|nota (?:bien|que)/i,
        /recuerda que/i,
        /sabe que/i,
        // Entities & people
        /se llama|mi nombre es|me llamo/i,
        /es\s+(?:un|una|el|la)\s+(?:cliente|contacto|persona)/i,
        // Technical keywords
        /config(?:uración)?|parámetros?|ajustes?\b/i,
        /servidor|hosting|VPS|dedicado/i,
        /dominio|DNS|SSL|HTTPS?\b/i,
        /proyecto|tarea|ticket\b/i,
        /bug|error|problema|issue\b/i,
        /API|endpoint|webhook|REST|GraphQL\b/i,
        /base de datos|database|BDD|DB\b/i,
        /despliegue|deploy|producción|staging\b/i,
        // Web & SEO specific
        /SEO|posicionamiento|backlinks?\b/i,
        /Google|ranking|posición\b/i,
        /palabras clave\b/i,
        /contenido|article|blog|página\b/i,
        /optimización|performance|velocidad\b/i,
        /analíticas|estadísticas\b/i,
        /CMS|WordPress|Shopify\b/i,
        /HTML|CSS|JavaScript|JS|TS\b/i,
        /framework|librería|bundle|build\b/i,
        // Hosting & infrastructure
        /nginx|apache|caddy|servidor\b/i,
        /certificado|SSL|TLS|HTTPS\b/i,
        /hosting|hospedaje|host\b/i,
        /respaldo|backup|restauración\b/i,
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
        /^(ok|sí|no|gracias|please)\b[.!]?$/i,
        /^(no sé|idk|i don'?t know)\b[.!]?$/i,
        /^(entendido|understood|got it)\b[.!]?$/i,
        /^(genial|perfecto|great|perfect)\b[.!]?$/i,
        /^(atención|ok|gracias)\s*[.!]*$/i,
    ],
    // Prompt injection patterns
    injectionPatterns: [
        /ignora (?:todo|el|los|esto|eso|previo| anteriores)/i,
        /prompt (?:sistema|inicial|de origen)/i,
        /tú (?:eres|ahora|te conviertes|eres ahora)/i,
        /nuevo (?:rol|contexto|instrucción)/i,
        /redefinir|reconfigura/i,
        /override|sobrescribir|contornear/i,
        /instrucción (?:oculta|secreta|de sistema)/i,
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
        /importante|esencial|crucial|crítico/i,
        /siempre|nunca|always|never/i,
        /prioritario|urgente|urgencia/i,
        /obligatorio|requisito|required/i,
        /nota (?:bien|eso)/i,
        /recuerda (?:bien|que)/i,
    ],
    // Category detection patterns
    categoryOverrides: {
        preference: [
            /prefiero|me gusta|odio|amo|quiero|elijo|evito/i,
            /mi (?:preferida|elección|favorita)/i,
            /es mi\s+/i,
        ],
        decision: [
            /decidido|decidimos|usamos|tomamos|elegimos|adoptamos|de acuerdo|validado|confirmado/i,
            /decisión (?:tomada|final)/i,
            /concluido|aceptado/i,
        ],
        entity: [
            /\+\d{10,}|@[\w.-]+\.\w+|se llama|mi nombre es/i,
            /es\s+(?:un|una)\s+(?:cliente|contacto|persona)/i,
        ],
        seo: [
            /SEO|posicionamiento|backlinks?|analíticas|estadísticas|contenido/i,
            /Google|posición|optimización/i,
        ],
        technical: [
            /config|parámetros?|ajustes?|servidor|hosting|VPS|dominio|DNS|SSL|despliegue/i,
            /nginx|apache|caddy|certificado|hospedaje/i,
        ],
        workflow: [
            /proyecto|tarea|ticket|workflow|proceso/i,
            /siempre|nunca|hay que|atención/i,
        ],
        debug: [
            /bug|error|problema|issue|panic|crash/i,
        ],
    },
    // Language-specific characteristics for detection
    characteristics: {
        commonWords: ["el", "la", "los", "las", "un", "una", "unos", "unas", "yo", "tú", "él", "ella", "nosotros", "nosotras", "vosotros", "vosotras", "ellos", "ellas", "que", "de", "en", "por", "para", "con", "sin", "sobre", "entre", "hasta", "desde"],
        accentedChars: /[áéíóúüñ]/i,
        commonPatterns: [
            /(?:dél|l|n|m|s|c|j)\s+/i, // Contractions like "del", "al", etc.
            /(?:ción|sión|miento)/i, // Common suffixes
        ],
    },
};
