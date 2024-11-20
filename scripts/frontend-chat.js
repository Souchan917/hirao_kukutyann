// フロントエンドのメインコード（frontend-chat.js）
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';

console.log('Starting script initialization...');

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
console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log('Firebase initialized successfully');

// DOM要素の取得を関数化
function getDOMElements() {
    console.log('Getting DOM elements...');
    const elements = {
        chatContainer: document.getElementById("chatContainer"),
        questionInput: document.getElementById("questionInput"),
        sendButton: document.getElementById("sendQuestion"),
        resetButton: document.getElementById("resetChat")
    };
    
    // DOM要素の存在確認
    Object.entries(elements).forEach(([name, element]) => {
        if (!element) {
            console.error(`${name} element not found!`);
        }
    });
    
    console.log('DOM elements retrieved');
    return elements;
}

// メイン処理を関数化
function initializeChat() {
    console.log('Initializing chat functionality...');
    
    const elements = getDOMElements();
    const apiUrl = "/api/chat";
    let isSubmitting = false;

    // Firebaseにメッセージを保存する関数
    async function saveToFirebase(message, type) {
        console.log(`Saving ${type} message to Firebase:`, message);
        try {
            const docRef = await addDoc(collection(db, 'chats'), {
                message: message,
                type: type,
                questionId: 3,
                timestamp: serverTimestamp()
            });
            console.log('Message saved to Firebase, ID:', docRef.id);
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            // Firebase保存エラーでもチャット機能は継続させる
        }
    }

    // チャット履歴を読み込む関数
    async function loadChatHistory() {
        console.log('Loading chat history...');
        try {
            const q = query(
                collection(db, 'chats'),
                orderBy('timestamp', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            const messages = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.questionId === 3) {
                    messages.push(data);
                }
            });
            
            console.log('Chat history loaded:', messages.length, 'messages');
            
            // 古い順に表示
            messages.reverse().forEach(msg => {
                addMessage(msg.message, msg.type);
            });
        } catch (error) {
            console.error('Error loading chat history:', error);
            // エラーメッセージを表示
            elements.chatContainer.innerHTML = '<div class="ai-message">チャット履歴の読み込みに失敗しました。</div>';
        }
    }

    function addMessage(content, type) {
        console.log('Adding message to UI:', { type, contentLength: content.length });
        const messageDiv = document.createElement("div");
        messageDiv.textContent = content;
        messageDiv.className = type === "user" ? "user-message" : "ai-message";
        elements.chatContainer.appendChild(messageDiv);
        elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
    }

    async function sendMessage() {
        console.log('Send message triggered');
        if (isSubmitting) {
            console.log('Already submitting, returning');
            return;
        }

        const message = elements.questionInput.value.trim();
        if (!message) {
            console.log('Empty message, showing alert');
            alert("Please enter a question.");
            return;
        }

        console.log('Processing message:', message);
        isSubmitting = true;
        elements.questionInput.disabled = true;
        elements.sendButton.disabled = true;

        try {
            // UIにメッセージを表示
            addMessage(message, "user");
            
            // Firebaseに保存
            await saveToFirebase(message, 'user');

            // AIに送信
            console.log('Sending to AI API...');
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userMessage: message, questionId: 3 })
            });

            console.log('AI API response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('AI response received:', data);

            // AIの返答をFirebaseに保存
            await saveToFirebase(data.reply, 'ai');
            
            // UIに表示
            addMessage(data.reply, "ai");

        } catch (error) {
            console.error("Error in message flow:", error);
            addMessage("An error occurred. Please try again later.", "ai");
        } finally {
            console.log('Resetting UI state');
            isSubmitting = false;
            elements.questionInput.disabled = false;
            elements.sendButton.disabled = false;
            elements.questionInput.value = "";
        }
    }

    function resetChat() {
        console.log('Reset chat triggered');
        if (confirm("Are you sure you want to reset the chat?")) {
            console.log('Reset confirmed');
            elements.chatContainer.innerHTML = "";
        }
    }

    // イベントリスナーの設定
    console.log('Setting up event listeners...');
    elements.sendButton.addEventListener("click", sendMessage);
    elements.resetButton.addEventListener("click", resetChat);
    elements.questionInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            console.log('Enter key pressed');
            sendMessage();
        }
    });

    // 初期ロード時にチャット履歴を読み込む
    loadChatHistory();
}

// DOMContentLoadedで初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    initializeChat();
});

// エラー監視
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});