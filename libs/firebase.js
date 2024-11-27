// libs/firebase.js
import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    addDoc,
    query, 
    where,
    orderBy,
    getDocs 
} from 'firebase/firestore';

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
console.log('Firebaseの初期化を開始...');
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log('Firebaseの初期化が完了しました');

/**
 * メッセージを保存する関数
 * @param {string} content - メッセージの内容
 * @param {string} type - メッセージの種類 ("user", "ai", "rating", "survey")
 * @param {string} sessionId - セッションID
 */
export async function saveMessage(content, type, sessionId) {
    console.log('メッセージを保存:', { content, type, sessionId });
    
    if (!sessionId) {
        console.error('セッションIDが指定されていません');
        sessionId = 'default-session-' + Date.now();
        console.log('デフォルトのセッションIDを生成しました:', sessionId);
    }

    try {
        const chatCollection = collection(db, "chatLogs");
        const messageData = {
            content: content,
            type: type,
            sessionId: sessionId,
            timestamp: new Date()
        };

        const docRef = await addDoc(chatCollection, messageData);
        console.log('メッセージを保存しました。Document ID:', docRef.id);
        
        return docRef.id;
    } catch (error) {
        console.error('メッセージの保存中にエラーが発生:', error);
        throw error;
    }
}

/**
 * チャット履歴を取得する関数
 * @param {string} sessionId - セッションID
 * @returns {Promise<Array>} メッセージの配列
 */
export async function getChatHistory(sessionId) {
    console.log('チャット履歴を取得:', sessionId);

    if (!sessionId) {
        console.error('セッションIDが指定されていません');
        return [];
    }

    try {
        // orderByを除去してシンプルなクエリに
        const chatQuery = query(
            collection(db, "chatLogs"),
            where("sessionId", "==", sessionId)
        );

        const querySnapshot = await getDocs(chatQuery);
        const messages = [];
        
        querySnapshot.forEach((doc) => {
            let messageData = doc.data();
            messages.push({
                id: doc.id,
                ...messageData
            });
        });

        // JavaScriptでソート
        messages.sort((a, b) => {
            const timeA = a.timestamp?.toMillis?.() ?? new Date(a.timestamp).getTime();
            const timeB = b.timestamp?.toMillis?.() ?? new Date(b.timestamp).getTime();
            return timeA - timeB;
        });

        console.log(`${messages.length}件のメッセージを取得しました`);
        return messages;

    } catch (error) {
        console.error('チャット履歴の取得中にエラーが発生:', error);
        return [];
    }
}

// Firestoreのインスタンスをエクスポート
export { db };