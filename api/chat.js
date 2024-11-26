// api/chat.js
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { getChatHistory } from '../libs/firebase.js'; // Firebaseからチャット履歴を取得するための関数をインポート

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

// チャット履歴をプロンプトに変換する関数
function formatChatHistory(history) {
    return history
        .slice(-10) // 最大5往復分（ユーザー5回＋AI5回）を取得
        .map(msg => `${msg.type === 'user' ? 'ユーザー' : 'ククちゃん'}: ${msg.content}`)
        .join('\n');
}

// 相談処理用の関数
async function handleConsultation(userMessage, apiKey, sessionId) {
    console.log('\n=== 相談処理開始 ===');
    console.log('入力メッセージ:', userMessage);

    // チャット履歴を取得
    const history = await getChatHistory(sessionId);
    const chatHistory = formatChatHistory(history);
    console.log('チャット履歴:', chatHistory);

    // 1. 意図分析
    console.log('\n[1] 意図分析開始');
    const intentPrompt = `あなたはカウンセリングの専門家です。以下のユーザーの質問に含まれている意図を詳細に分析してください。
    ユーザーが質問を通じてどのようなサポートやアドバイスを期待しているのかを具体的に説明し、その背景や目的についても考察してください。
    また、質問の背後にある感情や動機についても考え、それがどのようにユーザーの期待や要求に影響を与えているかを分析してください。
    最終的に、ユーザーがどのような返答や行動を求めているかを推測してください。
    この分析を通じて、ユーザーの質問の真の意図と、それに対する最も適切な応答を明確にすることを目指します。

    これまでの会話:
    ${chatHistory}

    ユーザーの質問: '${userMessage}'
    
    意図の分析: ~~~`;
    
    console.log('意図分析プロンプト:', intentPrompt);

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
    console.log('\n=== 意図分析の生成結果 ===');
    console.log('--------------------');
    console.log(intentContent);
    console.log('--------------------\n');

    // 2. 追加質問の提案
    console.log('\n[2] 追加質問生成開始');
    const followUpPrompt = `あなたはカウンセリングの専門家です。以下のユーザーの質問に対して以下を分析してください。
    ユーザーの質問に対して不足している環境や行動に関する情報を特定し、以下の点を踏まえつつ重要と判断される追加質問を2~3個提案してください。
    具体的に、ユーザーが提供していないが必要となる詳細な情報を特定し、それに基づいて質問を作成してください。

    これまでの会話:
    ${chatHistory}

    ユーザーの質問: '${userMessage}'
    意図の分析: '${intentContent}'

    追加質問の提案: ~~~`;

    console.log('追加質問プロンプト:', followUpPrompt);

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
    console.log('\n=== 追加質問の生成結果 ===');
    console.log('--------------------');
    console.log(followUpContent);
    console.log('--------------------\n');

    // 3. 最終的な回答生成
    console.log('\n[3] 最終回答生成開始');
    const finalPrompt = `${KUKU_PROFILE}

    これまでの会話:
    ${chatHistory}

    以下の情報をもとに、ククちゃんとして、ユーザーへの共感的で支援的な返答をわかりやすく簡潔に生成してください。
    また、ユーザーが提供した情報に基づいて具体的なアドバイスを行い、必要な場合は追加の質問をしてください。

    ユーザーの質問: '${userMessage}'
    意図の分析: '${intentContent}'
    追加の質問提案: ${followUpContent}

    ユーザーへの返答: ~~~`;

    console.log('最終回答プロンプト:', finalPrompt);

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
    console.log('\n=== 最終回答の生成結果 ===');
    console.log('--------------------');
    console.log(finalContent);
    console.log('--------------------\n');
    console.log('=== 相談処理完了 ===\n');

    return finalContent;
}

// 雑談処理用の関数
async function handleChatting(userMessage, apiKey, sessionId) {
    console.log('\n=== 雑談処理開始 ===');
    console.log('入力メッセージ:', userMessage);

    // チャット履歴を取得
    const history = await getChatHistory(sessionId);
    const chatHistory = formatChatHistory(history);
    console.log('チャット履歴:', chatHistory);

    // 1. 追加質問の提案
    console.log('\n[1] 追加質問生成開始');
    const followUpPrompt = `あなたはカウンセリングの専門家です。以下のユーザーの質問に含まれている意図を詳細に分析してください。
    ユーザーの質問に対して不足している環境や行動に関する情報を特定し、以下の点を踏まえつつ重要と判断される追加質問を2~3個提案してください。
    質問の背景理解：質問の主な内容と関連する問題点を把握します。
    不足情報の特定：環境要因、行動パターン、観測可能な変数など、欠けている重要情報を特定します。

    これまでの会話:
    ${chatHistory}

    ユーザーの質問: '${userMessage}'

    追加質問の提案: ~~~`;

    console.log('追加質問プロンプト:', followUpPrompt);

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
    console.log('追加質問生成結果:', followUpContent);

    // 2. 最終的な回答生成
    console.log('\n[2] 最終回答生成開始');
    const responsePrompt = `${KUKU_PROFILE}

    これまでの会話:
    ${chatHistory}

    以下の情報をもとに、ククちゃんとして、ユーザーへの共感的で支援的な返答をわかりやすく簡潔に生成してください。
    また、話を広げるような会話を必ず心がけてください。

    ユーザーの質問: '${userMessage}'
    追加の質問提案: ${followUpContent}

    ユーザーへの返答: ~~~`;

    console.log('最終回答プロンプト:', responsePrompt);

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
    console.log('\n最終回答:', finalContent);
    console.log('=== 雑談処理完了 ===\n');

    return finalContent;
}

// メインのハンドラー関数
export default async function handler(req, res) {
    console.log('\n====== チャット処理開始 ======');
    console.log('受信メッセージ:', req.body.userMessage);

    const { userMessage } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEYが設定されていません');
        return res.status(500).json({ error: 'サーバーの設定エラー: APIキーが設定されていません。' });
    }

    // セッションIDの管理
    let sessionId = req.cookies.sessionId;
    if (!sessionId) {
        sessionId = uuidv4(); // 新しいセッションIDを生成
        res.setHeader('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Path=/`);
    }

    try {
        // 1. メッセージの分類
        console.log('\n[1] メッセージ分類開始');
        console.log('分類プロンプト:', CLASSIFICATION_PROMPT);

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
        console.log('\n=== メッセージ分類結果 ===');
        console.log('--------------------');
        console.log(`分類: ${messageType}`);
        console.log('--------------------\n');

        // 2. 分類に基づいて処理を分岐
        let reply;
        if (messageType === '相談') {
            console.log('\n[2] 相談モードで処理開始');
            reply = await handleConsultation(userMessage, apiKey, sessionId);
        } else {
            console.log('\n[2] 雑談モードで処理開始');
            reply = await handleChatting(userMessage, apiKey, sessionId);
        }

        // 3. 結果を返す
        console.log('\n[3] 最終結果:', { type: messageType, reply: reply });
        console.log('====== チャット処理完了 ======\n');

        res.status(200).json({
            reply: reply,
            type: messageType
        });

    } catch (error) {
        console.error('\n!!!! エラー発生 !!!!');
        console.error('エラー詳細:', error);
        console.error('====== チャット処理異常終了 ======\n');

        res.status(500).json({
            error: 'AIからの応答の取得に失敗しました',
            details: error.message
        });
    }
}