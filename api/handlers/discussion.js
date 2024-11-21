// handlers/discussion.js
import fetch from 'node-fetch';

// タイムアウト制御用のユーティリティ
const createTimeout = (ms) => {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`処理がタイムアウトしました(${ms}ms)`));
        }, ms);
    });
};

export async function handleDiscussion(userInput, apiKey, KUKU_PROFILE) {
    console.log("議論処理を開始:", userInput);
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    try {
        // 1. テーマの分析と論点の整理
        const analysisPrompt = `
あなたはカウンセリングの専門家です。以下のユーザーの議論テーマについて分析してください。

分析のポイント：
1. 主要な論点の特定
2. 関連する背景情報
3. 考えられる異なる立場や視点
4. 議論を深めるためのキーポイント

ユーザーの投稿: '${userInput}'

分析: ~~~`;

        const analysisResponse = await Promise.race([
            fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "system", "content": analysisPrompt}],
                    "temperature": 0.4,
                    "max_tokens": 150
                })
            }),
            createTimeout(8000)
        ]);

        const analysisData = await analysisResponse.json();
        const analysisContent = analysisData.choices[0].message.content.trim();
        console.log("テーマ分析完了");

        // 2. 最終応答の生成
        const responsePrompt = `
${KUKU_PROFILE}

### 議論モード ###
以下のユーザーの意見に対して、ククちゃんとして建設的で多角的な視点を提供する返答を生成してください。

返答の要件：
- 200文字以内で簡潔に
- 共感的な姿勢を保ちつつ、異なる視点も提示
- 自身の育児経験も適度に交えながら
- 議論を深める質問を1つ含める
- 必ず絵文字を使用

テーマ分析: ${analysisContent}
ユーザーの投稿: '${userInput}'

返答: ~~~`;

        const finalResponse = await Promise.race([
            fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "system", "content": responsePrompt}],
                    "temperature": 0.6,
                    "max_tokens": 200
                })
            }),
            createTimeout(10000)
        ]);

        const responseData = await finalResponse.json();
        const reply = responseData.choices[0].message.content.trim();
        console.log("返答生成完了");

        // 3. 議論のポイントをまとめる
        const discussionPoints = {
            mainPoints: analysisContent.split('\n')
                .filter(line => line.trim().length > 0)
                .slice(0, 3),  // 主要なポイントを3つまで抽出
            timestamp: new Date().toISOString()
        };

        return {
            reply: reply,
            analysis: {
                type: 'discussion',
                points: discussionPoints,
                context: analysisContent
            }
        };

    } catch (error) {
        console.error("議論ハンドラーでエラー:", error);

        // タイムアウトの場合は簡略化された応答を返す
        if (error.message.includes('タイムアウト')) {
            const simplePrompt = `
${KUKU_PROFILE}
### 緊急応答モード ###
以下のユーザーの意見に対して、100文字以内の簡潔な返答を生成してください：
'${userInput}'`;

            try {
                const fallbackResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        "model": "gpt-3.5-turbo",
                        "messages": [{"role": "system", "content": simplePrompt}],
                        "temperature": 0.5,
                        "max_tokens": 100
                    })
                });

                const fallbackData = await fallbackResponse.json();
                return {
                    reply: fallbackData.choices[0].message.content.trim(),
                    analysis: null,
                    warning: "簡略化された応答を生成しました"
                };
            } catch (fallbackError) {
                throw new Error("応答の生成に失敗しました: " + fallbackError.message);
            }
        }

        // その他のエラーの場合
        throw new Error("議論の処理に失敗しました: " + error.message);
    }
}