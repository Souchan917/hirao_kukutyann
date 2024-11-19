// frontend-chat.js
import { saveMessage, getChatHistory } from '../libs/firebaseUtils';

const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");

let isSubmitting = false;

// 初期読み込み時にチャット履歴を取得
async function loadChatHistory() {
    try {
        const messages = await getChatHistory(3); // questionId = 3
        chatContainer.innerHTML = ''; // Clear existing messages
        messages.forEach(msg => {
            addMessage(msg.message, msg.type);
        });
    } catch (error) {
        console.error('Error loading chat history:', error);
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
        // ユーザーメッセージをFirestoreに保存
        await saveMessage(message, 'user', 3);
        addMessage(message, "user");

        const response = await fetch("/api/chat", {
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

// イベントリスナーの設定
sendButton.addEventListener("click", sendMessage);
resetButton.addEventListener("click", () => {
    if (confirm("チャットをリセットしてもよろしいですか？")) {
        chatContainer.innerHTML = "";
    }
});
questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// 初期読み込み時にチャット履歴を取得
document.addEventListener('DOMContentLoaded', loadChatHistory);