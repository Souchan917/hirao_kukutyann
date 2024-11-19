const fetch = require('node-fetch');

// APIエンドポイントの処理
module.exports = async (req, res) => {
    const { userMessage, questionId } = req.body;

    const prompts = {
        3: "AI-based puzzle game. Guess the animal name based on questions."
    };

    const prompt = prompts[questionId] || "Default prompt for your game.";

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: prompt },
                    { role: "user", content: userMessage }
                ]
            })
        });

        const data = await response.json();
        res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
        console.error('Error communicating with OpenAI API:', error);
        res.status(500).json({ error: 'Failed to fetch AI response' });
    }
};





// Firebase設定情報
const firebaseConfig = {
    apiKey: "AIzaSyACZVcf8cWzcu698PdbKKRVcbStH82lavc",
    authDomain: "kukutyan-f48ae.firebaseapp.com",
    projectId: "kukutyan-f48ae",
    storageBucket: "kukutyan-f48ae.firebaseapp.com",
    messagingSenderId: "894594120998",
    appId: "1:894594120998:web:9160722e1d27e98afbd5e7",
    measurementId: "G-8FSDCGV2M7"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM要素の取得
const chatContainer = document.getElementById('chatContainer');
const questionInput = document.getElementById('questionInput');
const sendQuestionButton = document.getElementById('sendQuestion');
const resetChatButton = document.getElementById('resetChat');

let isSubmitting = false; // 質問の重複送信を防止するフラグ

// チャットメッセージを表示する関数
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = content;
    messageDiv.style.textAlign = type === 'user' ? 'right' : 'left';
    messageDiv.style.padding = '10px';
    messageDiv.style.margin = '5px 0';
    messageDiv.style.background = type === 'user' ? '#e6e6fa' : '#f0f0ff';
    messageDiv.style.border = '1px solid #ddd';
    messageDiv.style.borderRadius = '10px';
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Firestoreにチャットメッセージを保存する関数
async function saveMessageToFirestore(content, type) {
    try {
        await db.collection('chatLogs').add({
            type: type,
            content: content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Message saved to Firestore: ${content}`);
    } catch (error) {
        console.error('Error saving message to Firestore:', error);
    }
}

// Vercel APIを呼び出してAI応答を取得する関数
async function getAIResponse(question) {
    const vercelFunctionUrl = "https://hirao-kukutyann.vercel.app/api/chat"; // VercelのエンドポイントURL

    try {
        const response = await fetch(vercelFunctionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userMessage: question, questionId: 3 }) // 問題IDを変更可能
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.reply;
    } catch (error) {
        console.error('Error communicating with Vercel API:', error);
        throw new Error('API communication error');
    }
}

// 質問を処理する関数
async function handleQuestion() {
    if (isSubmitting) return; // 送信中は処理を中断

    const question = questionInput.value.trim();
    if (!question) {
        alert('質問を入力してください');
        return;
    }

    isSubmitting = true; // 送信フラグをオン
    questionInput.disabled = true; // 入力欄を無効化
    addMessage(question, 'user'); // 質問をチャットに表示
    saveMessageToFirestore(question, 'user'); // Firestoreに保存

    try {
        const aiReply = await getAIResponse(question); // Vercel APIからAI応答を取得
        addMessage(aiReply, 'ai'); // AIの応答をチャットに表示
        saveMessageToFirestore(aiReply, 'ai'); // Firestoreに保存
    } catch (error) {
        addMessage('エラーが発生しました。もう一度試してください。', 'ai');
    } finally {
        isSubmitting = false; // 送信フラグをオフ
        questionInput.disabled = false; // 入力欄を有効化
        questionInput.value = ''; // 入力欄をクリア
        questionInput.focus(); // 入力欄にフォーカスを戻す
    }
}

// チャット履歴をリセットする関数
function resetChatHistory() {
    if (confirm('チャット履歴をリセットしてもよろしいですか？')) {
        chatContainer.innerHTML = ''; // チャット内容をクリア
        localStorage.removeItem('chatHistory'); // ローカルストレージをクリア
        console.log('Chat history reset');
    }
}

// イベントリスナーの設定
sendQuestionButton.addEventListener('click', handleQuestion);
resetChatButton.addEventListener('click', resetChatHistory);
questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleQuestion();
    }
});
