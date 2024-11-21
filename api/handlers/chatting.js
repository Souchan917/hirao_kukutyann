// handlers/chatting.js
import fetch from 'node-fetch';

// タイムアウト用のユーティリティ関数
const createTimeout = (ms) => {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`処理がタイムアウトしました(${ms}ms)`));
        }, ms);
    });
};

// OpenAI APIリクエストを行う関数
async function makeOpenAIRequest(prompt, apiKey) {
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
                temperature: 0.7,
                max_tokens: 200
            })
        }),
        createTimeout(15000) // 15秒でタイムアウト
    ]);

    if (!response.ok) {
        throw new Error(`APIエラー: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

export async function handleChatting(userMessage, apiKey, KUKU_PROFILE) {
    console.log('雑談処理を開始:', userMessage);

    try {
        // 追加質問の分析用プロンプト
        const followUpPrompt = `
あなたはカウンセリングの専門家です。以下のユーザーの質問に含まれている意図を詳細に分析してください。
ユーザーの質問に対して不足している環境や行動に関する情報を特定し、以下の点を踏まえつつ重要と判断される追加質問を2~3個提案してください。

質問の背景理解：質問の主な内容と関連する問題点を把握します。
不足情報の特定：環境要因、行動パターン、観測可能な変数など、欠けている重要情報を特定します。

ユーザーの質問: '${userMessage}'

追加質問の提案: ~~~`;

        // 追加質問の生成
        const followUpContent = await makeOpenAIRequest(followUpPrompt, apiKey);
        console.log('追加質問生成完了:', followUpContent);

        // ククちゃんの返答生成用プロンプト
        const responsePrompt = `
${KUKU_PROFILE}

ククちゃんとして、以下の情報をもとにユーザーへの共感的で支援的な返答をわかりやすく簡潔に生成してください。
また、話を広げるような会話を必ず心がけてください。

ユーザーの質問: '${userMessage}'
追加の質問提案: ${followUpContent}

ユーザーへの返答: ~~~`;

        // 最終返答の生成
        const finalResponse = await makeOpenAIRequest(responsePrompt, apiKey);
        console.log('最終返答生成完了');

        return {
            reply: finalResponse,
            analysis: {
                suggestedQuestions: followUpContent
            }
        };

    } catch (error) {
        console.error('雑談処理でエラー:', error);
        
        if (error.message.includes('タイムアウト')) {
            throw new Error('ククちゃんの返答生成に時間がかかりすぎています。');
        }
        
        // エラー時のフォールバック応答
        return {
            reply: 'ごめんなさい、うまく返答できませんでした。もう一度お話を聞かせていただけますか？ 💦',
            error: error.message
        };
    }
}