class AutoChat {
    constructor() {
        this.messages = [
            "子どもの食事について悩んでいます",
            "野菜を全く食べてくれなくて困っています",
            "離乳食の進め方がわかりません",
            "子どもの睡眠リズムが気になります",
            "夜泣きが続いていて大変です"
        ];
        this.currentIndex = 0;
        this.isRunning = false;
        this.init();
    }

    init() {
        const button = document.createElement('button');
        button.className = 'btn btn-primary mb-3';
        button.textContent = '自動テスト開始';
        button.onclick = () => this.startAutomation();
        
        const container = document.createElement('div');
        container.className = 'text-center mb-3';
        container.appendChild(button);
        
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.parentNode.insertBefore(container, chatContainer);
        
        this.button = button;
    }

    async sendMessage(message) {
        const input = document.getElementById('questionInput');
        const sendButton = document.getElementById('sendQuestion');
        
        if (input && sendButton) {
            input.value = message;
            sendButton.click();
            
            try {
                const sessionId = sessionStorage.getItem('kukuchan_session_id');
                await saveMessage(message, "user", sessionId);
            } catch (error) {
                console.error("メッセージの保存に失敗:", error);
            }
        }
    }

    async startAutomation() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.button.disabled = true;
        this.button.textContent = '自動送信中...';

        while (this.currentIndex < this.messages.length) {
            await this.sendMessage(this.messages[this.currentIndex]);
            await new Promise(resolve => setTimeout(resolve, 10000));
            this.currentIndex++;
        }

        this.isRunning = false;
        this.currentIndex = 0;
        this.button.disabled = false;
        this.button.textContent = '自動テスト開始';
    }
}