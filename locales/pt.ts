/**
 * Portuguese locale patterns for MemoryClaw
 * Supports both Brazilian (pt-BR) and European (pt-PT) variants
 */

import type { LocalePatterns } from "./index.js";

export const pt: LocalePatterns = {
  languageCode: "pt",
  languageName: "Português",

  // Triggers for memory capture
  triggers: [
    // Explicit memory instructions
    /lembra(?:r)?(?:-se)?|memoriza|grava|guarda/i,
    /não (?:esqueça|esquece)|nunca esqueça/i,
    /anota (?:isso|isto)|registra/i,
    /salva|arquiva|preserva/i,
    /marca|assinala/i,

    // Preferences & choices
    /(?:eu )?prefiro|quero|gosto|odeio|amo|desejo|escolho|evito/i,
    /minha (?:preferência|escolha|favorita|opinião)/i,
    /é o meu\s+/i,
    /nenhum\s+/i,
    /em vez de|ao invés de|melhor que/i,

    // Decisions & agreements
    /(?:nós )?decidimos|decidimos|escolhemos|adotamos|usaremos/i,
    /decisão (?:tomada|final)/i,
    /concordamos|de acordo\s*:\s*/i,
    /está (?:decidido|escolhido|validado|confirmado)/i,
    /concluído|aceito|validado/i,

    // Facts & rules
    /sempre|nunca|importante|essencial|crucial|crítico/i,
    /é preciso|é necessário|tem que|deve/i,
    /atenção (?:a|:)|⚠️|nota/i,
    /lembre-se que|saiba que/i,

    // Entities & people
    /se chama|meu nome é|me chamo/i,
    /é\s+(?:um|uma|o|a)\s+(?:cliente|contato|pessoa)/i,

    // Technical keywords
    /config(?:uração)?|parâmetros?|configurações?\b/i,
    /servidor|hosting|VPS|dedicado/i,
    /domínio|DNS|SSL|HTTPS?\b/i,
    /projeto|tarefa|ticket\b/i,
    /bug|erro|problema|issue\b/i,
    /API|endpoint|webhook|REST|GraphQL\b/i,
    /banco de dados|database|DB\b/i,
    /deploy(?:ment)?|produção|staging\b/i,

    // Web & SEO specific
    /SEO|posicionamento|ranking\b/i,
    /palavras?[- ]?chave|keywords?\b/i,
    /conteúdo|artigo|blog|página\b/i,
    /otimização|performance|velocidade\b/i,
    /analytics|estatísticas?\b/i,
    /CMS|WordPress|Shopify\b/i,
    /HTML|CSS|JavaScript|JS|TS\b/i,
    /framework|biblioteca|bundle|build\b/i,

    // Hosting & infrastructure
    /nginx|apache|caddy|servidor\b/i,
    /certificado|SSL|TLS|HTTPS\b/i,
    /hospedagem|hosting|host\b/i,
    /backup|restauração\b/i,
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
    /^(ok|sim|não|não|obrigado|por favor)\b[.!]?$/i,
    /^(não sei|idk)\b[.!]?$/i,
    /^(entendi|percebi|entendido)\b[.!]?$/i,
    /^(ótimo|perfeito|excelente|legal)\b[.!]?$/i,
    /^(tá|ok|beleza)\s*[.!]*$/i,
  ],

  // Prompt injection patterns
  injectionPatterns: [
    /ignore (?:tudo|o|os|as|isto|isso|anteriores)/i,
    /prompt (?:do sistema|inicial)/i,
    /você (?:é|agora|se torna|é agora)/i,
    /novo (?:papel|contexto|instrução)/i,
    /redefinir|reconfigurar/i,
    /override|sobrescrever|contornar/i,
    /instrução (?:oculta|secreta|de sistema)/i,

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
    /importante|essencial|crucial|crítico/i,
    /sempre|nunca|always|never/i,
    /prioridade|urgente|urgência/i,
    /obrigatório|exigido|required/i,
    /nota (?:bem|isso)|lembre-se bem/i,
  ],

  // Category detection patterns
  categoryOverrides: {
    preference: [
      /prefiro|gosto|odeio|amo|quero|escolho|evito/i,
      /minha (?:preferência|escolha|favorita)/i,
      /é o meu\s+/i,
    ],
    decision: [
      /decidido|decidimos|usamos|escolhemos|adotamos|de acordo|validado|confirmado/i,
      /decisão (?:tomada|final)/i,
      /concluído|aceito/i,
    ],
    entity: [
      /\+\d{10,}|@[\w.-]+\.\w+|se chama|meu nome é/i,
      /é\s+(?:um|uma)\s+(?:cliente|contato|pessoa)/i,
    ],
    seo: [
      /SEO|posicionamento|palavras?[- ]?chave|backlinks?|analytics|estatísticas|conteúdo/i,
      /Google|ranking|otimização/i,
    ],
    technical: [
      /config|parâmetros?|configurações?|servidor|hosting|VPS|domínio|DNS|SSL|deploy/i,
      /nginx|apache|caddy|certificado|hospedagem/i,
    ],
    workflow: [
      /projeto|tarefa|ticket|workflow|processo/i,
      /sempre|nunca|é preciso|atenção/i,
    ],
    debug: [
      /bug|erro|problema|issue|panic|crash/i,
    ],
  },

  // Language-specific characteristics for detection
  characteristics: {
    commonWords: ["o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "em", "para", "com", "por", "sem", "sobre", "entre", "eu", "tu", "ele", "ela", "nós", "vós", "eles", "elas", "que", "é", "são", "tem", "têm"],
    accentedChars: /[áàâãéêíóôõúç]/i,
    commonPatterns: [
      /(?:o|a|os|as|um|uma|uns|umas)\s+\w+/i,
      /(?:ção|ões|agem|idade|mento|nça)\b/i, // Common suffixes
      /(?:não|n')\s+\w+/i,
    ],
  },
};
