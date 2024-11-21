import fetch from "node-fetch";

// ククちゃんのプロファイル情報
const KUKU_NAME = "ククちゃん";
const KUKU_PROFILE = `あなたは子育ての相談にのる先輩、"ククちゃん"として会話を行います。... (省略)`;

// ハンドラー関数のインポート
import { handleConsultation } from "../handlers/consultation";
import { handleChatting } from "../handlers/chatting";
import { handleComplaint } from "../handlers/complaint";
import { handleDiscussion } from "../handlers/discussion";
import { handleInformation } from "../handlers/information";
import { handleApproval } from "../handlers/approval";

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
        // 質問の分類を行う
        console.log("Classifying user input...");
        const classifyPrompt = `
            あなたはカウンセリングの専門家です。以下のユーザーの質問を「相談」「情報」「愚痴」「承認」「議論」「雑談」のいずれかに分類してください。
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
            throw new Error(`Classification API error: ${classifyResponse.statusText}`);
        }

        const classifyData = await classifyResponse.json();
        const classification = classifyData.choices[0].message.content.trim().toLowerCase();
        console.log("Classification result:", classification);

        // 分類に応じた処理を実行
        let response = "";
        switch (classification) {
            case "相談":
                response = await handleConsultation(userMessage, apiKey, KUKU_PROFILE, KUKU_NAME);
                break;
            case "情報":
                response = await handleInformation(userMessage, apiKey);
                break;
            case "愚痴":
                response = await handleComplaint(userMessage, apiKey);
                break;
            case "承認":
                response = await handleApproval(userMessage, apiKey);
                break;
            case "議論":
                response = await handleDiscussion(userMessage, apiKey);
                break;
            case "雑談":
                response = await handleChatting(userMessage, apiKey);
                break;
            default:
                response = "申し訳ありませんが、その質問にはお答えできません。";
                break;
        }

        console.log("Generated response:", response);
        res.status(200).json({ reply: response });
    } catch (error) {
        console.error("Error in chat endpoint:", error);
        res.status(500).json({
            error: "AIからの応答の取得に失敗しました",
            details: error.message,
        });
    }
};
