// api/chat.js
import fetch from 'node-fetch';
import { 
    handleConsultation,
    handleComplaint,
    handleInformation,
    handleApproval,
    handleDiscussion,
    handleChatting,
    handleError
} from './handlers/index.js';

// ククちゃんの基本プロンプト
export const KUKU_PROFILE = `あなたは子育ての相談にのる先輩、"ククちゃん"として会話を行いますユーザーに親身になり、共感してください。
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

// タイムアウト制御用のユーティリティ
const createTimeout = (ms) => {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`処理がタイムアウトしました(${ms}ms)`));
        }, ms);
    });
};

// メッセージの分類を行う関数
async function classifyMessage(message, apiKey) {
    console.log('メッセージの分類を開始:', message);
    
    const CLASSIFICATION_PROMPT = `あなたはカウンセリングの専門家です。以下のユーザーの質問を「相談」「情報」「愚痴」「承認」「議論」「雑談」のいずれかに分類してください。

各分類の説明は次の通りです：
1. 相談：ユーザーが具体的な問題や困難についてアドバイスや解決策を求めている質問。
2. 情報：ユーザーが具体的な情報、知識、事例を求めている質問。
3. 愚痴：ユーザーがストレスや不満を発散するための質問。
4. 承認：ユーザーが自身の考えや意見を認めてほしい、受け入れてほしいという質問。
5. 議論：ユーザーが特定のテーマについての意見交換や討論を求めている質問。
6. 雑談：ユーザーが気軽な話題や軽い会話を楽しむための質問。

ユーザーの質問を分析し、最も適切な分類を一つだけ返してください。返答は分類名のみにしてください。`;

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
        console.log('メッセージを分類:', classification);
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

// APIエンドポイントのメイン処理
export default async (req, res) => {
    console.log('APIエンドポイントが呼び出されました');
    console.log('リクエスト内容:', req.body);

    const startTime = Date.now();
    const { userMessage } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEYが設定されていません');
        return res.status(500).json({ 
            error: 'サーバーの設定エラー: APIキーが設定されていません。',
            details: 'API key is missing'
        });
    }

    try {
        // 入力検証
        if (!userMessage || typeof userMessage !== 'string') {
            throw new Error('メッセージの形式が不正です');
        }

        console.log('メッセージ処理を開始...');
        
        // メッセージの分類と処理
        const classification = await classifyMessage(userMessage, apiKey);
        console.log('分類結果:', classification);

        // 分類に基づいた処理の実行
        const response = await Promise.race([
            processMessage(classification, userMessage, apiKey, KUKU_PROFILE),
            createTimeout(25000) // 全体の処理に25秒のタイムアウト
        ]);

        const processingTime = Date.now() - startTime;
        console.log(`処理完了: ${processingTime}ms`);

        return res.status(200).json({
            reply: response.reply,
            classification: classification,
            analysis: response.analysis || null,
            metadata: {
                ...response.metadata,
                processingTime
            }
        });

    } catch (error) {
        console.error('チャットエンドポイントでエラー:', error);
        const errorMessage = error.message || '不明なエラーが発生しました';
        const statusCode = error.message.includes('形式が不正') ? 400 : 500;
        
        res.status(statusCode).json({
            error: 'ククちゃんからの応答の取得に失敗しました',
            details: errorMessage,
            status: statusCode,
            retryable: !error.message.includes('形式が不正')
        });
    }
};