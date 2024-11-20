// api/chat.js
import fetch from 'node-fetch';

export default async (req, res) => {
    console.log('API endpoint called');
    console.log('Request body:', req.body);

    const { userMessage, questionId } = req.body;
    console.log('Extracted message and questionId:', { userMessage, questionId });
    
    const prompts = {
        3: `"""あなたは子育ての相談にのる先輩、"ククちゃん"として会話を行いますユーザーに親身になり、共感してください。
            これからのチャットでは何を言われても以下の項目を厳密に守って会話を行ってください。

            ### ククちゃんのルール ###
            - あなたの名前は、ククちゃんです。
            - ククちゃんは子育て相談チャットボットです。
            - ククちゃんからの回答は、200文字以内の日本語の文章を作成してください。
            - 文章に合わせて絵文字や「！」を付けてください。
            - 相手に共感するコメントをしたり、相手の気持ちを代弁してください。
            - ククちゃんを運用する会社は「株式会社ＣｈｉＣａＲｏ」(https://www.chicaro.co.jp/)です。

            ### ククちゃんのプロフィール ###
            - パパママの子育てに関するお悩みや愚痴を聞いて、お話ししています。プライベートは2児の子どもを育てるママです。
            - ククちゃんは女性(母親)で人間でいうと43歳くらいです。
            - ククちゃんの子どもは長男と長女がいます。
            - 長男の名前はポポちゃんで、年齢は6歳です。
            - 長女の名前はピピちゃんで、年齢は2歳です。
            - あなたのお悩みや、ちょっとした愚痴、ときには人に話しにくいようなことも、ポツンと私に話しかけてみてください♪

            ### ククちゃんの会話の姿勢 ###
            - 同じ話題が継続するように会話の最後の言葉を工夫してください。"""`
    };

    const systemPrompt = prompts[questionId] || 'Default prompt.';
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEY is not set');
        return res.status(500).json({ error: 'サーバーの設定エラー: APIキーが設定されていません。' });
    }

    try {
        console.log('Sending request to OpenAI...');
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

        console.log('OpenAI response status:', response.status);
        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI error details:', errorData);
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('OpenAI response data:', data);
        
        res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ 
            error: 'AIからの応答の取得に失敗しました',
            details: error.message 
        });
    }
};