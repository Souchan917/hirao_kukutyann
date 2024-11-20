// frontend-chat.js
import { db } from '../libs/firebase.js';
import { saveMessage, getChatHistory } from '../libs/firebaseUtils.js';

const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");

let isSubmitting = false;

// チャット履歴の読み込み
async function loadChatHistory() {
    console.log('チャット履歴の読み込み開始');
    try {
        const messages = await getChatHistory(3);
        console.log('取得したチャット履歴:', messages);
        messages.forEach(msg => {
            addMessage(msg.message, msg.type);
        });
    } catch (error) {
        console.error('チャット履歴の読み込みエラー:', error);
    }
}

async function sendMessage() {
    console.log('メッセージ送信開始');
    if (isSubmitting) return;

    const message = questionInput.value.trim();
    if (!message) {
        alert("Please enter a question.");
        return;
    }

    isSubmitting = true;
    questionInput.disabled = true;
    sendButton.disabled = true;

    try {
        // ユーザーメッセージをFirestoreに保存
        console.log('ユーザーメッセージの保存開始:', message);
        await saveMessage(message, 'user', 3);
        addMessage(message, "user");

        // AI応答の取得
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
        console.log('AI応答の受信:', data.reply);
        
        // AIの応答をFirestoreに保存
        await saveMessage(data.reply, 'ai', 3);
        addMessage(data.reply, "ai");
    } catch (error) {
        console.error("エラー発生:", error);
        addMessage("An error occurred. Please try again later.", "ai");
    } finally {
        isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.value = "";
    }
}

function addMessage(content, type) {
    console.log('メッセージ追加:', { type, content: content.substring(0, 50) });
    const messageDiv = document.createElement("div");
    messageDiv.textContent = content;
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function resetChat() {
    if (confirm("Are you sure you want to reset the chat?")) {
        chatContainer.innerHTML = "";
    }
}

// イベントリスナーの設定
sendButton.addEventListener("click", sendMessage);
resetButton.addEventListener("click", resetChat);
questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// 初期読み込み時にチャット履歴を取得
document.addEventListener('DOMContentLoaded', loadChatHistory);

console.log('frontend-chat.js の初期化完了');