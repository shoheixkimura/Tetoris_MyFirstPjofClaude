// 音声管理のためのクラス
class SoundManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.muted = false;

        // BGM
        this.loadSound('bgm', 'https://assets.codepen.io/21542/TetrisTheme.mp3');

        // 効果音
        this.loadSound('rotate', 'https://assets.codepen.io/21542/rotate.mp3');
        this.loadSound('move', 'https://assets.codepen.io/21542/move.mp3');
        this.loadSound('drop', 'https://assets.codepen.io/21542/drop.mp3');
        this.loadSound('clear', 'https://assets.codepen.io/21542/line-clear.mp3');
        this.loadSound('tetris', 'https://assets.codepen.io/21542/tetris-clear.mp3');
        this.loadSound('levelup', 'https://assets.codepen.io/21542/level-up.mp3');
        this.loadSound('gameover', 'https://assets.codepen.io/21542/game-over.mp3');
    }

    // 音声ファイルをロードする
    loadSound(name, url) {
        this.sounds[name] = new Audio(url);
        
        // BGMはループ再生するように設定
        if (name === 'bgm') {
            this.sounds[name].loop = true;
        }
    }

    // BGMを再生する
    playBGM() {
        if (this.muted) return;
        
        const bgm = this.sounds['bgm'];
        bgm.volume = this.musicVolume;
        bgm.currentTime = 0;
        bgm.play().catch(e => console.log("BGM再生失敗:", e));
    }

    // BGMを停止する
    stopBGM() {
        const bgm = this.sounds['bgm'];
        bgm.pause();
        bgm.currentTime = 0;
    }

    // BGMを一時停止する
    pauseBGM() {
        const bgm = this.sounds['bgm'];
        bgm.pause();
    }

    // BGMを再開する
    resumeBGM() {
        if (this.muted) return;
        
        const bgm = this.sounds['bgm'];
        bgm.volume = this.musicVolume;
        bgm.play().catch(e => console.log("BGM再開失敗:", e));
    }

    // 効果音を再生する
    playSFX(name) {
        if (this.muted) return;
        
        // 効果音がロードされていない場合はスキップ
        if (!this.sounds[name]) return;
        
        const sfx = this.sounds[name];
        sfx.volume = this.sfxVolume;
        sfx.currentTime = 0;
        sfx.play().catch(e => console.log(`効果音(${name})再生失敗:`, e));
    }

    // 音量を設定する
    setMusicVolume(volume) {
        this.musicVolume = volume;
        if (this.sounds['bgm']) {
            this.sounds['bgm'].volume = volume;
        }
    }

    // 効果音の音量を設定する
    setSFXVolume(volume) {
        this.sfxVolume = volume;
    }

    // ミュート切り替え
    toggleMute() {
        this.muted = !this.muted;
        
        if (this.muted) {
            this.pauseBGM();
        } else {
            this.resumeBGM();
        }
        
        return this.muted;
    }
}

// グローバルなサウンドマネージャーのインスタンスを作成
const soundManager = new SoundManager();
