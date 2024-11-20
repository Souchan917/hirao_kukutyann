// frontend-chat.js
import { saveMessage } from '../libs/firebaseUtils.js';

const apiUrl = "/api/chat";
const chatContainer = document.getElementById("chatContainer");
const questionInput = document.getElementById("questionInput");
const sendButton = document.getElementById("sendQuestion");
const resetButton = document.getElementById("resetChat");

let isSubmitting = false;

async function sendMessage() {
    console.log('Send message triggered');
    if (isSubmitting) {
        console.log('Already submitting, returning');
        return;
    }

    const message = questionInput.value.trim();
    if (!message) {
        console.log('Empty message');
        alert("Please enter a question.");
        return;
    }

    console.log('Starting message process');
    isSubmitting = true;
    questionInput.disabled = true;
    sendButton.disabled = true;

    addMessage(message, "user");

    // Firebaseへの保存を非同期で試みる（エラーが発生しても続行）
    try {
        await saveMessage(message, 'user', 3);
        console.log('User message saved to Firebase');
    } catch (error) {
        console.error('Failed to save user message to Firebase:', error);
        // Firebase保存エラーは無視して続行
    }

    try {
        console.log('Sending to API');
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userMessage: message, questionId: 3 })
        });

        console.log('API response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received AI response');
        addMessage(data.reply, "ai");

        // AI応答もFirebaseに保存
        try {
            await saveMessage(data.reply, 'ai', 3);
            console.log('AI response saved to Firebase');
        } catch (error) {
            console.error('Failed to save AI response to Firebase:', error);
            // Firebase保存エラーは無視
        }

    } catch (error) {
        console.error("Error in chat flow:", error);
        addMessage("An error occurred. Please try again later.", "ai");
    } finally {
        console.log('Resetting UI state');
        isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.value = "";
    }
}

// 他の関数は変更なし
function addMessage(content, type) {
    console.log('Adding message:', type);
    const messageDiv = document.createElement("div");
    messageDiv.textContent = content;
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function resetChat() {
    console.log('Reset triggered');
    if (confirm("Are you sure you want to reset the chat?")) {
        chatContainer.innerHTML = "";
    }
}

sendButton.addEventListener("click", sendMessage);
resetButton.addEventListener("click", resetChat);
questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});