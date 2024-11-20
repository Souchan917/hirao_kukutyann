// frontend-chat.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { collection, addDoc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';

// Firebaseの設定
const firebaseConfig = {
    apiKey: "AIzxSyACzVcf8eNzcu698PdbKKRVcbStH821avc",
    authDomain: "kukutyan-f48ae.firebaseapp.com",
    projectId: "kukutyan-f48ae",
    storageBucket: "kukutyan-f48ae.firebasestorage.app",
    messagingSenderId: "894594120998",
    appId: "1:894594120998:web:9160722e1d27e98afbd5e7",
    measurementId: "G-8F3DC6V2M7"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firebase関連の関数
async function saveMessage(message, type, questionId) {
    try {
        const docRef = await addDoc(collection(db, 'chats'), {
            message,
            type,
            questionId,
            timestamp: serverTimestamp()
        });
        console.log('Message saved with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
}

async function getChatHistory(questionId, limitCount = 50) {
    try {
        const q = query(
            collection(db, 'chats'),
            orderBy('timestamp', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const messages = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.questionId === questionId) {
                messages.push({
                    id: doc.id,
                    ...data
                });
            }
        });

        return messages.reverse();
    } catch (error) {
        console.error('Error getting chat history:', error);
        throw error;
    }
}

// UI要素の取得
const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");

let isSubmitting = false;

// チャット履歴の読み込み
async function loadChatHistory() {
    try {
        const messages = await getChatHistory(3);
        chatContainer.innerHTML = '';
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
        // ユーザーメッセージをFirestoreに保存
        await saveMessage(message, 'user', 3);
        addMessage(message, "user");

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

// チャットのリセット
function resetChat() {
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