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

// メッセージを保存する関数（1つのドキュメントに統合）
export async function saveSessionData(sessionId, userMessage, aiResponse) {
    console.log('Saving session data:', { sessionId });

    try {
        // ドキュメント参照 (セッションIDごとに1つのドキュメント)
        const sessionRef = doc(collection(db, "chatLogs"), sessionId);

        // 既存のデータを取得
        const existingDoc = await getDocs(sessionRef);
        let messages = [];

        if (existingDoc.exists()) {
            // 既存のメッセージを取得
            messages = existingDoc.data().messages || [];
        }

        // 新しいメッセージを追加
        messages.push(
            {
                type: "user",
                content: userMessage,
                timestamp: new Date().toISOString()
            },
            {
                type: "ai",
                content: aiResponse,
                timestamp: new Date().toISOString()
            }
        );

        // Firestoreにドキュメントを保存（または更新）
        await setDoc(sessionRef, { sessionId, messages });
        console.log('Session data saved successfully');
    } catch (error) {
        console.error('Error saving session data:', error);
        throw error;
    }
}

// チャット履歴を取得する関数（セッション単位）
export async function getChatHistory(sessionId) {
    console.log('Fetching chat history for session:', sessionId);
    try {
        const sessionRef = doc(collection(db, "chatLogs"), sessionId);
        const sessionDoc = await getDocs(sessionRef);

        if (sessionDoc.exists()) {
            console.log('Retrieved session data:', sessionDoc.data());
            return sessionDoc.data().messages || [];
        } else {
            console.warn('No chat history found for session:', sessionId);
            return [];
        }
    } catch (error) {
        console.error('Error getting chat history:', error);
        throw error;
    }
}

// dbをエクスポート
export { db };
