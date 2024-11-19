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
        alert("Please enter a question.");
        return;
    }

    isSubmitting = true;
    questionInput.disabled = true;
    sendButton.disabled = true;

    addMessage(message, "user");

    try {
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userMessage: message, questionId: 3 })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        addMessage(data.reply, "ai");
    } catch (error) {
        console.error("Error fetching AI response:", error.message);
        addMessage("An error occurred. Please try again later.", "ai");
    } finally {
        isSubmitting = false;
        questionInput.disabled = false;
        sendButton.disabled = false;
        questionInput.value = "";
    }
}

function resetChat() {
    if (confirm("Are you sure you want to reset the chat?")) {
        chatContainer.innerHTML = "";
    }
}

function addMessage(content, type) {
    const messageDiv = document.createElement("div");
    messageDiv.textContent = content;
    messageDiv.className = type === "user" ? "user-message" : "ai-message";
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

sendButton.addEventListener("click", sendMessage);
resetButton.addEventListener("click", resetChat);
questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});
