// 音声管理のためのクラス
class SoundManager {
    constructor() {
        this.sounds = {};
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.muted = false;
        this.initialized = false;

        // 音声ファイルをロード
        this.loadSounds();
    }

    // 音声ファイルをロードする
    loadSounds() {
        // CDN経由のMP3形式の音声ファイルを使用 (CORSに対応しているソース)
        // BGM
        this.loadSound('bgm', 'https://dl.dropboxusercontent.com/s/wrz5mhv8urzsj64/tetris_theme.mp3');

        // 効果音
        this.loadSound('rotate', 'https://dl.dropboxusercontent.com/s/7dr7hkgqcu7p3hp/rotate.mp3');
        this.loadSound('move', 'https://dl.dropboxusercontent.com/s/xkmmpv5tvi67db0/move.mp3');
        this.loadSound('drop', 'https://dl.dropboxusercontent.com/s/wu31n7mgiutpn65/drop.mp3');
        this.loadSound('clear', 'https://dl.dropboxusercontent.com/s/tda60rdpv243lwb/line-clear.mp3');
        this.loadSound('tetris', 'https://dl.dropboxusercontent.com/s/b6n4emgcqfvs2ri/tetris-clear.mp3');
        this.loadSound('levelup', 'https://dl.dropboxusercontent.com/s/ys90qh66hzu80mf/level-up.mp3');
        this.loadSound('gameover', 'https://dl.dropboxusercontent.com/s/n2mmhqvkj0ntk90/game-over.mp3');
    }

    // 音声ファイルをロードする
    loadSound(name, url) {
        try {
            const audio = new Audio();
            
            // 音声ファイルをロードするイベントハンドラを設定
            audio.addEventListener('canplaythrough', () => {
                console.log(`Sound loaded successfully: ${name}`);
            });
            
            // エラーハンドリング
            audio.addEventListener('error', (e) => {
                console.error(`Error loading sound ${name}:`, e);
            });
            
            // 音声ファイルのURLを設定
            audio.src = url;
            
            // BGMはループ再生するように設定
            if (name === 'bgm') {
                audio.loop = true;
            }
            
            // プリロード
            audio.load();
            
            // オブジェクトに保存
            this.sounds[name] = audio;
            
            console.log(`Sound loading started: ${name}`);
        } catch (e) {
            console.error(`Failed to initialize sound: ${name}`, e);
        }
    }

    // オーディオコンテキストを初期化（ユーザー操作後に呼び出す）
    initializeAudio() {
        if (this.initialized) return;
        
        try {
            // 全ての音声をロードし直し、短く再生してから停止（ブラウザの自動再生ポリシー対策）
            for (const [name, sound] of Object.entries(this.sounds)) {
                if (!sound) continue;
                
                // 音量を0にして短く再生してから停止
                const originalVolume = sound.volume;
                sound.volume = 0;
                
                const playPromise = sound.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        // 再生が始まったら即座に停止
                        setTimeout(() => {
                            sound.pause();
                            sound.currentTime = 0;
                            sound.volume = originalVolume;
                            console.log(`Sound ${name} initialized`);
                        }, 1);
                    }).catch(e => {
                        console.warn(`Could not initialize sound ${name}:`, e);
                    });
                }
            }
            
            this.initialized = true;
            console.log('Audio system initialized successfully!');
        } catch (e) {
            console.error('Failed to initialize audio system:', e);
        }
    }

    // BGMを再生する
    playBGM() {
        if (this.muted) return;
        
        try {
            this.initializeAudio();
            const bgm = this.sounds['bgm'];
            if (!bgm) {
                console.error('BGM not loaded, trying fallback');
                this.createFallbackBGM();
                return;
            }
            
            bgm.volume = this.musicVolume;
            bgm.currentTime = 0;
            
            // プロミスを返すplayメソッドをtry-catchで囲む
            const playPromise = bgm.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("BGM再生失敗:", e.message);
                    
                    // 自動再生に失敗した場合、フォールバックBGMを試す
                    console.log("フォールバックBGMを試行中...");
                    const fallbackSuccess = this.createFallbackBGM();
                    
                    // フォールバックも失敗した場合は、静かなミュート状態で再生を試みる
                    if (!fallbackSuccess) {
                        bgm.muted = true;
                        bgm.play().then(() => {
                            // ユーザー操作後にミュートを解除する
                            document.addEventListener('click', () => {
                                bgm.muted = false;
                            }, { once: true });
                        }).catch(e => {
                            console.error("ミュート状態でもBGM再生失敗:", e.message);
                        });
                    }
                });
            }
        } catch (e) {
            console.error('BGM playback error:', e.message);
            // エラー発生時にフォールバックBGMを試す
            this.createFallbackBGM();
        }
    }

    // BGMを停止する
    stopBGM() {
        try {
            const bgm = this.sounds['bgm'];
            if (!bgm) return;
            
            bgm.pause();
            bgm.currentTime = 0;
        } catch (e) {
            console.error('Error stopping BGM:', e);
        }
    }

    // BGMを一時停止する
    pauseBGM() {
        try {
            const bgm = this.sounds['bgm'];
            if (!bgm) return;
            
            bgm.pause();
        } catch (e) {
            console.error('Error pausing BGM:', e);
        }
    }

    // BGMを再開する
    resumeBGM() {
        if (this.muted) return;
        
        try {
            this.initializeAudio();
            const bgm = this.sounds['bgm'];
            if (!bgm) return;
            
            bgm.volume = this.musicVolume;
            
            const playPromise = bgm.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log("BGM再開失敗:", e);
                });
            }
        } catch (e) {
            console.error('Error resuming BGM:', e);
        }
    }

    // 効果音を再生する
    playSFX(name) {
        if (this.muted) return;
        
        try {
            this.initializeAudio();
            // 効果音がロードされていない場合はスキップ
            if (!this.sounds[name]) {
                console.warn(`Sound not found: ${name}, trying fallback sound`);
                this.createFallbackSound(name);
                return;
            }
            
            const sfx = this.sounds[name];
            sfx.volume = this.sfxVolume;
            sfx.currentTime = 0;
            
            const playPromise = sfx.play();
            if (playPromise !== undefined) {
                playPromise.catch(e => {
                    console.log(`効果音(${name})再生失敗: ${e.message}, フォールバック音を使用`);
                    // 通常の効果音が再生できない場合、フォールバックのWeb Audio APIを使用
                    this.createFallbackSound(name);
                });
            }
        } catch (e) {
            console.error(`Error playing SFX ${name}:`, e);
            // エラー時にフォールバックの効果音を生成
            this.createFallbackSound(name);
        }
    }

    // 音量を設定する
    setMusicVolume(volume) {
        this.musicVolume = volume;
        try {
            if (this.sounds['bgm']) {
                this.sounds['bgm'].volume = volume;
            }
        } catch (e) {
            console.error('Error setting music volume:', e);
        }
    }

    // 効果音の音量を設定する
    setSFXVolume(volume) {
        this.sfxVolume = volume;
    }
    
    // 代替音を使用して効果音生成（フォールバック用）
    createFallbackSound(name) {
        try {
            // Web Audio API を使用して音を生成
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // 音の種類に応じて設定を変更
            switch(name) {
                case 'rotate':
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 330;
                    gainNode.gain.value = 0.2;
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    oscillator.start();
                    setTimeout(() => oscillator.stop(), 80);
                    break;
                    
                case 'move':
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 280;
                    gainNode.gain.value = 0.1;
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    oscillator.start();
                    setTimeout(() => oscillator.stop(), 50);
                    break;
                    
                case 'drop':
                    oscillator.type = 'triangle';
                    oscillator.frequency.value = 180;
                    gainNode.gain.value = 0.3;
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    oscillator.start();
                    setTimeout(() => oscillator.stop(), 100);
                    break;
                    
                case 'clear':
                    oscillator.type = 'square';
                    oscillator.frequency.value = 420;
                    gainNode.gain.value = 0.2;
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    oscillator.start();
                    setTimeout(() => {
                        oscillator.frequency.value = 500;
                        setTimeout(() => oscillator.stop(), 100);
                    }, 100);
                    break;
                    
                case 'tetris':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.value = 440;
                    gainNode.gain.value = 0.2;
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    oscillator.start();
                    setTimeout(() => {
                        oscillator.frequency.value = 540;
                        setTimeout(() => {
                            oscillator.frequency.value = 640;
                            setTimeout(() => oscillator.stop(), 120);
                        }, 120);
                    }, 120);
                    break;
                    
                case 'levelup':
                    oscillator.type = 'square';
                    oscillator.frequency.value = 330;
                    gainNode.gain.value = 0.2;
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    oscillator.start();
                    setTimeout(() => {
                        oscillator.frequency.value = 440;
                        setTimeout(() => {
                            oscillator.frequency.value = 550;
                            setTimeout(() => oscillator.stop(), 150);
                        }, 150);
                    }, 150);
                    break;
                    
                case 'gameover':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.value = 220;
                    gainNode.gain.value = 0.3;
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    oscillator.start();
                    setTimeout(() => {
                        oscillator.frequency.value = 180;
                        setTimeout(() => {
                            oscillator.frequency.value = 150;
                            setTimeout(() => oscillator.stop(), 300);
                        }, 300);
                    }, 300);
                    break;
            }
            
            console.log(`Created fallback sound for: ${name}`);
        } catch (e) {
            console.error(`Failed to create fallback sound: ${name}`, e);
        }
    }

    // ミュート切り替え
    toggleMute() {
        this.muted = !this.muted;
        
        try {
            if (this.muted) {
                this.pauseBGM();
            } else {
                this.resumeBGM();
            }
        } catch (e) {
            console.error('Error toggling mute:', e);
        }
        
        return this.muted;
    }
    
    // BGMをフォールバック生成
    createFallbackBGM() {
        try {
            console.log('Creating fallback BGM...');
            
            // Web Audio APIでシンプルなBGM生成
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 音を定期的に生成する関数
            const createNote = (freq, start, duration, volume = 0.1) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.type = 'square';
                oscillator.frequency.value = freq;
                gainNode.gain.value = volume;
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.start(audioContext.currentTime + start);
                oscillator.stop(audioContext.currentTime + start + duration);
                
                return { oscillator, gainNode };
            };
            
            // テトリス風のシンプルなメロディ (C, E, G, C のアルペジオ)
            const notes = [
                {freq: 262, start: 0, duration: 0.2},    // C
                {freq: 330, start: 0.3, duration: 0.2},  // E
                {freq: 392, start: 0.6, duration: 0.2},  // G
                {freq: 523, start: 0.9, duration: 0.3},  // C (高)
                
                {freq: 392, start: 1.3, duration: 0.2},  // G
                {freq: 330, start: 1.6, duration: 0.2},  // E
                {freq: 262, start: 1.9, duration: 0.4},  // C
            ];
            
            // メロディを再生
            notes.forEach(note => {
                createNote(note.freq, note.start, note.duration);
            });
            
            // 一度だけフォールバックBGMを再生することをユーザーに通知
            console.log('Fallback BGM played once. Regular BGM will try to load for next play.');
            return true;
        } catch (e) {
            console.error('Failed to create fallback BGM:', e);
            return false;
        }
    }
}

// グローバルなサウンドマネージャーのインスタンスを作成
const soundManager = new SoundManager();

// ユーザーの操作時にオーディオを初期化するため複数のイベントをリッスン
['click', 'keydown', 'touchstart'].forEach(eventType => {
    document.addEventListener(eventType, () => {
        soundManager.initializeAudio();
    }, { once: true });
});

// ユーザーにサウンドシステムを初期化する方法を通知
console.log('SoundManager initialized - Click anywhere to enable audio!');
