// libs/firebaseUtils.js
import { collection, addDoc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';  // .js拡張子を追加

export async function saveMessage(message, type, questionId) {
    try {
        const docRef = await addDoc(collection(db, 'chats'), {
            message,
            type,
            questionId,
            timestamp: serverTimestamp()
        });
        console.log('Message saved with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
}

export async function getChatHistory(questionId, limitCount = 50) {
    try {
        const q = query(
            collection(db, 'chats'),
            orderBy('timestamp', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const messages = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.questionId === questionId) {
                messages.push({
                    id: doc.id,
                    ...data
                });
            }
        });

        return messages.reverse();
    } catch (error) {
        console.error('Error getting chat history:', error);
        throw error;
    }
}