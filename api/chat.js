// api/chat.js

import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { getChatHistory } from '../libs/firebase.js';  // Firebaseのインポートを追加

/**
 * 過去の会話履歴をプロンプト用に整形する関数
 * @param {Array} history - 会話履歴の配列
 * @param {number} maxTurns - 含める最大ターン数
 * @returns {string} フォーマットされた会話履歴
 */

function formatConversationHistory(history, maxTurns = 5) {
   if (!history || history.length === 0) return '';
   
   // 最新のmaxTurns分の会話を取得
   const recentHistory = history.slice(-maxTurns * 2); // userとaiで2倍
   
   return recentHistory.map(msg => {
       const role = msg.type === 'user' ? 'ユーザー' : 'ククちゃん';
       return `${role}: ${msg.content}`;
   }).join('\n');
}

// くくちゃんの基本プロンプト - 会話履歴を含める形に修正
function createBasePrompt(conversationHistory = '') {
   return `あなたは子育ての相談にのる先輩、"ククちゃん"として会話を行います。
ユーザーに親身になり、共感してください。

### ククちゃんのルール ###
- あなたの名前は、ククちゃんです。
- ククちゃんは子育て相談チャットボットです。
- ククちゃんからの回答は、200文字以内の日本語の文章を作成してください。
- 文章に合わせて絵文字や「！」を付けてください。
- 相手に共感するコメントをしたり、相手の気持ちを代弁してください。
- 過去の会話の文脈を考慮して返答してください。

### ククちゃんのプロフィール ###
- 2児の子どもを育てるママです。
- 女性(母親)で43歳くらいです。
- 長男(ポポちゃん・6歳)と長女(ピピちゃん・2歳)がいます。

### これまでの会話の流れ ###
${conversationHistory}`;
}

// 分類用のプロンプト
const CLASSIFICATION_PROMPT = `以下のユーザーの質問を「相談」「雑談」のいずれかに分類してください。

1. 相談：子育ての悩みや問題についてアドバイスを求める質問
2. 雑談：その他の一般的な会話や軽い話題

回答は「相談」「雑談」のどちらかの1単語のみを返してください。`;



// 相談処理用の関数を修正
async function handleConsultation(userMessage, apiKey, conversationHistory) {
    console.log('\n=== 相談処理開始 ===');
    console.log('入力メッセージ:', userMessage);
    
    // 1. 意図分析
    const intentPrompt = `あなたはカウンセリングの専門家です。以下のユーザーとの会話履歴と最新の質問の意図を詳細に分析してください。
会話の流れを踏まえた上で、ユーザーが今回の質問で求めているサポートやアドバイスを具体的に説明し、その背景や目的について考察してください。

### これまでの会話の流れ ###
${conversationHistory}

### 最新の質問 ###
${userMessage}

意図の分析: ~~~`;

    const intentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: intentPrompt }],
            temperature: 0.7,
            max_tokens: 200
        })
    });

    if (!intentResponse.ok) {
        throw new Error(`意図分析APIエラー: ${intentResponse.statusText}`);
    }

    const intentData = await intentResponse.json();
    const intentContent = intentData.choices[0].message.content.trim();

    // 2. 追加質問の提案
    const followUpPrompt = `あなたはカウンセリングの専門家です。
これまでの会話の流れを踏まえた上で、現在の質問に関して不足している情報を特定し、重要な追加質問を2~3個提案してください。

### これまでの会話の流れ ###
${conversationHistory}

### 最新の質問 ###
${userMessage}

### 意図の分析 ###
${intentContent}

追加質問の提案: ~~~`;

    const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: followUpPrompt }],
            temperature: 0.7,
            max_tokens: 200
        })
    });

    if (!followUpResponse.ok) {
        throw new Error(`追加質問生成APIエラー: ${followUpResponse.statusText}`);
    }

    const followUpData = await followUpResponse.json();
    const followUpContent = followUpData.choices[0].message.content.trim();

    // 3. 最終的な回答生成
    const finalPrompt = `${createBasePrompt(conversationHistory)}

### 最新の質問 ###
${userMessage}

### 分析情報 ###
意図の分析: ${intentContent}
追加質問案: ${followUpContent}

ユーザーへの返答: ~~~`;

    const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: finalPrompt }],
            temperature: 0.7,
            max_tokens: 400
        })
    });

    if (!finalResponse.ok) {
        throw new Error(`最終回答生成APIエラー: ${finalResponse.statusText}`);
    }

    const finalData = await finalResponse.json();
    const finalContent = finalData.choices[0].message.content.trim();
    console.log('=== 相談処理完了 ===\n');

    return finalContent;
}
// 雑談処理用の関数
async function handleChatting(userMessage, apiKey) {
    console.log('\n=== 雑談処理開始 ===');
    console.log('入力メッセージ:', userMessage);

    // 1. 追加質問の提案
    console.log('\n[1] 追加質問生成開始');
    const followUpPrompt = `あなたはカウンセリングの専門家です。以下のユーザーの質問に含まれている意図を詳細に分析してください。
    ユーザーの質問に対して不足している環境や行動に関する情報を特定し、以下の点を踏まえつつ重要と判断される追加質問を2~3個提案してください。
    質問の背景理解：質問の主な内容と関連する問題点を把握します。
    不足情報の特定：環境要因、行動パターン、観測可能な変数など、欠けている重要情報を特定します。

    ユーザーの質問: '${userMessage}'

    追加質問の提案: ~~~`;

    const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: followUpPrompt }],
            temperature: 0.7,
            max_tokens: 200
        })
    });

    if (!followUpResponse.ok) {
        throw new Error(`追加質問生成APIエラー: ${followUpResponse.statusText}`);
    }

    const followUpData = await followUpResponse.json();
    const followUpContent = followUpData.choices[0].message.content.trim();

    // 2. 最終的な回答生成
    console.log('\n[2] 最終回答生成開始');
    const responsePrompt = `${KUKU_PROFILE}

    以下の情報をもとに、ククちゃんとして、ユーザーへの共感的で支援的な返答をわかりやすく簡潔に生成してください。
    また、話を広げるような会話を必ず心がけてください。

    ユーザーの質問: '${userMessage}'
    追加の質問提案: ${followUpContent}

    ユーザーへの返答: ~~~`;

    const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: responsePrompt }],
            temperature: 0.7,
            max_tokens: 400
        })
    });

    if (!finalResponse.ok) {
        throw new Error(`最終回答生成APIエラー: ${finalResponse.statusText}`);
    }

    const finalData = await finalResponse.json();
    const finalContent = finalData.choices[0].message.content.trim();
    console.log('=== 雑談処理完了 ===\n');

    return finalContent;
}

// メインのハンドラー関数を修正
export default async function handler(req, res) {
    console.log('\n====== チャット処理開始 ======');
    console.log('受信メッセージ:', req.body.userMessage);

    const { userMessage } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEYが設定されていません');
        return res.status(500).json({ error: 'サーバーの設定エラー: APIキーが設定されていません。' });
    }

    try {
        // セッションIDの管理
        let sessionId = req.cookies.sessionId;
        if (!sessionId) {
            sessionId = uuidv4();
            res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Path=/; Max-Age=86400`);
        }

        // 会話履歴の取得
        let chatHistory = [];
        try {
            chatHistory = await getChatHistory(sessionId);
            console.log('会話履歴を取得しました:', chatHistory.length, '件');
        } catch (error) {
            console.error('会話履歴の取得中にエラー:', error);
            // エラーが発生しても処理を継続
        }

        // 会話履歴の整形
        const formattedHistory = formatConversationHistory(chatHistory);
        console.log('整形された会話履歴:', formattedHistory);

        // メッセージの分類
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

        // 分類に基づいて処理を分岐
        let reply;
        try {
            if (messageType === '相談') {
                reply = await handleConsultation(userMessage, apiKey, formattedHistory);
            } else {
                // 暫定的に全て相談として処理
                reply = await handleConsultation(userMessage, apiKey, formattedHistory);
            }
        } catch (error) {
            console.error('応答生成中にエラー:', error);
            throw new Error('応答の生成に失敗しました');
        }

        // 結果を返す
        console.log('\n[3] 最終結果:', { type: messageType, reply: reply, sessionId: sessionId });
        console.log('====== チャット処理完了 ======\n');

        return res.status(200).json({
            reply: reply,
            type: messageType,
            sessionId: sessionId
        });

    } catch (error) {
        console.error('\n!!!! エラー発生 !!!!');
        console.error('エラー詳細:', error);
        console.error('====== チャット処理異常終了 ======\n');

        return res.status(500).json({
            error: 'AIからの応答の取得に失敗しました',
            details: error.message || '不明なエラーが発生しました'
        });
    }
}