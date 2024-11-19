// questionAudioControl.js
window.questionAudioController = {
    audio: new Audio('https://souchan917.github.io/webnazorikaishita/assets/audio/Q4_voice.mp3'),
    progressBar: null,
    timeDisplay: null,
    playButton: null,
    
    init() {
        this.progressBar = document.querySelector('.progress-bar');
        this.timeDisplay = document.querySelector('.time-display');
        this.playButton = document.querySelector('.audio-player');
        
        this.setupEventListeners();
        this.loadState();
        
        // 定期的に現在の再生位置を保存（1秒ごと）
        setInterval(() => this.saveState(), 1000);
    },

    setupEventListeners() {
        // 再生ボタンのクリックイベント
        this.playButton?.addEventListener('click', () => this.toggle());
        
        // 音声の時間更新イベント
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
            this.updateTimeDisplay();
        });
        
        // 音声の終了イベント
        this.audio.addEventListener('ended', () => {
            this.updateUI();
            this.progressBar.style.width = '0%';
            // 終了時に状態をリセット
            localStorage.removeItem('questionAudioPlaying');
            localStorage.removeItem('questionAudioTime');
        });
        
        // エラーハンドリング
        this.audio.addEventListener('error', (e) => {
            console.error('問題音声の再生エラー:', e);
            this.updateUI();
        });

        // ページ遷移時に状態を保存
        window.addEventListener('beforeunload', () => this.saveState());
    },

    loadState() {
        // 再生状態の読み込み
        const isPlaying = localStorage.getItem('questionAudioPlaying') === 'true';
        
        // 再生位置の読み込み
        const savedTime = parseFloat(localStorage.getItem('questionAudioTime')) || 0;
        this.audio.currentTime = savedTime;
        
        // 再生状態に応じて再生開始
        if (isPlaying) {
            this.play();
        }
        
        this.updateUI();
    },

    saveState() {
        // 再生状態の保存
        localStorage.setItem('questionAudioPlaying', !this.audio.paused);
        
        // 現在の再生位置を保存（再生中の場合のみ）
        if (!this.audio.paused) {
            localStorage.setItem('questionAudioTime', this.audio.currentTime);
        }
    },

    play() {
        const savedTime = parseFloat(localStorage.getItem('questionAudioTime')) || 0;
        this.audio.currentTime = savedTime;
        
        this.audio.play().catch(error => {
            console.error('再生エラー:', error);
            this.updateUI();
        });
        this.updateUI();
    },

    pause() {
        this.audio.pause();
        // 停止時の位置を保存
        localStorage.setItem('questionAudioTime', this.audio.currentTime);
        this.updateUI();
    },

    toggle() {
        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
        this.saveState();
    },

    updateProgress() {
        if (this.progressBar && !isNaN(this.audio.duration)) {
            const progress = (this.audio.currentTime / this.audio.duration) * 100;
            this.progressBar.style.width = `${progress}%`;
        }
    },

    updateTimeDisplay() {
        if (this.timeDisplay) {
            const minutes = Math.floor(this.audio.currentTime / 60);
            const seconds = Math.floor(this.audio.currentTime % 60);
            this.timeDisplay.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    },

    updateUI() {
        if (this.playButton) {
            this.playButton.textContent = this.audio.paused ? '▶︎' : '⏸️';
        }
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    window.questionAudioController.init();
});