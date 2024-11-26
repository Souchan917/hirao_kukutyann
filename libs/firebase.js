// libs/firebase.js
import pkg from 'firebase/app';
const { initializeApp } = pkg;

import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    Timestamp
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

let app;
let db;

try {
    console.log('Firebaseの初期化を開始...');
    // 既に初期化されているかチェック
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('Firebaseの初期化が完了しました');
} catch (error) {
    if (error.code === 'app/duplicate-app') {
        // 既に初期化されている場合は既存のインスタンスを使用
        console.log('既存のFirebaseインスタンスを使用します');
        app = pkg.getApp();
        db = getFirestore(app);
    } else {
        console.error('Firebaseの初期化中にエラーが発生:', error);
        throw error;
    }
}

/**
 * メッセージを保存する関数
 * @param {string} content - メッセージの内容
 * @param {string} type - メッセージの種類 ("user", "ai", "rating", "survey")
 * @param {string} sessionId - セッションID
 * @returns {Promise<string>} 保存されたドキュメントのID
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
            timestamp: Timestamp.now()  // Firestoreのタイムスタンプを使用
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
        return []; // 空の配列を返す
    }

    try {
        // 特定のセッションIDに対応するメッセージを時系列で取得
        const chatQuery = query(
            collection(db, "chatLogs"),
            where("sessionId", "==", sessionId),
            orderBy("timestamp", "asc")
        );

        const querySnapshot = await getDocs(chatQuery);
        const messages = [];
        
        querySnapshot.forEach((doc) => {
            const messageData = doc.data();
            // FirestoreのTimestampをJavaScriptのDateオブジェクトに変換
            const timestamp = messageData.timestamp?.toDate?.() || new Date();
            
            messages.push({
                id: doc.id,
                ...messageData,
                timestamp: timestamp
            });
        });

        console.log(`${messages.length}件のメッセージを取得しました`);
        return messages;

    } catch (error) {
        console.error('チャット履歴の取得中にエラーが発生:', error);
        return []; // エラーが発生しても空の配列を返す
    }
}

/**
 * 最新のチャットメッセージを取得する関数
 * @param {string} sessionId - セッションID
 * @param {number} limit - 取得するメッセージの数
 * @returns {Promise<Array>} 最新のメッセージの配列
 */
export async function getRecentChatHistory(sessionId, limit = 10) {
    console.log(`最新の${limit}件のチャット履歴を取得:`, sessionId);

    if (!sessionId) {
        console.error('セッションIDが指定されていません');
        return [];
    }

    try {
        const chatQuery = query(
            collection(db, "chatLogs"),
            where("sessionId", "==", sessionId),
            orderBy("timestamp", "desc"), // 降順で取得
            limit
        );

        const querySnapshot = await getDocs(chatQuery);
        const messages = [];
        
        querySnapshot.forEach((doc) => {
            const messageData = doc.data();
            const timestamp = messageData.timestamp?.toDate?.() || new Date();
            
            messages.push({
                id: doc.id,
                ...messageData,
                timestamp: timestamp
            });
        });

        // 時系列順に並び替えて返す
        return messages.reverse();

    } catch (error) {
        console.error('最新チャット履歴の取得中にエラーが発生:', error);
        return [];
    }
}

/**
 * Firebaseの接続状態をチェックする関数
 * @returns {Promise<boolean>} 接続が有効な場合はtrue
 */
export async function checkFirebaseConnection() {
    try {
        const testQuery = query(collection(db, "chatLogs"), limit(1));
        await getDocs(testQuery);
        return true;
    } catch (error) {
        console.error('Firebase接続チェックでエラーが発生:', error);
        return false;
    }
}

// Firebase関連のインスタンスをエクスポート
export {
    db,
    app
};