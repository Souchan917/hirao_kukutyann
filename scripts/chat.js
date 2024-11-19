document.getElementById('sendQuestion').addEventListener('click', async () => {
    const question = document.getElementById('questionInput').value.trim();

    if (!question) {
        alert('質問を入力してください！');
        return;
    }

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userMessage: question,
                questionId: 3 // 必要に応じて問題IDを変更
            })
        });

        const data = await response.json();
        addMessage(data.reply, 'ai');
    } catch (error) {
        console.error('Error:', error);
        alert('エラーが発生しました。もう一度お試しください。');
    }
});

function addMessage(content, type) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.textContent = content;
    messageDiv.className = type === 'user' ? 'user-message' : 'ai-message';
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
