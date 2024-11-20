// scripts/frontend-chat.js
import { saveMessage, getChatHistory } from '../libs/firebaseUtils.js';

const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");

let isSubmitting = false;

// 初期ロード時にチャット履歴を取得
async function loadChatHistory() {
    console.log('Loading chat history...');
    try {
        const messages = await getChatHistory(3); // questionId: 3
        console.log('Loaded chat history:', messages);
        
        messages.forEach(msg => {
            addMessage(msg.message, msg.type);
        });
    } catch (error) {
        console.error('Error loading chat history:', error);
        alert('チャット履歴の読み込みに失敗しました');
    }
}

async function sendMessage() {
    console.log('Send message triggered');
    if (isSubmitting) {
        console.log('Already submitting, returning');
        return;
    }

    const message = questionInput.value.trim();
    if (!message) {
        console.log('Empty message, showing alert');
        alert("質問を入力してください。");
        return;
    }

    console.log('Message to send:', message);
    isSubmitting = true;
    questionInput.disabled = true;
    sendButton.disabled = true;

    try {
        // まずFirebaseに保存
        console.log('Saving message to Firebase...');
        await saveMessage(message, 'user', 3);
        console.log('Message saved to Firebase successfully');

        // UIに表示
        addMessage(message, "user");

        // AIに送信
        console.log('Sending message to AI...');
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userMessage: message, questionId: 3 })
        });

        console.log('AI response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('AI response data:', data);

        // AIの返答をFirebaseに保存
        console.log('Saving AI response to Firebase...');
        await saveMessage(data.reply, 'ai', 3);
        console.log('AI response saved to Firebase successfully');

        // UIに表示
        addMessage(data.reply, "ai");

    } catch (error) {
        console.error("Error in send message flow:", error);
        addMessage("エラーが発生しました。もう一度お試しください。", "ai");
    } finally {
        console.log('Resetting UI state');
        isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.value = "";
    }
}

async function resetChat() {
    console.log('Reset chat triggered');
    if (confirm("チャットをリセットしてもよろしいですか？")) {
        console.log('Reset confirmed');
        chatContainer.innerHTML = "";
        // TODO: Firebaseのチャット履歴もクリアする場合はここに追加
    }
}

function addMessage(content, type) {
    console.log('Adding message to UI:', { content, type });
    const messageDiv = document.createElement("div");
    messageDiv.textContent = content;
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// イベントリスナーの設定
window.addEventListener('load', () => {
    console.log('Window loaded, initializing chat...');
    loadChatHistory();
});

sendButton.addEventListener("click", () => {
    console.log('Send button clicked');
    sendMessage();
});

resetButton.addEventListener("click", () => {
    console.log('Reset button clicked');
    resetChat();
});

questionInput.addEventListener("keypress", (e) => {
    console.log('Key pressed:', e.key);
    if (e.key === "Enter") {
        console.log('Enter key pressed, sending message');
        sendMessage();
    }
});