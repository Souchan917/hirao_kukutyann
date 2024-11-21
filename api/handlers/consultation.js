// handlers/consultation.js

export async function handleConsultation(userInput, apiKey, KUKU_PROFILE, KUKU_NAME) {
    console.log("Starting consultation handling for input:", userInput);
    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    try {
        // 1. 意図の分析
        console.log("Analyzing intent...");
        const intentPrompt = 
            "あなたはカウンセリングの専門家です。以下のユーザーの質問に含まれている意図を詳細に分析してください。" +
            "ユーザーが質問を通じてどのようなサポートやアドバイスを期待しているのかを具体的に説明し、その背景や目的についても考察してください。" +
            "また、質問の背後にある感情や動機についても考え、それがどのようにユーザーの期待や要求に影響を与えているかを分析してください。" +
            "最終的に、ユーザーがどのような返答や行動を求めているかを推測してください。" +
            "この分析を通じて、ユーザーの質問の真の意図と、それに対する最も適切な応答を明確にすることを目指します。\n\n" +
            `ユーザーの質問: '${userInput}'\n\n` +
            "意図の分析: ~~~";

        const intentResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": intentPrompt}]
            })
        });

        const intentData = await intentResponse.json();
        const intentContent = intentData.choices[0].message.content.trim();
        console.log("Intent analysis completed");

        // 2. 追加質問の提案
        console.log("Generating follow-up questions...");
        const followUpPrompt = 
            "あなたはカウンセリングの専門家です。以下のユーザーの質問に対して以下を分析してください。" +
            "ユーザーの質問に対して不足している環境や行動に関する情報を特定し、以下の点を踏まえつつ重要と判断される追加質問を2~3個提案してください。" +
            "具体的に、ユーザーが提供していないが必要となる詳細な情報を特定し、それに基づいて質問を作成してください。\n\n" +
            `ユーザーの質問: '${userInput}'\n` +
            `意図の分析: '${intentContent}'\n\n` +
            "追加質問の提案: ~~~";

        const followUpResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "system", "content": followUpPrompt}]
            })
        });

        const followUpData = await followUpResponse.json();
        const followUpContent = followUpData.choices[0].message.content.trim();
        console.log("Follow-up questions generated");

        // 3. 最終応答の生成
        console.log("Generating final response...");
        const responsePrompt = 
            `以下の情報をもとに、${KUKU_PROFILE}\n\n${KUKU_NAME}として、` +
            "ユーザーへの共感的で支援的な返答をわかりやすく簡潔に生成してください。" +
            "また、ユーザーが提供した情報に基づいて具体的なアドバイスを行い、必要な場合は追加の質問をしてください。\n" +
            `ユーザーの質問: '${userInput}'\n` +
            `意図の分析: '${intentContent}'\n` +
            `追加の質問提案: ${followUpContent}\n\n` +
            "ユーザーへの返答: ~~~";

        const responseDataResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                "model": "gpt-4-turbo",
                "messages": [{"role": "system", "content": responsePrompt}]
            })
        });

        const responseData = await responseDataResponse.json();
        const finalResponse = responseData.choices[0].message.content.trim();
        console.log("Final response generated");

        return {
            response: finalResponse,
            analysis: {
                intent: intentContent,
                followUp: followUpContent
            }
        };

    } catch (error) {
        console.error("Error in consultation handler:", error);
        throw new Error("Consultation handling failed: " + error.message);
    }
}