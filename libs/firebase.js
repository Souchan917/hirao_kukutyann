// libs/firebase.js

// 環境チェックとFirebase初期化
let db;
let firebaseInstance;

if (typeof window !== 'undefined') {
    // ブラウザ環境
    console.log('ブラウザ環境でFirebaseを初期化します');
    
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

    try {
        console.log('Firebaseの初期化を開始...');
        // window.firebase が定義されているか確認
        if (typeof window.firebase !== 'undefined') {
            if (!window.firebase.apps.length) {
                firebaseInstance = window.firebase.initializeApp(firebaseConfig);
            } else {
                firebaseInstance = window.firebase.app();
            }
            db = firebaseInstance.firestore();
            console.log('Firebaseの初期化が完了しました');
        } else {
            console.error('Firebase SDKが読み込まれていません');
        }
    } catch (error) {
        console.error('Firebaseの初期化中にエラーが発生:', error);
    }
} else {
    // サーバー環境（Node.js）
    console.log('サーバー環境を検出しました');
    try {
        const { initializeApp } = require('firebase/app');
        const { getFirestore } = require('firebase/firestore');
        
        const firebaseConfig = {
            apiKey: "AIzxSyACzVcf8eNzcu698PdbKKRVcbStH821avc",
            authDomain: "kukutyan-f48ae.firebaseapp.com",
            projectId: "kukutyan-f48ae",
            storageBucket: "kukutyan-f48ae.firebasestorage.app",
            messagingSenderId: "894594120998",
            appId: "1:894594120998:web:9160722e1d27e98afbd5e7",
            measurementId: "G-8F3DC6V2M7"
        };

        firebaseInstance = initializeApp(firebaseConfig);
        db = getFirestore(firebaseInstance);
        console.log('サーバー側Firebaseの初期化が完了しました');
    } catch (error) {
        console.error('サーバー側Firebaseの初期化中にエラーが発生:', error);
    }
}

/**
 * メッセージを保存する関数
 */
export async function saveMessage(content, type, sessionId) {
    if (!db) {
        console.error('Firestore が初期化されていません');
        return null;
    }

    console.log('メッセージを保存:', { content, type, sessionId });
    
    if (!sessionId) {
        console.error('セッションIDが指定されていません');
        sessionId = 'default-session-' + Date.now();
        console.log('デフォルトのセッションIDを生成しました:', sessionId);
    }

    try {
        const chatCollection = db.collection("chatLogs");
        const messageData = {
            content: content,
            type: type,
            sessionId: sessionId,
            timestamp: new Date()
        };

        const docRef = await chatCollection.add(messageData);
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
    if (!db) {
        console.error('Firestore が初期化されていません');
        return [];
    }

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