// pages/api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { userMessage } = req.body;
  
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "AI-based puzzle game. Guess the animal name based on questions." },
            { role: "user", content: userMessage }
          ]
        })
      });
  
      const data = await response.json();
      res.status(200).json({ reply: data.choices[0].message.content });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to fetch AI response' });
    }
  }



// chat.js
const chatContainer = document.getElementById('chatContainer');
const questionInput = document.getElementById('questionInput');

function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function handleQuestion() {
    const question = questionInput.value.trim();
    if (!question) return;

    addMessage(question, 'user');
    questionInput.value = '';
    questionInput.disabled = true;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage: question })
        });

        const data = await response.json();
        addMessage(data.reply, 'ai');
    } catch (error) {
        addMessage('エラーが発生しました。もう一度お試しください。', 'ai');
    }

    questionInput.disabled = false;
    questionInput.focus();
}

function resetChat() {
    if (confirm('チャット履歴をリセットしますか？')) {
        chatContainer.innerHTML = '';
    }
}

questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleQuestion();
    }
});