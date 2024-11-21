// frontend-chat.js
import { saveMessage, getChatHistory } from "../libs/firebase.js";

console.log("=== frontend-chat.js 読み込み開始 ===");

const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");
const MAX_RETRIES = 3;
const POLLING_INTERVAL = 1000;

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
        alert("メッセージを入力してください。");
        return;
    }

    console.log("メッセージ送信プロセス開始");
    isSubmitting = true;
    setUIState(true);
    addMessage(message, "user");
    showTypingIndicator();

    try {
        // Firebaseへのユーザーメッセージ保存
        try {
            console.log("Firebaseにユーザーメッセージを保存中...");
            await saveMessage(message, "user", 3);
            console.log("Firebaseにユーザーメッセージが保存されました");
        } catch (error) {
            console.error("Firebaseにユーザーメッセージの保存失敗:", error);
        }

        // 初期リクエストの送信
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const initData = await response.json();
        console.log("初期レスポンス:", initData);

        if (initData.status === 'processing' && initData.requestId) {
            // ポーリングによる結果の取得
            const result = await pollForResponse(initData.requestId);
            hideTypingIndicator();
            addMessage(result.reply, "ai");

            // AI応答のFirebase保存
            try {
                await saveMessage(result.reply, "ai", 3);
                console.log("FirebaseにAI応答が保存されました");
            } catch (error) {
                console.error("FirebaseにAI応答の保存失敗:", error);
            }
        } else {
            // 従来の直接レスポンス処理
            hideTypingIndicator();
            addMessage(initData.reply, "ai");
        }

    } catch (error) {
        console.error("チャットフロー内でエラーが発生:", error);
        hideTypingIndicator();
        addMessage("申し訳ありません。エラーが発生しました。もう一度お試しください。", "error");
    } finally {
        cleanup();
    }
}

async function pollForResponse(requestId, attempt = 0) {
    if (attempt >= MAX_RETRIES) {
        throw new Error('応答取得がタイムアウトしました');
    }

    try {
        const response = await fetch(`${apiUrl}?requestId=${requestId}`);
        const data = await response.json();

        if (data.status === 'completed') {
            return data;
        }

        if (data.status === 'error') {
            throw new Error(data.error || '処理中にエラーが発生しました');
        }

        // 処理中の場合は待機して再試行
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
        return pollForResponse(requestId, attempt + 1);

    } catch (error) {
        console.error("ポーリングエラー:", error);
        throw error;
    }
}

function addMessage(content, type) {
    console.log("addMessage関数:", { content, type });
    const messageDiv = document.createElement("div");
    const timestamp = new Date().toLocaleTimeString();
    
    messageDiv.className = `message ${type}-message`;
    messageDiv.innerHTML = `
        <div class="message-content">${content}</div>
        <div class="message-timestamp">${timestamp}</div>
    `;
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    console.log("メッセージをチャットに追加しました:", content);
}

function showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.id = "typing-indicator";
    typingDiv.className = "message ai-message typing";
    typingDiv.textContent = "ククちゃんが考え中...";
    chatContainer.appendChild(typingDiv);
    scrollToBottom();
}

function hideTypingIndicator() {
    const typingDiv = document.getElementById("typing-indicator");
    if (typingDiv) {
        typingDiv.remove();
    }
}

function setUIState(disabled) {
    questionInput.disabled = disabled;
    sendButton.disabled = disabled;
}

function cleanup() {
    isSubmitting = false;
    setUIState(false);
    questionInput.value = "";
    questionInput.focus();
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function resetChat() {
    console.log("リセットがトリガーされました");
    if (confirm("チャット履歴をリセットしてもよろしいですか？")) {
        chatContainer.innerHTML = "";
        console.log("チャット履歴をリセットしました");
    }
}

// イベントリスナーの設定
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
    if (e.key === "Enter" && !e.shiftKey) {
        console.log("Enterキーが押されました");
        e.preventDefault();
        sendMessage();
    }
});

// 入力監視
questionInput.addEventListener("input", () => {
    sendButton.disabled = questionInput.value.trim() === "";
});

// 初期化処理
async function initialize() {
    try {
        const history = await getChatHistory();
        if (history && history.length > 0) {
            history.forEach(msg => addMessage(msg.content, msg.type));
        }
        console.log("チャット履歴を読み込みました");
    } catch (error) {
        console.error("チャット履歴の読み込みに失敗:", error);
    }
}

initialize();
console.log("=== frontend-chat.js 読み込み終了 ===");