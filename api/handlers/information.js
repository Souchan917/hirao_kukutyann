// handlers/information.js
import fetch from 'node-fetch';

// タイムアウト制御用のユーティリティ
const createTimeout = (ms) => {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`処理がタイムアウトしました(${ms}ms)`));
        }, ms);
    });
};

// OpenAI APIリクエスト用の共通関数
async function makeOpenAIRequest(prompt, apiKey, temperature = 0.5, maxTokens = 150) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: prompt }],
            temperature: temperature,
            max_tokens: maxTokens
        })
    });

    if (!response.ok) {
        throw new Error(`APIエラー: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

export async function handleInformation(userInput, apiKey, KUKU_PROFILE) {
    console.log("情報提供処理を開始:", userInput);

    try {
        // 1. 情報ニーズの分析
        const analysisPrompt = `
あなたは子育ての専門家です。以下のユーザーの質問から、必要とされている情報を分析してください。

分析ポイント：
1. 求められている主な情報
2. 関連する背景知識
3. 年齢や発達段階との関連性
4. 考慮すべき注意点

ユーザーの質問: '${userInput}'

分析: ~~~`;

        const analysisContent = await Promise.race([
            makeOpenAIRequest(analysisPrompt, apiKey, 0.4),
            createTimeout(8000)
        ]);

        console.log("情報ニーズの分析完了");

        // 2. 情報の構造化
        const structurePrompt = `
以下の質問と分析に基づいて、提供すべき情報を3つのポイントに整理してください：

ユーザーの質問: '${userInput}'
分析内容: ${analysisContent}

重要ポイント（箇条書きで）: ~~~`;

        const structuredPoints = await Promise.race([
            makeOpenAIRequest(structurePrompt, apiKey, 0.3, 100),
            createTimeout(5000)
        ]);

        console.log("情報の構造化完了");

        // 3. 最終応答の生成
        const responsePrompt = `
${KUKU_PROFILE}

### 情報提供モード ###
以下の質問に対して、ククちゃんとして分かりやすく情報を提供してください。

応答の要件：
- 200文字以内で簡潔に
- 専門用語は避けて平易な言葉で説明
- 実体験や具体例を含める
- 重要なポイントは強調
- 必ず絵文字を使用
- 情報の出所に言及（「私の経験では」「一般的には」など）

ユーザーの質問: '${userInput}'
分析内容: ${analysisContent}
重要ポイント: ${structuredPoints}

返答: ~~~`;

        const reply = await Promise.race([
            makeOpenAIRequest(responsePrompt, apiKey, 0.6, 200),
            createTimeout(10000)
        ]);

        console.log("最終応答の生成完了");

        // 4. 補足情報の生成
        const supplementPrompt = `
以下の内容に関連する補足情報やアドバイスを1-2個提案してください：

質問: '${userInput}'
返答: ${reply}

補足情報: ~~~`;

        const supplementInfo = await Promise.race([
            makeOpenAIRequest(supplementPrompt, apiKey, 0.5, 100),
            createTimeout(5000)
        ]).catch(() => null); // 補足情報の生成は任意

        // 5. 構造化された返答の作成
        return {
            reply: reply,
            analysis: {
                type: 'information',
                mainPoints: structuredPoints.split('\n')
                    .filter(point => point.trim().length > 0)
                    .map(point => point.replace(/^[•-]\s*/, '')), // 箇条書きの記号を削除
                context: analysisContent,
                supplement: supplementInfo,
                tags: extractKeywords(analysisContent) // キーワードの抽出
            },
            metadata: {
                timestamp: new Date().toISOString(),
                confidence: 'high' // 情報の確実性
            }
        };

    } catch (error) {
        console.error("情報提供処理でエラー:", error);

        // タイムアウトの場合は簡略化された応答を生成
        if (error.message.includes('タイムアウト')) {
            const simplePrompt = `
${KUKU_PROFILE}
### 緊急応答モード ###
以下の質問に対して、最も重要な情報のみを100文字以内で提供してください：
'${userInput}'`;

            try {
                const fallbackResponse = await makeOpenAIRequest(simplePrompt, apiKey, 0.5, 100);
                return {
                    reply: fallbackResponse,
                    analysis: {
                        type: 'information',
                        mainPoints: ['簡略化された応答を生成しました'],
                        context: null,
                        supplement: null
                    },
                    metadata: {
                        timestamp: new Date().toISOString(),
                        confidence: 'limited'
                    }
                };
            } catch (fallbackError) {
                throw new Error("応答の生成に失敗しました: " + fallbackError.message);
            }
        }

        throw new Error("情報提供の処理に失敗しました: " + error.message);
    }
}

// キーワード抽出用のユーティリティ関数
function extractKeywords(text) {
    // 簡単なキーワード抽出ロジック
    const keywords = text.split(/[,.\s]/)
        .map(word => word.trim())
        .filter(word => word.length > 1)
        .filter(word => !['です', 'ます', 'した', 'など', 'による', 'および'].includes(word));
    
    // 重複を削除して上位5個を返す
    return [...new Set(keywords)].slice(0, 5);
}