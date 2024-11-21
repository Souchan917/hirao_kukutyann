// handlers/complaint.js
export async function handleComplaint(userInput, apiKey, KUKU_PROFILE) {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    try {
        // 愚痴は共感と受容が重要なので、直接応答を生成
        const responsePrompt = 
            `${KUKU_PROFILE}\n\n### 傾聴モード ###\n` +
            "以下のユーザーの愚痴に対して、深い共感と理解を示しながら、優しく受け止める返答を生成してください。\n" +
            "返答には必ず以下の要素を含めてください：\n" +
            "- ユーザーの感情への共感\n" +
            "- 経験に基づく理解\n" +
            "- 励ましの言葉\n\n" +
            `ユーザーの愚痴: '${userInput}'\n\n` +
            "返答: ~~~";

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "system", "content": responsePrompt}],
                "temperature": 0.7,
                "max_tokens": 200
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content.trim();

        return {
            reply: reply,
            analysis: null
        };

    } catch (error) {
        console.error("Error in complaint handler:", error);
        throw new Error("Complaint handling failed: " + error.message);
    }
}

// handlers/information.js
export async function handleInformation(userInput, apiKey, KUKU_PROFILE) {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    try {
        const responsePrompt = 
            `${KUKU_PROFILE}\n\n### 情報提供モード ###\n` +
            "以下のユーザーの質問に対して、正確で分かりやすい情報を提供してください。\n" +
            "返答には以下の要素を含めてください：\n" +
            "- 具体的な情報や知識\n" +
            "- 分かりやすい例示\n" +
            "- 実践的なアドバイス\n\n" +
            `ユーザーの質問: '${userInput}'\n\n` +
            "返答: ~~~";

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "system", "content": responsePrompt}],
                "temperature": 0.5,
                "max_tokens": 200
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content.trim();

        return {
            reply: reply,
            analysis: null
        };

    } catch (error) {
        console.error("Error in information handler:", error);
        throw new Error("Information handling failed: " + error.message);
    }
}

// handlers/approval.js
export async function handleApproval(userInput, apiKey, KUKU_PROFILE) {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    try {
        const responsePrompt = 
            `${KUKU_PROFILE}\n\n### 承認モード ###\n` +
            "以下のユーザーの考えや行動に対して、肯定的な評価と支持を示す返答を生成してください。\n" +
            "返答には以下の要素を含めてください：\n" +
            "- 具体的な良い点の指摘\n" +
            "- 努力や工夫への評価\n" +
            "- 前向きな励まし\n\n" +
            `ユーザーの投稿: '${userInput}'\n\n` +
            "返答: ~~~";

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "system", "content": responsePrompt}],
                "temperature": 0.6,
                "max_tokens": 200
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content.trim();

        return {
            reply: reply,
            analysis: null
        };

    } catch (error) {
        console.error("Error in approval handler:", error);
        throw new Error("Approval handling failed: " + error.message);
    }
}

// handlers/discussion.js
export async function handleDiscussion(userInput, apiKey, KUKU_PROFILE) {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    try {
        const responsePrompt = 
            `${KUKU_PROFILE}\n\n### 議論モード ###\n` +
            "以下のユーザーの意見に対して、建設的で多角的な視点を提供する返答を生成してください。\n" +
            "返答には以下の要素を含めてください：\n" +
            "- 複数の観点からの考察\n" +
            "- 具体的な事例や経験\n" +
            "- 建設的な意見交換\n\n" +
            `ユーザーの意見: '${userInput}'\n\n` +
            "返答: ~~~";

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "system", "content": responsePrompt}],
                "temperature": 0.6,
                "max_tokens": 200
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content.trim();

        return {
            reply: reply,
            analysis: null
        };

    } catch (error) {
        console.error("Error in discussion handler:", error);
        throw new Error("Discussion handling failed: " + error.message);
    }
}

// handlers/chatting.js
export async function handleChatting(userInput, apiKey, KUKU_PROFILE) {
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    try {
        const responsePrompt = 
            `${KUKU_PROFILE}\n\n### 雑談モード ###\n` +
            "以下のユーザーの話題に対して、親しみやすく楽しい雰囲気の返答を生成してください。\n" +
            "返答には以下の要素を含めてください：\n" +
            "- 明るく前向きな反応\n" +
            "- 共感的な応答\n" +
            "- 自然な会話の展開\n\n" +
            `ユーザーの話題: '${userInput}'\n\n` +
            "返答: ~~~";

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "system", "content": responsePrompt}],
                "temperature": 0.7,
                "max_tokens": 200
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content.trim();

        return {
            reply: reply,
            analysis: null
        };

    } catch (error) {
        console.error("Error in chatting handler:", error);
        throw new Error("Chatting handling failed: " + error.message);
    }
}