// auto-chat.js
import { saveMessage } from './libs/firebase.js';

class AutoChat {
    constructor() {
        this.running = false;
        this.currentIndex = 0;
        this.sessionId = '';
        this.questions = [
            "子どもの夜泣きが心配です。どうしたらいいですか？",
            "離乳食はいつから始めればいいですか？",
            "子どもの発達が遅いように感じます。様子を見ていていいですか？",
            "上の子が下の子に意地悪をします。どう対応すればいいですか？",
            "保育園に行きたがらないのですが、どうしたらいいでしょうか？"
        ];
        this.setupUI();
    }

    setupUI() {
        const container = document.createElement('div');
        container.className = 'auto-chat-container p-4';
        
        const button = document.createElement('button');
        button.textContent = '自動質問開始';
        button.className = 'btn btn-primary';
        button.onclick = () => this.startAutomation();
        
        const progress = document.createElement('div');
        progress.className = 'mt-4';
        progress.id = 'auto-chat-progress';
        
        container.appendChild(button);
        container.appendChild(progress);
        
        document.getElementById('main-content').prepend(container);
    }

    async startAutomation() {
        if (this.running) return;
        
        this.running = true;
        this.sessionId = `auto-session-${Date.now()}`;
        this.currentIndex = 0;
        await this.sendNextQuestion();
    }

    async sendNextQuestion() {
        if (this.currentIndex >= this.questions.length) {
            this.running = false;
            return;
        }

        try {
            const question = this.questions[this.currentIndex];
            document.getElementById('auto-chat-progress').textContent = 
                `進捗: ${this.currentIndex + 1}/${this.questions.length}`;

            await saveMessage(question, "user", this.sessionId);

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Session-ID": this.sessionId
                },
                body: JSON.stringify({
                    userMessage: question,
                    conversationSummary: ""
                })
            });

            const data = await response.json();
            
            await saveMessage(JSON.stringify({
                message: data.reply,
                messageType: data.type,
                timestamp: new Date().toISOString()
            }), "ai", this.sessionId);

            this.currentIndex++;
            setTimeout(() => this.sendNextQuestion(), 2000);

        } catch (error) {
            console.error('Error in automation:', error);
            this.running = false;
        }
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    new AutoChat();
});