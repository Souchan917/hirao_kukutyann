import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

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
const CLASSIFICATION_PROMPT = `以下のユーザーの質問を「相談」「情報」「愚痴」「承認」「議論」「雑談」のいずれかに分類してください。

各分類の説明は次の通りです：
1. 相談：ユーザーが具体的な問題や困難についてアドバイスや解決策を求めている質問
2. 情報：ユーザーが具体的な情報、知識、事例を求めている質問
3. 愚痴：ユーザーがストレスや不満を発散するための質問
4. 承認：ユーザーが自身の考えや意見を認めてほしい、受け入れてほしいという質問
5. 議論：ユーザーが特定のテーマについての意見交換や討論を求めている質問
6. 雑談：ユーザーが気軽な話題や軽い会話を楽しむための質問

回答は上記6種類のいずれかの単語のみを返してください。`;

// 相談処理用の関数
async function handleConsultation(userMessageData, apiKey) {
    console.log('\n=== 相談処理開始 ===');
    const { message, conversationHistory } = userMessageData;

    // 1. 意図分析
    const intentPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    あなたはカウンセリングの専門家です。以下のユーザーの相談に含まれている意図を詳細に分析してください。
    - 主訴は何か
    - どのような状況で困っているのか
    - どのような解決を望んでいるのか
    - 相談の背景にある感情
    について分析してください。
    
    ユーザーの相談: '${message}'
    
    意図の分析: ~~~`;

    const intentContent = await getGPTResponse(intentPrompt, apiKey, '1. 意図分析ステップ');

    // 2. 追加質問の生成
    const followUpPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    あなたはカウンセリングの専門家です。この相談をより良く理解し適切なアドバイスをするために、
    確認すべき追加の情報について2-3個の具体的な質問を提案してください。
    
    ユーザーの相談: '${message}'
    意図の分析: '${intentContent}'
    
    追加質問案: ~~~`;

    const followUpContent = await getGPTResponse(followUpPrompt, apiKey, '2. 追加質問生成ステップ');

    // 3. 最終的な回答生成
    const finalPrompt = `${KUKU_PROFILE}
    
    ${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    
    あなたはカウンセリングの専門家です。以下の情報をもとに、ククちゃんとして、
    共感的で具体的な解決策を含む返答を生成してください。
    
    ユーザーの相談: '${message}'
    意図の分析: '${intentContent}'
    追加で確認したい質問: '${followUpContent}'
    
    ユーザーへの返答: ~~~`;

    return await getGPTResponse(finalPrompt, apiKey, '3. 最終回答生成ステップ');
}

// 情報提供処理用の関数
async function handleInformation(userMessageData, apiKey) {
    console.log('\n=== 情報提供処理開始 ===');
    const { message, conversationHistory } = userMessageData;

    // 1. 意図分析
    const intentPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    あなたは子育ての専門家です。以下のユーザーの質問について分析してください。
    - どのような情報を求めているか
    - その情報をどのように活用したいのか
    - 情報の詳細度はどの程度求められているか
    について分析してください。
    
    ユーザーの質問: '${message}'
    
    意図の分析: ~~~`;

    const intentContent = await getGPTResponse(intentPrompt, apiKey);

    // 2. 追加質問の生成
    const followUpPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    より正確で有用な情報を提供するために、確認すべき追加の情報について
    2-3個の具体的な質問を提案してください。
    
    ユーザーの質問: '${message}'
    意図の分析: '${intentContent}'
    
    追加質問案: ~~~`;

    const followUpContent = await getGPTResponse(followUpPrompt, apiKey);

    // 3. 最終的な回答生成
    const finalPrompt = `${KUKU_PROFILE}
    
    ${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    
    以下の情報をもとに、ククちゃんとして、
    わかりやすく正確な情報提供を含む返答を生成してください。
    
    ユーザーの質問: '${message}'
    意図の分析: '${intentContent}'
    追加で確認したい質問: '${followUpContent}'
    
    ユーザーへの返答: ~~~`;

    return await getGPTResponse(finalPrompt, apiKey);
}

// 愚痴処理用の関数
async function handleComplaint(userMessageData, apiKey) {
    console.log('\n=== 愚痴処理開始 ===');
    const { message, conversationHistory } = userMessageData;

    // 1. 意図分析
    const intentPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    あなたは共感的なカウンセラーです。以下のユーザーの愚痴について分析してください。
    - どのような状況で困っているのか
    - どのような感情を抱いているのか
    - なぜそのような感情を抱くのか
    - どのような反応を期待しているのか
    について分析してください。
    
    ユーザーの愚痴: '${message}'
    
    意図の分析: ~~~`;

    const intentContent = await getGPTResponse(intentPrompt, apiKey);

    // 2. 追加質問の生成
    const followUpPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    ユーザーの感情をより深く理解し、適切な共感を示すために、
    確認すべき追加の情報について2-3個の質問を提案してください。
    
    ユーザーの愚痴: '${message}'
    意図の分析: '${intentContent}'
    
    追加質問案: ~~~`;

    const followUpContent = await getGPTResponse(followUpPrompt, apiKey);

    // 3. 最終的な回答生成
    const finalPrompt = `${KUKU_PROFILE}
    
    ${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    
    以下の情報をもとに、ククちゃんとして、
    深い共感を示し、気持ちに寄り添う返答を生成してください。
    
    ユーザーの愚痴: '${message}'
    意図の分析: '${intentContent}'
    追加で確認したい質問: '${followUpContent}'
    
    ユーザーへの返答: ~~~`;

    return await getGPTResponse(finalPrompt, apiKey);
}

// 承認処理用の関数
async function handleApproval(userMessageData, apiKey) {
    console.log('\n=== 承認処理開始 ===');
    const { message, conversationHistory } = userMessageData;

    // 1. 意図分析
    const intentPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    あなたは肯定的なカウンセラーです。以下のユーザーの発言について分析してください。
    - どのような行動や考えの承認を求めているか
    - なぜ承認を求めているのか
    - どの部分に自信が持てていないのか
    - どのような反応を期待しているのか
    について分析してください。
    
    ユーザーの発言: '${message}'
    
    意図の分析: ~~~`;

    const intentContent = await getGPTResponse(intentPrompt, apiKey);

    // 2. 追加質問の生成
    const followUpPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    ユーザーの努力や工夫をより具体的に理解し、適切な承認を行うために、
    確認すべき追加の情報について2-3個の質問を提案してください。
    
    ユーザーの発言: '${message}'
    意図の分析: '${intentContent}'
    
    追加質問案: ~~~`;

    const followUpContent = await getGPTResponse(followUpPrompt, apiKey);

    // 3. 最終的な回答生成
    const finalPrompt = `${KUKU_PROFILE}
    
    ${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    
    以下の情報をもとに、ククちゃんとして、
    ユーザーの行動や考えを具体的に認め、自信を持てるような返答を生成してください。
    
    ユーザーの発言: '${message}'
    意図の分析: '${intentContent}'
    追加で確認したい質問: '${followUpContent}'
    
    ユーザーへの返答: ~~~`;

    return await getGPTResponse(finalPrompt, apiKey);
}

// 議論処理用の関数
async function handleDiscussion(userMessageData, apiKey) {
    console.log('\n=== 議論処理開始 ===');
    const { message, conversationHistory } = userMessageData;

    // 1. 意図分析
    const intentPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    あなたは建設的な議論を導くファシリテーターです。以下のユーザーの発言について分析してください。
    - 議論したいテーマは何か
    - なぜそのテーマについて議論したいのか
    - どのような視点からの意見を求めているか
    - どのような結論を期待しているか
    について分析してください。
    
    ユーザーの発言: '${message}'
    
    意図の分析: ~~~`;

    const intentContent = await getGPTResponse(intentPrompt, apiKey);

    // 2. 追加質問の生成
    const followUpPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    より建設的な議論を行うために、確認すべき追加の情報について
    2-3個の具体的な質問を提案してください。
    
    ユーザーの発言: '${message}'
    意図の分析: '${intentContent}'
    
    追加質問案: ~~~`;

    const followUpContent = await getGPTResponse(followUpPrompt, apiKey);

    // 3. 最終的な回答生成
    const finalPrompt = `${KUKU_PROFILE}
    
    ${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    
    以下の情報をもとに、ククちゃんとして、
    多角的な視点を提供しつつ、建設的な議論を促す返答を生成してください。
    
    ユーザーの発言: '${message}'
    意図の分析: '${intentContent}'
    追加で確認したい質問: '${followUpContent}'
    
    ユーザーへの返答: ~~~`;

    return await getGPTResponse(finalPrompt, apiKey);
}

// 雑談処理用の関数

async function handleChatting(userMessageData, apiKey) {
    console.log('\n=== 雑談処理開始 ===');
    const { message, conversationHistory } = userMessageData;

    // 1. 意図分析
    const intentPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    あなたは親しみやすい話し相手です。以下のユーザーの発言について分析してください。
    - どのような話題について話したいのか
    - どのような気分や雰囲気か
    - どのような反応を期待しているか
    - 会話の方向性
    について分析してください。
    
    ユーザーの発言: '${message}'
    
    意図の分析: ~~~`;

    const intentContent = await getGPTResponse(intentPrompt, apiKey);

    // 2. 追加質問の生成
    const followUpPrompt = `${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    より楽しい会話を展開するために、確認したい追加の情報について
    2-3個の自然な質問を提案してください。
    
    ユーザーの発言: '${message}'
    意図の分析: '${intentContent}'
    
    追加質問案: ~~~`;

    const followUpContent = await getGPTResponse(followUpPrompt, apiKey);

    // 3. 最終的な回答生成
    const finalPrompt = `${KUKU_PROFILE}
    
    ${conversationHistory ? `\n### 過去の会話履歴 ###\n${conversationHistory}\n` : ''}
    
    以下の情報をもとに、ククちゃんとして、
    親しみやすく自然な会話の流れを作る返答を生成してください。
    
    ユーザーの発言: '${message}'
    意図の分析: '${intentContent}'
    追加で確認したい質問: '${followUpContent}'
    
    ユーザーへの返答: ~~~`;

    return await getGPTResponse(finalPrompt, apiKey);
}

// 共通のGPT応答取得関数
async function getGPTResponse(prompt, apiKey, stage = 'Unknown') {
    console.group(`\n=== ${stage} ===`);
    console.log('プロンプト内容:');
    console.log(prompt);

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`GPT APIエラー: ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim();
        
        console.log('\nAIからの応答:');
        console.log(result);
        console.groupEnd();
        
        return result;

    } catch (error) {
        console.error('APIエラー:', error);
        console.groupEnd();
        throw error;
    }
}
// メインのハンドラー関数
export default async function handler(req, res) {
    console.log('\n====== チャット処理開始 ======');
    const { userMessage, conversationHistory } = req.body;
    console.log('受信メッセージ:', userMessage);
    console.log('会話履歴:', conversationHistory);

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEYが設定されていません');
        return res.status(500).json({ error: 'サーバーの設定エラー: APIキーが設定されていません。' });
    }

    try {
        // 1. メッセージの分類
        console.log('\n[1] メッセージ分類開始');
        const classificationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
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
        console.log('\n分類結果:', messageType);

        // 2. 分類に基づいて処理を分岐
        let reply;
        const messageData = { message: userMessage, conversationHistory };
        
        switch (messageType) {
            case '相談':
                reply = await handleConsultation(messageData, apiKey);
                break;
            case '情報':
                reply = await handleInformation(messageData, apiKey);
                break;
            case '愚痴':
                reply = await handleComplaint(messageData, apiKey);
                break;
            case '承認':
                reply = await handleApproval(messageData, apiKey);
                break;
            case '議論':
                reply = await handleDiscussion(messageData, apiKey);
                break;
            case '雑談':
            default:
                reply = await handleChatting(messageData, apiKey);
                break;
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