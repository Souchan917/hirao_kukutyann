// frontend-chat.js

import { saveMessage, getChatHistory } from "../libs/firebase.js";

console.log("=== frontend-chat.js 読み込み開始 ===");

// 定数定義
const STORAGE_KEYS = {
    SESSION: 'kukuchan_session_id',
    SUMMARY: 'kukuchan_chat_summary'
};

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
const satisfactionButtons = surveyForm.querySelectorAll('input[name="satisfaction"]');
const personalizedButtons = surveyForm.querySelectorAll('input[name="personalization"]');
const comparisonButtons = surveyForm.querySelectorAll('input[name="comparison"]');
const intentionButtons = surveyForm.querySelectorAll('input[name="intention"]');
const ageButtons = surveyForm.querySelectorAll('input[name="age"]');
const genderButtons = surveyForm.querySelectorAll('input[name="gender"]');
const occupationButtons = surveyForm.querySelectorAll('input[name="occupation"]');
const experienceButtons = surveyForm.querySelectorAll('input[name="experience"]');
const feedbackTextarea = document.getElementById('feedback');

// 状態管理
let state = {
    isSubmitting: false,
    lastMessageEvaluated: true,
    currentSummary: '',
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

// サマリー管理の関数
const summaryManager = {
    getCurrentSummary() {
        return localStorage.getItem(STORAGE_KEYS.SUMMARY) || '';
    },

    saveSummary(summary) {
        localStorage.setItem(STORAGE_KEYS.SUMMARY, summary);
        state.currentSummary = summary;
        console.log('新しい会話まとめを保存:', summary);
    },

    clearSummary() {
        localStorage.removeItem(STORAGE_KEYS.SUMMARY);
        state.currentSummary = '';
        console.log('会話まとめをクリアしました');
    }
};

// セッション管理の関数
function getOrCreateSessionId(forceNew = false) {
    if (forceNew) {
        summaryManager.clearSummary();
        const newSessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(STORAGE_KEYS.SESSION, newSessionId);
        document.cookie = `sessionId=${newSessionId}; path=/`;
        console.log("新しいセッションIDを生成:", newSessionId);
        return newSessionId;
    }

    let sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION);
    if (!sessionId) {
        summaryManager.clearSummary();
        sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(STORAGE_KEYS.SESSION, sessionId);
        document.cookie = `sessionId=${sessionId}; path=/`;
        console.log("新しいセッションIDを生成:", sessionId);
    }
    
    return sessionId;
}

// レーティング関連の関数
function createRatingContainer() {
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
}

function createRatingText() {
    const text = document.createElement("div");
    text.textContent = "この回答を評価してください。評価すると次のチャットを送ることができます。";
    text.style.cssText = `
        margin-bottom: 10px;
        color: #666;
        font-size: 0.9rem;
    `;
    return text;
}

function createButtonsContainer() {
    const container = document.createElement("div");
    container.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 20px;
    `;
    return container;
}

function createRatingButtons() {
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

    goodBtn.style.cssText = buttonStyle;
    badBtn.style.cssText = buttonStyle;

    setupRatingButtonEvents(goodBtn, badBtn);

    return { goodBtn, badBtn };
}

function createMinimizedRating(rating) {
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

function setupRatingButtonEvents(goodBtn, badBtn) {
    const content = chatContainer.lastElementChild.textContent;

    goodBtn.onmouseover = () => goodBtn.style.backgroundColor = '#f8f9fa';
    goodBtn.onmouseout = () => goodBtn.style.backgroundColor = 'white';
    badBtn.onmouseover = () => badBtn.style.backgroundColor = '#f8f9fa';
    badBtn.onmouseout = () => badBtn.style.backgroundColor = 'white';

    goodBtn.onclick = async () => await handleRating('good', content, goodBtn, badBtn);
    badBtn.onclick = async () => await handleRating('bad', content, badBtn, goodBtn);
}

// メッセージ追加関数
function addMessage(content, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);

    if (type === "ai") {
        state.lastMessageEvaluated = false;
        const ratingContainer = createRatingContainer();
        const ratingText = createRatingText();
        const buttonsContainer = createButtonsContainer();
        const { goodBtn, badBtn } = createRatingButtons();

        buttonsContainer.appendChild(goodBtn);
        buttonsContainer.appendChild(badBtn);
        ratingContainer.appendChild(ratingText);
        ratingContainer.appendChild(buttonsContainer);
        chatContainer.appendChild(ratingContainer);

        questionInput.disabled = true;
        sendButton.disabled = true;
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// メッセージ送信関数
async function sendMessage() {
    if (state.isSubmitting || !state.lastMessageEvaluated) {
        if (!state.lastMessageEvaluated) {
            alert("前の回答の評価をお願いします。");
        }
        return;
    }

    const message = questionInput.value.trim();
    if (!message) {
        alert("メッセージを入力してください。");
        return;
    }

    state.isSubmitting = true;
    questionInput.disabled = true;
    sendButton.disabled = true;

    try {
        const sessionId = getOrCreateSessionId();
        addMessage(message, "user");
        await saveMessage(message, "user", sessionId);

        const currentSummary = summaryManager.getCurrentSummary();
        
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Session-ID": sessionId
            },
            body: JSON.stringify({ 
                userMessage: message,
                conversationSummary: currentSummary
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // 会話まとめの更新
        if (data.summary) {
            summaryManager.saveSummary(data.summary);
        }

        addMessage(data.reply, "ai");
        await saveMessage(data.reply, "ai", sessionId);

    } catch (error) {
        console.error("チャットフロー内でエラー:", error);
        addMessage("エラーが発生しました。もう一度お試しください。", "ai");
    } finally {
        state.isSubmitting = false;
        questionInput.value = "";
    }
}

// 評価処理関数
async function handleRating(rating, content, activeBtn, inactiveBtn) {
    try {
        const sessionId = getOrCreateSessionId();
        await saveMessage(JSON.stringify({
            rating: rating,
            message: content,
            timestamp: new Date().toISOString()
        }), "rating", sessionId);
        
        const container = activeBtn.closest('.rating-container');
        const minimizedRating = createMinimizedRating(rating);
        container.parentNode.replaceChild(minimizedRating, container);
        
        state.lastMessageEvaluated = true;
        questionInput.disabled = false;
        sendButton.disabled = false;
        
    } catch (error) {
        console.error("評価保存エラー:", error);
        alert("評価の保存に失敗しました。もう一度お試しください。");
    }
}

// アンケート関連の関数
function setupRatingButtons() {
    const buttonGroups = [
        { buttons: satisfactionButtons, name: 'satisfaction' },
        { buttons: personalizedButtons, name: 'personalization' },
        { buttons: comparisonButtons, name: 'comparison' },
        { buttons: intentionButtons, name: 'intention' },
        { buttons: ageButtons, name: 'age' },
        { buttons: genderButtons, name: 'gender' },
        { buttons: occupationButtons, name: 'occupation' },
        { buttons: experienceButtons, name: 'experience' }
    ];

    buttonGroups.forEach(group => {
        group.buttons.forEach(button => {
            button.addEventListener('change', function() {
                state.surveyAnswers[group.name] = this.value;
            });
        });
    });

    if (feedbackTextarea) {
        feedbackTextarea.addEventListener('input', function() {
            state.surveyAnswers.feedback = this.value.trim();
        });
    }
}

async function submitSurvey(event) {
    event.preventDefault();

    const unansweredCategories = [];
    if (state.surveyAnswers.satisfaction === 0) unansweredCategories.push('満足度');
    if (state.surveyAnswers.personalization === 0) unansweredCategories.push('個別化された回答');
    if (state.surveyAnswers.comparison === 0) unansweredCategories.push('比較');
    if (state.surveyAnswers.intention === 0) unansweredCategories.push('意図の理解');
    if (state.surveyAnswers.age === 0) unansweredCategories.push('年代');
    if (!state.surveyAnswers.gender) unansweredCategories.push('性別');
    if (!state.surveyAnswers.occupation) unansweredCategories.push('職業');
    if (!state.surveyAnswers.experience) unansweredCategories.push('経験年数');

    if (unansweredCategories.length > 0) {
        alert(`以下の項目が未回答です：\n${unansweredCategories.join('\n')}`);
        return;
    }

    try {
        submitSurveyButton.disabled = true;
        submitSurveyButton.textContent = '送信中...';

        const sessionId = getOrCreateSessionId();
        const surveyData = {
            timestamp: new Date().toISOString(),
            answers: { ...state.surveyAnswers },
            sessionId: sessionId,
            conversationSummary: summaryManager.getCurrentSummary()
        };

        await saveMessage(JSON.stringify(surveyData), "survey", sessionId);
        alert("アンケートにご協力いただき、ありがとうございました。");
        resetSurveyUI();

    } catch (error) {
        console.error("アンケート送信エラー:", error);
        alert("送信に失敗しました。もう一度お試しください。");
    } finally {
        submitSurveyButton.disabled = false;
        submitSurveyButton.textContent = 'アンケートを送信';
    }
}

// UI関連の関数
function resetSurveyUI() {
    surveyForm.style.display = 'none';
    chatContainer.innerHTML = '';
    questionInput.disabled = false;
    sendButton.disabled = false;
    
    document.querySelectorAll('.selected').forEach(button => {
        button.classList.remove('selected');
        button.style.backgroundColor = '';
    });

    if (feedbackTextarea) {
        feedbackTextarea.value = '';
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
        chatContainer.innerHTML = "";
        summaryManager.clearSummary();
        getOrCreateSessionId(true);
        state.lastMessageEvaluated = true;
    }
}

function endChat() {
    if (!surveyForm) {
        console.error("アンケートフォームが見つかりません");
        return;
    }

    questionInput.disabled = true;
    sendButton.disabled = true;
    surveyForm.style.display = 'block';
    surveyForm.scrollIntoView({ behavior: 'smooth' });
}

// チャット履歴関連の関数
async function loadChatHistory() {
    const sessionId = getOrCreateSessionId();
    try {
        console.log("チャット履歴を読み込み中...");
        
        // 保存された会話まとめを読み込む
        const savedSummary = summaryManager.getCurrentSummary();
        if (savedSummary) {
            state.currentSummary = savedSummary;
            console.log('保存された会話まとめを読み込みました:', savedSummary);
        }

        // チャット履歴を読み込む
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

// デバッグ用関数
function debugState() {
    console.log('現在の状態:', {
        summary: summaryManager.getCurrentSummary(),
        sessionId: sessionStorage.getItem(STORAGE_KEYS.SESSION),
        state: state
    });
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded イベント発火");
    setupRatingButtons();
    
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
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        console.log("入力フィールドのリスナーを設定");
    }

    if (endChatButton) {
        endChatButton.addEventListener("click", endChat);
        console.log("終了ボタンのリスナーを設定");
    }

    if (submitSurveyButton) {
        submitSurveyButton.addEventListener("click", submitSurvey);
        console.log("アンケート送信ボタンのリスナーを設定");
    }
    
    console.log("イベントリスナーの設定完了");
});

// ページロード時の処理
window.addEventListener('load', () => {
    console.log("ページロード処理開始");
    
    if (!document.hidden) {
        getOrCreateSessionId(true);
    }
    loadChatHistory();
});

// ストレージ変更の監視
window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.SESSION || event.key === STORAGE_KEYS.SUMMARY) {
        console.log("ストレージの変更を検出:", event.key);
        loadChatHistory();
    }
});

// エラーハンドリング
window.addEventListener('error', (event) => {
    console.error('グローバルエラー:', event.error);
    alert("予期せぬエラーが発生しました。ページを更新してください。");
});

// エクスポート
export { getOrCreateSessionId, resetChat, endChat };

console.log("=== frontend-chat.js 読み込み完了 ===");