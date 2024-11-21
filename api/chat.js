// api/chat.js
import fetch from 'node-fetch';

import { handleConsultation } from './handlers/consultation.js';

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

// 各分類に応じたプロンプトを生成する関数
function getPromptByClassification(classification, userMessage) {
    const basePrompt = KUKU_PROFILE;
    
    const specificPrompts = {
        '相談': `${basePrompt}\n\n### 相談対応モード ###\n- 具体的な解決策を提案してください。\n- 共感を示しながら、実践的なアドバイスを提供してください。\n- 必要に応じて追加の質問をしてください。`,
        '情報': `${basePrompt}\n\n### 情報提供モード ###\n- 正確で具体的な情報を提供してください。\n- 専門的な内容は分かりやすく説明してください。\n- 必要に応じて補足情報も提供してください。`,
        '愚痴': `${basePrompt}\n\n### 傾聴モード ###\n- ユーザーの気持ちに寄り添ってください。\n- 共感を示し、感情を受け止めてください。\n- 励ましの言葉を添えてください。`,
        '承認': `${basePrompt}\n\n### 承認モード ###\n- ユーザーの考えや行動を肯定的に評価してください。\n- 具体的な良い点を指摘してください。\n- 自信を持てるような言葉かけをしてください。`,
        '議論': `${basePrompt}\n\n### 議論モード ###\n- 多角的な視点を提供してください。\n- 建設的な意見交換を心がけてください。\n- 相手の意見も尊重しながら話を進めてください。`,
        '雑談': `${basePrompt}\n\n### 雑談モード ###\n- リラックスした雰囲気で会話してください。\n- 明るく前向きな話題を心がけてください。\n- 会話が自然に続くように質問を投げかけてください。`
    };

    return specificPrompts[classification] || basePrompt;
}

// メッセージを分類する関数
async function classifyMessage(message, apiKey) {
    console.log('Classifying message:', message);
    
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
                    { role: 'system', content: CLASSIFICATION_PROMPT },
                    { role: 'user', content: message }
                ],
                temperature: 0.3,
                max_tokens: 50
            })
        });

        if (!response.ok) {
            throw new Error(`Classification API error: ${response.statusText}`);
        }

        const data = await response.json();
        const classification = data.choices[0].message.content.trim();
        console.log('Message classified as:', classification);
        return classification;
    } catch (error) {
        console.error('Classification error:', error);
        throw error;
    }
}


// APIエンドポイント処理部分のみを示します
export default async (req, res) => {
    console.log('API endpoint called');
    console.log('Request body:', req.body);

    const { userMessage } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEY is not set');
        return res.status(500).json({ 
            error: 'サーバーの設定エラー: APIキーが設定されていません。',
            details: 'API key is missing'
        });
    }

    try {
        // バリデーション
        if (!userMessage || typeof userMessage !== 'string') {
            throw new Error('Invalid message format');
        }

        console.log('Starting message processing...');
        
        // メッセージの分類
        const classification = await classifyMessage(userMessage, apiKey);
        console.log('Message classified as:', classification);

        // 分類に基づいてハンドラーを選択して実行
        let response;
        try {
            switch (classification) {
                case '相談':
                    response = await handleConsultation(userMessage, apiKey, KUKU_PROFILE);
                    console.log('Consultation handler executed');
                    break;
                case '情報':
                    response = await handleInformation(userMessage, apiKey, KUKU_PROFILE);
                    console.log('Information handler executed');
                    break;
                case '愚痴':
                    response = await handleComplaint(userMessage, apiKey, KUKU_PROFILE);
                    console.log('Complaint handler executed');
                    break;
                case '承認':
                    response = await handleApproval(userMessage, apiKey, KUKU_PROFILE);
                    console.log('Approval handler executed');
                    break;
                case '議論':
                    response = await handleDiscussion(userMessage, apiKey, KUKU_PROFILE);
                    console.log('Discussion handler executed');
                    break;
                case '雑談':
                    response = await handleChatting(userMessage, apiKey, KUKU_PROFILE);
                    console.log('Chatting handler executed');
                    break;
                default:
                    // デフォルトの処理（分類不明の場合）
                    const specificPrompt = getPromptByClassification('雑談', userMessage);
                    response = await handleChatting(userMessage, apiKey, KUKU_PROFILE);
                    console.log('Default handler (chatting) executed');
                    break;
            }

            console.log('Handler response:', response);
            
            return res.status(200).json({
                reply: response.reply,
                classification: classification,
                analysis: response.analysis || null
            });

        } catch (error) {
            console.error('Error in handler execution:', error);
            throw new Error(`Handler execution failed: ${error.message}`);
        }

    } catch (error) {
        console.error('Error in chat endpoint:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        const statusCode = error.message.includes('Invalid message format') ? 400 : 500;
        
        res.status(statusCode).json({
            error: 'AIからの応答の取得に失敗しました',
            details: errorMessage,
            status: statusCode
        });
    }
}