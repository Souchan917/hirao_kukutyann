import { saveMessage, getChatHistory } from "../libs/firebase.js";

console.log("=== frontend-chat.js 読み込み開始 ===");

// 定数の定義
const CONSTANTS = {
    TIMEOUT_MS: 11000,         // タイムアウト時間（8秒）
    MAX_HISTORY_LENGTH: 10,   // 保持する履歴の最大数
    SESSION_STORAGE_KEY: 'kukuchan_session_id',
    CHAT_HISTORY_KEY: 'kukuchan_chat_history'
};

// DOM要素の取得
const apiUrl = "/api/chat";
const elements = {
    chatContainer: document.getElementById("chatContainer"),
    questionInput: document.getElementById("questionInput"),
    sendButton: document.getElementById("sendQuestion"),
    resetButton: document.getElementById("resetChat"),
    endChatButton: document.getElementById("endChat"),
    surveyForm: document.getElementById("survey-form"),
    submitSurveyButton: document.getElementById("submitSurvey")
};

// アンケート要素の取得
const surveyElements = {
    satisfaction: elements.surveyForm.querySelectorAll('input[name="satisfaction"]'),
    personalization: elements.surveyForm.querySelectorAll('input[name="personalization"]'),
    comparison: elements.surveyForm.querySelectorAll('input[name="comparison"]'),
    intention: elements.surveyForm.querySelectorAll('input[name="intention"]'),
    age: elements.surveyForm.querySelectorAll('input[name="age"]'),
    gender: elements.surveyForm.querySelectorAll('input[name="gender"]'),
    occupation: elements.surveyForm.querySelectorAll('input[name="occupation"]'),
    experience: elements.surveyForm.querySelectorAll('input[name="experience"]'),
    feedback: document.getElementById('feedback')
};

// 状態管理
let state = {
    isSubmitting: false,
    lastMessageEvaluated: true,
    isRequestInProgress: false,
    surveyAnswers: {
        satisfaction: 0,
        personalization: 0,
        comparison: 0,
        intention: 0,
        age: 0,
        gender: '',
        occupation: '',
        experience: '',
        feedback: ''
    }
};

// ローカルストレージ関連の関数
const storage = {
    saveLocalChatHistory(content, type) {
        try {
            let history = this.getLocalChatHistory();
            history.push({
                content,
                type,
                timestamp: new Date().toISOString()
            });
            
            if (history.length > CONSTANTS.MAX_HISTORY_LENGTH) {
                history = history.slice(-CONSTANTS.MAX_HISTORY_LENGTH);
            }
            
            localStorage.setItem(CONSTANTS.CHAT_HISTORY_KEY, JSON.stringify(history));
            console.log('ローカルストレージに保存しました:', history);
        } catch (error) {
            console.error('ローカル履歴の保存中にエラー:', error);
        }
    },

    getLocalChatHistory() {
        try {
            const history = localStorage.getItem(CONSTANTS.CHAT_HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (error) {
            console.error('ローカル履歴の取得中にエラー:', error);
            return [];
        }
    },

    clearLocalChatHistory() {
        localStorage.removeItem(CONSTANTS.CHAT_HISTORY_KEY);
        console.log('ローカル履歴をクリアしました');
    }
};

// セッション管理の関数
function getOrCreateSessionId(forceNew = false) {
    if (forceNew) {
        storage.clearLocalChatHistory();
        const newSessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(CONSTANTS.SESSION_STORAGE_KEY, newSessionId);
        document.cookie = `sessionId=${newSessionId}; path=/`;
        console.log("新しいセッションIDを生成:", newSessionId);
        return newSessionId;
    }

    let sessionId = sessionStorage.getItem(CONSTANTS.SESSION_STORAGE_KEY);
    
    if (!sessionId) {
        storage.clearLocalChatHistory();
        sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(CONSTANTS.SESSION_STORAGE_KEY, sessionId);
        document.cookie = `sessionId=${sessionId}; path=/`;
        console.log("新しいセッションIDを生成:", sessionId);
    }
    
    return sessionId;
}

// メッセージUI関連の関数
const ui = {
    createMessageElement(content, type) {
        const messageDiv = document.createElement("div");
        messageDiv.className = type === "user" ? "user-message" : "ai-message";
        messageDiv.textContent = content;
        return messageDiv;
    },

    createErrorElement(message) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "error-message";
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            color: #721c24;
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            text-align: center;
        `;
        return errorDiv;
    },

    createRatingContainer() {
        const container = document.createElement("div");
        container.className = "rating-container";
        container.style.cssText = `
            text-align: center;
            margin: 10px 0;
            padding: 10px;
            border-radius: 5px;
            background-color: #f8f9fa;
        `;
        return container;
    },

    createRatingText() {
        const text = document.createElement("div");
        text.textContent = "この回答を評価してください。評価すると次のチャットを送ることができます。";
        text.style.cssText = `
            margin-bottom: 10px;
            color: #666;
            font-size: 0.9rem;
        `;
        return text;
    },

    createButtonsContainer() {
        const container = document.createElement("div");
        container.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 20px;
        `;
        return container;
    },

    createRatingButtons() {
        const goodBtn = document.createElement("button");
        const badBtn = document.createElement("button");

        const buttonStyle = `
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

        [goodBtn, badBtn].forEach(btn => btn.style.cssText = buttonStyle);

        goodBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
            <span style="margin-left: 5px;">Good</span>
        `;

        badBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
            </svg>
            <span style="margin-left: 5px;">Bad</span>
        `;

        return { goodBtn, badBtn };
    },

    createMinimizedRating(rating) {
        const container = document.createElement("div");
        container.style.cssText = `
            text-align: right;
            margin: 5px 0;
            font-size: 0.8rem;
            color: ${rating === 'good' ? '#34a853' : '#ea4335'};
        `;

        const icon = document.createElement("span");
        icon.innerHTML = rating === 'good' ? '👍' : '👎';
        icon.style.fontSize = '0.8rem';
        
        container.appendChild(icon);
        return container;
    }
};

// メッセージ処理関連の関数
async function sendMessage() {
    if (state.isSubmitting || !state.lastMessageEvaluated) {
        if (!state.lastMessageEvaluated) {
            alert("前の回答の評価をお願いします。");
        }
        return;
    }

    const message = elements.questionInput.value.trim();
    if (!message) {
        alert("メッセージを入力してください。");
        return;
    }

    try {
        if (state.isRequestInProgress) return;
        state.isRequestInProgress = true;
        state.isSubmitting = true;

        elements.questionInput.disabled = true;
        elements.sendButton.disabled = true;

        const sessionId = getOrCreateSessionId();
        addMessage(message, "user");
        await saveMessage(message, "user", sessionId);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONSTANTS.TIMEOUT_MS);

        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Session-ID": sessionId
                },
                body: JSON.stringify({ 
                    userMessage: message,
                    conversationHistory: storage.getLocalChatHistory()
                        .map(msg => `${msg.type === 'user' ? 'ユーザー' : 'ククちゃん'}: ${msg.content}`)
                        .join('\n')
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data || !data.reply) {
                throw new Error('Invalid response format');
            }

            addMessage(data.reply, "ai");
            await saveMessage(data.reply, "ai", sessionId);

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('応答がタイムアウトしました。もう一度お試しください。');
            }
            throw error;
        }

    } catch (error) {
        console.error("チャットフロー内でエラー:", error);
        
        let errorMessage = "エラーが発生しました。もう一度お試しください。";
        if (error.message.includes('timeout') || error.message.includes('タイムアウト')) {
            errorMessage = "応答に時間がかかりすぎています。もう一度お試しください。";
        } else if (error.message.includes('network') || error.message.includes('Network')) {
            errorMessage = "通信エラーが発生しました。インターネット接続を確認してください。";
        }
        
        addMessage(errorMessage, "error");
        
        state.lastMessageEvaluated = true;
        elements.questionInput.disabled = false;
        elements.sendButton.disabled = false;

    } finally {
        state.isRequestInProgress = false;
        state.isSubmitting = false;
        elements.questionInput.value = "";
    }
}

function addMessage(content, type) {
    let messageElement;
    
    if (type === "error") {
        messageElement = ui.createErrorElement(content);
    } else {
        messageElement = ui.createMessageElement(content, type);
    }
    
    elements.chatContainer.appendChild(messageElement);

    if (type !== "error") {
        storage.saveLocalChatHistory(content, type);
    }

    if (type === "ai") {
        state.lastMessageEvaluated = false;
        addRatingInterface();
    }

    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

function addRatingInterface() {
    const container = ui.createRatingContainer();
    const text = ui.createRatingText();
    const buttonsContainer = ui.createButtonsContainer();
    const { goodBtn, badBtn } = ui.createRatingButtons();

    setupRatingButtonEvents(goodBtn, badBtn);
    
    buttonsContainer.appendChild(goodBtn);
    buttonsContainer.appendChild(badBtn);
    container.appendChild(text);
    container.appendChild(buttonsContainer);
    elements.chatContainer.appendChild(container);

    elements.questionInput.disabled = true;
    elements.sendButton.disabled = true;
}

function setupRatingButtonEvents(goodBtn, badBtn) {
    const content = elements.chatContainer.lastElementChild.textContent;

    [goodBtn, badBtn].forEach(btn => {
        btn.onmouseover = () => btn.style.backgroundColor = '#f8f9fa';
        btn.onmouseout = () => btn.style.backgroundColor = 'white';
    });

    goodBtn.onclick = async () => await handleRating('good', content, goodBtn, badBtn);
    badBtn.onclick = async () => await handleRating('bad', content, badBtn, goodBtn);
}

async function handleRating(rating, content, activeBtn, inactiveBtn) {
    try {
        const sessionId = getOrCreateSessionId();
        await saveMessage(JSON.stringify({
            rating: rating,
            message: content,
            timestamp: new Date().toISOString()
        }), "rating", sessionId);
        
        const container = activeBtn.closest('.rating-container');
        const minimizedRating = ui.createMinimizedRating(rating);
        container.parentNode.replaceChild(minimizedRating, container);
        
        state.lastMessageEvaluated = true;
        elements.questionInput.disabled = false;
        elements.sendButton.disabled = false;
        
    } catch (error) {
        console.error("評価保存エラー:", error);
        alert("評価の保存に失敗しました。もう一度お試しください。");
    }
}

// アンケート関連の関数

function setupSurvey() {
    Object.entries(surveyElements).forEach(([key, elements]) => {
        if (key === 'feedback') {
            elements.addEventListener('input', function() {
                state.surveyAnswers.feedback = this.value.trim();
            });
            return;
        }

        elements.forEach(element => {
            element.addEventListener('change', function() {
                state.surveyAnswers[key] = this.value;
                console.log(`${key}の評価を更新:`, state.surveyAnswers[key]);
            });
        });
    });
}

async function submitSurvey(event) {
    event.preventDefault();
    console.log("アンケート送信処理を開始");

    const unansweredCategories = validateSurvey();
    if (unansweredCategories.length > 0) {
        alert(`以下の項目が未回答です：\n${unansweredCategories.join('\n')}`);
        return;
    }

    try {
        elements.submitSurveyButton.disabled = true;
        elements.submitSurveyButton.textContent = '送信中...';

        const sessionId = getOrCreateSessionId();
        const surveyData = createSurveyData(sessionId);

        await saveMessage(JSON.stringify(surveyData), "survey", sessionId);
        
        alert("アンケートにご協力いただき、ありがとうございました。");
        resetSurveyUI();

    } catch (error) {
        console.error("アンケート送信エラー:", error);
        alert("送信に失敗しました。もう一度お試しください。");
    } finally {
        elements.submitSurveyButton.disabled = false;
        elements.submitSurveyButton.textContent = 'アンケートを送信';
    }
}

function validateSurvey() {
    const unansweredCategories = [];
    const requiredFields = {
        satisfaction: '満足度',
        personalization: '個別化された回答',
        comparison: '比較',
        intention: '意図の理解',
        age: '年代',
        gender: '性別',
        occupation: '職業',
        experience: '経験年数'
    };

    Object.entries(requiredFields).forEach(([key, label]) => {
        if (!state.surveyAnswers[key]) {
            unansweredCategories.push(label);
        }
    });

    return unansweredCategories;
}

function createSurveyData(sessionId) {
    return {
        timestamp: new Date().toISOString(),
        answers: { ...state.surveyAnswers },
        sessionId: sessionId
    };
}

// UI操作関連の関数
function resetSurveyUI() {
    elements.surveyForm.style.display = 'none';
    elements.chatContainer.innerHTML = '';
    elements.questionInput.disabled = false;
    elements.sendButton.disabled = false;
    
    document.querySelectorAll('.selected').forEach(button => {
        button.classList.remove('selected');
        button.style.backgroundColor = '';
    });

    if (surveyElements.feedback) {
        surveyElements.feedback.value = '';
    }

    state.surveyAnswers = {
        satisfaction: 0,
        personalization: 0,
        comparison: 0,
        intention: 0,
        age: 0,
        gender: '',
        occupation: '',
        experience: '',
        feedback: ''
    };

    getOrCreateSessionId(true);
}

function resetChat() {
    if (confirm("チャット履歴をリセットしてもよろしいですか？")) {
        elements.chatContainer.innerHTML = "";
        storage.clearLocalChatHistory();
        getOrCreateSessionId(true);
        state.lastMessageEvaluated = true;
    }
}

function endChat() {
    if (!elements.surveyForm) {
        console.error("アンケートフォームが見つかりません");
        return;
    }

    elements.questionInput.disabled = true;
    elements.sendButton.disabled = true;
    elements.surveyForm.style.display = 'block';
    elements.surveyForm.scrollIntoView({ behavior: 'smooth' });
}

// チャット履歴関連の関数
async function loadChatHistory() {
    const sessionId = getOrCreateSessionId();
    try {
        console.log("チャット履歴を読み込み中...");
        const history = await getChatHistory(sessionId);

        if (history && history.length > 0) {
            history.forEach(message => {
                if (message.type !== 'rating' && message.type !== 'survey') {
                    addMessage(message.content, message.type);
                }
            });
        }
    } catch (error) {
        console.error("チャット履歴の読み込みエラー:", error);
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("DOMContentLoaded イベント発火");
        setupSurvey();
        
        if (elements.sendButton) {
            elements.sendButton.addEventListener("click", sendMessage);
        }

        if (elements.resetButton) {
            elements.resetButton.addEventListener("click", resetChat);
        }

        if (elements.questionInput) {
            elements.questionInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        if (elements.endChatButton) {
            elements.endChatButton.addEventListener("click", endChat);
        }

        if (elements.submitSurveyButton) {
            elements.submitSurveyButton.addEventListener("click", submitSurvey);
        }
    });

    window.addEventListener('load', () => {
        if (!document.hidden) {
            getOrCreateSessionId(true);
        }
        loadChatHistory();
    });

    window.addEventListener('storage', (event) => {
        if (event.key === CONSTANTS.SESSION_STORAGE_KEY) {
            loadChatHistory();
        }
    });
}

// 初期化
setupEventListeners();

console.log("=== frontend-chat.js 読み込み完了 ===");

export { getOrCreateSessionId, resetChat, endChat };