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

async function sendMessage() {
    if (isSubmitting) {
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
        // ユーザーメッセージを表示
        addMessage(message, "user");
        await saveMessage(message, "user", 3);

        // リクエスト送信
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userMessage: message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (response.status === 202) {
            // ポーリング開始
            await pollForResponse(data.requestId);
        }

    } catch (error) {
        console.error("Error:", error);
        addMessage("エラーが発生しました。もう一度お試しください。", "ai");
    } finally {
        isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.value = "";
    }
}

// 新しく追加する関数：ポーリング処理
async function pollForResponse(requestId) {
    const maxAttempts = 30; // 最大60秒（2秒 × 30回）
    const interval = 2000; // 2秒間隔
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`/api/chat?requestId=${requestId}`);
            const data = await response.json();

            if (response.status === 200) {
                // 完了
                addMessage(data.reply, "ai");
                await saveMessage(data.reply, "ai", 3);
                return;
            } else if (response.status === 500) {
                // エラー
                throw new Error(data.error || 'エラーが発生しました');
            }

            // まだ処理中の場合は待機
            await new Promise(resolve => setTimeout(resolve, interval));
            attempts++;

        } catch (error) {
            console.error("Polling error:", error);
            addMessage("エラーが発生しました。もう一度お試しください。", "ai");
            return;
        }
    }

    // タイムアウト
    addMessage("応答がタイムアウトしました。もう一度お試しください。", "ai");
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