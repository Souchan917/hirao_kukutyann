import fetch from "node-fetch";

export default async (req, res) => {
    console.log("--- API Endpoint Called ---");
    console.log("Request body:", req.body);

    const { userMessage } = req.body;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error("OPENAI_API_KEY is not set");
        return res.status(500).json({ error: "サーバーの設定エラー: APIキーが設定されていません。" });
    }

    try {
        // 1. 分類プロセス
        console.log("Classifying user input...");
        const classifyPrompt = `
            以下のユーザーの質問を「相談」「情報」「愚痴」「承認」「議論」「雑談」のいずれかに分類してください。
            ユーザーの質問: '${userMessage}'
            分類:
        `;

        const classifyResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: classifyPrompt }],
                max_tokens: 50,
            }),
        });

        if (!classifyResponse.ok) {
            const errorData = await classifyResponse.json();
            console.error("Classification API error details:", errorData);
            throw new Error(`Classification API error: ${classifyResponse.statusText}`);
        }

        const classifyData = await classifyResponse.json();
        const classification = classifyData.choices[0].message.content.trim().toLowerCase();
        console.log("Classification result:", classification);

        // 2. 応答生成プロセス
        console.log("Generating response based on classification...");
        const responsePrompt = `
            ユーザーの質問: '${userMessage}'
            質問の分類: '${classification}'
            この分類に基づいて適切な応答を作成してください。応答は共感的で、200文字以内に収めてください。
        `;

        const responseGeneration = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: responsePrompt }],
                max_tokens: 200,
            }),
        });

        if (!responseGeneration.ok) {
            const errorData = await responseGeneration.json();
            console.error("Response generation API error details:", errorData);
            throw new Error(`Response generation API error: ${responseGeneration.statusText}`);
        }

        const responseData = await responseGeneration.json();
        const finalResponse = responseData.choices[0].message.content.trim();
        console.log("Generated response:", finalResponse);

        // 最終応答を返す
        res.status(200).json({ reply: finalResponse, classification });
    } catch (error) {
        console.error("Error in chat endpoint:", error);
        res.status(500).json({
            error: "AIからの応答の取得に失敗しました",
            details: error.message,
        });
    }
};
