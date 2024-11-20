// frontend-chat.js
import { saveMessage, getChatHistory } from '../libs/firebaseUtils.js';

const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");

let isSubmitting = false;

// 初期読み込み時にチャット履歴を表示
async function loadChatHistory() {
    try {
        const messages = await getChatHistory(3); // questionId = 3
        chatContainer.innerHTML = ''; // 既存のメッセージをクリア
        messages.forEach(msg => {
            addMessage(msg.message, msg.type);
        });
    } catch (error) {
        console.error('チャット履歴の読み込みに失敗:', error);
        addMessage('チャット履歴の読み込みに失敗しました。', 'system');
    }
}

async function sendMessage() {
    if (isSubmitting) return;

    const message = questionInput.value.trim();
    if (!message) {
        alert("質問を入力してください。");
        return;
    }

    isSubmitting = true;
    questionInput.disabled = true;
    sendButton.disabled = true;

    try {
        // ユーザーのメッセージをFirestoreに保存
        await saveMessage(message, 'user', 3);
        addMessage(message, "user");

        // AI応答を取得
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userMessage: message, questionId: 3 })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // AIの応答をFirestoreに保存
        await saveMessage(data.reply, 'ai', 3);
        addMessage(data.reply, "ai");

    } catch (error) {
        console.error("Error:", error);
        addMessage("エラーが発生しました。もう一度お試しください。", "system");
    } finally {
        isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.value = "";
    }
}

function addMessage(content, type) {
    const messageDiv = document.createElement("div");
    messageDiv.textContent = content;
    messageDiv.className = `message ${type}-message`;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function resetChat() {
    if (confirm("チャットをリセットしてもよろしいですか？")) {
        chatContainer.innerHTML = "";
    }
}

// イベントリスナーの設定
sendButton.addEventListener("click", sendMessage);
resetButton.addEventListener("click", resetChat);
questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// ページ読み込み時にチャット履歴を読み込む
document.addEventListener('DOMContentLoaded', loadChatHistory);