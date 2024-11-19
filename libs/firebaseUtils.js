// libs/firebaseUtils.js
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// チャットメッセージの保存
export const saveMessage = async (message, type, questionId) => {
    try {
        const docRef = await addDoc(collection(db, 'chats'), {
            message: message,
            type: type, // 'user' または 'ai'
            questionId: questionId,
            timestamp: serverTimestamp()
        });
        console.log('Message saved with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
};

// チャット履歴の取得
export const getChatHistory = async (questionId, limit = 50) => {
    try {
        const q = query(
            collection(db, 'chats'),
            orderBy('timestamp', 'desc'),
            limit(limit)
        );

        const querySnapshot = await getDocs(q);
        const messages = [];
        querySnapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() });
        });

        return messages.reverse();
    } catch (error) {
        console.error('Error getting chat history:', error);
        throw error;
    }
};