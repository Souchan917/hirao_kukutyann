// インポート
import { saveMessage, getChatHistory } from "../libs/firebase.js";

console.log("=== frontend-chat.js 読み込み開始 ===");

// DOM要素の取得
const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");
const endChatButton = document.querySelector(".text-center.mt-4"); // チャットを終わるボタン
const surveyForm = document.getElementById("survey-form");
const submitSurveyButton = surveyForm.querySelector(".text-center"); // アンケートを送信ボタン

// 評価ボタングループの取得
const satisfactionButtons = surveyForm.querySelector('div[aria-label="満足度"]').querySelectorAll('strong');
const personalizedButtons = surveyForm.querySelector('div[aria-label="個別化された回答"]').querySelectorAll('strong');
const comparisonButtons = surveyForm.querySelector('div[aria-label="比較"]').querySelectorAll('strong');
const intentionButtons = surveyForm.querySelector('div[aria-label="意図の理解"]').querySelectorAll('strong');

console.log("DOM要素の確認:", {
    chatContainer,
    questionInput,
    sendButton,
    resetButton,
    endChatButton,
    surveyForm,
    submitSurveyButton
});

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

    console.log("UIを無効化しました");
    addMessage(message, "user");

    try {
        console.log("Firebaseにユーザーメッセージを保存中...");
        await saveMessage(message, "user", 3);
        console.log("Firebaseにユーザーメッセージが保存されました");
    } catch (error) {
        console.error("Firebaseにユーザーメッセージの保存失敗:", error);
    }

    try {
        console.log("APIにリクエスト送信中...");
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userMessage: message, questionId: 3 })
        });

        console.log("APIレスポンスステータス:", response.status);

        if (!response.ok) {
            console.error("APIエラー:", response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("APIからのデータ:", data);

        console.log("AIからの応答をチャットに追加します");
        addMessage(data.reply, "ai");

        try {
            console.log("FirebaseにAI応答を保存中...");
            await saveMessage(data.reply, "ai", 3);
            console.log("FirebaseにAI応答が保存されました");
        } catch (error) {
            console.error("FirebaseにAI応答の保存失敗:", error);
        }
    } catch (error) {
        console.error("チャットフロー内でエラーが発生:", error);
        addMessage("エラーが発生しました。後でもう一度お試しください。", "ai");
    } finally {
        console.log("UIをリセットします");
        isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.value = "";
        console.log("=== sendMessage 関数終了 ===");
    }
}

// メッセージ追加関数
function addMessage(content, type) {
    console.log("addMessage関数:", { content, type });
    const messageDiv = document.createElement("div");
    messageDiv.textContent = content;
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    console.log("メッセージをチャットに追加しました:", content);
}

// チャットリセット関数
function resetChat() {
    console.log("リセットがトリガーされました");
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
        });
    });
}

// チャット終了関数
function endChat() {
    console.log("チャットを終了します");
    questionInput.disabled = true;
    sendButton.disabled = true;
    
    surveyForm.style.display = 'block';
    surveyForm.scrollIntoView({ behavior: 'smooth' });
}

// アンケート送信関数
async function submitSurvey() {
    console.log("アンケートを送信します", surveyAnswers);
    
    if (Object.values(surveyAnswers).some(value => value === 0)) {
        alert("すべての項目にお答えください。");
        return;
    }
    
    try {
        // Firebase保存処理を実装予定
        await saveMessage(JSON.stringify(surveyAnswers), "survey", 3);
        
        alert("アンケートにご協力いただき、ありがとうございました。");
        
        surveyForm.style.display = 'none';
        chatContainer.innerHTML = '';
        questionInput.disabled = false;
        sendButton.disabled = false;
        
        // アンケートの回答をリセット
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
console.log("イベントリスナーを設定します");

sendButton.addEventListener("click", () => {
    console.log("送信ボタンがクリックされました");
    sendMessage();
});

resetButton.addEventListener("click", () => {
    console.log("リセットボタンがクリックされました");
    resetChat();
});

questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        console.log("Enterキーが押されました");
        sendMessage();
    }
});

endChatButton.addEventListener("click", () => {
    console.log("終了ボタンがクリックされました");
    endChat();
});

submitSurveyButton.addEventListener("click", () => {
    console.log("アンケート送信ボタンがクリックされました");
    submitSurvey();
});

// ESCキーでアンケートをキャンセル
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && surveyForm.style.display === 'block') {
        surveyForm.style.display = 'none';
        questionInput.disabled = false;
        sendButton.disabled = false;
    }
});

console.log("=== frontend-chat.js 読み込み終了 ===");