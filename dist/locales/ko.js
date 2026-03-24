/**
 * Korean locale patterns for MemoryClaw
 * Supports Hangul text patterns
 */
export const ko = {
    languageCode: "ko",
    languageName: "한국어",
    // Triggers for memory capture
    triggers: [
        // Explicit memory instructions
        /기억해|기억하세요|외워|암기/i,
        /잊지 마|잊지마세요|절대 잊지/i,
        /메모해|메모하세요|기록해/i,
        /저장해|보관해|아카이브/i,
        /적어둬|적어두세요/i,
        // Preferences & choices
        /(?:저는|나는)?좋아해|싫어해|원해|바래|선택해|피해/i,
        /내 (?:취향|선택|의견|선호)/i,
        /이게 내\s*/i,
        /없어\s+/i,
        /보다|대신에|보다 더/i,
        // Decisions & agreements
        /결정했|결정했어|정했|선택했|채택했/i,
        /동의|합의|동의했|동의해/i,
        /그렇게 하자|이걸로 하자/i,
        /확정|확인|승인/i,
        /결론|마무리/i,
        // Facts & rules
        /항상|절대|중요|필수|필수적|키/i,
        /필요|꼭|해야|하지 않으면/i,
        /주의|⚠️|조심|유의/i,
        /기억해야|알아야/i,
        // Entities & people
        /이름은|불리|저는/i,
        /(?:클라이언트|고객|연락처|담당자)/i,
        /(?:전화번호|이메일|메일)/i,
        // Technical keywords
        /설정|파라미터|구성/i,
        /서버|호스팅|VPS/i,
        /도메인|DNS|SSL|HTTPS?\b/i,
        /프로젝트|과제|티켓/i,
        /버그|에러|문제|issue/i,
        /API|엔드포인트|웹훅|REST|GraphQL/i,
        /데이터베이스|DB\b/i,
        /배포|프로덕션|스테이징/i,
        // Web & SEO specific
        /SEO|랭킹|순위/i,
        /키워드|검색어/i,
        /콘텐츠|기사|블로그|페이지/i,
        /최적화|퍼포먼스|속도/i,
        /애널리틱스|통계/i,
        /CMS|워드프레스|Shopify/i,
        /HTML|CSS|자바스크립트|JS|TS/i,
        /프레임워크|라이브러리|빌드/i,
        // Hosting & infrastructure
        /nginx|apache|caddy/i,
        /인증서|SSL|TLS|HTTPS/i,
        /백업|복원/i,
        /curl|wget|ssh|ftp|sftp/i,
        // Contact info
        /\+\d{10,}/,
        /[\w.-]+@[\w.-]+\.\w+/,
        /https?:\/\/[^\s]+/,
        // Korean-specific triggers
        /앞으로|매번|계속/i,
        /습관적으로|보통/i,
        /경험상|경험으로/i,
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
        /^[。\s、！？]+$/,
    ],
    // Low-value content patterns
    lowValuePatterns: [
        /^(네|예|아니요|아니|OK|알겠어|알겠습니다|감사|고마워)\s*[.!?]*$/,
        /^(모르겠|몰라|모름)\s*[.!?]*$/,
        /^(이해했|알겠|알았어|알았습니다)\s*[.!?]*$/,
        /^(좋아|완벽|훌륭|최고)\s*[.!?]*$/,
        /^(응|어|그래)\s*[.!?]*$/,
    ],
    // Prompt injection patterns
    injectionPatterns: [
        /(?:모든|전체|이전|이것)을 무시/i,
        /시스템 프롬프트|초기 프롬프트/i,
        /당신은 이제|너는 이제/i,
        /새로운 (?:역할|컨텍스트|지시)/i,
        /재정의|재구성/i,
        /override|바이패스|우회/i,
        /숨겨진 (?:지시|명령)/i,
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
        /중요|필수|필수적|키|핵심/i,
        /항상|절대/i,
        /우선|긴급|급하게/i,
        /필수|요구|required/i,
        /주의|유의/i,
    ],
    // Category detection
    categoryOverrides: {
        preference: [
            /좋아|싫어|원해|선택|피해/i,
            /내 (?:취향|선택|선호)/i,
            /이게 내\s*/i,
        ],
        decision: [
            /결정|정했|선택했|채택|동의|승인/i,
            /그렇게 하자|이걸로 하자/i,
            /결론|마무리/i,
        ],
        entity: [
            /\+\d{10,}|@[\w.-]+\.\w+|이름은/i,
            /(?:클라이언트|고객|연락처)/i,
        ],
        seo: [
            /SEO|랭킹|키워드|백링크|애널리틱스|콘텐츠/i,
            /Google|순위|최적화/i,
        ],
        technical: [
            /설정|파라미터|서버|호스팅|VPS|도메인|DNS|SSL|배포/i,
            /nginx|apache|caddy|인증서/i,
        ],
        workflow: [
            /프로젝트|과제|티켓|워크플로우|프로세스/i,
            /항상|절대|필요|주의/i,
        ],
        debug: [
            /버그|에러|문제|issue|크래시/i,
        ],
    },
    // Language detection characteristics
    characteristics: {
        commonWords: ["이", "그", "저", "것", "들", "은", "는", "이", "가", "을", "를", "에", "와", "과", "도", "만", "부터", "까지", "에서", "로", "으로", "하다", "있다", "없다", "되다", "같다", "아니다", "그리고", "그래서", "그러나", "또는", "그런데", "그러면", "그래도", "아니면", "왜냐하면", "따라서", "그러므로"],
        accentedChars: null,
        commonPatterns: [
            /[\uAC00-\uD7A3]{2,}/, // Hangul syllables
            /(?:입니다|습니다|했다|했다|한다|하다)\b/,
            /(?:은|는|이|가|을|를|에|와|과|도|만)\b/,
        ],
    },
};
