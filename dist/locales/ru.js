/**
 * Russian locale patterns for MemoryClaw
 * Supports Cyrillic text patterns
 */
export const ru = {
    languageCode: "ru",
    languageName: "Русский",
    // Triggers for memory capture
    triggers: [
        // Explicit memory instructions
        /запомни|запомните|помни|помните|запиши|запишите/i,
        /не забудь|не забудьте|никогда не забывай/i,
        /отметь|отметьте|зафиксируй/i,
        /сохрани|сбереги|архивируй/i,
        /заметь|обрати внимание/i,
        // Preferences & choices
        /(?:я )?предпочитаю|хочу|люблю|ненавижу|обожаю|желаю|выбираю|избегаю/i,
        /мо[яй] (?:предпочтение|выбор|любимое|мнение)/i,
        /это мо[йё]\s+/i,
        /ни\s+/i,
        /лучше чем|вместо|предпочтительнее/i,
        // Decisions & agreements
        /(?:мы )?решили|договорились|выбрали|приняли|утвердили/i,
        /решение (?:принято|окончательное)/i,
        /согласны|договорились\s*:\s*/i,
        /решено|выбрано|подтверждено|утверждено/i,
        /заключено|принято|согласовано/i,
        // Facts & rules
        /всегда|никогда|важно|существенно|критично|ключево/i,
        /нужно|необходимо|обязательно|должен/i,
        /внимание (?:на|:)|⚠️|заметь/i,
        /помни что|знай что|учти что/i,
        // Entities & people
        /зовут|мо[ёе] имя|я|это/i,
        /это\s+(?:мой|моя|наш|наша)?\s*(?:клиент|контакт|человек|коллега)/i,
        /(?:телефон|почта|email|скайп|телеграм)\s*(?::|—|-)?\s*/i,
        // Technical keywords
        /конфиг(?:урация)?|параметры?|настройки?\b/i,
        /сервер|хостинг|VPS|выделен/i,
        /домен|DNS|SSL|HTTPS?\b/i,
        /проект|задача|тикет|билет\b/i,
        /баг|ошибка|проблема|issue\b/i,
        /API|endpoint|вебхук|REST|GraphQL\b/i,
        /база данных|БД|database|DB\b/i,
        /деплой|развертывание|продакшн|стейджинг\b/i,
        // Web & SEO specific
        /SEO|ранжирование|позиция\b/i,
        /ключев(?:ие|ые)\s+слов(?:а|о)|keywords?\b/i,
        /контент|статья|блог|страница\b/i,
        /оптимизация|производительность|скорость\b/i,
        /аналитика|статистика\b/i,
        /CMS|WordPress|Shopify\b/i,
        /HTML|CSS|JavaScript|JS|TS\b/i,
        /фреймворк|библиотека|бандл|билд\b/i,
        // Hosting & infrastructure
        /nginx|apache|caddy|сервер\b/i,
        /сертификат|SSL|TLS|HTTPS\b/i,
        /хостинг|хост\b/i,
        /бэкап|резервная копия|восстановление\b/i,
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
        /^(ок|да|нет|хорошо|спасибо|пожалуйста)\b[.!]?$/i,
        /^(не знаю|понятия не имею)\b[.!]?$/i,
        /^(понял|поняла|понятно|ясно)\b[.!]?$/i,
        /^(отлично|прекрасно|супер|классно)\b[.!]?$/i,
        /^(ладно|ок|ага)\s*[.!]*$/i,
    ],
    // Prompt injection patterns
    injectionPatterns: [
        /игнорируй (?:вс[ёе]|предыдущ(?:ее|ие)|это)/i,
        /системный промпт|начальный промпт/i,
        /ты (?:теперь|сейчас|становишься)/i,
        /нов(?:ая|ый) (?:роль|контекст|инструкция)/i,
        /переопредели|перенастрой/i,
        /override|обойди|обход/i,
        /скрыт(?:ая|ое) (?:инструкция|команда)/i,
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
        /важно|существенно|критично|ключево/i,
        /всегда|никогда|always|never/i,
        /приоритет|срочно|срочность/i,
        /обязательно|требуется|required/i,
        / обрати внимание|заметь/i,
    ],
    // Category detection patterns
    categoryOverrides: {
        preference: [
            /предпочитаю|люблю|ненавижу|хочу|выбираю|избегаю/i,
            /мо[яй] (?:предпочтение|выбор|любимое)/i,
            /это мо[йё]\s+/i,
        ],
        decision: [
            /решили|договорились|выбрали|утвердили|согласованы/i,
            /решение (?:принято|окончательное)/i,
            /заключено|принято/i,
        ],
        entity: [
            /\+\d{10,}|@[\w.-]+\.\w+|зовут|мо[ёе] имя/i,
            /это\s+(?:мой|моя)?\s*(?:клиент|контакт)/i,
        ],
        seo: [
            /SEO|ранжирование|ключев(?:ие|ые)\s+слов(?:а|о)|бэклинки?|аналитика|контент/i,
            /Google|позиция|оптимизация/i,
        ],
        technical: [
            /конфиг|параметры?|настройки?|сервер|хостинг|VPS|домен|DNS|SSL|деплой/i,
            /nginx|apache|caddy|сертификат|хостинг/i,
        ],
        workflow: [
            /проект|задача|тикет|workflow|процесс/i,
            /всегда|никогда|нужно|внимание/i,
        ],
        debug: [
            /баг|ошибка|проблема|issue|паник|крэш/i,
        ],
    },
    // Language-specific characteristics for detection
    characteristics: {
        commonWords: ["и", "в", "не", "на", "я", "что", "он", "с", "как", "это", "но", "его", "к", "у", "же", "вы", "мы", "они", "да", "нет", "по", "из", "за", "от", "для", "о", "об", "со", "то", "а", "или"],
        accentedChars: /[ё]/i,
        commonPatterns: [
            /[\u0400-\u04FF]{2,}/, // Cyrillic characters
            /(?:ия|ость|ство|ние|ний)\b/i, // Common suffixes
            /(?:не|ни)\s+\w+/i,
        ],
    },
};
