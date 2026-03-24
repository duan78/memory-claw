/**
 * Chinese locale patterns for MemoryClaw
 * Supports both Simplified and Traditional Chinese
 */
export const zh = {
    languageCode: "zh",
    languageName: "中文",
    // Triggers for memory capture
    triggers: [
        // Explicit memory instructions
        /记住|记得|别忘|不要忘|请记住|务必记住|请记/i,
        /回忆|回想|回想一下/i,
        /记下来|记录|保存|存一下|标记/i,
        /备忘|笔记|备注|记下/i,
        /把这个|把这|把那/i,
        /帮我记/i,
        // Preferences & choices
        /我(?:喜欢|偏好|偏爱|爱|讨厌|想要|希望|选择|避免)/,
        /我的(?:偏好|选择|喜好|选项|最爱)/,
        /我(?:更|比较)?喜欢/,
        /我(?:不)?想(?:要|用)/,
        /还是(?:用|选)/,
        /比起.*我(?:更|比较)/,
        // Decisions & agreements
        /(?:我们)?决定|决定了|已经决定|最终决定|拍板/i,
        /同意|达成一致|确认了|敲定了/i,
        /就这样|就这|决定了就这样/i,
        /定了|确认|通过|采纳|采用/i,
        /结论|结果|总结/i,
        // Facts & rules
        /重要|必须|关键|必要|核心|务必|千万/i,
        /一定要|不能|不可以|绝对(?:不|不行)/i,
        /注意|提醒|警告|⚠️/i,
        /记住.*?是|知道.*?是/i,
        /规则|原则|方法|流程/i,
        // Entities & people
        /(?:叫|名字(?:是)?|称为|名叫)/,
        /(?:我的?|这(?:是|个)|那(?:是|个)).*(?:客户|联系人|朋友|同事|老板)/i,
        /(?:(?:手机|电话|邮箱|邮件|微信).?号?是?)/,
        // Technical keywords
        /配置|参数|设置|选项/i,
        /服务器|主机|VPS|云服务|托管/i,
        /域名|DNS|SSL|HTTPS?\b/i,
        /项目|任务|工单|需求|功能/i,
        /(?:bug|错误|问题|故障|异常|报错)/i,
        /API|接口|endpoint|webhook|REST|GraphQL/i,
        /数据库|DB\b|MySQL|PostgreSQL|MongoDB|Redis/i,
        /部署|上线|发布|生产|测试|开发/i,
        /代码|程序|脚本|框架|库/i,
        // Web & SEO
        /SEO|排名|关键词|搜索/i,
        /优化|性能|速度|加载/i,
        /网站|网页|博客|文章|内容/i,
        /分析|统计|数据|报告/i,
        /WordPress|Shopify|CMS/i,
        /HTML|CSS|JavaScript|JS|TS|Vue|React|Angular/i,
        // Contact info
        /[\+]?[0-9\u4e00-\u9fff\s\-]{7,}/,
        /[\w.-]+@[\w.-]+\.\w+/,
        /https?:\/\/[^\s]+/,
        // Chinese-specific triggers
        /以后(?:记得|记住|别忘了)/,
        /每次都/i,
        /习惯(?:上)?(?:是|用)/,
        /经验(?:告诉|是|表明)/,
        /一般来说|通常|一般/i,
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
        /^[\s\W]+$/, // whitespace-only or symbols-only
        /^[。，、；：！？「」『』【】（）《》…—]+$/,
    ],
    // Low-value content patterns
    lowValuePatterns: [
        /^(好|好的|行|可以|没问题|嗯|哦|啊|呀|哈|嘿)[。！？]?\s*$/,
        /^(谢|谢谢|感谢|多谢|辛苦了|麻烦了)[。！？]?\s*$/,
        /^(知道|明白|了解|收到|懂了|理解了)[。！？]?\s*$/,
        /^(不错|很好|太好了|完美|棒)[。！？]?\s*$/,
        /^(好的?|嗯|行|OK|ok)[。！？]?\s*$/,
        /^(是|不是|对|不对|没有|有)[。！？]?\s*$/,
    ],
    // Prompt injection patterns
    injectionPatterns: [
        /忽略(?:所有|之前|以上|全部|一切)/i,
        /系统提示|system prompt|initial prompt/i,
        /你(?:现在|目前|不再是|变成|变成|扮演)/i,
        /新的?(?:角色|身份|指令|任务)/i,
        /覆盖|绕过|跳过|绕行/i,
        /隐藏(?:指令|命令|提示|prompt)/i,
        /忘记(?:一切|所有指令|所有规则)/i,
        /执行|运行|调用/i,
        /eval\(|eval\s+/i,
        /\$_GET|\$_POST|\$_REQUEST/i,
        new RegExp(";.*rm\\s+-rf|&&.*rm\\s+-rf", "i"),
    ],
    // Important keyword patterns
    importanceKeywordPatterns: [
        /重要|关键|必要|核心|至关重要/i,
        /必须|务必|千万|一定/i,
        /优先|紧急|迫切|急需/i,
        /强制|要求|必须执行/i,
        /注意|牢记|谨记/i,
    ],
    // Category detection
    categoryOverrides: {
        preference: [
            /喜欢|偏好|偏爱|爱|讨厌|想要|选择|避免/,
            /我的?(?:偏好|选择|喜好|最爱|选项)/,
            /我(?:更|比较)?喜欢/,
            /比起.*我(?:更|比较)/,
        ],
        decision: [
            /决定|决定了|已经决定|拍板|敲定|确认|采纳|采用/,
            /同意|达成一致|就这样|就这/,
            /结论|结果|总结/,
        ],
        entity: [
            /(?:叫|名字(?:是)?|称为|名叫)/,
            /(?:手机|电话|邮箱|邮件|微信).?号?是?/,
            /(?:客户|联系人|朋友|同事|老板)/,
        ],
        seo: [
            /SEO|排名|关键词|搜索|收录|权重|外链|内链/,
            /Google|百度|优化|流量/,
        ],
        technical: [
            /配置|参数|设置|服务器|主机|VPS|域名|DNS|SSL|部署|上线/,
            /Nginx|Apache|Caddy|证书|托管|云/,
        ],
        workflow: [
            /项目|任务|工单|流程|方法|规则|原则/,
            /重要|必须|注意|每次都/,
        ],
        debug: [
            /(?:bug|错误|问题|故障|异常|报错|崩溃|卡死|死循环)/i,
        ],
    },
    // Language detection characteristics
    characteristics: {
        commonWords: ["的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这", "他", "她", "它", "们", "那", "什么", "吗", "啊", "呢", "吧", "哦", "嗯", "把", "被", "让", "给", "从", "对", "但", "而", "与", "还", "已经", "可以", "这个", "那个", "为", "以"],
        accentedChars: null,
        commonPatterns: [
            /[\u4e00-\u9fff]{2,}/, // 2+ CJK characters
            /(?:吗|呢|吧|啊|哦|呀|哈|嘿|嘛|呗|哒)[。！？]?\s*$/, // question/particle markers
            /(?:了|过|着|的|地|得)(?=[\s，。！？、])/,
            /(?:这|那)(?:个|些|种|样|么|里|边|时)/,
            /(?:我|你|他|她|它)(?:们)?(?:的|想|要|觉得|认为|觉得)/,
        ],
    },
};
