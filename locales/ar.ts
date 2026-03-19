/**
 * Arabic locale patterns for MemoryClaw
 * Supports RTL (Right-to-Left) text patterns
 */

import type { LocalePatterns } from "./index.js";

export const ar: LocalePatterns = {
  languageCode: "ar",
  languageName: "العربية",

  // Triggers for memory capture
  triggers: [
    // Explicit memory instructions
    /تذكر|اذكر|احفظ|احتفظ/i,
    /لا تنس(?:ى|ي)|لا تنس(?:ى|ي) أبدا/i,
    /سجل|اكتب|دوّن/i,
    /احفظ|أرشف|خزّن/i,
    /انتبه|لاحظ/i,

    // Preferences & choices
    /أفضّل|أحب|أكره|أريد|أرغب|أختار|أتجنب/i,
    /تفضيلي|اختياري|رأيي/i,
    /هذا لي\s*/i,
    /لا\s+/i,
    /أفضل من|بدلا من/i,

    // Decisions & agreements
    /قررنا|اتفقنا|اخترنا|تبنينا/i,
    /القرار (?:تم|نهائي)/i,
    /اتفقنا|موافق\s*:\s*/i,
    /تم (?:الاتفاق|الاختيار|التأكيد)/i,
    /مؤكد|مقبول|معتمد/i,

    // Facts & rules
    /دائما|أبدا|مهم|ضروري|حاسم|أساسي/i,
    /يجب|من الضروري|لا بد/i,
    /انتباه|⚠️|احذر/i,
    /تذكر أن|اعلم أن/i,

    // Entities & people
    /اسمي|أدعى|يسمونني/i,
    /هذا\s+(?:عميل|زبون|شخص|زميل)/i,
    /(?:هاتف|بريد|ايميل|واتساب)/i,

    // Technical keywords
    /إعدادات?|تهيئة|ضبط/i,
    /خادم|استضافة|سيرفر|VPS/i,
    /نطاق|مجال|DNS|SSL|HTTPS?\b/i,
    /مشروع|مهمة|تذكرة/i,
    /خطأ|عطل|مشكلة|bug|issue/i,
    /API|نقطة نهاية|webhook|REST|GraphQL/i,
    /قاعدة بيانات|DB\b/i,
    /نشر|إنتاج|staging/i,

    // Web & SEO specific
    /SEO|ترتيب|تصنيف/i,
    /كلمات? مفتاحية|keywords?\b/i,
    /محتوى|مقال|مدونة|صفحة/i,
    /تحسين|أداء|سرعة/i,
    /تحليلات?|إحصائيات?/i,
    /CMS|ووردبريس|Shopify/i,
    /HTML|CSS|جافاسكريبت|JavaScript|JS|TS/i,
    /إطار عمل|مكتبة|بناء/i,

    // Hosting & infrastructure
    /nginx|apache|caddy/i,
    /شهادة|SSL|TLS|HTTPS/i,
    /نسخ احتياطي|استعادة/i,
    /curl|wget|ssh|ftp|sftp/i,

    // Contact info
    /\+\d{10,}/,
    /[\w.-]+@[\w.-]+\.\w+/,
    /https?:\/\/[^\s]+/,

    // Arabic-specific triggers
    /في المرة القادمة|دائما|كل مرة/i,
    /عادة|غالبا/i,
    /من تجربتي/i,
  ],

  // Patterns to skip
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
    /^(نعم|لا|أوكي|حسنا|شكرا|من فضلك)\s*[.!?]*$/,
    /^(لا أعرف|ما بعرف|مش عارف)\s*[.!?]*$/,
    /^(فهمت|تمام|حسنا|موافق)\s*[.!?]*$/,
    /^(ممتاز|رائع|عظيم|مذهل)\s*[.!?]*$/,
    /^(آه|إيوه|اي)\s*[.!?]*$/,
  ],

  // Prompt injection patterns
  injectionPatterns: [
    /تجاهل (?:الكل|السابق|هذا)/i,
    /موجه النظام|الموجه الأولي/i,
    /أنت الآن|أصبحت/i,
    /دور جديد|سياق جديد|تعليمات جديدة/i,
    /أعد تعريف|أعد ضبط/i,
    /override|تجاوز|التفاف/i,
    /تعليمات (?:مخفية|سرية)/i,

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

  // Important keyword patterns
  importanceKeywordPatterns: [
    /مهم|ضروري|حاسم|أساسي/i,
    /دائما|أبدا/i,
    /أولوية|عاجل|مستعجل/i,
    /إلزامي|مطلوب|required/i,
    /انتبه|احذر/i,
  ],

  // Category detection
  categoryOverrides: {
    preference: [
      /أفضّل|أحب|أكره|أريد|أختار|أتجنب/i,
      /تفضيلي|اختياري/i,
      /هذا لي\s*/i,
    ],
    decision: [
      /قررنا|اتفقنا|اخترنا|تبنينا|موافق|معتمد/i,
      /القرار (?:تم|نهائي)/i,
      /مؤكد|مقبول/i,
    ],
    entity: [
      /\+\d{10,}|@[\w.-]+\.\w+|اسمي/i,
      /هذا\s+(?:عميل|زبون|شخص)/i,
    ],
    seo: [
      /SEO|ترتيب|كلمات? مفتاحية|روابط|تحليلات|محتوى/i,
      /Google|تصنيف|تحسين/i,
    ],
    technical: [
      /إعدادات?|تهيئة|خادم|استضافة|VPS|نطاق|DNS|SSL|نشر/i,
      /nginx|apache|caddy|شهادة/i,
    ],
    workflow: [
      /مشروع|مهمة|تذكرة|سير عمل|عملية/i,
      /دائما|أبدا|يجب|انتبه/i,
    ],
    debug: [
      /خطأ|عطل|مشكلة|bug|issue|انهيار/i,
    ],
  },

  // Language detection characteristics
  characteristics: {
    commonWords: ["في", "من", "إلى", "على", "مع", "أن", "هذا", "هذه", "ذلك", "التي", "الذي", "كان", "كانت", "يكون", "تكون", "هو", "هي", "هم", "نحن", "أنا", "أنت", "لا", "ما", "قد", "لم", "لن", "سوف", "ثم", "أو", "و", "فقط", "أيضا", "كل", "بعض", "عن", "بين", "حتى", "عند", "غير", "قبل", "بعد"],
    accentedChars: null,
    commonPatterns: [
      /[\u0600-\u06FF]{2,}/, // Arabic script
      /(?:ال|أل|لل)\w+/i, // Definite article
      /(?:ون|ين|ات|ة|ي|ا)\b/i, // Common suffixes
    ],
  },
};
