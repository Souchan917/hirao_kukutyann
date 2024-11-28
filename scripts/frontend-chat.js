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
const satisfactionButtons = surveyForm.querySelectorAll('input[name="satisfaction"]');
const personalizedButtons = surveyForm.querySelectorAll('input[name="personalization"]');
const comparisonButtons = surveyForm.querySelectorAll('input[name="comparison"]');
const intentionButtons = surveyForm.querySelectorAll('input[name="intention"]');

// セッション管理用の定数
const SESSION_STORAGE_KEY = 'kukuchan_session_id';
const CHAT_HISTORY_KEY = 'kukuchan_chat_history';

// 状態管理
let isSubmitting = false;
let surveyAnswers = {
    satisfaction: 0,
    personalization: 0,
    comparison: 0,
    intention: 0
};

// ローカルストレージ関連の関数
function saveLocalChatHistory(content, type) {
    try {
        let history = [];
        const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        if (savedHistory) {
            history = JSON.parse(savedHistory);
        }
        
        history.push({
            content,
            type,
            timestamp: new Date().toISOString()
        });
        
        // 最新6件（3往復分）のみ保持
        if (history.length > 6) {
            history = history.slice(-6);
        }
        
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history));
        console.log('ローカルストレージに保存しました:', history);
    } catch (error) {
        console.error('ローカル履歴の保存中にエラー:', error);
    }
}

function getLocalChatHistory() {
    try {
        const history = localStorage.getItem(CHAT_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('ローカル履歴の取得中にエラー:', error);
        return [];
    }
}

function clearLocalChatHistory() {
    localStorage.removeItem(CHAT_HISTORY_KEY);
    console.log('ローカル履歴をクリアしました');
}

// セッション管理の関数
function getOrCreateSessionId(forceNew = false) {
    if (forceNew) {
        const newSessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
        document.cookie = `sessionId=${newSessionId}; path=/`;
        console.log("新しいセッションIDを生成:", newSessionId);
        return newSessionId;
    }

    let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    
    if (!sessionId) {
        sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        document.cookie = `sessionId=${sessionId}; path=/`;
        console.log("新しいセッションIDを生成:", sessionId);
    } else {
        console.log("既存のセッションIDを使用:", sessionId);
    }
    
    return sessionId;
}

// メッセージ追加関数
function addMessage(content, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);

    // ローカルストレージに保存
    saveLocalChatHistory(content, type);

    if (type === "ai") {
        const ratingContainer = createRatingContainer();
        const ratingText = createRatingText();
        const buttonsContainer = createButtonsContainer();
        const { goodBtn, badBtn } = createRatingButtons();

        buttonsContainer.appendChild(goodBtn);
        buttonsContainer.appendChild(badBtn);
        ratingContainer.appendChild(ratingText);
        ratingContainer.appendChild(buttonsContainer);
        chatContainer.appendChild(ratingContainer);
    }

    chatContainer.scrollTop = chatContainer.scrollHeight;
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
    text.textContent = "この回答は役に立ちましたか？";
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

    goodBtn.style.cssText = buttonStyle;
    badBtn.style.cssText = buttonStyle;

    setupRatingButtonEvents(goodBtn, badBtn);

    return { goodBtn, badBtn };
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

// メッセージ送信関数
async function sendMessage() {
    if (isSubmitting) {
        console.log("送信中のため処理をスキップします");
        return;
    }

    const message = questionInput.value.trim();
    if (!message) {
        alert("メッセージを入力してください。");
        return;
    }

    isSubmitting = true;
    questionInput.disabled = true;
    sendButton.disabled = true;

    try {
        const sessionId = getOrCreateSessionId();
        
        // メッセージを表示
        addMessage(message, "user");

        // 会話履歴を取得
        const history = getLocalChatHistory();
        const conversationHistory = history
            .map(msg => `${msg.type === 'user' ? 'ユーザー' : 'ククちゃん'}: ${msg.content}`)
            .join('\n');

        // Firebaseにも保存
        await saveMessage(message, "user", sessionId);

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Session-ID": sessionId
            },
            body: JSON.stringify({ 
                userMessage: message,
                conversationHistory: conversationHistory
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        addMessage(data.reply, "ai");
        await saveMessage(data.reply, "ai", sessionId);

    } catch (error) {
        console.error("チャットフロー内でエラー:", error);
        addMessage("エラーが発生しました。後でもう一度お試しください。", "ai");
    } finally {
        isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
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
        const ratingText = container.querySelector('div');
        
        activeBtn.style.backgroundColor = rating === 'good' ? '#e6f4ea' : '#fce8e6';
        activeBtn.style.borderColor = rating === 'good' ? '#34a853' : '#ea4335';
        activeBtn.style.color = rating === 'good' ? '#34a853' : '#ea4335';
        inactiveBtn.style.opacity = '0.5';
        activeBtn.disabled = true;
        inactiveBtn.disabled = true;
        
        ratingText.textContent = "評価ありがとうございます";
        ratingText.style.color = rating === 'good' ? '#34a853' : '#ea4335';
    } catch (error) {
        console.error("評価保存エラー:", error);
        alert("評価の保存に失敗しました。もう一度お試しください。");
    }
}

// チャット終了関数
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

// アンケート関連の関数
function setupRatingButtons() {
    console.log("評価ボタンのセットアップを開始");

    const buttonGroups = [
        { buttons: satisfactionButtons, name: 'satisfaction', label: '満足度' },
        { buttons: personalizedButtons, name: 'personalization', label: '個別化された回答' },
        { buttons: comparisonButtons, name: 'comparison', label: '比較' },
        { buttons: intentionButtons, name: 'intention', label: '意図の理解' }
    ];

    const selectedStyle = {
        backgroundColor: '#2196f3',
        color: 'white',
        borderColor: '#1976d2',
        fontWeight: 'bold',
    };

    const defaultStyle = {
        backgroundColor: 'white',
        color: '#333',
        borderColor: '#dee2e6',
        fontWeight: 'normal'
    };

    buttonGroups.forEach(group => {
        group.buttons.forEach(button => {
            button.addEventListener('change', function() {
                surveyAnswers[group.name] = parseInt(this.value);
                console.log(`${group.label}の評価を更新:`, surveyAnswers[group.name]);

                const allLabels = document.querySelectorAll(`label[for^="${group.name}"]`);
                allLabels.forEach(label => {
                    Object.assign(label.style, defaultStyle);
                    label.classList.remove('selected');
                });

                const selectedLabel = document.querySelector(`label[for="${this.id}"]`);
                if (selectedLabel) {
                    Object.assign(selectedLabel.style, selectedStyle);
                    selectedLabel.classList.add('selected');

                    selectedLabel.addEventListener('mouseover', () => {
                        selectedLabel.style.backgroundColor = '#1976d2';
                    });
                    selectedLabel.addEventListener('mouseout', () => {
                        if (selectedLabel.classList.contains('selected')) {
                            selectedLabel.style.backgroundColor = selectedStyle.backgroundColor;
                        }
                    });
                }
            });
        });

        const labels = document.querySelectorAll(`label[for^="${group.name}"]`);
        labels.forEach(label => {
            Object.assign(label.style, defaultStyle);
            
            label.addEventListener('mouseover', () => {
                if (!label.classList.contains('selected')) {
                    label.style.backgroundColor = '#f8f9fa';
                }
            });
            label.addEventListener('mouseout', () => {
                if (!label.classList.contains('selected')) {
                    label.style.backgroundColor = defaultStyle.backgroundColor;
                }
            });
        });
    });
}

async function submitSurvey(event) {
    event.preventDefault();
    console.log("アンケート送信処理を開始");

    const unansweredCategories = [];
    if (surveyAnswers.satisfaction === 0) unansweredCategories.push('満足度');
    if (surveyAnswers.personalization === 0) unansweredCategories.push('個別化された回答');
    if (surveyAnswers.comparison === 0) unansweredCategories.push('比較');
    if (surveyAnswers.intention === 0) unansweredCategories.push('意図の理解');

    if (unansweredCategories.length > 0) {
        const message = `以下の項目が未回答です：\n${unansweredCategories.join('\n')}`;
        console.log("未回答項目があります:", message);
        alert(message);
        return;
    }

    try {
        submitSurveyButton.disabled = true;
        submitSurveyButton.textContent = '送信中...';

        const sessionId = getOrCreateSessionId();
        const surveyData = {
            timestamp: new Date().toISOString(),
            answers: {
                satisfaction: surveyAnswers.satisfaction,
                personalization: surveyAnswers.personalization,
                comparison: surveyAnswers.comparison,
                intention: surveyAnswers.intention
            },
            sessionId: sessionId
        };

        console.log("Firebaseに送信するデータ:", surveyData);
        await saveMessage(JSON.stringify(surveyData), "survey", sessionId);
        console.log("Firebaseへの送信完了");

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

    surveyAnswers = {
        satisfaction: 0,
        personalization: 0,
        comparison: 0,
        intention: 0
    };

    getOrCreateSessionId(true);
}

function resetChat() {
    if (confirm("チャット履歴をリセットしてもよろしいですか？")) {
        chatContainer.innerHTML = "";
        clearLocalChatHistory();
        getOrCreateSessionId(true);
    }
}

// チャット履歴読み込み関数
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

// デバッグ用関数
function debugLocalStorage() {
    const history = getLocalChatHistory();
    console.log('現在のローカルストレージの内容:', history);
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
            if (e.key === "Enter") {
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
        submitSurveyButton.addEventListener("click", function(event) {
            event.preventDefault();
            submitSurvey(event);
        });
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

// visibility変更時の処理
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        console.log("タブがアクティブになりました");
        getOrCreateSessionId(true);
        chatContainer.innerHTML = '';
        loadChatHistory();
    }
});

// セッションストレージの変更を監視
window.addEventListener('storage', (event) => {
    if (event.key === SESSION_STORAGE_KEY) {
        console.log("セッションストレージの変更を検出");
        loadChatHistory();
    }
});

console.log("=== frontend-chat.js 読み込み完了 ===");

export { getOrCreateSessionId, resetChat, endChat };