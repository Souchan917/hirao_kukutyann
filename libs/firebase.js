// libs/firebase.js

// クライアントサイドでのFirebaseの読み込みを確認
if (typeof window !== 'undefined' && typeof window.firebase === 'undefined') {
    throw new Error('Firebaseが読み込まれていません。index.htmlにFirebaseのCDNスクリプトを追加してください。');
}

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

let db;

// Firebaseの初期化
try {
    console.log('Firebaseの初期化を開始...');
    // アプリが既に初期化されているかチェック
    if (!firebase.apps?.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    console.log('Firebaseの初期化が完了しました');
} catch (error) {
    console.error('Firebaseの初期化中にエラーが発生:', error);
    throw error;
}

/**
 * メッセージを保存する関数
 */
export async function saveMessage(content, type, sessionId) {
    console.log('メッセージを保存:', { content, type, sessionId });
    
    if (!sessionId) {
        console.error('セッションIDが指定されていません');
        sessionId = 'default-session-' + Date.now();
        console.log('デフォルトのセッションIDを生成しました:', sessionId);
    }

    try {
        const docRef = await db.collection("chatLogs").add({
            content: content,
            type: type,
            sessionId: sessionId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('メッセージを保存しました。Document ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('メッセージの保存中にエラーが発生:', error);
        throw error;
    }
}

/**
 * チャット履歴を取得する関数
 */
export async function getChatHistory(sessionId) {
    console.log('チャット履歴を取得:', sessionId);

    if (!sessionId) {
        console.error('セッションIDが指定されていません');
        return [];
    }

    try {
        const snapshot = await db.collection("chatLogs")
            .where("sessionId", "==", sessionId)
            .get();

        const messages = [];
        snapshot.forEach(doc => {
            messages.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // タイムスタンプでソート
        messages.sort((a, b) => {
            return (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0);
        });

        console.log(`${messages.length}件のメッセージを取得しました`);
        return messages;
    } catch (error) {
        console.error('チャット履歴の取得中にエラーが発生:', error);
        return [];
    }
}

export { db };