// libs/firebase.js
import { collection, addDoc, query, where, getDocs, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// データベースインスタンスの取得
const db = window.db;

if (!db) {
    throw new Error('Firebaseが読み込まれていません。index.htmlにFirebaseのCDNスクリプトを追加してください。');
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
        const docRef = await addDoc(collection(db, "chatLogs"), {
            content: content,
            type: type,
            sessionId: sessionId,
            timestamp: serverTimestamp()
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
        const q = query(
            collection(db, "chatLogs"),
            where("sessionId", "==", sessionId)
        );
        const snapshot = await getDocs(q);

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