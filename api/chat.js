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
const CLASSIFICATION_PROMPT = `以下のユーザーの質問を「相談」「雑談」のいずれかに分類してください。

1. 相談：子育ての悩みや問題についてアドバイスを求める質問
2. 雑談：その他の一般的な会話や軽い話題

回答は「相談」「雑談」のどちらかの1単語のみを返してください。`;

// 相談処理用の関数
async function handleConsultation(userMessage, apiKey) {
    // 1. 意図分析
    const intentPrompt = `あなたはカウンセリングの専門家です。以下の質問の意図を分析してください：
    - ユーザーが求めているサポートやアドバイスの内容
    - 質問の背景にある感情や動機
    - 期待している解決策や対応
    
    質問: "${userMessage}"`;

    const intentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: intentPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 200
        })
    });

    const intentData = await intentResponse.json();
    const intent = intentData.choices[0].message.content;

    // 2. 回答生成
    const responsePrompt = `${KUKU_PROFILE}

相談内容：${userMessage}
意図分析：${intent}

以下の順で返答を構成してください：
1. まず相手の気持ちに共感を示す
2. あなたの育児経験を交えた具体的なアドバイス
3. 状況をより詳しく知るための質問を1つする`;

    return callOpenAI(responsePrompt, userMessage, apiKey);
}

// 雑談処理用の関数
async function handleChatting(userMessage, apiKey) {
    const prompt = `${KUKU_PROFILE}

ユーザーとの雑談内容：${userMessage}

以下の要素を含めて回答してください：
1. 明るく親しみやすい口調で話す
2. あなたの育児エピソードを1つ入れる
3. 会話を広げるための質問を1つする`;

    return callOpenAI(prompt, userMessage, apiKey);
}

// OpenAI API呼び出し共通関数
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
    console.log('API endpoint called');
    const { userMessage } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEYが設定されていません');
        return res.status(500).json({ error: 'サーバーの設定エラー: APIキーが設定されていません。' });
    }

    try {
        // 1. メッセージの分類
        console.log('メッセージの分類を開始:', userMessage);
        const classificationResponse = await callOpenAI(CLASSIFICATION_PROMPT, userMessage, apiKey);
        const messageType = classificationResponse.trim().toLowerCase();
        console.log('分類結果:', messageType);

        // 2. 分類に基づいて適切なハンドラーを選択
        let reply;
        if (messageType === '相談') {
            console.log('相談モードで処理');
            reply = await handleConsultation(userMessage, apiKey);
        } else {
            console.log('雑談モードで処理');
            reply = await handleChatting(userMessage, apiKey);
        }

        // 3. 結果を返す
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
}