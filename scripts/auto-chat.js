// auto-chat.js
import { saveMessage, saveSummaryData } from "../libs/firebase.js";

const questions = [
    "夜泣きが続いて困っています",
    "離乳食の進め方について教えてください",
    "子どもの発熱時の対処法を教えてください",
    "トイレトレーニングのコツは？",
    "イヤイヤ期の対処法について"
];

async function processQuestion(question, maxRetries = 3) {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            const sessionId = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log(`処理中: "${question}"`);
            
            await saveMessage(question, "user", sessionId);

            const response = await fetch("http://localhost:3000/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Session-ID": sessionId
                },
                body: JSON.stringify({
                    userMessage: question,
                    conversationSummary: ""
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            
            const aiMessageContent = {
                message: data.reply,
                messageType: data.type,
                timestamp: new Date().toISOString()
            };
            await saveMessage(JSON.stringify(aiMessageContent), "ai", sessionId);

            const summaryData = {
                chatHistory: [
                    {
                        content: question,
                        type: "user",
                        timestamp: new Date().toISOString()
                    },
                    {
                        content: data.reply,
                        type: "ai",
                        messageType: data.type,
                        timestamp: new Date().toISOString()
                    }
                ],
                conversationSummary: data.summary
            };
            await saveSummaryData(sessionId, summaryData);

            console.log(`✅ 成功: "${question}"`);
            return true;

        } catch (error) {
            attempts++;
            console.error(`❌ 失敗 (${attempts}/${maxRetries}):`, error);
            
            if (attempts < maxRetries) {
                const waitTime = Math.pow(2, attempts) * 1000;
                console.log(`⏳ ${waitTime/1000}秒後に再試行...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    return false;
}

async function simulateChat() {
    console.log(`=== 開始 - ${questions.length}件 ===`);
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`\n[${i + 1}/${questions.length}]`);
        
        const success = await processQuestion(question);
        if (success) {
            processed++;
            if (i < questions.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } else {
            failed++;
        }
    }

    console.log(`\n=== 完了: 成功=${processed}, 失敗=${failed} ===`);
}

simulateChat().catch(console.error);