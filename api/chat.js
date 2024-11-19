import fetch from 'node-fetch';

export default async (req, res) => {
    console.log('Request body:', req.body);

    const { userMessage, questionId } = req.body;
    
    // ウミガメのスープ用のプロンプトを設定
    const prompts = {
        3: `あなたはAIウミガメのスープというゲームのホストです。
            プレイヤーから質問を受け付け、「はい」「いいえ」「それは関係ありません」のいずれかで答えてください。
            プレイヤーが答えを宣言したら、正解かどうかを判定してください。
            秘密の答え: カラスです。`
    };

    const systemPrompt = prompts[questionId] || 'Default prompt.';
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEY is not set');
        return res.status(500).json({ error: 'サーバーの設定エラー: APIキーが設定されていません。' });
    }

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI error details:', errorData);
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('OpenAI response:', data);
        res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error('Error communicating with OpenAI:', error);
        res.status(500).json({ 
            error: 'AIからの応答の取得に失敗しました',
            details: error.message 
        });
    }
};