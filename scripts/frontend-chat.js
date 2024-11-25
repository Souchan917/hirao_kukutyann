// インポート
import { saveMessage, getChatHistory } from "../libs/firebase.js";

console.log("=== frontend-chat.js 読み込み開始 ===");

// DOM要素の取得
const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");
const endChatButton = document.getElementById("endChat"); // IDベースで取得するように変更
const surveyForm = document.getElementById("survey-form");
const submitSurveyButton = document.getElementById("submitSurvey"); // IDベースで取得するように変更

// 評価ボタングループの取得
const satisfactionButtons = surveyForm.querySelector('div[aria-label="満足度"]').querySelectorAll('strong');
const personalizedButtons = surveyForm.querySelector('div[aria-label="個別化された回答"]').querySelectorAll('strong');
const comparisonButtons = surveyForm.querySelector('div[aria-label="比較"]').querySelectorAll('strong');
const intentionButtons = surveyForm.querySelector('div[aria-label="意図の理解"]').querySelectorAll('strong');

// DOM要素の存在確認とログ出力
console.log("DOM要素の確認:", {
    chatContainer,
    questionInput,
    sendButton,
    resetButton,
    endChatButton,
    surveyForm,
    submitSurveyButton,
    評価ボタン: {
        満足度: satisfactionButtons.length,
        個別化: personalizedButtons.length,
        比較: comparisonButtons.length,
        意図: intentionButtons.length
    }
});

// 状態管理
let isSubmitting = false;
let surveyAnswers = {
    satisfaction: 0,
    personalization: 0,
    comparison: 0,
    intention: 0
};

// メッセージ追加関数を修正
function addMessage(content, type) {
    console.log(`addMessage関数実行: ${type}メッセージを追加`);
    const messageDiv = document.createElement("div");
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    
    // メッセージコンテナを作成
    const messageContainer = document.createElement("div");
    messageContainer.className = "message-container";
    messageContainer.style.marginBottom = "20px";
    
    // メッセージ内容を追加
    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    messageContent.textContent = content;
    messageContainer.appendChild(messageContent);
    
    // AIメッセージの場合、評価ボタンを追加
    if (type === "ai") {
        const ratingContainer = document.createElement("div");
        ratingContainer.className = "rating-container";
        ratingContainer.style.marginTop = "5px";
        ratingContainer.style.display = "flex";
        ratingContainer.style.gap = "10px";
        ratingContainer.style.justifyContent = "flex-end";
        
        // GOODボタン
        const goodButton = document.createElement("button");
        goodButton.innerHTML = "👍";
        goodButton.className = "rating-button good";
        goodButton.style.border = "none";
        goodButton.style.background = "none";
        goodButton.style.cursor = "pointer";
        goodButton.style.fontSize = "1.2em";
        goodButton.title = "Good";
        
        // BADボタン
        const badButton = document.createElement("button");
        badButton.innerHTML = "👎";
        badButton.className = "rating-button bad";
        badButton.style.border = "none";
        badButton.style.background = "none";
        badButton.style.cursor = "pointer";
        badButton.style.fontSize = "1.2em";
        badButton.title = "Bad";
        
        // 評価イベントリスナーを追加
        const messageId = `msg_${Date.now()}`;
        messageContainer.dataset.messageId = messageId;
        
        goodButton.addEventListener("click", () => handleRating(messageId, content, "good"));
        badButton.addEventListener("click", () => handleRating(messageId, content, "bad"));
        
        ratingContainer.appendChild(goodButton);
        ratingContainer.appendChild(badButton);
        messageContainer.appendChild(ratingContainer);
    }
    
    // メッセージをチャットコンテナに追加
    chatContainer.appendChild(messageContainer);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 評価処理関数を追加
async function handleRating(messageId, content, rating) {
    console.log(`評価処理開始: ${messageId}, ${rating}`);
    
    try {
        // 評価ボタンを無効化（二重評価防止）
        const messageContainer = document.querySelector(`[data-message-id="${messageId}"]`);
        const ratingButtons = messageContainer.querySelectorAll(".rating-button");
        ratingButtons.forEach(button => {
            button.disabled = true;
            button.style.opacity = "0.5";
            button.style.cursor = "default";
        });
        
        // 選択された評価を強調表示
        const selectedButton = messageContainer.querySelector(`.rating-button.${rating}`);
        selectedButton.style.opacity = "1";
        selectedButton.style.transform = "scale(1.2)";
        
        // Firebaseに評価を保存
        await saveMessage(JSON.stringify({
            messageId,
            content,
            rating,
            timestamp: new Date().toISOString()
        }), "rating", 3);
        
        console.log(`評価保存完了: ${rating}`);
        
    } catch (error) {
        console.error("評価保存エラー:", error);
        alert("評価の保存に失敗しました。");
    }
}

// メッセージ追加関数
function addMessage(content, type) {
    console.log(`addMessage関数実行: ${type}メッセージを追加`);
    const messageDiv = document.createElement("div");
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
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
        console.log("Firebaseにアンケート回答を保存中...");
        await saveMessage(JSON.stringify(surveyAnswers), "survey", 3);
        
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

// ESCキーでアンケートをキャンセル
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && surveyForm.style.display === 'block') {
        surveyForm.style.display = 'none';
        questionInput.disabled = false;
        sendButton.disabled = false;
        console.log("ESCキーでアンケートをキャンセルしました");
    }
});

console.log("=== frontend-chat.js 読み込み完了 ===");