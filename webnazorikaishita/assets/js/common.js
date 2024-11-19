// BGMの状態管理
const bgmButton = document.getElementById('bgmToggle');
let bgm = new Audio('./assets/audio/Q4_BGM.mp3');
bgm.loop = true;

// ページ読み込み時に再生状態を復元
document.addEventListener('DOMContentLoaded', () => {
    // localStorageから状態を取得
    const isBgmPlaying = localStorage.getItem('bgmPlaying') === 'true';
    
    if (isBgmPlaying) {
        bgm.play().catch(error => {
            console.log('BGM再生エラー:', error);
        });
        bgmButton.classList.add('playing');
        bgmButton.querySelector('.bgm-status').textContent = 'ON';
    } else {
        bgmButton.classList.remove('playing');
        bgmButton.querySelector('.bgm-status').textContent = 'OFF';
    }
});

// BGMボタンのクリックイベント
bgmButton.addEventListener('click', () => {
    const isPlaying = bgmButton.classList.contains('playing');
    
    if (isPlaying) {
        bgm.pause();
        bgmButton.classList.remove('playing');
        bgmButton.querySelector('.bgm-status').textContent = 'OFF';
        localStorage.setItem('bgmPlaying', 'false');
    } else {
        bgm.play().catch(error => {
            console.log('BGM再生エラー:', error);
        });
        bgmButton.classList.add('playing');
        bgmButton.querySelector('.bgm-status').textContent = 'ON';
        localStorage.setItem('bgmPlaying', 'true');
    }
});