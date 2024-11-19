// frontend-chat.js
const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");

let isSubmitting = false;

async function sendMessage() {
    if (isSubmitting) return;

    const message = questionInput.value.trim();
    if (!message) {
        alert("質問を入力してください。");
        return;
    }

    isSubmitting = true;
    updateUIState(true);
    addMessage(message, "user");

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                userMessage: message, 
                questionId: 3 
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `エラーが発生しました（${response.status}）`);
        }

        addMessage(data.reply, "ai");
    } catch (error) {
        console.error("Error:", error);
        addMessage("エラーが発生しました。しばらく待ってから再度お試しください。", "ai");
    } finally {
        updateUIState(false);
        questionInput.value = "";
    }
}

function updateUIState(disabled) {
    isSubmitting = disabled;
    questionInput.disabled = disabled;
    sendButton.disabled = disabled;
}

function resetChat() {
    if (confirm("チャットをリセットしてもよろしいですか？")) {
        chatContainer.innerHTML = "";
    }
}

function addMessage(content, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

sendButton.addEventListener("click", sendMessage);
resetButton.addEventListener("click", resetChat);
questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});