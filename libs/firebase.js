// 既存のインポートはそのまま
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDocs,
    getDoc, 
    collection, 
    query, 
    orderBy 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// 既存の設定と初期化はそのまま
const firebaseConfig = {
    apiKey: "AIzxSyACzVcf8eNzcu698PdbKKRVcbStH821avc",
    authDomain: "kukutyan-f48ae.firebaseapp.com",
    projectId: "kukutyan-f48ae",
    storageBucket: "kukutyan-f48ae.firebasestorage.app",
    messagingSenderId: "894594120998",
    appId: "1:894594120998:web:9160722e1d27e98afbd5e7",
    measurementId: "G-8F3DC6V2M7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 既存の関数はそのまま維持
export async function saveMessage(content, type, questionId) {
    // 既存のコード
}

export async function getChatHistory(limit = 50) {
    // 既存のコード
}

// 新しく追加する関数：チャット応答の保存
export async function saveResponseToFirebase(requestId, data) {
    console.log('Saving response to Firebase:', { requestId, data });
    try {
        const responseRef = doc(db, "chat_responses", requestId);
        await setDoc(responseRef, {
            ...data,
            timestamp: new Date().toISOString()
        });
        console.log('Response saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving response:', error);
        throw error;
    }
}

// 新しく追加する関数：チャット応答の取得
export async function getResponseFromFirebase(requestId) {
    console.log('Getting response from Firebase:', requestId);
    try {
        const responseRef = doc(db, "chat_responses", requestId);
        const docSnap = await getDoc(responseRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting response:', error);
        throw error;
    }
}

export { db };