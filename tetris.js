// キャンバスとコンテキストの設定
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// ゲーム設定
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const NEXT_BLOCK_SIZE = 20;
const COLORS = [
    null,
    '#FF0D72', // I
    '#0DC2FF', // J
    '#0DFF72', // L
    '#F538FF', // O
    '#FF8E0D', // S
    '#FFE138', // T
    '#3877FF'  // Z
];

// UI要素
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const startButton = document.getElementById('start-button');
const resetButton = document.getElementById('reset-button');

// サウンド関連のUI要素
const musicVolumeSlider = document.getElementById('music-volume');
const sfxVolumeSlider = document.getElementById('sfx-volume');
const muteButton = document.getElementById('mute-button');

// ゲーム状態
let board = createMatrix(COLS, ROWS);
let score = 0;
let level = 1;
let lines = 0;
let dropCounter = 0;
let dropInterval = 1000; // ミリ秒単位での落下速度
let lastTime = 0;
let paused = false;
let gameOver = true;
let animationId = null;
let nextPiece = null;

// テトロミノの形状
const PIECES = [
    [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    [
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0]
    ],
    [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0]
    ],
    [
        [4, 4],
        [4, 4]
    ],
    [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0]
    ],
    [
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0]
    ],
    [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
    ]
];

// プレイヤーの状態
const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0
};

// 行列（マトリクス）を作成する関数
function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

// ピースを作成する関数
function createPiece(type) {
    return PIECES[type];
}

// 衝突判定を行う関数
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// 行列をコピーする関数
function copyMatrix(matrix) {
    return matrix.map(row => [...row]);
}

// 行列をマージする関数
function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

// 行が完全に埋まっているかチェックして削除する関数
function clearLines() {
    let rowsCleared = 0;
    outer: for (let y = board.length - 1; y >= 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }

        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        ++rowsCleared;
    }

    if (rowsCleared > 0) {
        // スコア計算 (テトリスの標準的なスコアリング)
        const linePoints = [40, 100, 300, 1200]; // 1行、2行、3行、4行のスコア
        score += linePoints[rowsCleared - 1] * level;
        scoreElement.textContent = score;

        // ライン数の更新
        lines += rowsCleared;
        linesElement.textContent = lines;

        // 効果音再生（4ライン消しの場合は特別な効果音）
        if (rowsCleared === 4) {
            soundManager.playSFX('tetris');
        } else {
            soundManager.playSFX('clear');
        }

        // レベルの更新 (10ラインごとにレベルアップ)
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            levelElement.textContent = level;
            // 落下速度の更新
            dropInterval = 1000 * Math.pow(0.8, level - 1);
            // レベルアップの効果音
            soundManager.playSFX('levelup');
        }
    }
}

// ピースを回転させる関数
function rotate(matrix, dir) {
    // トランスポーズ（行と列を入れ替え）
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    // 行を反転（時計回りまたは反時計回り）
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

// プレイヤーを回転させる関数
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    const originalMatrix = copyMatrix(player.matrix);
    rotate(player.matrix, dir);

    // 回転後に衝突する場合、位置を調整して再試行
    while (collide(board, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            // 調整できない場合は元に戻す
            player.matrix = originalMatrix;
            player.pos.x = pos;
            return;
        }
    }
    
    // 回転の効果音を再生
    soundManager.playSFX('rotate');
}

// プレイヤーを移動する関数
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) {
        player.pos.x -= dir;
    } else {
        // 移動の効果音を再生
        soundManager.playSFX('move');
    }
}

// ピースをドロップする関数
function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--;
        merge(board, player);
        // 着地の効果音を再生
        soundManager.playSFX('drop');
        playerReset();
        clearLines();
    }
    dropCounter = 0;
}

// ハードドロップ（即座に底まで落とす）
function playerHardDrop() {
    while (!collide(board, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(board, player);
    // ハードドロップの効果音を再生
    soundManager.playSFX('drop');
    playerReset();
    clearLines();
    dropCounter = 0;
}

// プレイヤーをリセットする関数
function playerReset() {
    // 次のピースを現在のピースにする
    if (nextPiece === null) {
        player.matrix = createPiece(Math.floor(Math.random() * PIECES.length));
    } else {
        player.matrix = nextPiece;
    }

    // 新しい次のピースを生成する
    nextPiece = createPiece(Math.floor(Math.random() * PIECES.length));

    // 開始位置にリセット
    player.pos.y = 0;
    player.pos.x = Math.floor((board[0].length - player.matrix[0].length) / 2);
    
    // ゲームオーバーチェック
    if (collide(board, player)) {
        gameOver = true;
        startButton.textContent = 'ゲーム開始';
        soundManager.stopBGM();
        soundManager.playSFX('gameover');
        alert('ゲームオーバー！スコア: ' + score);
        cancelAnimationFrame(animationId);
    }
    
    // 次のピースを描画
    drawNext();
}

// ゲームを描画する関数
function draw() {
    // キャンバスをクリア
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ボードを描画
    drawMatrix(board, { x: 0, y: 0 });

    // プレイヤーを描画
    drawMatrix(player.matrix, player.pos);
}

// 次のピースを描画する関数
function drawNext() {
    nextCtx.fillStyle = '#111';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        // 次のピースの中央に配置するための位置計算
        const offsetX = Math.floor((5 - nextPiece[0].length) / 2) * NEXT_BLOCK_SIZE;
        const offsetY = Math.floor((5 - nextPiece.length) / 2) * NEXT_BLOCK_SIZE;

        nextPiece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    nextCtx.fillStyle = COLORS[value];
                    nextCtx.fillRect(x * NEXT_BLOCK_SIZE + offsetX, y * NEXT_BLOCK_SIZE + offsetY, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
                    nextCtx.strokeStyle = '#111';
                    nextCtx.strokeRect(x * NEXT_BLOCK_SIZE + offsetX, y * NEXT_BLOCK_SIZE + offsetY, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
                }
            });
        });
    }
}

// 行列を描画する関数
function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = COLORS[value];
                ctx.fillRect(
                    (x + offset.x) * BLOCK_SIZE,
                    (y + offset.y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
                ctx.strokeStyle = '#111';
                ctx.strokeRect(
                    (x + offset.x) * BLOCK_SIZE,
                    (y + offset.y) * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        });
    });
}

// ゲームの更新関数
function update(time = 0) {
    if (gameOver || paused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    animationId = requestAnimationFrame(update);
}

// ゲームをリセットする関数
function resetGame() {
    board = createMatrix(COLS, ROWS);
    score = 0;
    level = 1;
    lines = 0;
    dropInterval = 1000;

    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;

    nextPiece = null;
    playerReset();

    if (!gameOver) {
        update();
    }
}

// ゲームを開始/一時停止する関数
function toggleGame() {
    if (gameOver) {
        gameOver = false;
        resetGame();
        startButton.textContent = '一時停止';
        // BGMを再生
        soundManager.playBGM();
        update();
    } else {
        paused = !paused;
        if (paused) {
            startButton.textContent = '再開';
            // BGMを一時停止
            soundManager.pauseBGM();
            cancelAnimationFrame(animationId);
        } else {
            startButton.textContent = '一時停止';
            // BGMを再開
            soundManager.resumeBGM();
            lastTime = performance.now();
            animationId = requestAnimationFrame(update);
        }
    }
}

// キーボード入力のイベントリスナー
document.addEventListener('keydown', event => {
    if (gameOver) return;

    if (!paused) {
        switch (event.key) {
            case 'ArrowLeft':
                playerMove(-1);
                break;
            case 'ArrowRight':
                playerMove(1);
                break;
            case 'ArrowUp':
                playerRotate(1);
                break;
            case 'ArrowDown':
                playerDrop();
                break;
            case ' ':
                playerHardDrop();
                break;
        }
    }

    if (event.key === 'p' || event.key === 'P') {
        toggleGame();
    }
});

// ボタンのイベントリスナー
startButton.addEventListener('click', toggleGame);
resetButton.addEventListener('click', () => {
    gameOver = true;
    startButton.textContent = 'ゲーム開始';
    soundManager.stopBGM();
    resetGame();
});

// サウンド設定のイベントリスナー
musicVolumeSlider.addEventListener('input', () => {
    soundManager.setMusicVolume(musicVolumeSlider.value);
});

sfxVolumeSlider.addEventListener('input', () => {
    soundManager.setSFXVolume(sfxVolumeSlider.value);
});

muteButton.addEventListener('click', () => {
    const isMuted = soundManager.toggleMute();
    muteButton.textContent = isMuted ? '音を出す' : '消音';
    muteButton.classList.toggle('muted', isMuted);
});

// 音声テスト用のボタン
const testSoundButton = document.getElementById('test-sound');
testSoundButton.addEventListener('click', () => {
    // まず音声システムを初期化
    soundManager.initializeAudio();
    
    // テスト用のメッセージを表示
    console.log('音声テスト開始...');
    
    // 各効果音を順番に再生
    const testSounds = ['rotate', 'move', 'drop', 'clear', 'tetris', 'levelup', 'gameover'];
    let delay = 0;
    
    // 効果音を一つずつ間隔を開けて再生
    testSounds.forEach((sound, index) => {
        setTimeout(() => {
            console.log(`${sound} 効果音を再生中...`);
            soundManager.playSFX(sound);
        }, delay);
        delay += 600; // 各効果音に600ミリ秒の間隔
    });
    
    // 最後にBGMを短く再生
    setTimeout(() => {
        console.log('BGM再生テスト...');
        // BGMを再生して1秒後に停止
        soundManager.playBGM();
        setTimeout(() => {
            soundManager.pauseBGM();
            console.log('音声テスト完了!');
            alert('すべての音が聞こえましたか？\n音が聞こえない場合は、以下を確認してください：\n1. ブラウザの設定でサイトの音声が許可されているか\n2. デバイスの音量が上がっているか\n3. ブラウザのコンソールでエラーメッセージがないか');
        }, 2000);
    }, delay);
});

// ゲームの初期設定
player.matrix = createPiece(0);
playerReset();
draw();