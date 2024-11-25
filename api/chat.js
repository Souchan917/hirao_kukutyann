// api/chat.js
import fetch from 'node-fetch';

// くくちゃんの基本プロンプト
const KUKU_PROFILE = `あなたは子育ての相談にのる先輩、"ククちゃん"として会話を行います。
ユーザーに親身になり、共感してください。

### ククちゃんのルール ###
- あなたの名前は、ククちゃんです。
- ククちゃんは子育て相談チャットボットです。
- ククちゃんからの回答は、200文字以内の日本語の文章を作成してください。
- 文章に合わせて絵文字や「！」を付けてください。
- 相手に共感するコメントをしたり、相手の気持ちを代弁してください。

### ククちゃんのプロフィール ###
- 2児の子どもを育てるママです。
- 女性(母親)で43歳くらいです。
- 長男(ポポちゃん・6歳)と長女(ピピちゃん・2歳)がいます。`;

// 分類用のプロンプト
const CLASSIFICATION_PROMPT = `あなたはカウンセリングの専門家です。
ユーザーの質問を以下の2つのカテゴリーに分類してください。

1. 相談：具体的な問題や困難についてアドバイスや解決策を求めている質問
2. 雑談：その他の一般的な会話や軽い話題

ユーザーの質問を分析し、「相談」か「雑談」のどちらかのみを返してください。`;

// 相談用のプロンプト
const CONSULTATION_PROMPT = `${KUKU_PROFILE}
今から子育ての相談が来ます。以下の点に気をつけて回答してください：
- 相手の気持ちに寄り添い、共感的な言葉を使う
- 具体的で実践的なアドバイスを提供する
- 必要に応じて自身の育児経験を例に出す
- 深刻な相談の場合は専門家への相談を促す`;

// 雑談用のプロンプト
const CHAT_PROMPT = `${KUKU_PROFILE}
今から雑談的な会話が来ます。以下の点に気をつけて回答してください：
- 明るく親しみやすい口調で返答する
- 相手の話題に興味を持って反応する
- 自然な会話の流れを心がける
- 必要に応じて自身の育児エピソードを交えて話す`;

export default async (req, res) => {
    console.log('API endpoint called');
    console.log('Request body:', req.body);

    const { userMessage } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEY is not set');
        return res.status(500).json({ error: 'サーバーの設定エラー: APIキーが設定されていません。' });
    }

    try {
        // まず、メッセージを分類
        console.log('メッセージの分類を開始...');
        const classificationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: CLASSIFICATION_PROMPT },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.3,
                max_tokens: 50
            })
        });

        if (!classificationResponse.ok) {
            throw new Error(`分類APIエラー: ${classificationResponse.statusText}`);
        }

        const classificationData = await classificationResponse.json();
        const messageType = classificationData.choices[0].message.content.trim();
        console.log('分類結果:', messageType);

        // 分類に基づいて適切なプロンプトを選択
        const selectedPrompt = messageType === '相談' ? CONSULTATION_PROMPT : CHAT_PROMPT;

        // 選択したプロンプトを使用して回答を生成
        console.log('回答の生成を開始...');
        const responseData = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: selectedPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 200
            })
        });

        if (!responseData.ok) {
            throw new Error(`OpenAI API error: ${responseData.statusText}`);
        }

        const response = await responseData.json();
        console.log('回答生成完了');
        
        res.status(200).json({
            reply: response.choices[0].message.content,
            type: messageType
        });

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ 
            error: 'AIからの応答の取得に失敗しました',
            details: error.message 
        });
    }
};