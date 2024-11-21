// handlers/chatting.js
import fetch from 'node-fetch';

// OpenAI APIリクエストを最適化して実行する関数
async function makeOpenAIRequest(messages, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: messages,
            temperature: 0.7,
            max_tokens: 200,
            presence_penalty: 0.6,
            frequency_penalty: 0.5
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

export async function handleChatting(userMessage, apiKey, KUKU_PROFILE) {
    console.log('チャット処理開始:', userMessage);
    
    try {
        // 1. 直接応答を生成（処理を単純化）
        const messages = [
            {
                role: 'system',
                content: `${KUKU_PROFILE}\n\n以下のユーザーメッセージに対して、ククちゃんとして返答してください。
                返答は200文字以内で、共感的で親しみやすい表現を使用し、絵文字を適切に入れてください。`
            },
            {
                role: 'user',
                content: userMessage
            }
        ];

        const reply = await makeOpenAIRequest(messages, apiKey);
        console.log('応答生成完了');

        // 成功レスポンスを返す
        return {
            reply: reply,
            analysis: null
        };

    } catch (error) {
        console.error('チャット処理エラー:', error);
        
        // エラー時のフォールバック応答
        return {
            reply: 'ごめんなさい、うまくお返事できませんでした。もう一度お話を聞かせていただけますか？ 💦',
            error: error.message
        };
    }
}