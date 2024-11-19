// audioControl.js
window.bgmController = {
    bgm: new Audio('https://souchan917.github.io/webnazorikaishita/assets/audio/Q4_BGM.mp3'),
    
    init() {
        this.bgm.loop = true;
        this.setupEventListeners();
        this.loadState();
        
        // 定期的に現在の再生位置を保存（1秒ごと）
        setInterval(() => this.saveState(), 1000);
    },

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            const bgmButton = document.getElementById('bgmToggle');
            if (bgmButton) {
                bgmButton.addEventListener('click', () => this.toggle());
                this.updateUI();
            }
        });

        // ページ遷移時に状態を保存
        window.addEventListener('beforeunload', () => this.saveState());
        
        // 再生エラー時のハンドリング
        this.bgm.addEventListener('error', (e) => {
            console.error('BGM再生エラー:', e);
            this.saveState(); // エラー時も状態を保存
        });
    },

    loadState() {
        // 再生状態の読み込み
        const isBgmPlaying = localStorage.getItem('bgmPlaying') === 'true';
        
        // 再生位置の読み込み
        const savedTime = parseFloat(localStorage.getItem('bgmCurrentTime')) || 0;
        this.bgm.currentTime = savedTime;
        
        // 再生状態に応じて再生開始
        if (isBgmPlaying) {
            this.play();
        }
    },

    saveState() {
        // 再生状態の保存
        localStorage.setItem('bgmPlaying', !this.bgm.paused);
        
        // 現在の再生位置を保存（再生中の場合のみ）
        if (!this.bgm.paused) {
            localStorage.setItem('bgmCurrentTime', this.bgm.currentTime);
        }
    },

    play() {
        const savedTime = parseFloat(localStorage.getItem('bgmCurrentTime')) || 0;
        
        // 保存された位置から再生を再開
        this.bgm.currentTime = savedTime;
        this.bgm.play().catch(error => {
            console.log('BGM再生エラー:', error);
            this.updateUI(); // エラー時にUIを更新
        });
        this.updateUI();
    },

    pause() {
        this.bgm.pause();
        // 停止時の位置を保存
        localStorage.setItem('bgmCurrentTime', this.bgm.currentTime);
        this.updateUI();
    },

    toggle() {
        if (this.bgm.paused) {
            this.play();
        } else {
            this.pause();
        }
        this.saveState();
    },

    updateUI() {
        const bgmButton = document.getElementById('bgmToggle');
        if (bgmButton) {
            bgmButton.classList.toggle('playing', !this.bgm.paused);
            bgmButton.querySelector('.bgm-status').textContent = this.bgm.paused ? 'OFF' : 'ON';
        }
    }
};

// 初期化
window.bgmController.init();