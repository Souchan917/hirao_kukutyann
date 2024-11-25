// libs/firebase.js

// インポートパスを修正
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDocs, 
    collection, 
    query, 
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzxSyACzVcf8eNzcu698PdbKKRVcbStH821avc",
    authDomain: "kukutyan-f48ae.firebaseapp.com",
    projectId: "kukutyan-f48ae",
    storageBucket: "kukutyan-f48ae.firebasestorage.app",
    messagingSenderId: "894594120998",
    appId: "1:894594120998:web:9160722e1d27e98afbd5e7",
    measurementId: "G-8F3DC6V2M7"
};

// Firebaseの初期化
console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log('Firebase initialized successfully');

// メッセージを保存する関数
export async function saveMessage(content, type, questionId) {
    console.log('Saving message:', { type, questionId });
    try {
        const messageRef = doc(collection(db, "chatLogs"));
        await setDoc(messageRef, {
            content: content,
            type: type,
            questionId: questionId,
            timestamp: new Date()
        });
        console.log('Message saved successfully');
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
}

// チャット履歴を取得する関数
export async function getChatHistory(limit = 50) {
    console.log('Fetching chat history, limit:', limit);
    try {
        const chatQuery = query(
            collection(db, "chatLogs"), 
            orderBy("timestamp", "asc")
        );
        const querySnapshot = await getDocs(chatQuery);
        const messages = querySnapshot.docs.map(doc => doc.data());
        console.log('Retrieved messages:', messages.length);
        return messages;
    } catch (error) {
        console.error('Error getting chat history:', error);
        throw error;
    }
}

// dbをエクスポート
export { db };