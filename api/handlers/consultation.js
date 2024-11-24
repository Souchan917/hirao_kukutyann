// handlers/consultation.js
export async function handleConsultation(userInput, apiKey, KUKU_PROFILE) {
    console.log("Starting consultation handling for input:", userInput);
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    try {
        // 1. 意図の分析
        console.log("Analyzing intent...");
        const intentResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                "model": "gpt-3.5-turbo",
                "messages": [{
                    "role": "user", 
                    "content": `あなたはカウンセリングの専門家です。以下のユーザーの質問の意図を分析してください：\n${userInput}`
                }]
            })
        });

        const intentData = await intentResponse.json();
        const intentContent = intentData.choices[0].message.content.trim();

        // 2. 最終応答の生成
        console.log("Generating final response...");
        const responsePrompt = 
            `${KUKU_PROFILE}\n\n` +
            `ユーザーの質問: ${userInput}\n` +
            `質問の意図: ${intentContent}\n\n` +
            "上記を踏まえて、ククちゃんとして返答してください。";

        const responseDataResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "system", "content": responsePrompt}]
            })
        });

        const responseData = await responseDataResponse.json();
        const reply = responseData.choices[0].message.content.trim();

        return {
            reply,
            analysis: {
                intent: intentContent
            }
        };

    } catch (error) {
        console.error("Error in consultation handler:", error);
        return {
            reply: "申し訳ありません。うまく返答できませんでした。もう一度お話を聞かせていただけますか？ 💦",
            error: error.message
        };
    }
}