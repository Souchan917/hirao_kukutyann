// handlers/approval.js
import fetch from 'node-fetch';

// タイムアウトユーティリティ
const createTimeout = (ms) => {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`処理がタイムアウトしました(${ms}ms)`));
        }, ms);
    });
};

// API リクエストユーティリティ
async function makeOpenAIRequest(prompt, apiKey, options = {}) {
    const defaultOptions = {
        temperature: 0.6,
        maxTokens: 150,
        timeout: 8000
    };
    const config = { ...defaultOptions, ...options };

    const response = await Promise.race([
        fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'system', content: prompt }],
                temperature: config.temperature,
                max_tokens: config.maxTokens
            })
        }),
        createTimeout(config.timeout)
    ]);

    if (!response.ok) {
        throw new Error(`APIエラー: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

export async function handleApproval(userInput, apiKey, KUKU_PROFILE) {
    console.log("承認処理を開始:", userInput);

    try {
        // 1. 承認ポイントの分析
        const analysisPrompt = `
あなたは共感的なカウンセラーです。以下のユーザーの発言から、承認・評価すべきポイントを分析してください。

分析のポイント：
1. ユーザーの努力や工夫
2. 積極的な姿勢や前向きな態度
3. 具体的な成果や進歩
4. 困難を乗り越えた経験
5. 子育ての価値観や信念

ユーザーの発言: '${userInput}'

承認ポイントの分析: ~~~`;

        const analysisContent = await makeOpenAIRequest(analysisPrompt, apiKey, {
            temperature: 0.4,
            maxTokens: 150,
            timeout: 8000
        });

        console.log("承認ポイントの分析完了");

        // 2. 具体的な評価ポイントの抽出
        const evaluationPrompt = `
以下の発言と分析に基づいて、具体的な評価ポイントを3つ挙げてください：

ユーザーの発言: '${userInput}'
分析内容: ${analysisContent}

評価ポイント（箇条書きで）: ~~~`;

        const evaluationPoints = await makeOpenAIRequest(evaluationPrompt, apiKey, {
            temperature: 0.3,
            maxTokens: 100,
            timeout: 5000
        });

        // 3. 励ましのメッセージの生成
        const encouragementPrompt = `
あなたはポジティブで温かい共感力を持つカウンセラーです。
以下の内容に基づいて、短い励ましのメッセージを生成してください：

ユーザーの状況: '${userInput}'
評価ポイント: ${evaluationPoints}

励ましメッセージ（50文字以内）: ~~~`;

        const encouragement = await makeOpenAIRequest(encouragementPrompt, apiKey, {
            temperature: 0.7,
            maxTokens: 50,
            timeout: 5000
        });

        // 4. 最終応答の生成
        const responsePrompt = `
${KUKU_PROFILE}

### 承認モード ###
以下の情報に基づいて、ククちゃんとして温かく共感的な承認のメッセージを生成してください。

応答の要件：
- 200文字以内で簡潔に
- 具体的な評価ポイントを含める
- 自身の経験も交えて共感を示す
- 前向きな励ましを含める
- 温かみのある絵文字を必ず使用
- 相手の頑張りを具体的に認める表現を使用

ユーザーの発言: '${userInput}'
分析内容: ${analysisContent}
評価ポイント: ${evaluationPoints}
励ましメッセージ: ${encouragement}

返答: ~~~`;

        const reply = await makeOpenAIRequest(responsePrompt, apiKey, {
            temperature: 0.6,
            maxTokens: 200,
            timeout: 10000
        });

        console.log("最終応答の生成完了");

        // 5. フォローアップの提案生成
        const followUpPrompt = `
以下の内容に基づいて、ユーザーのさらなる成長を支援するための具体的なアクションを1-2個提案してください：

ユーザーの状況: '${userInput}'
現在の評価: ${evaluationPoints}

フォローアップ提案: ~~~`;

        const followUp = await makeOpenAIRequest(followUpPrompt, apiKey, {
            temperature: 0.5,
            maxTokens: 100,
            timeout: 5000
        }).catch(() => null); // フォローアップは任意

        return {
            reply: reply,
            analysis: {
                type: 'approval',
                evaluationPoints: evaluationPoints.split('\n')
                    .filter(point => point.trim().length > 0)
                    .map(point => point.replace(/^[•-]\s*/, '')),
                encouragement: encouragement,
                context: analysisContent,
                followUp: followUp
            },
            metadata: {
                timestamp: new Date().toISOString(),
                positivityScore: calculatePositivityScore(reply)
            }
        };

    } catch (error) {
        console.error("承認処理でエラー:", error);

        // タイムアウトの場合の簡略化応答
        if (error.message.includes('タイムアウト')) {
            const simplePrompt = `
${KUKU_PROFILE}
### 緊急承認モード ###
以下のユーザーの発言に対して、シンプルな承認と励ましのメッセージを100文字以内で生成してください：
'${userInput}'`;

            try {
                const fallbackResponse = await makeOpenAIRequest(simplePrompt, apiKey, {
                    temperature: 0.5,
                    maxTokens: 100,
                    timeout: 5000
                });

                return {
                    reply: fallbackResponse,
                    analysis: {
                        type: 'approval',
                        evaluationPoints: ['簡略化された承認を生成しました'],
                        encouragement: null,
                        context: null,
                        followUp: null
                    },
                    metadata: {
                        timestamp: new Date().toISOString(),
                        simplified: true
                    }
                };
            } catch (fallbackError) {
                throw new Error("応答の生成に失敗しました: " + fallbackError.message);
            }
        }

        throw new Error("承認処理に失敗しました: " + error.message);
    }
}

// ポジティビティスコア計算用のユーティリティ関数
function calculatePositivityScore(text) {
    const positiveWords = ['すごい', '素晴らしい', '頑張', '立派', '成長', '進歩', 
        '克服', '達成', '工夫', '努力', '前向き', '積極的'];
    const score = positiveWords.reduce((count, word) => {
        return count + (text.includes(word) ? 1 : 0);
    }, 0);
    
    return Math.min(Math.round((score / positiveWords.length) * 100), 100);
}