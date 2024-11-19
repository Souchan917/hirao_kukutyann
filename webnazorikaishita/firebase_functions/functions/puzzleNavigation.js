export class PuzzleNavigation {
    constructor() {
        this.totalQuestions = 9;
        this.currentProgress = this.getProgress();
        this.initializeNavigation();
        
        // 現在のページが「通過ページ」だった場合、進行状況を1つ進める
        this.updateProgressForPassThroughPage();
    }

    // ページ番号とランダムURLのマッピング
    urlMapping = {
        1: '1qXyZ3.html',
        2: '2puzzleA2F1.html',
        3: '3mYtN4.html',
        4: '4lB9wR.html',
        5: '5uPa1s.html',
        6: '6banana.html',
        7: '7dF8vX.html',
        8: '8yC3sN.html',
        9: '9finalPage.html'
    };
    

    // 現在の進行状況を取得
    getProgress() {
        const savedProgress = localStorage.getItem('puzzleProgress');
        const currentPage = Object.keys(this.urlMapping).find(key =>
            window.location.pathname.includes(this.urlMapping[key])
        ) || '1';
        
        if (!savedProgress) {
            localStorage.setItem('puzzleProgress', currentPage);
            return parseInt(currentPage);
        }
        
        return Math.max(parseInt(savedProgress), parseInt(currentPage));
    }

    // 通過ページの場合に進行状況を更新
    updateProgressForPassThroughPage() {
        const passThroughPage = 6; // 例：通過用のページ番号
        if (window.location.pathname.includes(this.urlMapping[passThroughPage])) {
            this.updateProgress(passThroughPage + 1); // 次の問題への進行状況に更新
        }
    }

    // 進行状況を更新
    updateProgress(level) {
        const currentProgress = this.getProgress();
        if (level > currentProgress) {
            localStorage.setItem('puzzleProgress', level.toString());
            this.currentProgress = level;
        }
    }

    // ナビゲーションの初期化
    initializeNavigation() {
        const nav = document.createElement('nav');
        nav.className = 'question-nav';
        
        for (let i = 1; i <= this.totalQuestions; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.className = 'nav-button';
            
            if (i <= this.currentProgress) {
                button.addEventListener('click', () => {
                    window.location.href = this.urlMapping[i];
                });
            } else {
                button.classList.add('disabled');
                button.disabled = true;
            }
            
            nav.appendChild(button);
        }
        
        document.body.insertBefore(nav, document.body.firstChild);
    }
}
