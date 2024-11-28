// libs/firebase.js
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    getDocs, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// グローバルに設定されたFirebase instancesを使用
const db = window.fbDb;

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
            where("sessionId", "==", sessionId),
            orderBy("timestamp", "asc")
        );
        
        const snapshot = await getDocs(q);
        const messages = [];
        
        snapshot.forEach(doc => {
            messages.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`${messages.length}件のメッセージを取得しました`);
        return messages;
    } catch (error) {
        console.error('チャット履歴の取得中にエラーが発生:', error);
        return [];
    }
}

export { db };