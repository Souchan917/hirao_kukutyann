// frontend-chat.js
import { saveMessage, getChatHistory } from "../libs/firebase.js";

console.log("=== frontend-chat.js 読み込み開始 ===");

/**
 * セッションIDを管理するクラス
 */
class SessionManager {
    static SESSION_KEY = 'chatSessionId';
    static SESSION_DURATION = 24 * 60 * 60 * 1000; // 24時間

    /**
     * セッションIDを取得または生成
     * @returns {string} セッションID
     */
    static getSessionId() {
        let sessionId = localStorage.getItem(this.SESSION_KEY);
        
        if (!sessionId) {
            // 新しいセッションIDを生成
            sessionId = 'session-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 9);
            
            // セッション情報を保存
            this.saveSession(sessionId);
            console.log('新しいセッションIDを生成:', sessionId);
        } else {
            // セッションの有効期限をチェック
            const sessionData = JSON.parse(localStorage.getItem(this.SESSION_KEY + '_data') || '{}');
            if (sessionData && new Date().getTime() - sessionData.timestamp > this.SESSION_DURATION) {
                // セッションが期限切れの場合、新しいセッションを作成
                sessionId = 'session-' + new Date().getTime() + '-' + Math.random().toString(36).substr(2, 9);
                this.saveSession(sessionId);
                console.log('セッションが期限切れのため新規作成:', sessionId);
            } else {
                console.log('既存のセッションIDを使用:', sessionId);
            }
        }

        return sessionId;
    }

    /**
     * セッション情報を保存
     * @param {string} sessionId - セッションID
     */
    static saveSession(sessionId) {
        localStorage.setItem(this.SESSION_KEY, sessionId);
        localStorage.setItem(this.SESSION_KEY + '_data', JSON.stringify({
            timestamp: new Date().getTime()
        }));
    }
}

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

// 状態管理
let isSubmitting = false;
let surveyAnswers = {
    satisfaction: 0,
    personalization: 0,
    comparison: 0,
    intention: 0
};

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
        // SessionManagerからセッションIDを取得
        const sessionId = SessionManager.getSessionId();
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
            body: JSON.stringify({ 
                userMessage: message,
                sessionId: sessionId
            })
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
        const goodBtn = createRatingButton('good');
        const badBtn = createRatingButton('bad');

        // ボタンの追加
        buttonsContainer.appendChild(goodBtn);
        buttonsContainer.appendChild(badBtn);
        ratingContainer.appendChild(buttonsContainer);
        chatContainer.appendChild(ratingContainer);
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 評価ボタンを作成する補助関数
function createRatingButton(type) {
    const button = document.createElement("button");
    const isGood = type === 'good';
    
    button.innerHTML = isGood ? 
        `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
        <span style="margin-left: 5px;">Good</span>` :
        `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
        </svg>
        <span style="margin-left: 5px;">Bad</span>`;

    button.style.cssText = `
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

    // ホバー効果
    button.onmouseover = () => button.style.backgroundColor = '#f8f9fa';
    button.onmouseout = () => button.style.backgroundColor = 'white';

    // クリックイベントの設定
    button.onclick = async () => {
        try {
            const sessionId = SessionManager.getSessionId();
            await saveMessage(JSON.stringify({
                rating: type,
                timestamp: new Date().toISOString()
            }), "rating", sessionId);

            // ビジュアルフィードバック
            const color = isGood ? '#34a853' : '#ea4335';
            const bgColor = isGood ? '#e6f4ea' : '#fce8e6';
            button.style.backgroundColor = bgColor;
            button.style.borderColor = color;
            button.style.color = color;
            
            // 他のボタンを無効化
            const otherButton = button.parentElement.querySelector(`button:not([disabled])`);
            if (otherButton) {
                otherButton.style.opacity = '0.5';
                otherButton.disabled = true;
            }
            button.disabled = true;

            // フィードバックテキストの更新
            const ratingText = button.parentElement.parentElement.querySelector('div');
            ratingText.textContent = "評価ありがとうございます";
            ratingText.style.color = color;
        } catch (error) {
            console.error("評価保存エラー:", error);
        }
    };

    return button;
}

// チャットリセット関数
function resetChat() {
    console.log("チャットリセット実行");
    if (confirm("チャット履歴をリセットしてもよろしいですか？")) {
        chatContainer.innerHTML = "";
        console.log("チャット履歴をリセットしました");
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
        const sessionId = SessionManager.getSessionId();
        console.log("Firebaseにアンケート回答を保存中...");
        await saveMessage(JSON.stringify(surveyAnswers), "survey", sessionId);
        
        alert("アンケートにご協力いただき、ありがとうございました。");
        
        // UIをリセット
        surveyForm.style.display = 'none';
        chatContainer.innerHTML = '';
        questionInput.disabled = false;
        sendButton.disabled = false;
        
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

// 初期化処理
function initializeChat() {
    // 評価ボタンのセットアップ
    setupRatingButtons(satisfactionButtons, 'satisfaction');
    setupRatingButtons(personalizedButtons, 'personalization');
    setupRatingButtons(comparisonButtons, 'comparison');
    setupRatingButtons(intentionButtons, 'intention');

    // イベントリスナーの設定
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
}

/**
 * チャット履歴を読み込む関数
 * @returns {Promise<void>}
 */
async function loadChatHistory() {
    const sessionId = SessionManager.getSessionId();
    console.log("セッションID:", sessionId);
    
    try {
        console.log("チャット履歴を読み込み中...");
        const history = await getChatHistory(sessionId);
        
        if (history && history.length > 0) {
            console.log(`${history.length}件のメッセージを読み込みました`);
            
            // メッセージを時系列順にソート
            const sortedHistory = history.sort((a, b) => {
                return new Date(a.timestamp) - new Date(b.timestamp);
            });

            // チャット履歴を表示
            sortedHistory.forEach(message => {
                if (message.type !== 'rating' && message.type !== 'survey') {
                    addMessage(message.content, message.type);
                }
            });
        } else {
            console.log("チャット履歴が空です");
        }
    } catch (error) {
        console.error("チャット履歴の読み込みエラー:", error);
        // エラーが発生しても静かに失敗
        console.log("チャット履歴の読み込みをスキップします");
    }
}

// アプリケーションの初期化
async function initializeApplication() {
    try {
        console.log("アプリケーションの初期化を開始...");
        
        // セッションの初期化
        const sessionId = SessionManager.getSessionId();
        console.log("セッションID:", sessionId);
        
        // チャットUIの初期化
        initializeChat();
        
        // チャット履歴の読み込み
        await loadChatHistory();
        
        console.log("アプリケーションの初期化が完了しました");
    } catch (error) {
        console.error("アプリケーションの初期化中にエラーが発生:", error);
    }
}

// アプリケーションの起動
window.addEventListener('load', initializeApplication);

console.log("=== frontend-chat.js 読み込み完了 ===");

// エクスポート（必要な場合）
export {
    SessionManager,
    sendMessage,
    addMessage,
    resetChat,
    endChat,
    submitSurvey
};