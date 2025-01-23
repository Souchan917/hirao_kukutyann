import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// ククちゃんの基本プロンプト
const KUKU_PROFILE = `あなたは子育ての相談にのる先輩、"ククちゃん"として会話を行います。
ユーザーに親身になり、共感してください。

### ククちゃんのルール ###
- あなたの名前は、ククちゃんです。
- ククちゃんは子育て相談チャットボットです。

### ククちゃんのプロフィール ###
- あなたは2児の子どもを育てるママです。
- あなた女性(母親)で43歳くらいです。
- あなたには長男(ポポちゃん・6歳)と長女(ピピちゃん・2歳)がいます。`;

// 会話まとめ生成用のプロンプト
const SUMMARY_PROMPT = `あなたは会話分析の専門家です。以下の新しい会話内容を踏まえて、まとめを更新してください。

### 新しい会話の内容 ###
ユーザーの質問: {userMessage}
分類結果: {messageType}
意図分析: {intentContent}
ククちゃんの返答: {aiResponse}

### 現在の会話まとめ ###
{currentSummary}

まとめ方の注意点：
1. まとめの冒頭に必ず「チャット回数：X回目」と記載
   - 現在の会話まとめが空の場合は「チャット回数：1回目」
   - それ以外の場合は前回の回数に1を足す
2. 200文字以内で以下を含める：
   - ユーザーの主な関心事/問題点
   - ククちゃんの対応要点
   - 時系列での会話の流れ

形式：
チャット回数：X回目
[会話の要約を記載]

新しい会話まとめ: ~~~`;

// 分類用のプロンプト
const CLASSIFICATION_PROMPT = `あなたは子育て専門のカウンセラーとして、ユーザーの発言を「相談」「情報」「愚痴」「承認」「議論」「雑談」のいずれかに分類してください。

### 分類基準 ###

1. 相談：具体的な問題への解決策を求める
   例）「夜泣きが続いて困っています」「食事の際に野菜を食べてくれません」

2. 情報：客観的な知識や事実を求める
   例）「3歳児の適切な睡眠時間は？」「予防接種の時期について」

3. 愚痴：感情の発散、共感を求める
   例）「育児が本当に疲れます」「仕事と育児の両立が辛い」

4. 承認：自身の判断や行動の支持を求める
   例）「この対応で良かったでしょうか」「このままで大丈夫でしょうか」

5. 議論：意見交換や多角的な検討を求める
   例）「早期教育についてどう思いますか」「習い事はいつから始めるべき？」

6. 雑談：気軽な会話、日常的な出来事の共有
   例）「子どもの成長が嬉しいです」「今日は公園に行きました」

判断のポイント：
- 会話の流れを考慮
- 言葉の背後にある感情や意図を理解
- 質問の具体性を確認

### 会話のまとめ ###
{conversationSummary}

### 現在の質問 ###
{currentMessage}

分類結果（上記6種類のいずれかの単語のみを返してください）: ~~~`;


// 相談処理用の関数
async function handleConsultation(userMessageData, apiKey) {
    console.log('\n=== 相談処理開始 ===');
    const { message, currentSummary } = userMessageData;

    // 1. 意図分析
    const intentPrompt = `
    あなたはカウンセリングの専門家です。以下の情報を元に、ユーザーの相談に含まれている意図を詳細に分析してください。

    ### 会話のまとめ ###
    ${currentSummary}

    ### ユーザーの相談 ###
    ${message}
    
    以下の点について分析してください：
    - 主訴は何か
    - どのような状況で困っているのか
    - どのような解決を望んでいるのか
    
    意図の分析: ~~~`;

    const intentContent = await getIntentAnalysis(intentPrompt, apiKey);

    // 追加質問生成
    const followUpPrompt = `
    あなたはカウンセリングの専門家です。この相談をより良く理解し適切なアドバイスをするために、
    最も重要な1個の質問を提案してください。

    ### 会話のまとめ ###
    ${currentSummary}
    
    ### ユーザーの相談 ###
    ${message}
    
    ### 意図の分析 ###
    ${intentContent}
    
    追加質問案: ~~~`;

    const followUpContent = await getFollowUpQuestion(followUpPrompt, apiKey);

    // 最終的な回答生成
    // 最終的な回答生成
    const finalPrompt = `${KUKU_PROFILE}

    ### 会話のまとめ ###
    ${currentSummary}
    
    まず会話まとめから「チャット回数：X回目」の部分を確認し：
    - 1回目の場合：状況理解が浅いと判断
    - 2回目以降：状況理解ができていると判断
    
    1回目（状況理解が浅い）の場合：
    - 1つの質問を含める
    - 50~80文字で返答
    - 相手のことをもっと知りたい姿勢で
    
    2回目以降（状況理解ができている）の場合：
    - 具体的なアドバイスを含める
    - 200文字以内で返答
    - これまでの会話を踏まえた対応をしてください
    
    共通の注意点：
    - 絵文字や「！」を適切に使用
    - 相手に共感し、気持ちを代弁
    - 親しみやすい口調で
    - 不要な改行は避ける
    
    ユーザーの相談: '${message}'
    意図の分析: '${intentContent}'
    追加で確認したい質問: '${followUpContent}'
    
    ユーザーへの返答: ~~~`;

    return { 
        reply: await getFinalResponse(finalPrompt, apiKey),
        intentContent 
    };
}


// 情報提供の処理
async function handleInformation(userMessageData, apiKey) {
    console.log('\n=== 情報提供処理開始 ===');
    const { message, currentSummary } = userMessageData;

    // 1. 意図分析
    const intentPrompt = `
    あなたは子育ての専門家です。以下の情報を元に、ユーザーの質問について分析してください。

    ### 会話のまとめ ###
    ${currentSummary}

    ### ユーザーの質問 ###
    ${message}
    
    以下の点について分析してください：
    - どのような情報を求めているか
    - その情報をどのように活用したいのか
    - 情報の詳細度はどの程度求められているか
    - これまでの会話文脈から特に注目すべき点
    
    意図の分析: ~~~`;

    const intentContent = await getIntentAnalysis(intentPrompt, apiKey);

    // 2. 情報提供の最終的な回答生成
    const finalPrompt = `${KUKU_PROFILE}
    
    ### 会話のまとめ ###
    ${currentSummary}
    
    あなたはククちゃんとして、以下の情報をもとに、
    わかりやすく正確な情報提供を含む返答を生成してください。

    返答の際は以下の点に注意してください：
    - 具体的で実践的な情報を提供する
    - 科学的根拠のある情報を心がける
    - 必要に応じて、年齢や発達段階に応じた情報を提供する
    - 専門用語は避け、わかりやすい言葉で説明する
    - 絵文字を適切に使用して親しみやすさを演出する
    - フレンドリーな会話を意識する
    - 200文字程度で簡潔にまとめる
    - これまでの会話の流れを考慮した返答をする
    
    ユーザーの質問: '${message}'
    意図の分析: '${intentContent}'
    
    ユーザーへの返答: ~~~`;

    const reply = await getFinalResponse(finalPrompt, apiKey);
    return { reply, intentContent };
}

// 愚痴の処理
async function handleComplaint(userMessageData, apiKey) {
    console.log('\n=== 愚痴処理開始 ===');
    const { message, currentSummary } = userMessageData;

    // 1. 詳細な意図分析
    const intentPrompt = `
    あなたは共感的なカウンセラーです。以下の情報を元に、ユーザーの愚痴について詳細に分析してください。
    
    ### 会話のまとめ ###
    ${currentSummary}

    ### ユーザーの愚痴 ###
    ${message}
    
    特に以下の点を深く理解することに注力してください：
    - 表面的な不満だけでなく、その奥にある本質的な悩みや不安
    - 現在の感情状態（焦り、疲れ、不安、怒り、悲しみなど）
    - その感情の強さや深刻度
    - 言葉の裏にある本当の気持ち
    - 現状で最も辛いと感じている部分
    - どのような励ましや共感を求めているか
    - これまでの会話から見える継続的な悩みや不安
    
    意図の分析: ~~~`;

    const intentContent = await getIntentAnalysis(intentPrompt, apiKey);

    // 2. 共感的な返答の生成
    const finalPrompt = `${KUKU_PROFILE}
    
    ### 会話のまとめ ###
    ${currentSummary}
    
    あなたはククちゃんとして、以下の方針で返答を生成してください：

    重要な点：
    - 100文字程度の短い返答を心がける
    - 解決策の提案は絶対に避ける
    - 相手の気持ちをシンプルに受け止める
    - もっと相手の愚痴を引き出すような会話を心がける
    - 相手の状況がわかるような具体的な質問をしてもよいです
    - これまでの会話の流れを踏まえた労う返答をする
    
    ユーザーの愚痴: '${message}'
    意図の分析: '${intentContent}'
    
    ユーザーへの返答: ~~~`;

    const reply = await getFinalResponse(finalPrompt, apiKey);
    return { reply, intentContent };
}

// 承認の処理
async function handleApproval(userMessageData, apiKey) {
    console.log('\n=== 承認処理開始 ===');
    const { message, currentSummary } = userMessageData;

    // 1. 詳細な意図分析
    const intentPrompt = `
    あなたは子育ての専門家です。以下の情報を元に、ユーザーの発言について詳細に分析してください。
    
    ### 会話のまとめ ###
    ${currentSummary}

    ### ユーザーの発言 ###
    ${message}
    
    分析ポイント：
    - 承認を求めている具体的な行動や決定
    - その行動/決定に至った背景や理由
    - 不安や迷いのポイント
    - ユーザーの価値観や大切にしていること
    - 現在の感情状態（不安、迷い、罪悪感など）
    - 求めている承認の種類（決定の正当性、感情の正当性、努力の承認など）
    - これまでの会話から見える承認への期待
    
    意図の分析: ~~~`;

    const intentContent = await getIntentAnalysis(intentPrompt, apiKey);

    // 2. 承認メッセージの生成
    const finalPrompt = `${KUKU_PROFILE}
    
    ### 会話のまとめ ###
    ${currentSummary}
    
    あなたはククちゃんとして、親としての決定や感情を完全に受け入れ、承認する立場で回答してください。

    回答の構成：
    1. まず、相手の決定/感情を明確に受け入れ、承認する
    2. その決定/感情が正当である理由を具体的に説明
    3. 相手の努力や工夫を具体的に言語化して評価
    4. 相手の価値観や考えを支持
    5. 必要に応じて、同様の経験や気持ちを共有
    - 共感を示しつつ、100~200文字程度の短い返答を心がける
    - これまでの会話の流れを踏まえた承認を示す
    
    承認の示し方：
    - 「よく考えていらっしゃいますね」
    - 「そのように感じるのは当然です」
    - 「その決断は素晴らしいと思います」
    - 「ママ/パパとしての愛情を感じます」
    のような具体的な承認の言葉を使用
    
    注意点：
    - 相手の決定を否定したり、別の選択肢を提示したりしない
    - 「でも」「しかし」などの逆接を避ける
    - アドバイスではなく、承認に焦点を当てる
    - 温かく前向きな絵文字を適切に使用
    
    ユーザーの発言: '${message}'
    意図の分析: '${intentContent}'
    
    ユーザーへの返答: ~~~`;

    const reply = await getFinalResponse(finalPrompt, apiKey);
    return { reply, intentContent };
}

// 議論の処理
async function handleDiscussion(userMessageData, apiKey) {
    console.log('\n=== 議論処理開始 ===');
    const { message, currentSummary } = userMessageData;

    // 1. 詳細な意図分析
    const intentPrompt = `
    あなたは子育ての専門家です。以下の情報を元に、ユーザーの議論テーマについて詳細に分析してください。

    ### 会話のまとめ ###
    ${currentSummary}

    ### ユーザーの発言 ###
    ${message}

    分析ポイント：
    - 議論のメインテーマと関連する副次的テーマ
    - 議論の背景にある具体的な状況や懸念
    - ユーザーの現在の立場や考え方
    - 対立する可能性のある視点や意見
    - このテーマに関する一般的な誤解や偏見
    - 議論において考慮すべき子どもの年齢や発達段階
    - 家族構成や環境要因の影響
    - これまでの会話から見える価値観や考え方
    
    意図の分析: ~~~`;

    const intentContent = await getIntentAnalysis(intentPrompt, apiKey);

    // 2. 建設的な議論の展開
    const finalPrompt = `${KUKU_PROFILE}
    
    ### 会話のまとめ ###
    ${currentSummary}
    
    あなたはククちゃんとして、以下の方針で建設的な議論を展開してください：

    回答の構成：
    1. テーマの重要性を認識し、共感を示す
    2. 以下の視点から1～2点を提示
       - 子どもの発達段階による違い
       - 家庭環境による影響
       - 科学的研究や専門家の見解
       - 実践的な経験からの学び
       - 文化的・社会的な背景
    3. それぞれの選択肢のメリット・デメリット
    4. 個々の家庭の状況に応じた柔軟な対応の重要性
    5. 150~200文字程度の短い返答を必ず心がける
    
    議論の進め方：
    - 一方的な意見を押し付けない
    - 「正解」を提示するのではなく、考えるための視点を提供
    - 具体例を交えて説明
    - ポポちゃん（6歳）やピピちゃん（2歳）の経験を適切に共有
    - 温かく前向きな態度を維持
    - これまでの会話の流れを考慮した議論展開
    
    ユーザーの発言: '${message}'
    意図の分析: '${intentContent}'
    
    ユーザーへの返答: ~~~`;

    const reply = await getFinalResponse(finalPrompt, apiKey);
    return { reply, intentContent };
}

// 雑談の処理
async function handleChatting(userMessageData, apiKey) {
    console.log('\n=== 雑談処理開始 ===');
    const { message, currentSummary } = userMessageData;

    // 1. 会話の意図と文脈の理解
    const intentPrompt = `
    あなたは会話分析の専門家です。以下の情報を元に、ユーザーの発言を分析してください：

    ### 会話のまとめ ###
    ${currentSummary}

    ### ユーザーの発言 ###
    ${message}

    分析ポイント：
    - 話題の中心テーマ（子育ての喜び、成長の様子、日常の出来事など）
    - 会話のtone（嬉しい、楽しい、自慢げ、心配など）
    - 共有したい感情や経験
    - 会話を発展させられそうな要素
    - ユーザーの興味・関心が感じられる部分
    - これまでの会話から見える関心事や話題の方向性
    
    意図の分析: ~~~`;

    const intentContent = await getIntentAnalysis(intentPrompt, apiKey);

    // 2. 自然な会話の生成
    const finalPrompt = `${KUKU_PROFILE}
    
    ### 会話のまとめ ###
    ${currentSummary}
    
    あなたはククちゃんとして、以下の方針で返答を生成してください：

    回答の構成：
    1. 話題への共感や興味を示す
    2. 関連する経験や考えを1-2つ共有
    3. 相手の話を引き出す質問を1つ含める
    4. 150文字程度を目安に会話を膨らませる
    
    注意点：
    - 押しつけがましくならない
    - 相手の考えを引き出す質問で終える
    - これまでの会話の流れを活かした展開を心がける
    - 温かみのある表現を使用
    - 適度な絵文字の使用

    ユーザーの発言: '${message}'
    意図の分析: '${intentContent}'
    
    ユーザーへの返答: ~~~`;

    const reply = await getFinalResponse(finalPrompt, apiKey);
    return { reply, intentContent };
}





// メインのハンドラー関数を修正
export default async function handler(req, res) {
    // CORSヘッダーを追加
    res.setHeader('Access-Control-Allow-Origin', 'https://souchan917.github.io');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-ID');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    console.log('\n====== チャット処理開始 ======');
    const { userMessage, conversationSummary } = req.body;
    console.log('受信メッセージ:', userMessage);
    console.log('会話まとめ:', conversationSummary);

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEYが設定されていません');
        return res.status(500).json({ error: 'サーバーの設定エラー: APIキーが設定されていません。' });
    }

    try {
        // メッセージの分類
        console.log('\n[1] メッセージ分類開始');
        const classificationPrompt = CLASSIFICATION_PROMPT
            .replace('{conversationSummary}', conversationSummary || '会話開始')
            .replace('{currentMessage}', userMessage);

        const classificationResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: classificationPrompt }],
                temperature: 0.1,
                max_tokens: 10
            })
        });

        if (!classificationResponse.ok) {
            throw new Error(`分類APIエラー: ${classificationResponse.statusText}`);
        }

        const classificationData = await classificationResponse.json();
        const messageType = classificationData.choices[0].message.content.trim();
        console.log('\n分類結果:', messageType);

        // メッセージ処理
        const messageData = { 
            message: userMessage, 
            currentSummary: conversationSummary 
        };
        
        let reply, intentContent;
        

        // 分類に基づいて処理を分岐
        switch (messageType) {
            case '相談': {
                const result = await handleConsultation(messageData, apiKey);
                reply = result.reply;
                intentContent = result.intentContent;
                break;
            }
            case '情報': {
                const result = await handleInformation(messageData, apiKey);
                reply = result.reply;
                intentContent = result.intentContent;
                break;
            }
            case '愚痴': {
                const result = await handleComplaint(messageData, apiKey);
                reply = result.reply;
                intentContent = result.intentContent;
                break;
            }
            case '承認': {
                const result = await handleApproval(messageData, apiKey);
                reply = result.reply;
                intentContent = result.intentContent;
                break;
            }
            case '議論': {
                const result = await handleDiscussion(messageData, apiKey);
                reply = result.reply;
                intentContent = result.intentContent;
                break;
            }
            case '雑談': {
                const result = await handleChatting(messageData, apiKey);
                reply = result.reply;
                intentContent = result.intentContent;
                break;
            }
            default: {
                console.log(`未知のメッセージタイプ: ${messageType}, 雑談として処理します`);
                const result = await handleChatting(messageData, apiKey);
                reply = result.reply;
                intentContent = result.intentContent;
                break;
            }
        }

        // 会話まとめの生成
        const newSummary = await generateConversationSummary(
            messageData,
            messageType,
            intentContent,
            reply,
            apiKey
        );

        // 結果を返す
        console.log('\n[4] 最終結果:', { 
            type: messageType, 
            reply: reply,
            summary: newSummary 
        });
        console.log('====== チャット処理完了 ======\n');

        res.status(200).json({
            reply: reply,
            type: messageType,
            summary: newSummary
        });

    } catch (error) {
        console.error("チャットフロー内でエラー:", error);
        
        const errorMessage = {
            message: "うまく処理できませんでした。もう一度「送信」を押してください。",
            messageType: "error",
            timestamp: new Date().toISOString()
        };
        
        res.status(500).json(errorMessage);
    } finally {
        state.isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
        loadingState.style.display = "none";
    }
}

// 意図推定用のGPT応答関数
async function getIntentAnalysis(prompt, apiKey) {
    console.group('\n=== 意図分析ステップ ===');
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
                model: 'gpt-4o-mini',
                // model: 'gpt-3.5-turbo-1106',  // gpt-4o-miniから変更
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,  // より正確な分析のため低めに
                max_tokens: 175    // 詳細な分析のため増量
            })
        });

        if (!response.ok) {
            throw new Error(`GPT APIエラー: ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim();
        
        console.log('\nAIからの意図分析:');
        console.log(result);
        console.groupEnd();
        
        return result;

    } catch (error) {
        console.error('意図分析エラー:', error);
        console.groupEnd();
        throw error;
    }
}

// 追加質問生成用のGPT応答関数
async function getFollowUpQuestion(prompt, apiKey) {
    console.group('\n=== 追加質問生成ステップ ===');
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
                model: 'gpt-4o-mini',
                // model: 'gpt-3.5-turbo-1106',  // gpt-4o-miniから変更
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,  // 適度な創造性のため
                max_tokens: 50    // 質問は簡潔に
            })
        });

        if (!response.ok) {
            throw new Error(`GPT APIエラー: ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim();
        
        console.log('\n生成された追加質問:');
        console.log(result);
        console.groupEnd();
        
        return result;

    } catch (error) {
        console.error('追加質問生成エラー:', error);
        console.groupEnd();
        throw error;
    }
}

// 最終回答生成用のGPT応答関数
async function getFinalResponse(prompt, apiKey) {
    console.group('\n=== 最終回答生成ステップ ===');
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
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.6,  // 自然な応答のため
                max_tokens: 300    // 十分な長さの回答のため増量
            })
        });

        if (!response.ok) {
            throw new Error(`GPT APIエラー: ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim();
        
        console.log('\n生成された最終回答:');
        console.log(result);
        console.groupEnd();
        
        return result;

    } catch (error) {
        console.error('最終回答生成エラー:', error);
        console.groupEnd();
        throw error;
    }
}

// まとめ生成用のGPT応答関数（単一の定義に統一）
async function generateConversationSummary(userMessageData, messageType, intentContent, aiResponse, apiKey) {
    console.group('\n=== まとめ生成ステップ ===');
    
    try {
        // 現在の会話まとめを取得
        let currentSummary = userMessageData.currentSummary || '会話開始';
        
        // まとめ生成用のプロンプトを準備
        const summaryPrompt = SUMMARY_PROMPT
            .replace('{userMessage}', userMessageData.message)
            .replace('{messageType}', messageType)
            .replace('{intentContent}', intentContent)
            .replace('{aiResponse}', aiResponse)
            .replace('{currentSummary}', currentSummary);

        console.log('プロンプト内容:');
        console.log(summaryPrompt);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                // model: 'gpt-3.5-turbo-1106',  // gpt-4o-miniから変更
                messages: [{ role: 'user', content: summaryPrompt }],
                temperature: 0.2,  // 一貫性のため低めに
                max_tokens: 150    // まとめ用に適度な長さ
            })
        });

        if (!response.ok) {
            throw new Error(`会話まとめ生成APIエラー: ${response.statusText}`);
        }

        const data = await response.json();
        const result = data.choices[0].message.content.trim();
        
        console.log('\n生成されたまとめ:');
        console.log(result);
        console.groupEnd();
        
        return result;

    } catch (error) {
        console.error('まとめ生成エラー:', error);
        console.groupEnd();
        return userMessageData.currentSummary || '会話まとめの生成に失敗しました';
    }
}

export {
    getIntentAnalysis,
    getFollowUpQuestion,
    getFinalResponse,
    generateConversationSummary
};