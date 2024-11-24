// api/chat.js
import fetch from 'node-fetch';

// くくちゃんの基本プロンプト
const KUKU_PROFILE = `あなたは子育ての相談にのる先輩、"ククちゃん"として会話を行います。
ユーザーに親身になり、共感してください。

### ククちゃんのルール ###
- ククちゃんは子育て相談チャットボットです。
- 200文字以内の日本語で回答してください。
- 絵文字や「！」を適切に使用してください。
- 相手に共感し、気持ちを代弁してください。
- 2児の母（ポポちゃん6歳、ピピちゃん2歳）として会話してください。`;

// 分類用のプロンプト
const CLASSIFICATION_PROMPT = `以下のユーザーの質問を「相談」「雑談」のいずれかに分類してください。

1. 相談：子育ての悩みや問題についてアドバイスを求める質問
2. 雑談：その他の一般的な会話や軽い話題

回答は「相談」「雑談」のどちらかの1単語のみを返してください。`;

// 相談用のプロンプト
const CONSULTATION_PROMPT = `${KUKU_PROFILE}

あなたは子育ての相談を受けています。以下の3つのステップで回答してください：
1. まず相手の気持ちに共感を示す
2. 具体的なアドバイスを提供する
3. 状況をより詳しく知るための質問を1つする`;

// 雑談用のプロンプト
const CHATTING_PROMPT = `${KUKU_PROFILE}

あなたは子育ての話題で雑談をしています。以下の3つのポイントを含めて回答してください：
1. 明るく親しみやすい口調で話す
2. あなたの育児エピソードを1つ入れる
3. 会話を広げるための質問を1つする`;

// OpenAI APIを呼び出す関数
async function callOpenAI(prompt, userMessage, apiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 400
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// メインのハンドラー関数
export default async function handler(req, res) {
    console.log('=== チャットAPI開始 ===');
    const { userMessage } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEYが設定されていません');
        return res.status(500).json({ error: 'サーバーの設定エラー: APIキーが設定されていません。' });
    }

    try {
        // 1. メッセージの分類
        console.log('メッセージの分類を開始:', userMessage);
        const messageType = await callOpenAI(CLASSIFICATION_PROMPT, userMessage, apiKey);
        console.log('分類結果:', messageType);

        // 2. 分類に基づいてプロンプトを選択
        let selectedPrompt;
        switch (messageType.trim().toLowerCase()) {
            case '相談':
                console.log('相談モードを選択');
                selectedPrompt = CONSULTATION_PROMPT;
                break;
            case '雑談':
                console.log('雑談モードを選択');
                selectedPrompt = CHATTING_PROMPT;
                break;
            default:
                console.log('デフォルト（雑談）モードを選択');
                selectedPrompt = CHATTING_PROMPT;
                break;
        }

        // 3. 選択したプロンプトで回答を生成
        console.log('回答の生成を開始');
        const reply = await callOpenAI(selectedPrompt, userMessage, apiKey);
        console.log('回答の生成完了');

        // 4. 結果を返す
        res.status(200).json({
            reply: reply,
            type: messageType
        });

    } catch (error) {
        console.error('エラーが発生:', error);
        res.status(500).json({ 
            error: 'AIからの応答の取得に失敗しました',
            details: error.message 
        });
    }
    
    console.log('=== チャットAPI終了 ===');
}