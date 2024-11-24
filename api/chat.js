import fetch from 'node-fetch';
import { saveResponseToFirebase, getResponseFromFirebase } from '../libs/firebase.js';

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
    console.log('OpenAI API呼び出し開始:', { prompt: prompt.substring(0, 50) + '...', userMessage });
    
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
        const errorData = await response.json();
        console.error('OpenAI APIエラー:', errorData);
        throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI API応答成功');
    return data.choices[0].message.content;
}

// バックグラウンド処理関数
async function processMessageAsync(userMessage, requestId, apiKey) {
    console.log('バックグラウンド処理開始:', { requestId, userMessage });
    
    try {
        // 処理開始状態を保存
        await saveResponseToFirebase(requestId, {
            status: 'processing',
            timestamp: new Date().toISOString()
        });

        // メッセージの分類
        console.log('メッセージの分類開始');
        const messageType = await callOpenAI(CLASSIFICATION_PROMPT, userMessage, apiKey);
        console.log('メッセージ分類結果:', messageType);

        // 分類に基づいてプロンプトを選択
        const selectedPrompt = messageType.trim().toLowerCase() === '相談' 
            ? CONSULTATION_PROMPT 
            : CHATTING_PROMPT;
        console.log('選択されたプロンプトタイプ:', messageType.trim().toLowerCase() === '相談' ? '相談' : '雑談');

        // 回答を生成
        console.log('回答の生成開始');
        const reply = await callOpenAI(selectedPrompt, userMessage, apiKey);
        console.log('回答の生成完了');

        // 結果を保存
        await saveResponseToFirebase(requestId, {
            status: 'completed',
            reply: reply,
            type: messageType,
            timestamp: new Date().toISOString()
        });
        console.log('処理完了:', { requestId });

    } catch (error) {
        console.error('バックグラウンド処理エラー:', error);
        // エラー状態を保存
        await saveResponseToFirebase(requestId, {
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// メインのAPIハンドラー
export default async function handler(req, res) {
    console.log('APIハンドラー呼び出し:', { method: req.method });

    if (req.method === 'POST') {
        const { userMessage } = req.body;
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error('OpenAI APIキーが設定されていません');
            return res.status(500).json({ error: 'サーバーの設定エラー: APIキーが設定されていません。' });
        }

        if (!userMessage) {
            console.error('メッセージが空です');
            return res.status(400).json({ error: 'メッセージが必要です' });
        }

        // リクエストIDを生成
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log('新規リクエスト作成:', { requestId, userMessage });

        try {
            // バックグラウンド処理を開始
            processMessageAsync(userMessage, requestId, apiKey).catch(error => {
                console.error('バックグラウンド処理中のエラー:', error);
            });

            // 即時レスポンス
            return res.status(202).json({
                status: 'processing',
                requestId: requestId,
                message: 'リクエストを受け付けました'
            });

        } catch (error) {
            console.error('POSTリクエスト処理エラー:', error);
            return res.status(500).json({ error: error.message });
        }

    } else if (req.method === 'GET') {
        const { requestId } = req.query;
        console.log('GETリクエスト:', { requestId });

        if (!requestId) {
            console.error('リクエストIDが指定されていません');
            return res.status(400).json({ error: 'リクエストIDが必要です' });
        }

        try {
            const response = await getResponseFromFirebase(requestId);
            console.log('Firebase応答:', { requestId, status: response?.status });
            
            if (!response) {
                return res.status(404).json({ 
                    error: 'リクエストが見つかりません',
                    requestId 
                });
            }

            switch (response.status) {
                case 'completed':
                    return res.status(200).json(response);
                case 'error':
                    return res.status(500).json({
                        error: 'AI応答の生成に失敗しました',
                        details: response.error,
                        requestId
                    });
                case 'processing':
                default:
                    return res.status(202).json({ 
                        status: 'processing',
                        message: '処理中です',
                        requestId
                    });
            }

        } catch (error) {
            console.error('GETリクエスト処理エラー:', error);
            return res.status(500).json({ 
                error: '結果の取得に失敗しました',
                details: error.message,
                requestId 
            });
        }
    }

    console.error('不正なメソッド:', req.method);
    return res.status(405).json({ 
        error: 'Method not allowed',
        allowedMethods: ['GET', 'POST']
    });
}