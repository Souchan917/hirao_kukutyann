import { doc, setDoc, getDocs, collection, query, orderBy } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";
import { db } from "./firebase.js";

// メッセージを保存する
export async function saveMessage(content, type, questionId) {
    const messageRef = doc(collection(db, "chatLogs"));
    await setDoc(messageRef, {
        content: content,
        type: type,
        questionId: questionId,
        timestamp: new Date()
    });
}

// チャット履歴を取得する
export async function getChatHistory(limit = 50) {
    const chatQuery = query(collection(db, "chatLogs"), orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(chatQuery);
    return querySnapshot.docs.map(doc => doc.data());
}
