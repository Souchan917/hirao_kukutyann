// chat.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
    // 環境変数のチェック
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('OpenAI API key is not configured');
        return res.status(500).json({ 
            error: 'サーバーの設定が不完全です。管理者に連絡してください。',
            details: 'OpenAI API key is not configured'
        });
    }

    const { userMessage, questionId } = req.body;

    // 入力値の検証
    if (!userMessage || typeof userMessage !== 'string') {
        return res.status(400).json({ error: '無効なメッセージです' });
    }

    const prompts = {
        3: `あなたはAIウミガメのスープというゲームのホストです。
            プレイヤーから質問を受け付け、「はい」「いいえ」「それは関係ありません」のいずれかで答えてください。
            プレイヤーが動物の名前を当てようとしたら、正解かどうかを判定してください。
            ゲームのルール:
            1. プレイヤーは質問をして、動物の名前を当てる
            2. 質問には「はい」「いいえ」「それは関係ありません」でのみ答える
            3. プレイヤーが答えを宣言したら、正解かどうかを判定する`
    };

    const prompt = prompts[questionId];
    if (!prompt) {
        return res.status(400).json({ error: '無効な質問IDです' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: prompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API error:', error);
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'AIからの応答の取得に失敗しました',
            details: error.message 
        });
    }
}