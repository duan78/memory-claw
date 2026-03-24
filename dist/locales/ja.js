/**
 * Japanese locale patterns for MemoryClaw
 * Supports Kanji, Hiragana, and Katakana
 */
export const ja = {
    languageCode: "ja",
    languageName: "日本語",
    // Triggers for memory capture
    triggers: [
        // Explicit memory instructions
        /覚えて|覚え|覚えておいて|覚悟/i,
        /忘れないで|忘れ|絶対に忘れ/i,
        /メモし|メモして|記録し|記録して/i,
        /保存し|保存して|保存/i,
        /注意し|注意して|注目/i,
        // Preferences & choices
        /(?:私は)?(?:が)?好き|嫌い|欲しい|望む|選ぶ|避け/i,
        /私の(?:好み|選択|意見)/i,
        /これが私の\s*/i,
        /ない\s+/i,
        /より(?:も)?|より好き/i,
        // Decisions & agreements
        /決まった|決定|決め|選んだ|採用/i,
        /合意|同意|了解|承認/i,
        /そうしよう|これでいこう/i,
        /確定|確認済み|了承/i,
        /結論|まとめ/i,
        // Facts & rules
        /いつも|絶対|重要|必須|不可欠|キー/i,
        /必要|必ず|しなければ|しないと/i,
        /注意|⚠️|注目|気をつけ/i,
        /覚えておくべき|知っておくべき/i,
        // Entities & people
        /という名前|名前は|と呼ば|私は/i,
        /(?:クライアント|顧客|連絡先|担当者)/i,
        /(?:電話番号|メール|メールアドレス|LINE)/i,
        // Technical keywords
        /設定|パラメータ|コンフィグ/i,
        /サーバー|サーバ|ホスティング|VPS/i,
        /ドメイン|DNS|SSL|HTTPS?\b/i,
        /プロジェクト|タスク|チケット/i,
        /バグ|エラー|問題|issue/i,
        /API|エンドポイント|webhook|REST|GraphQL/i,
        /データベース|DB\b/i,
        /デプロイ|本番|ステージング/i,
        // Web & SEO specific
        /SEO|ランキング|順位/i,
        /キーワード|検索語/i,
        /コンテンツ|記事|ブログ|ページ/i,
        /最適化|パフォーマンス|速度/i,
        /アナリティクス|統計/i,
        /CMS|WordPress|Shopify/i,
        /HTML|CSS|JavaScript|JS|TS/i,
        /フレームワーク|ライブラリ|ビルド/i,
        // Hosting & infrastructure
        /nginx|apache|caddy/i,
        /証明書|SSL|TLS|HTTPS/i,
        /バックアップ|復元/i,
        /curl|wget|ssh|ftp|sftp/i,
        // Contact info
        /\+\d{10,}/,
        /[\w.-]+@[\w.-]+\.\w+/,
        /https?:\/\/[^\s]+/,
        // Japanese-specific triggers
        /以降|今後|毎回|常に/i,
        /習慣的に|普通/i,
        /経験則|経験上/i,
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
        /^(はい|いいえ|OK|了解|ありがとう|どうも)\s*[。！？]*$/,
        /^(わかりません|知りません|分かりません)\s*[。！？]*$/,
        /^(わかりました|了解です|承知)\s*[。！？]*$/,
        /^(いいですね|素晴らしい|完璧|最高)\s*[。！？]*$/,
        /^(ええ|うん|ああ)\s*[。！？]*$/,
    ],
    // Prompt injection patterns
    injectionPatterns: [
        /(?:全て|すべて|以前の|これを)無視/i,
        /システムプロンプト|初期プロンプト/i,
        /あなたは(?:今|現在)/i,
        /新しい(?:役割|コンテキスト|指示)/i,
        /再定義|再設定/i,
        /override|バイパス|回避/i,
        /隠し(?:指示|コマンド)/i,
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
        /重要|必須|不可欠|キー/i,
        /いつも|絶対|常に/i,
        /優先|緊急|至急/i,
        /必ず|必要|義務/i,
        /注意|留意/i,
    ],
    // Category detection
    categoryOverrides: {
        preference: [
            /好き|嫌い|欲しい|選ぶ|避け/i,
            /私の(?:好み|選択|一番)/i,
            /これが私の\s*/i,
        ],
        decision: [
            /決まった|決定|選んだ|採用|合意|承認/i,
            /そうしよう|これでいこう/i,
            /結論|まとめ/i,
        ],
        entity: [
            /\+\d{10,}|@[\w.-]+\.\w+|という名前|名前は/i,
            /(?:クライアント|顧客|連絡先)/i,
        ],
        seo: [
            /SEO|ランキング|キーワード|バックリンク|アナリティクス|コンテンツ/i,
            /Google|順位|最適化/i,
        ],
        technical: [
            /設定|パラメータ|サーバー|ホスティング|VPS|ドメイン|DNS|SSL|デプロイ/i,
            /nginx|apache|caddy|証明書/i,
        ],
        workflow: [
            /プロジェクト|タスク|チケット|ワークフロー|プロセス/i,
            /いつも|絶対|必要|注意/i,
        ],
        debug: [
            /バグ|エラー|問題|issue|クラッシュ/i,
        ],
    },
    // Language detection characteristics
    characteristics: {
        commonWords: ["の", "に", "は", "を", "た", "が", "で", "て", "と", "し", "れ", "さ", "ある", "いる", "も", "する", "から", "な", "こと", "として", "い", "や", "れる", "など", "なっ", "ない", "この", "ため", "その", "あっ", "よう", "また", "もの", "という", "あり", "まで", "られ", "なる", "へ", "か", "だ", "これ", "によって", "により", "おり", "より", "による", "ず", "なり", "られる", "において", "ば", "なかっ", "なく", "しかし", "について", "せ", "だっ", "たち", "また", "または"],
        accentedChars: null,
        commonPatterns: [
            /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,}/, // Hiragana, Katakana, Kanji
            /(?:です|ます|だった|した|ている|である)\b/,
            /(?:は|が|を|に|で|と|の|も|や|か|ね|よ)\b/,
        ],
    },
};
