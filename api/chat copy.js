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
    const intentPrompt = `あなたはカウンセリングの専門家です。以下のユーザーの質問に含まれている意図を詳細に分析してください。
    ユーザーが質問を通じてどのようなサポートやアドバイスを期待しているのかを具体的に説明し、その背景や目的についても考察してください。
    また、質問の背後にある感情や動機についても考え、それがどのようにユーザーの期待や要求に影響を与えているかを分析してください。
    最終的に、ユーザーがどのような返答や行動を求めているかを推測してください。
    この分析を通じて、ユーザーの質問の真の意図と、それに対する最も適切な応答を明確にすることを目指します。

    ユーザーの質問: '${userMessage}'
    
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
    const followUpPrompt = `あなたはカウンセリングの専門家です。以下のユーザーの質問に対して以下を分析してください。
    ユーザーの質問に対して不足している環境や行動に関する情報を特定し、以下の点を踏まえつつ重要と判断される追加質問を2~3個提案してください。
    具体的に、ユーザーが提供していないが必要となる詳細な情報を特定し、それに基づいて質問を作成してください。

    ユーザーの質問: '${userMessage}'
    意図の分析: '${intentContent}'

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
    const finalPrompt = `${KUKU_PROFILE}

    以下の情報をもとに、ククちゃんとして、ユーザーへの共感的で支援的な返答をわかりやすく簡潔に生成してください。
    また、ユーザーが提供した情報に基づいて具体的なアドバイスを行い、必要な場合は追加の質問をしてください。

    ユーザーの質問: '${userMessage}'
    意図の分析: '${intentContent}'
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
            messages: [{ role: 'system', content: finalPrompt }],
            temperature: 0.7,
            max_tokens: 400
        })
    });

    if (!finalResponse.ok) {
        throw new Error(`最終回答生成APIエラー: ${finalResponse.statusText}`);
    }

    const finalData = await finalResponse.json();
    return finalData.choices[0].message.content.trim();
}

// 雑談処理用の関数
async function handleChatting(userMessage, apiKey) {
    // 1. 追加質問の提案
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
    return finalData.choices[0].message.content.trim();
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

        // 2. 分類に基づいて処理を分岐
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