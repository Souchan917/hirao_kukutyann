// api/chat.js
import fetch from 'node-fetch';
import { saveResponseToFirebase, getResponseFromFirebase } from '../libs/firebase.js';
import { 
    handleConsultation,
    handleComplaint,
    handleInformation,
    handleApproval,
    handleDiscussion,
    handleChatting
} from './handlers/index.js';

// ククちゃんの基本プロンプト
const KUKU_PROFILE = `あなたは子育ての相談にのる先輩、"ククちゃん"として会話を行いますユーザーに親身になり、共感してください。
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
- あなたのお悩みや、ちょっとした愚痴、ときには人に話しにくいようなことも、ポツンと私に話しかけてみてください♪`;

// 分類用のプロンプト
const CLASSIFICATION_PROMPT = `あなたはカウンセリングの専門家です。以下のユーザーの質問を「相談」「情報」「愚痴」「承認」「議論」「雑談」のいずれかに分類してください。

各分類の説明は次の通りです：
1. 相談：ユーザーが具体的な問題や困難についてアドバイスや解決策を求めている質問。
2. 情報：ユーザーが具体的な情報、知識、事例を求めている質問。
3. 愚痴：ユーザーがストレスや不満を発散するための質問。
4. 承認：ユーザーが自身の考えや意見を認めてほしい、受け入れてほしいという質問。
5. 議論：ユーザーが特定のテーマについての意見交換や討論を求めている質問。
6. 雑談：ユーザーが気軽な話題や軽い会話を楽しむための質問。

ユーザーの質問を分析し、最も適切な分類を一つだけ返してください。返答は分類名のみにしてください。`;

// タイムアウト制御用のユーティリティ
const createTimeout = (ms) => {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`処理がタイムアウトしました(${ms}ms)`));
        }, ms);
    });
};

// メッセージを分類する関数
async function classifyMessage(message, apiKey) {
    console.log('メッセージの分類を開始:', message);
    
    try {
        const response = await Promise.race([
            fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: CLASSIFICATION_PROMPT },
                        { role: 'user', content: message }
                    ],
                    temperature: 0.3,
                    max_tokens: 50
                })
            }),
            createTimeout(8000)
        ]);

        if (!response.ok) {
            throw new Error(`分類APIエラー: ${response.statusText}`);
        }

        const data = await response.json();
        const classification = data.choices[0].message.content.trim();
        console.log('分類結果:', classification);
        return classification;
    } catch (error) {
        console.error('分類エラー:', error);
        if (error.message.includes('タイムアウト')) {
            console.warn('分類処理がタイムアウトしました。デフォルト(雑談)を使用します。');
            return '雑談';
        }
        throw error;
    }
}

// バックグラウンド処理関数
async function processMessageAsync(userMessage, requestId, apiKey) {
    console.log(`バックグラウンド処理開始 - RequestID: ${requestId}`);
    
    try {
        // 処理開始状態を保存
        await saveResponseToFirebase(requestId, {
            status: 'processing',
            timestamp: new Date().toISOString()
        });

        // メッセージの分類
        const classification = await classifyMessage(userMessage, apiKey);
        console.log(`メッセージ分類結果: ${classification}`);

        // 分類に基づいてハンドラーを選択して実行
        let response;
        try {
            switch (classification) {
                case '相談':
                    response = await handleConsultation(userMessage, apiKey, KUKU_PROFILE);
                    break;
                case '情報':
                    response = await handleInformation(userMessage, apiKey, KUKU_PROFILE);
                    break;
                case '愚痴':
                    response = await handleComplaint(userMessage, apiKey, KUKU_PROFILE);
                    break;
                case '承認':
                    response = await handleApproval(userMessage, apiKey, KUKU_PROFILE);
                    break;
                case '議論':
                    response = await handleDiscussion(userMessage, apiKey, KUKU_PROFILE);
                    break;
                default:
                    response = await handleChatting(userMessage, apiKey, KUKU_PROFILE);
                    break;
            }

            // 成功結果をFirebaseに保存
            await saveResponseToFirebase(requestId, {
                status: 'completed',
                reply: response.reply,
                classification: classification,
                analysis: response.analysis || null,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('ハンドラー実行エラー:', error);
            throw error;
        }

    } catch (error) {
        console.error('非同期処理エラー:', error);
        // エラー情報をFirebaseに保存
        await saveResponseToFirebase(requestId, {
            status: 'error',
            error: 'AIからの応答の取得に失敗しました',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

// メインのAPIハンドラー
export default async function handler(req, res) {
    const startTime = Date.now();
    console.log(`APIリクエスト受信 - Method: ${req.method}`);

    // APIキーの確認
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('OPENAI_API_KEYが設定されていません');
        return res.status(500).json({
            error: 'サーバーの設定エラー: APIキーが設定されていません。',
            details: 'API key is missing'
        });
    }

    try {
        if (req.method === 'POST') {
            // 新規メッセージの処理
            const { userMessage } = req.body;

            // 入力検証
            if (!userMessage || typeof userMessage !== 'string') {
                throw new Error('メッセージの形式が不正です');
            }

            // リクエストIDの生成
            const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log(`新規リクエスト開始 - ID: ${requestId}`);

            // バックグラウンド処理の開始
            processMessageAsync(userMessage, requestId, apiKey).catch(error => {
                console.error('バックグラウンド処理エラー:', error);
            });

            // 即時レスポンス
            return res.status(202).json({
                status: 'processing',
                requestId: requestId,
                message: 'リクエストを受け付けました'
            });

        } else if (req.method === 'GET') {
            // 処理結果の取得
            const { requestId } = req.query;

            if (!requestId) {
                return res.status(400).json({
                    error: 'リクエストIDが指定されていません'
                });
            }

            const response = await getResponseFromFirebase(requestId);
            console.log(`結果取得 - RequestID: ${requestId}, Status: ${response?.status}`);

            if (!response) {
                return res.status(404).json({
                    error: '指定されたリクエストが見つかりませんでした'
                });
            }

            if (response.status === 'processing') {
                return res.status(202).json({
                    status: 'processing',
                    message: '処理中です'
                });
            }

            return res.status(200).json(response);

        } else {
            // 不正なメソッド
            return res.status(405).json({
                error: 'Method not allowed',
                allowedMethods: ['POST', 'GET']
            });
        }

    } catch (error) {
        console.error('APIエラー:', error);
        const statusCode = error.message.includes('形式が不正') ? 400 : 500;
        
        return res.status(statusCode).json({
            error: 'リクエストの処理に失敗しました',
            details: error.message,
            status: statusCode,
            processingTime: Date.now() - startTime
        });
    }
}