// frontend-chat.js
import { saveMessage, getChatHistory } from "../libs/firebaseUtils.js";


console.log("=== frontend-chat.js 読み込み開始 ===");

const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");

console.log("DOM要素の確認:", {
    chatContainer,
    questionInput,
    sendButton,
    resetButton
});

let isSubmitting = false;

async function sendMessage() {
    console.log("=== sendMessage 関数開始 ===");

    if (isSubmitting) {
        console.log("送信中のため処理をスキップします");
        return;
    }

    const message = questionInput.value.trim();
    console.log("入力されたメッセージ:", message);

    if (!message) {
        console.log("メッセージが空です");
        alert("Please enter a question.");
        return;
    }

    console.log("メッセージ送信プロセス開始");
    isSubmitting = true;
    questionInput.disabled = true;
    sendButton.disabled = true;

    console.log("UIを無効化しました");
    addMessage(message, "user");

    // Firebaseへの保存を非同期で試みる（エラーが発生しても続行）
    try {
        console.log("Firebaseにユーザーメッセージを保存中...");
        await saveMessage(message, "user", 3);
        console.log("Firebaseにユーザーメッセージが保存されました");
    } catch (error) {
        console.error("Firebaseにユーザーメッセージの保存失敗:", error);
        // Firebase保存エラーは無視して続行
    }

    try {
        console.log("APIにリクエスト送信中...");
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userMessage: message, questionId: 3 })
        });

        console.log("APIレスポンスステータス:", response.status);

        if (!response.ok) {
            console.error("APIエラー:", response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("APIからのデータ:", data);

        console.log("AIからの応答をチャットに追加します");
        addMessage(data.reply, "ai");

        // AI応答もFirebaseに保存
        try {
            console.log("FirebaseにAI応答を保存中...");
            await saveMessage(data.reply, "ai", 3);
            console.log("FirebaseにAI応答が保存されました");
        } catch (error) {
            console.error("FirebaseにAI応答の保存失敗:", error);
            // Firebase保存エラーは無視
        }
    } catch (error) {
        console.error("チャットフロー内でエラーが発生:", error);
        addMessage("An error occurred. Please try again later.", "ai");
    } finally {
        console.log("UIをリセットします");
        isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.value = "";
        console.log("=== sendMessage 関数終了 ===");
    }
}

function addMessage(content, type) {
    console.log("addMessage関数:", { content, type });
    const messageDiv = document.createElement("div");
    messageDiv.textContent = content;
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    console.log("メッセージをチャットに追加しました:", content);
}

function resetChat() {
    console.log("リセットがトリガーされました");
    if (confirm("Are you sure you want to reset the chat?")) {
        chatContainer.innerHTML = "";
        console.log("チャット履歴をリセットしました");
    }
}

console.log("イベントリスナーを設定します");
sendButton.addEventListener("click", () => {
    console.log("送信ボタンがクリックされました");
    sendMessage();
});
resetButton.addEventListener("click", () => {
    console.log("リセットボタンがクリックされました");
    resetChat();
});
questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        console.log("Enterキーが押されました");
        sendMessage();
    }
});

console.log("=== frontend-chat.js 読み込み終了 ===");
