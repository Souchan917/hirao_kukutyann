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
// DOM要素の取得部分を修正
const satisfactionButtons = surveyForm.querySelectorAll('input[name="satisfaction"]');
const personalizedButtons = surveyForm.querySelectorAll('input[name="personalization"]');
const comparisonButtons = surveyForm.querySelectorAll('input[name="comparison"]');
const intentionButtons = surveyForm.querySelectorAll('input[name="intention"]');

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

async function sendMessage() {
    console.log("=== sendMessage 関数開始 ===");

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
        await saveMessage(message, "user", sessionId);
        addMessage(message, "user");

        // 過去のチャット履歴を取得
        const history = await getChatHistory(sessionId);
        const pastMessages = history.map(message => ({
            role: message.type === 'user' ? 'user' : 'assistant',
            content: message.content
        }));

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Session-ID": sessionId
            },
            body: JSON.stringify({ 
                userMessage: message,
                pastMessages: pastMessages  // 過去のメッセージを含める
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

// メッセージ追加関数
function addMessage(content, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);

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

// 評価コンテナ作成
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

// 評価テキスト作成
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

// ボタンコンテナ作成
function createButtonsContainer() {
    const container = document.createElement("div");
    container.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 20px;
    `;
    return container;
}

// 評価ボタン作成
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

// 評価ボタンのイベント設定
function setupRatingButtonEvents(goodBtn, badBtn) {
    const content = chatContainer.lastElementChild.textContent;

    goodBtn.onmouseover = () => goodBtn.style.backgroundColor = '#f8f9fa';
    goodBtn.onmouseout = () => goodBtn.style.backgroundColor = 'white';
    badBtn.onmouseover = () => badBtn.style.backgroundColor = '#f8f9fa';
    badBtn.onmouseout = () => badBtn.style.backgroundColor = 'white';

    goodBtn.onclick = async () => await handleRating('good', content, goodBtn, badBtn);
    badBtn.onclick = async () => await handleRating('bad', content, badBtn, goodBtn);
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

// チャットリセット関数
function resetChat() {
    if (confirm("チャット履歴をリセットしてもよろしいですか？")) {
        chatContainer.innerHTML = "";
        getOrCreateSessionId(true);
    }
}

function setupRatingButtons() {
    console.log("評価ボタンのセットアップを開始");

    const buttonGroups = [
        { buttons: satisfactionButtons, name: 'satisfaction', label: '満足度' },
        { buttons: personalizedButtons, name: 'personalization', label: '個別化された回答' },
        { buttons: comparisonButtons, name: 'comparison', label: '比較' },
        { buttons: intentionButtons, name: 'intention', label: '意図の理解' }
    ];

    // 選択されたボタンのスタイル
    const selectedStyle = {
        backgroundColor: '#2196f3', // より鮮やかな青
        color: 'white',            // 白文字
        borderColor: '#1976d2',    // やや暗い青で枠取り
        fontWeight: 'bold',        // 太字
    };

    // 非選択のボタンのスタイル
    const defaultStyle = {
        backgroundColor: 'white',
        color: '#333',
        borderColor: '#dee2e6',
        fontWeight: 'normal'
    };

    buttonGroups.forEach(group => {
        group.buttons.forEach(button => {
            button.addEventListener('change', function() {
                // 値を保存
                surveyAnswers[group.name] = parseInt(this.value);
                console.log(`${group.label}の評価を更新:`, surveyAnswers[group.name]);
                console.log('現在の回答状態:', surveyAnswers);

                // 同じグループの全てのラベルを非選択状態のスタイルにリセット
                const allLabels = document.querySelectorAll(`label[for^="${group.name}"]`);
                allLabels.forEach(label => {
                    Object.assign(label.style, defaultStyle);
                    label.classList.remove('selected');
                });

                // 選択されたラベルのスタイルを変更
                const selectedLabel = document.querySelector(`label[for="${this.id}"]`);
                if (selectedLabel) {
                    Object.assign(selectedLabel.style, selectedStyle);
                    selectedLabel.classList.add('selected');

                    // ホバーエフェクトを追加
                    selectedLabel.addEventListener('mouseover', () => {
                        selectedLabel.style.backgroundColor = '#1976d2';  // やや暗い青
                    });
                    selectedLabel.addEventListener('mouseout', () => {
                        if (selectedLabel.classList.contains('selected')) {
                            selectedLabel.style.backgroundColor = selectedStyle.backgroundColor;
                        }
                    });
                }
            });
        });

        // 初期状態のスタイルを設定
        const labels = document.querySelectorAll(`label[for^="${group.name}"]`);
        labels.forEach(label => {
            Object.assign(label.style, defaultStyle);
            
            // ホバーエフェクトを追加
            label.addEventListener('mouseover', () => {
                if (!label.classList.contains('selected')) {
                    label.style.backgroundColor = '#f8f9fa';  // 薄いグレー
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

// アンケート送信関数も修正
async function submitSurvey(event) {
    event.preventDefault();
    console.log("アンケート送信処理を開始");
    console.log("送信前の回答状態:", surveyAnswers);

    // 未回答チェック
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

// UIリセット関数
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

async function getChatHistory(sessionId) {
    console.log('チャット履歴を取得:', sessionId);

    if (!sessionId) {
        console.error('セッションIDが指定されていません');
        return []; // 空の配列を返す
    }

    try {
        // 特定のセッションIDに対応するメッセージを時系列で取得
        const chatQuery = query(
            collection(db, "chatLogs"),
            where("sessionId", "==", sessionId),
            orderBy("timestamp", "asc")
        );

        const querySnapshot = await getDocs(chatQuery);
        const messages = [];
        
        querySnapshot.forEach((doc) => {
            let messageData = doc.data();
            // timestampがFirestore Timestampオブジェクトの場合の処理
            if (messageData.timestamp && typeof messageData.timestamp.toDate === 'function') {
                messageData.timestamp = messageData.timestamp.toDate();
            }
            
            messages.push({
                id: doc.id,
                ...messageData
            });
        });

        console.log(`${messages.length}件のメッセージを取得しました`);
        
        // 最大3回分の過去のチャット履歴を返す
        return messages.slice(-6);  // ユーザーとAIの発言を合わせて最大6件
    } catch (error) {
        console.error('チャット履歴の取得中にエラーが発生:', error);
        // エラーが発生しても空の配列を返す
        return [];
    }
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

    // アンケート送信ボタンのイベントリスナー
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