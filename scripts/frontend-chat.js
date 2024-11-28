// frontend-chat.js
import { saveMessage, getChatHistory } from "../libs/firebase.js";

console.log("=== frontend-chat.js 読み込み開始 ===");

// DOM要素の取得
const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");
const endChatButton = document.getElementById("endChat");
const surveyForm = document.getElementById("survey-form");
const submitSurveyButton = document.getElementById("submitSurvey");

// 評価ボタングループの取得
const satisfactionButtons = surveyForm.querySelector('div[aria-label="満足度"]').querySelectorAll('strong');
const personalizedButtons = surveyForm.querySelector('div[aria-label="個別化された回答"]').querySelectorAll('strong');
const comparisonButtons = surveyForm.querySelector('div[aria-label="比較"]').querySelectorAll('strong');
const intentionButtons = surveyForm.querySelector('div[aria-label="意図の理解"]').querySelectorAll('strong');

// セッション管理用の定数
const SESSION_STORAGE_KEY = 'kukuchan_session_id';

// 状態管理
let isSubmitting = false;
let surveyAnswers = {
    satisfaction: 0,
    personalization: 0,
    comparison: 0,
    intention: 0
};

// セッション管理の関数
function getOrCreateSessionId(forceNew = false) {
    // forceNew が true の場合は必ず新しいセッションIDを生成
    if (forceNew) {
        const newSessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
        document.cookie = `sessionId=${newSessionId}; path=/`;
        console.log("新しいセッションIDを生成:", newSessionId);
        return newSessionId;
    }

    // 既存のセッションIDを取得
    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    
    if (!sessionId) {
        // 新しいセッションIDを生成
        sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        document.cookie = `sessionId=${sessionId}; path=/`;
        console.log("新しいセッションIDを生成:", sessionId);
    } else {
        console.log("既存のセッションIDを使用:", sessionId);
    }
    
    return sessionId;
}

// Cookie値を取得する関数
function getCookieValue(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(name + '=')) {
            return cookie.substring(name.length + 1);
        }
    }
    return null;
}

// メッセージ送信関数
async function sendMessage() {
    console.log("=== sendMessage 関数開始 ===");

    if (isSubmitting) {
        console.log("送信中のため処理をスキップします");
        return;
    }

    const message = questionInput.value.trim();
    console.log("入力されたメッセージ:", message);

    if (!message) {
        console.log("メッセージが空です");
        alert("メッセージを入力してください。");
        return;
    }

    console.log("メッセージ送信プロセス開始");
    isSubmitting = true;
    questionInput.disabled = true;
    sendButton.disabled = true;

    try {
        const sessionId = getOrCreateSessionId();
        console.log("現在のセッションID:", sessionId);

        // ユーザーメッセージを保存
        console.log("Firebaseにユーザーメッセージを保存中...");
        await saveMessage(message, "user", sessionId);
        console.log("ユーザーメッセージが保存されました");

        addMessage(message, "user");

        // APIリクエスト
        console.log("APIにリクエスト送信中...");
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Session-ID": sessionId
            },
            body: JSON.stringify({ userMessage: message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("APIからのレスポンス:", data);

        // AI応答を保存して表示
        addMessage(data.reply, "ai");
        await saveMessage(data.reply, "ai", sessionId);
        console.log("AI応答がFirebaseに保存されました");

    } catch (error) {
        console.error("チャットフロー内でエラー:", error);
        addMessage("エラーが発生しました。後でもう一度お試しください。", "ai");
    } finally {
        console.log("UIをリセットします");
        isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.value = "";
    }

    console.log("=== sendMessage 関数終了 ===");
}

// メッセージ追加関数
function addMessage(content, type) {
    console.log(`addMessage関数実行: ${type}メッセージを追加`);
    const messageDiv = document.createElement("div");
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);

    // AIの返答の場合のみ評価UIを表示
    if (type === "ai") {
        // 評価コンテナを作成
        const ratingContainer = document.createElement("div");
        ratingContainer.className = "rating-container";
        ratingContainer.style.cssText = `
            text-align: center;
            margin: 10px 0;
            padding: 10px;
            border-radius: 5px;
            background-color: #f8f9fa;
        `;

        // 「この回答は役に立ちましたか？」のテキスト
        const ratingText = document.createElement("div");
        ratingText.textContent = "この回答は役に立ちましたか？";
        ratingText.style.cssText = `
            margin-bottom: 10px;
            color: #666;
            font-size: 0.9rem;
        `;
        ratingContainer.appendChild(ratingText);

        // ボタンコンテナ
        const buttonsContainer = document.createElement("div");
        buttonsContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 20px;
        `;

        // Goodボタン
        const goodBtn = document.createElement("button");
        goodBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            <span style="margin-left: 5px;">Good</span>
        `;
        goodBtn.style.cssText = `
            display: flex;
            align-items: center;
            padding: 8px 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            color: #333;
            transition: all 0.2s;
        `;

        // Badボタン
        const badBtn = document.createElement("button");
        badBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
            <span style="margin-left: 5px;">Bad</span>
        `;
        badBtn.style.cssText = goodBtn.style.cssText;

        // ホバー効果
        goodBtn.onmouseover = () => goodBtn.style.backgroundColor = '#f8f9fa';
        goodBtn.onmouseout = () => goodBtn.style.backgroundColor = 'white';
        badBtn.onmouseover = () => badBtn.style.backgroundColor = '#f8f9fa';
        badBtn.onmouseout = () => badBtn.style.backgroundColor = 'white';

        // クリックイベントの追加
        goodBtn.onclick = async () => {
            try {
                const sessionId = getOrCreateSessionId();
                await saveMessage(JSON.stringify({
                    rating: 'good',
                    message: content,
                    timestamp: new Date().toISOString()
                }), "rating", sessionId);
                
                // ビジュアルフィードバック
                goodBtn.style.backgroundColor = '#e6f4ea';
                goodBtn.style.borderColor = '#34a853';
                goodBtn.style.color = '#34a853';
                badBtn.style.opacity = '0.5';
                goodBtn.disabled = true;
                badBtn.disabled = true;
                
                ratingText.textContent = "評価ありがとうございます";
                ratingText.style.color = '#34a853';
            } catch (error) {
                console.error("評価保存エラー:", error);
            }
        };

        badBtn.onclick = async () => {
            try {
                const sessionId = getOrCreateSessionId();
                await saveMessage(JSON.stringify({
                    rating: 'bad',
                    message: content,
                    timestamp: new Date().toISOString()
                }), "rating", sessionId);
                
                // ビジュアルフィードバック
                badBtn.style.backgroundColor = '#fce8e6';
                badBtn.style.borderColor = '#ea4335';
                badBtn.style.color = '#ea4335';
                goodBtn.style.opacity = '0.5';
                goodBtn.disabled = true;
                badBtn.disabled = true;
                
                ratingText.textContent = "評価ありがとうございます";
                ratingText.style.color = '#ea4335';
            } catch (error) {
                console.error("評価保存エラー:", error);
            }
        };

        buttonsContainer.appendChild(goodBtn);
        buttonsContainer.appendChild(badBtn);
        ratingContainer.appendChild(buttonsContainer);
        chatContainer.appendChild(ratingContainer);
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// チャットリセット関数
function resetChat() {
    console.log("チャットリセット実行");
    if (confirm("チャット履歴をリセットしてもよろしいですか？")) {
        chatContainer.innerHTML = "";
        // 新しいセッションIDを生成
        getOrCreateSessionId(true);
        console.log("チャット履歴をリセットし、新しいセッションIDを生成しました");
    }
}

// 評価ボタンのセットアップ関数
function setupRatingButtons(buttons, category) {
    buttons.forEach((button, index) => {
        button.addEventListener('click', () => {
            console.log(`${category}の評価がクリックされました:`, index + 1);
            buttons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            surveyAnswers[category] = index + 1;
            console.log("現在の評価状態:", surveyAnswers);
        });
    });
}

// チャット終了関数
function endChat() {
    console.log("チャット終了処理を開始");
    
    if (!surveyForm) {
        console.error("アンケートフォームが見つかりません");
        return;
    }

    // 入力を無効化
    questionInput.disabled = true;
    sendButton.disabled = true;

    // アンケートフォームを表示
    surveyForm.style.display = 'block';
    
    // スムーズスクロール
    surveyForm.scrollIntoView({ behavior: 'smooth' });
    
    console.log("アンケートフォームを表示し、チャット終了処理を完了");
}

// アンケート送信関数
async function submitSurvey(event) {
    event.preventDefault();
    console.log("アンケート送信処理を開始", surveyAnswers);

    if (Object.values(surveyAnswers).some(value => value === 0)) {
        alert("すべての項目にお答えください。");
        return;
    }

    try {
        console.log("Firebaseにアンケート回答を保存中...");
        const sessionId = getOrCreateSessionId();
        await saveMessage(JSON.stringify(surveyAnswers), "survey", sessionId);
        
        alert("アンケートにご協力いただき、ありがとうございました。");
        
        // UIをリセット
        surveyForm.style.display = 'none';
        chatContainer.innerHTML = '';
        questionInput.disabled = false;
        sendButton.disabled = false;
        
        // 新しいセッションIDを生成
        getOrCreateSessionId(true);
        
        // 回答をリセット
        surveyAnswers = {
            satisfaction: 0,
            personalization: 0,
            comparison: 0,
            intention: 0
        };
        
        // 選択状態をリセット
        document.querySelectorAll('.btn-group strong.selected').forEach(button => {
            button.classList.remove('selected');
        });
        
        console.log("アンケート送信処理が完了し、UIをリセットしました");
        
    } catch (error) {
        console.error("アンケート送信エラー:", error);
        alert("アンケートの送信に失敗しました。もう一度お試しください。");
    }
}



    // チャット履歴読み込み関数
async function loadChatHistory() {
    const sessionId = getOrCreateSessionId();
    console.log("セッションIDを取得:", sessionId);

    try {
        console.log("チャット履歴を読み込み中...");
        const history = await getChatHistory(sessionId);
        
        if (history && history.length > 0) {
            console.log(`${history.length}件のメッセージを読み込みました`);
            history.forEach(message => {
                if (message.type !== 'rating' && message.type !== 'survey') {
                    addMessage(message.content, message.type);
                }
            });
        } else {
            console.log("チャット履歴が空です");
        }
    } catch (error) {
        console.error("チャット履歴の読み込みエラー:", error);
    }
}

// 評価ボタンのセットアップ
setupRatingButtons(satisfactionButtons, 'satisfaction');
setupRatingButtons(personalizedButtons, 'personalization');
setupRatingButtons(comparisonButtons, 'comparison');
setupRatingButtons(intentionButtons, 'intention');

// イベントリスナーの設定
console.log("イベントリスナーの設定を開始");

if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
    console.log("送信ボタンのリスナーを設定");
}

if (resetButton) {
    resetButton.addEventListener("click", resetChat);
    console.log("リセットボタンのリスナーを設定");
}

if (questionInput) {
    questionInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            console.log("Enterキーが押されました");
            sendMessage();
        }
    });
    console.log("入力フィールドのリスナーを設定");
}

if (endChatButton) {
    endChatButton.addEventListener("click", endChat);
    console.log("終了ボタンのリスナーを設定");
} else {
    console.error("終了ボタンが見つかりません");
}

if (submitSurveyButton) {
    submitSurveyButton.addEventListener("click", submitSurvey);
    console.log("アンケート送信ボタンのリスナーを設定");
} else {
    console.error("アンケート送信ボタンが見つかりません");
}

// ページロード時の処理
window.addEventListener('load', () => {
    console.log("ページロード時の初期化を開始");
    // 新しいタブで開いた場合は新しいセッションIDを生成
    if (!document.hidden) {
        getOrCreateSessionId(true);
    }
    loadChatHistory();
});

// visibility変更時の処理を追加
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // タブがアクティブになった時（リロードも含む）
        console.log("タブがアクティブになりました");
        getOrCreateSessionId(true);
        chatContainer.innerHTML = ''; // チャット履歴をクリア
        loadChatHistory();
    }
});

// セッションストレージの変更を監視（別タブとの同期用）
window.addEventListener('storage', (event) => {
    if (event.key === SESSION_STORAGE_KEY) {
        console.log("セッションストレージの変更を検出:", event.newValue);
        loadChatHistory();
    }
});

console.log("=== frontend-chat.js 読み込み完了 ===");