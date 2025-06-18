// Global Constants
let BOARD_SIZE = 3;
let WIN_CONDITION = 3;
// MAX_SEARCH_DEPTH không còn được dùng trực tiếp ở đây,
// mà được lấy từ AI_DIFFICULTY_LEVELS.MAX_DEPTH
const INFINITE_BOARD_SIZE = 30; // Kích thước của bàn cờ "vô hạn" (ví dụ 16x16)

// Định nghĩa các cấp độ khó cho AI
const AI_DIFFICULTY_LEVELS = {
    EASY: {
        MAX_DEPTH: 2,           // Độ sâu tìm kiếm nông
        BLOCK_MULTIPLIER: 0.5,  // Ít ưu tiên phòng thủ hơn
        RANDOM_MOVE_CHANCE: 0.3 // 30% khả năng đi ngẫu nhiên
    },
    MEDIUM: {
        MAX_DEPTH: 3,           // Độ sâu vừa phải
        BLOCK_MULTIPLIER: 0.8,  // Ưu tiên phòng thủ vừa phải
        RANDOM_MOVE_CHANCE: 0   // Không đi ngẫu nhiên
    },
    HARD: {
        MAX_DEPTH: 5,           // Độ sâu cao hơn
        BLOCK_MULTIPLIER: 10,  // Ưu tiên phòng thủ cao
        RANDOM_MOVE_CHANCE: 0
    },
    EXPERT: { // Yêu cầu Alpha-Beta Pruning hiệu quả
        MAX_DEPTH: 6,           // Độ sâu rất cao
        BLOCK_MULTIPLIER: 20,  // Rất ưu tiên phòng thủ
        RANDOM_MOVE_CHANCE: 0
    }
};

let currentAIDifficulty = AI_DIFFICULTY_LEVELS.MEDIUM; // Cấp độ mặc định khi khởi tạo

const SCORES = {
    'WIN': 100000000,   
    'LOSE': -100000000, // Thua vẫn là giá trị rất âm
    'LIVE_FIVE': 10000000, 
    'LIVE_FOUR': 1000000, // Điểm số cho Live Four của mình
    'LIVE_THREE': 10000,  
    'LIVE_TWO': 100,      

    'BLOCKED_FOUR': 10000, // Vẫn là điểm tấn công khi tự tạo
    'BLOCKED_THREE': 100,  
    'BLOCKED_TWO': 10,     

    'DOUBLE_LIVE_FOUR': 10000000, // Điểm cho double Live Four của mình
    'DOUBLE_LIVE_THREE': 100000, 

    'CENTER_WEIGHT': 50, 
    'BLOCK_MULTIPLIER': 1.0 // Hệ số nhân cho điểm của đối thủ khi phòng thủ
};

// DOM elements
const boardElement = document.getElementById('board');
const currentPlayerSpan = document.getElementById('current-player');
const resetButton = document.getElementById('reset-button');
const gameMessageElement = document.getElementById('game-message');
const boardSizeSelect = document.getElementById('board-size');
const playerVsPlayerBtn = document.getElementById('player-vs-player-button');
const playerVsAiBtn = document.getElementById('player-vs-ai-button');

// Thêm các biến DOM mới cho lựa chọn AI
const aiModeSelection = document.getElementById('ai-mode-selection');
const aiMinimaxBtn = document.getElementById('ai-minimax-button');
const aiAlphaBetaBtn = document.getElementById('ai-alpha-beta-button');
const aiDifficultySelect = document.getElementById('ai-difficulty'); // Thêm DOM element cho cấp độ khó

const aiTimeSpan = document.getElementById('ai-time');
const aiNodesSpan = document.getElementById('ai-nodes');
const aiDepthDisplaySpan = document.getElementById('ai-depth-display');

// Game state variables
let board = [];
let currentPlayer = 'X';
let isGameOver = false;
let gameMode = 'player-vs-ai';
let aiAlgorithm = 'minimax'; // Mặc định là minimax, hoặc 'alpha-beta'

let nodesVisited = 0; // For AI performance metrics (đếm số nút duyệt trong thuật toán AI)

// Variables for dragging functionality
let isDragging = false;
let startX;
let startY;
let scrollLeft;
let scrollTop;

// --- INITIALIZATION ---

function initializeGame() {
    const selectedSize = boardSizeSelect.value;
    if (selectedSize === 'infinite') {
        BOARD_SIZE = INFINITE_BOARD_SIZE;
        WIN_CONDITION = 5; 
        
        boardElement.classList.add('scrollable-board'); 
        enableDragging(); 
    } else {
        BOARD_SIZE = parseInt(selectedSize);
        if (BOARD_SIZE === 3) {
            WIN_CONDITION = 3;
        } else if (BOARD_SIZE === 5) {
            WIN_CONDITION = 4;
        } else if (BOARD_SIZE === 7) { 
            WIN_CONDITION = 5; 
        }
        
        boardElement.classList.remove('scrollable-board'); 
        disableDragging(); 
    }

    board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(''));
    currentPlayer = 'X';
    isGameOver = false;
    gameMessageElement.textContent = '';
    aiTimeSpan.textContent = 'N/A'; 
    aiNodesSpan.textContent = 'N/A';
    aiDepthDisplaySpan.textContent = 'N/A';

    renderBoard(); 
    updateGameInfo();

    if (gameMode === 'player-vs-ai' && currentPlayer === 'O') {
        setTimeout(makeAIMove, 500);
    }
}

// --- DRAGGING FUNCTIONALITY (for infinite board) ---
function enableDragging() {
    const gameBoardArea = document.querySelector('.game-board-area');
    if (!gameBoardArea) return; 
    gameBoardArea.addEventListener('mousedown', startDragging);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDragging);
}

function disableDragging() {
    const gameBoardArea = document.querySelector('.game-board-area');
    if (!gameBoardArea) return; 
    gameBoardArea.removeEventListener('mousedown', startDragging);
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', stopDragging);
    gameBoardArea.classList.remove('grabbing');
}

function startDragging(e) {
    if (e.button !== 0) return; 
    
    isDragging = true;
    const gameBoardArea = e.currentTarget;
    gameBoardArea.classList.add('grabbing'); 
    
    startX = e.pageX - gameBoardArea.offsetLeft;
    startY = e.pageY - gameBoardArea.offsetTop;
    scrollLeft = gameBoardArea.scrollLeft;
    scrollTop = gameBoardArea.scrollTop;
    
    e.preventDefault(); 
}

function drag(e) {
    if (!isDragging) return;
    e.preventDefault(); 
    const gameBoardArea = document.querySelector('.game-board-area'); 
    if (!gameBoardArea) return; 

    const x = e.pageX - gameBoardArea.offsetLeft;
    const y = e.pageY - gameBoardArea.offsetTop;
    const walkX = (x - startX); 
    const walkY = (y - startY); 
    
    gameBoardArea.scrollLeft = scrollLeft - walkX;
    gameBoardArea.scrollTop = scrollTop - walkY;
}

function stopDragging() {
    isDragging = false;
    const gameBoardArea = document.querySelector('.game-board-area');
    if (gameBoardArea) { 
        gameBoardArea.classList.remove('grabbing');
    }
}


// --- RENDERING ---

function renderBoard() {
    boardElement.innerHTML = ''; 

    boardElement.style.width = '';
    boardElement.style.height = '';
    boardElement.style.aspectRatio = '';
    boardElement.style.objectFit = '';

    setTimeout(() => {
        let boardWidth = boardElement.offsetWidth;
        let boardHeight = boardElement.offsetHeight;

        console.log('Board offsetWidth (after timeout):', boardWidth);
        console.log('Board offsetHeight (after timeout):', boardHeight);

        if (boardWidth <= 0 || boardHeight <= 0) {
            console.error('Lỗi: boardElement có kích thước 0 hoặc âm. Vui lòng kiểm tra CSS và đảm bảo phần tử có kích thước hiển thị.');
            displayMessage('Lỗi hiển thị bàn cờ. Kích thước bảng không hợp lệ.', true);
            return; 
        }

        const gapSize = 1; 
        
        let cellSize;
        if (boardSizeSelect.value === 'infinite') {
            cellSize = 40; 
            boardElement.style.width = `${BOARD_SIZE * cellSize + (BOARD_SIZE - 1) * gapSize}px`;
            boardElement.style.height = `${BOARD_SIZE * cellSize + (BOARD_SIZE - 1) * gapSize}px`;
            boardElement.style.aspectRatio = 'unset'; 
            boardElement.style.objectFit = 'unset'; 

            const gameBoardArea = document.querySelector('.game-board-area');
            if (gameBoardArea) {
                gameBoardArea.scrollLeft = (boardElement.offsetWidth - gameBoardArea.clientWidth) / 2;
                gameBoardArea.scrollTop = (boardElement.offsetHeight - gameBoardArea.clientHeight) / 2;
            }

        } else {
            const availableWidthForCells = boardWidth - (BOARD_SIZE - 1) * gapSize;
            const availableHeightForCells = boardHeight - (BOARD_SIZE - 1) * gapSize;
            cellSize = Math.floor(Math.min(availableWidthForCells, availableHeightForCells) / BOARD_SIZE);

            boardElement.style.width = '100%';
            boardElement.style.height = '100%';
            boardElement.style.aspectRatio = '1 / 1';
            boardElement.style.objectFit = 'contain';
        }

        console.log('Calculated cellSize:', cellSize);

        if (cellSize <= 0 || !isFinite(cellSize)) {
            console.error('Lỗi: Kích thước ô cờ được tính toán là 0, âm hoặc không hợp lệ sau khi tính toán. Vui lòng kiểm tra logic tính toán.');
            displayMessage('Lỗi hiển thị bàn cờ. Vui lòng kiểm tra console.', true);
            return;
        }

        boardElement.style.gridTemplateColumns = `repeat(${BOARD_SIZE}, ${cellSize}px)`;
        boardElement.style.gridTemplateRows = `repeat(${BOARD_SIZE}, ${cellSize}px)`;


        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (board[row][col]) {
                    cell.classList.add(board[row][col]);
                    cell.setAttribute('data-content', board[row][col]);
                }
                
                cell.style.fontSize = `${cellSize * 0.45}px`; 

                cell.addEventListener('click', handleCellClick);
                boardElement.appendChild(cell);
            }
        }
    }, 250); 
}

function updateGameInfo() {
    currentPlayerSpan.textContent = currentPlayer;
    currentPlayerSpan.style.color = currentPlayer === 'X' ? '#ff6347' : '#4a8ee1'; 
}

function displayMessage(message, isError = false) {
    gameMessageElement.textContent = message;
    gameMessageElement.classList.remove('error'); 
    if (isError) {
        gameMessageElement.classList.add('error'); 
    }
}

// --- GAME LOGIC ---

function handleCellClick(event) {
    if (isDragging && boardSizeSelect.value === 'infinite') {
        console.log("Click ignored: Dragging active in infinite mode."); 
        return; 
    }

    if (isGameOver) {
        console.log("handleCellClick: Click ignored as game is over.");
        displayMessage('Trò chơi đã kết thúc! Nhấn "Chơi lại" để bắt đầu ván mới.');
        return;
    }

    // Điều kiện QUAN TRỌNG: Chỉ ngăn chặn người chơi click khi đến lượt AI (nếu click từ người dùng)
    if (gameMode === 'player-vs-ai' && currentPlayer === 'O' && event.isTrusted) {
        console.log("handleCellClick: Player attempted to click when it's AI's turn. Ignored.");
        displayMessage('Đến lượt AI đi, vui lòng đợi!', true);
        return;
    }

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (isNaN(row) || isNaN(col) || row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        console.error("handleCellClick: Clicked cell index is out of bounds or invalid.", {row, col, eventTarget: event.target});
        return;
    }

    if (board[row][col] === '') {
        console.log(`handleCellClick: Cell (${row},${col}) is empty. Placing ${currentPlayer}.`); 
        board[row][col] = currentPlayer;
        event.target.classList.add(currentPlayer);
        event.target.setAttribute('data-content', currentPlayer); 

        if (checkWin(row, col, currentPlayer, board)) { 
            console.log(`handleCellClick: ${currentPlayer} thắng cuộc!`);
            displayMessage(`${currentPlayer} thắng cuộc!`, false);
            highlightWinningCells();
            isGameOver = true;
        } else if (isBoardFull(board)) { 
            console.log("handleCellClick: Board is full, it's a draw.");
            displayMessage('Hòa cờ!', false);
            isGameOver = true;
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            updateGameInfo();
            console.log(`handleCellClick: Turn switched to ${currentPlayer}.`);
            if (gameMode === 'player-vs-ai' && currentPlayer === 'O') {
                console.log("handleCellClick: It's AI's turn, calling makeAIMove after 500ms.");
                setTimeout(makeAIMove, 500);
            }
        }
    } else {
        console.log(`handleCellClick: Cell (${row},${col}) is already occupied by ${board[row][col]}.`);
        displayMessage('Ô này đã có quân rồi!', true);
    }
}

// Hàm kiểm tra thắng, nhận 'currentBoard' làm đối số
function checkWin(lastRow, lastCol, player, currentBoard) {
    const directions = [
        [0, 1],   // Ngang
        [1, 0],   // Dọc
        [1, 1],   // Chéo phải
        [1, -1]   // Chéo trái
    ];

    for (const [dr, dc] of directions) {
        for (let i = 0; i < WIN_CONDITION; i++) {
            let currentCount = 0;
            let currentWinningCells = [];

            for (let j = 0; j < WIN_CONDITION; j++) {
                const r = lastRow + dr * (j - i);
                const c = lastCol + dc * (j - i);

                if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && currentBoard[r][c] === player) {
                    currentCount++;
                    currentWinningCells.push([r, c]);
                } else {
                    currentCount = 0;
                    currentWinningCells = [];
                    break; 
                }
            }
            if (currentCount >= WIN_CONDITION) {
                if (currentBoard === board) { 
                    sessionStorage.setItem('winningCells', JSON.stringify(currentWinningCells));
                }
                return true;
            }
        }
    }
    return false;
}

function highlightWinningCells() {
    const winningCells = JSON.parse(sessionStorage.getItem('winningCells'));
    if (winningCells) {
        winningCells.forEach(([r, c]) => {
            const cellElement = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            if (cellElement) {
                cellElement.classList.add('winner');
            }
        });
        sessionStorage.removeItem('winningCells');
    }
}

// Hàm kiểm tra bảng đầy, nhận 'currentBoard' làm đối số
function isBoardFull(currentBoard) {
    if (boardSizeSelect.value === 'infinite') {
        return false; 
    }
    for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
            if (currentBoard[row][col] === '') {
                return false;
            }
        }
    }
    return true;
}

// Trong hàm evaluate(currentBoard):
function evaluate(currentBoard) {
    // Kiểm tra thắng/thua trực tiếp (ưu tiên cao nhất)
    if (checkWin(0, 0, 'O', currentBoard)) return SCORES.WIN;
    if (checkWin(0, 0, 'X', currentBoard)) return SCORES.LOSE; 
    if (isBoardFull(currentBoard)) return 0; 

    // Khai báo và tính toán occupiedCellsCount ngay tại đây, trong mỗi lần evaluate được gọi
    let occupiedCellsCount = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] !== '') {
                occupiedCellsCount++;
            }
        }
    }
    
    // MẢNG NƯỚC ĐI TIỀM NĂNG
    const movesToCheck = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] === '') {
                movesToCheck.push({ r, c });
            }
        }
    }
    if (movesToCheck.length === 0 && boardSizeSelect.value !== 'infinite') return 0;

    // QUAN TRỌNG: Kiểm tra các nước thắng trực tiếp (Win in 1) cho cả hai bên
    for (const { r, c } of movesToCheck) {
        // Giả định đối thủ đặt quân (X)
        currentBoard[r][c] = 'X';
        if (checkWin(r, c, 'X', currentBoard)) {
            currentBoard[r][c] = ''; // Hoàn tác
            return SCORES.LOSE + (currentAIDifficulty.MAX_DEPTH * 10); // Điểm cực thấp nếu đối thủ thắng
        }
        currentBoard[r][c] = ''; // Hoàn tác

        // Giả định AI đặt quân (O)
        currentBoard[r][c] = 'O';
        if (checkWin(r, c, 'O', currentBoard)) {
            currentBoard[r][c] = ''; // Hoàn tác
            return SCORES.WIN - (currentAIDifficulty.MAX_DEPTH * 10); // Điểm cực cao nếu AI thắng
        }
        currentBoard[r][c] = ''; // Hoàn tác
    }

    // Nếu không có nước thắng/thua trực tiếp, tính điểm heuristic tổng quát
    let aiTotalScore = 0;
    let playerTotalScore = 0;

    for (const { r, c } of movesToCheck) {
        // Giả định AI đặt 'O'
        currentBoard[r][c] = 'O';
        const aiScoreIfMove = calculatePlayerScore(currentBoard, 'O');
        currentBoard[r][c] = '';

        // Giả định Người chơi đặt 'X'
        currentBoard[r][c] = 'X';
        const playerThreatScoreIfMove = calculatePlayerScore(currentBoard, 'X'); // Điểm mối đe dọa của người chơi
        currentBoard[r][c] = '';

        // Điểm của AI là điểm mình tạo ra trừ đi điểm mối đe dọa của đối thủ
        // AI ưu tiên nước nào vừa tạo được chuỗi tốt cho mình VÀ chặn được đối thủ hiệu quả
        aiTotalScore += aiScoreIfMove - playerThreatScoreIfMove * currentAIDifficulty.BLOCK_MULTIPLIER;

        // Ưu tiên trung tâm (cho ô trống)
        if (boardSizeSelect.value !== 'infinite' || occupiedCellsCount < 5) {
            const centerRow = Math.floor(BOARD_SIZE / 2);
            const centerCol = Math.floor(BOARD_SIZE / 2);
            const distFromCenter = Math.max(Math.abs(r - centerRow), Math.abs(c - centerCol));
            aiTotalScore += SCORES.CENTER_WEIGHT * (1 - distFromCenter / (BOARD_SIZE / 2));
        }
    }
    
    // TRẢ VỀ TỔNG ĐIỂM
    // Trong Minimax, điểm này sẽ được truyền lên.
    // Nếu aiTotalScore quá thấp (vì playerThreatScoreIfMove cao), Minimax sẽ không chọn nước đó.
    return aiTotalScore;
}

// Hàm tính điểm tổng thể cho một người chơi (AI hoặc Player) trên bảng
// Hàm này chỉ tính điểm *tấn công* của người chơi đó
function calculatePlayerScore(currentBoard, player) { 
    let score = 0;
    let liveThrees = 0;
    let liveFours = 0;

    let visitedPatterns = new Set(); 

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] !== player) continue; 

            const patterns = getPatternsFromCell(r, c, player, currentBoard);

            for (const pattern of patterns) {
                const patternKey = `${pattern.startR},${pattern.startC},${pattern.dr},${pattern.dc},${pattern.count},${pattern.openEnds},${player}`;
                if (visitedPatterns.has(patternKey)) {
                    continue;
                }
                visitedPatterns.add(patternKey);

                const patternScore = getPatternScoreValue(pattern);
                score += patternScore;

                if (pattern.count === 3 && pattern.openEnds === 2) liveThrees++;
                if (pattern.count === 4 && pattern.openEnds === 2) liveFours++;
            }
        }
    }

    // Đánh giá mối đe dọa kép
    if (liveFours >= 2) return SCORES.DOUBLE_LIVE_FOUR; 
    if (liveFours >= 1 && liveThrees >= 1) return SCORES.DOUBLE_LIVE_FOUR; 
    if (liveThrees >= 2) score += SCORES.DOUBLE_LIVE_THREE; 

    return score;
}

// Hàm mới: Trả về tất cả các pattern từ một ô cụ thể
function getPatternsFromCell(row, col, player, currentBoard) {
    const patternsFound = [];
    const directions = [
        [0, 1],   // Ngang (col + 1)
        [1, 0],   // Dọc (row + 1)
        [1, 1],   // Chéo phải (row + 1, col + 1)
        [1, -1]   // Chéo trái (row + 1, col - 1)
    ];

    for (const [dr, dc] of directions) {
        // Kiểm tra xem pattern này đã được đếm từ ô phía sau (ngược hướng) chưa
        // Mục đích: Đảm bảo mỗi chuỗi (ví dụ: OOOOO) chỉ được tính từ một điểm khởi đầu duy nhất
        const prevR_for_check = row - dr;
        const prevC_for_check = col - dc;
        if (prevR_for_check >= 0 && prevR_for_check < BOARD_SIZE && 
            currentBoard[prevR_for_check][prevC_for_check] === player) {
            continue; 
        }

        let count = 0;
        let openEnds = 0;
        let blockedEnds = 0;

        // Bắt đầu từ ô hiện tại và đếm chuỗi theo hướng (dr, dc)
        let r_fwd = row; 
        let c_fwd = col; 
        while (r_fwd >= 0 && r_fwd < BOARD_SIZE && c_fwd >= 0 && c_fwd < BOARD_SIZE && currentBoard[r_fwd][c_fwd] === player) {
            count++;
            r_fwd += dr;
            c_fwd += dc;
        }

        // Kiểm tra đầu mở/bị chặn ở phía "forward" (sau chuỗi)
        if (r_fwd >= 0 && r_fwd < BOARD_SIZE && c_fwd >= 0 && c_fwd < BOARD_SIZE) {
            if (currentBoard[r_fwd][c_fwd] === '') {
                openEnds++;
            } else { // Gặp quân đối thủ hoặc biên
                blockedEnds++;
            }
        } else { // Vượt ra ngoài biên
            blockedEnds++;
        }

        // Kiểm tra đầu mở/bị chặn ở phía "backward" (trước chuỗi)
        // Di chuyển về phía sau từ ô bắt đầu của chuỗi (row, col)
        let r_bwd = row - dr; 
        let c_bwd = col - dc; 
        if (r_bwd >= 0 && r_bwd < BOARD_SIZE && c_bwd >= 0 && c_bwd < BOARD_SIZE) {
            if (currentBoard[r_bwd][c_bwd] === '') {
                openEnds++;
            } else { // Gặp quân đối thủ hoặc biên
                blockedEnds++;
            }
        } else { // Vượt ra ngoài biên
            blockedEnds++;
        }

        // Chỉ thêm pattern nếu nó hợp lệ (tối thiểu 2 quân) và có ít nhất một đầu mở hoặc bị chặn
        // Loại bỏ các chuỗi không có tiềm năng phát triển
        if (count >= 2 && (openEnds + blockedEnds) > 0) {
             patternsFound.push({
                 startR: row, startC: col, dr, dc, 
                 count: count,
                 openEnds: openEnds,
                 blockedEnds: blockedEnds
             });
        }
    }
    return patternsFound;
}

// Hàm mới: Trả về điểm số dựa trên pattern đã tìm thấy
function getPatternScoreValue(pattern) {
    const { count, openEnds, blockedEnds } = pattern;

    if (count >= WIN_CONDITION) {
        return SCORES.LIVE_FIVE; // Hoặc SCORES.WIN nếu muốn điểm cụ thể
    }

    if (count === WIN_CONDITION - 1) { // 4 quân
        if (openEnds === 2) return SCORES.LIVE_FOUR;
        if (openEnds === 1) return SCORES.BLOCKED_FOUR;
    } else if (count === WIN_CONDITION - 2) { // 3 quân
        if (openEnds === 2) return SCORES.LIVE_THREE;
        if (openEnds === 1) return SCORES.BLOCKED_THREE;
    } else if (count === WIN_CONDITION - 3) { // 2 quân
        if (openEnds === 2) return SCORES.LIVE_TWO;
        if (openEnds === 1) return SCORES.BLOCKED_TWO;
    }
    return 0; // Không có pattern nào quan trọng
}

// AI LOGIC (Minimax and Alpha-Beta)
function makeAIMove() {
    displayMessage('AI đang suy nghĩ...');
    let bestMove = null;
    nodesVisited = 0; 

    // Bước 1: Làm nổi bật các ô trống NGAY LẬP TỨC
    highlightPotentialAIMoves();

    setTimeout(() => {
        let startTime = performance.now();

        const boardCopy = board.map(row => [...row]); 

        // Áp dụng yếu tố ngẫu nhiên cho cấp độ dễ
        if (currentAIDifficulty.RANDOM_MOVE_CHANCE > 0 && Math.random() < currentAIDifficulty.RANDOM_MOVE_CHANCE) {
            bestMove = findBestMoveRandom(boardCopy);
            console.log("AI took a random move (due to difficulty setting).");
        } else {
            // Chọn thuật toán dựa trên aiAlgorithm và độ sâu từ cấp độ khó
            if (aiAlgorithm === 'minimax') {
                bestMove = findBestMoveMinimax(boardCopy, currentPlayer, currentAIDifficulty.MAX_DEPTH); 
            } else if (aiAlgorithm === 'alpha-beta') {
                bestMove = findBestMoveAlphaBeta(boardCopy, currentPlayer, currentAIDifficulty.MAX_DEPTH); 
            } else {
                bestMove = findBestMoveRandom(boardCopy); 
            }
        }
        
        let endTime = performance.now();
        let duration = endTime - startTime;

        aiTimeSpan.textContent = `${duration.toFixed(2)}`;
        aiNodesSpan.textContent = nodesVisited;
        aiDepthDisplaySpan.textContent = currentAIDifficulty.MAX_DEPTH; // Hiển thị độ sâu thực tế

        clearPotentialAIMoves(); // Xóa các chấm sau khi AI đã chọn nước đi

        if (bestMove) {
            setTimeout(() => {
                const cellToClick = boardElement.querySelector(`.cell[data-row="${bestMove.row}"][data-col="${bestMove.col}"]`);
                
                if (cellToClick) {
                    if (board[bestMove.row][bestMove.col] === '') { 
                        cellToClick.click();
                    } else {
                        console.warn(`AI selected an already occupied cell: (${bestMove.row}, ${bestMove.col}). This should not happen with a correct Minimax. Attempting a random fallback move.`);
                        const fallbackMove = findBestMoveRandom(board);
                        if (fallbackMove) {
                            const fallbackCell = boardElement.querySelector(`.cell[data-row="${fallbackMove.row}"][data-col="${fallbackMove.col}"]`);
                            if (fallbackCell && board[fallbackMove.row][fallbackMove.col] === '') {
                                fallbackCell.click();
                            } else {
                                displayMessage('Lỗi: AI không tìm được ô trống nào, kể cả ngẫu nhiên.', true);
                            }
                        } else {
                            displayMessage('AI không tìm được nước đi hợp lệ.', true);
                        }
                    }
                } else {
                    console.error("AI's bestMove cell element not found in DOM for clicking!", bestMove);
                    displayMessage('Lỗi: AI không tìm thấy ô để đánh trên giao diện.', true);
                }
            }, 200); 
            
        } else {
            displayMessage('AI không tìm thấy nước đi! (Có thể do hết ô trống)', true);
        }
    }, 1000); 
}

// Hàm mới để làm nổi bật các ô trống mà AI thực sự quan tâm (trong bán kính 2 ô quanh quân cờ)
function highlightPotentialAIMoves() {
    console.log("Highlighting potential AI moves..."); 
    let highlightedCount = 0;
    const cellsToHighlight = new Set(); // Sử dụng Set để lưu trữ các vị trí duy nhất

    // Duyệt qua tất cả các ô đã có quân cờ
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== '') { // Nếu ô này đã có quân
                // Xem xét các ô lân cận (trong bán kính nhỏ)
                for (let dr_offset = -2; dr_offset <= 2; dr_offset++) { // Phạm vi +/- 2 hàng
                    for (let dc_offset = -2; dc_offset <= 2; dc_offset++) { // Phạm vi +/- 2 cột
                        // Bỏ qua chính ô đang xét
                        if (dr_offset === 0 && dc_offset === 0) continue; 

                        const neighborR = r + dr_offset;
                        const neighborC = c + dc_offset;

                        // Kiểm tra xem ô lân cận có hợp lệ và trống không
                        if (neighborR >= 0 && neighborR < BOARD_SIZE &&
                            neighborC >= 0 && neighborC < BOARD_SIZE &&
                            board[neighborR][neighborC] === '') {
                            // Thêm vị trí vào Set (đảm bảo không trùng lặp)
                            cellsToHighlight.add(`${neighborR},${neighborC}`);
                        }
                    }
                }
            }
        }
    }

    // Nếu không có quân cờ nào trên bàn cờ (ván mới), highlight ô trung tâm
    if (cellsToHighlight.size === 0 && BOARD_SIZE > 0) {
        const centerR = Math.floor(BOARD_SIZE / 2);
        const centerC = Math.floor(BOARD_SIZE / 2);
        if (board[centerR][centerC] === '') {
             cellsToHighlight.add(`${centerR},${centerC}`);
        }
    }


    // Duyệt qua các vị trí đã thu thập và áp dụng class
    cellsToHighlight.forEach(pos => {
        const [r, c] = pos.split(',').map(Number);
        const cellElement = boardElement.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
        if (cellElement) {
            cellElement.classList.add('ai-potential-move');
            // cellElement.classList.add('ai-potential-dot'); // Tùy chọn: nếu muốn chấm tròn
            highlightedCount++;
        } else {
            console.warn(`Cell element at (${r}, ${c}) not found for highlighting.`);
        }
    });

    console.log(`Finished highlighting. Total cells highlighted: ${highlightedCount}`);
}

// Hàm mới để xóa các ô nổi bật
function clearPotentialAIMoves() {
    console.log("Clearing potential AI moves..."); 
    const potentialCells = document.querySelectorAll('.cell.ai-potential-move');
    let clearedCount = 0;
    potentialCells.forEach(cell => {
        cell.classList.remove('ai-potential-move');
        // cell.classList.remove('ai-potential-dot');
        clearedCount++;
    });
    console.log(`Finished clearing. Total cells cleared: ${clearedCount}`);
}

// Hàm tìm nước đi ngẫu nhiên tạm thời
function findBestMoveRandom(currentBoard) {
    let availableMoves = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] === '') {
                availableMoves.push({ row: r, col: c });
            }
        }
    }
    if (availableMoves.length > 0) {
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
    return null;
}

// --- Thuật toán Minimax CHƯA CẮT TỈA ---
function minimaxNoPruning(currentBoard, currentDepth, isMaximizingPlayer, maxSearchDepth) {
    nodesVisited++; 

    let score = evaluate(currentBoard); 

    if (score !== null) {
        if (score === SCORES.WIN) return score - currentDepth;
        if (score === SCORES.LOSE) return score + currentDepth;
        return score; 
    }

    if (currentDepth === maxSearchDepth) { // So sánh với độ sâu tìm kiếm tối đa được truyền vào
        return evaluate(currentBoard); 
    }

    if (isMaximizingPlayer) { 
        let bestScore = -Infinity;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentBoard[r][c] === '') {
                    currentBoard[r][c] = 'O'; 
                    bestScore = Math.max(bestScore, minimaxNoPruning(currentBoard, currentDepth + 1, false, maxSearchDepth)); 
                    currentBoard[r][c] = ''; 
                }
            }
        }
        return bestScore;
    } else { 
        let bestScore = Infinity;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentBoard[r][c] === '') {
                    currentBoard[r][c] = 'X'; 
                    bestScore = Math.min(bestScore, minimaxNoPruning(currentBoard, currentDepth + 1, true, maxSearchDepth)); 
                    currentBoard[r][c] = ''; 
                }
            }
        }
        return bestScore;
    }
}

// Hàm tìm nước đi tốt nhất bằng Minimax CHỈ (không cắt tỉa)
function findBestMoveMinimax(currentBoard, player, maxSearchDepth) { // maxSearchDepth được truyền từ makeAIMove
    let bestScore = -Infinity;
    let bestMove = null;
    let availableMoves = [];

    // Lấy tất cả các nước đi trống
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] === '') {
                availableMoves.push({ row: r, col: c });
            }
        }
    }

    if (availableMoves.length === 0) {
        return null;
    }

    for (const move of availableMoves) {
        currentBoard[move.row][move.col] = player;
        let score = minimaxNoPruning(currentBoard, 0, false, maxSearchDepth); // Gọi phiên bản không cắt tỉa
        currentBoard[move.row][move.col] = '';

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}


// --- Thuật toán Minimax CÓ CẮT TỈA ALPHA-BETA ---
function minimax(currentBoard, currentDepth, isMaximizingPlayer, alpha, beta, maxSearchDepth) { // Thêm maxSearchDepth
    nodesVisited++; 

    let score = evaluate(currentBoard); 

    if (score !== null) {
        if (score === SCORES.WIN) return score - currentDepth;
        if (score === SCORES.LOSE) return score + currentDepth;
        return score; 
    }

    if (currentDepth === maxSearchDepth) { // So sánh với độ sâu tìm kiếm tối đa được truyền vào
        return evaluate(currentBoard); 
    }

    if (isMaximizingPlayer) { 
        let bestScore = -Infinity;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentBoard[r][c] === '') {
                    currentBoard[r][c] = 'O'; 
                    bestScore = Math.max(bestScore, minimax(currentBoard, currentDepth + 1, false, alpha, beta, maxSearchDepth));
                    currentBoard[r][c] = ''; 

                    alpha = Math.max(alpha, bestScore); 
                    if (beta <= alpha) { 
                        break; 
                    }
                }
            }
        }
        return bestScore;
    } else { 
        let bestScore = Infinity;
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if (currentBoard[r][c] === '') {
                    currentBoard[r][c] = 'X'; 
                    bestScore = Math.min(bestScore, minimax(currentBoard, currentDepth + 1, true, alpha, beta, maxSearchDepth)); 
                    currentBoard[r][c] = ''; 

                    beta = Math.min(beta, bestScore); 
                    if (beta <= alpha) { 
                        break;
                    }
                }
            }
        }
        return bestScore;
    }
}

// Hàm tìm nước đi tốt nhất bằng Minimax với cắt tỉa Alpha-Beta
function findBestMoveAlphaBeta(currentBoard, player, maxSearchDepth) { // maxSearchDepth được truyền từ makeAIMove
    let bestScore = -Infinity;
    let bestMove = null;
    let availableMoves = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] === '') {
                availableMoves.push({ row: r, col: c });
            }
        }
    }

    if (availableMoves.length === 0) {
        return null;
    }

    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of availableMoves) {
        currentBoard[move.row][move.col] = player; 
        let score = minimax(currentBoard, 0, false, alpha, beta, maxSearchDepth); 
        currentBoard[move.row][move.col] = '';

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        alpha = Math.max(alpha, bestScore); 
    }
    return bestMove;
}


// --- EVENT LISTENERS ---
resetButton.addEventListener('click', initializeGame);
boardSizeSelect.addEventListener('change', initializeGame);

playerVsPlayerBtn.addEventListener('click', () => {
    gameMode = 'player-vs-player';
    displayMessage('Chế độ 2 Người Chơi');
    if (aiModeSelection) { 
        aiModeSelection.classList.add('hidden'); 
    }
    initializeGame();
});

playerVsAiBtn.addEventListener('click', () => {
    if (aiModeSelection) { 
        aiModeSelection.classList.remove('hidden');
    }
    displayMessage('Chọn chế độ AI:');
});

// Listener cho cấp độ AI
if (aiDifficultySelect) { // Kiểm tra nếu phần tử tồn tại (đảm bảo index.html đã được cập nhật)
    aiDifficultySelect.addEventListener('change', () => {
        const selectedLevel = aiDifficultySelect.value;
        currentAIDifficulty = AI_DIFFICULTY_LEVELS[selectedLevel];
        displayMessage(`Đã chọn cấp độ AI: ${selectedLevel}`);
        // Không initializeGame() ở đây để không làm gián đoạn game đang chạy
        // AI sẽ áp dụng cấp độ mới từ lượt tiếp theo
    });
}


aiMinimaxBtn.addEventListener('click', () => {
    gameMode = 'player-vs-ai';
    aiAlgorithm = 'minimax'; // Chọn thuật toán Minimax (không cắt tỉa)
    displayMessage('Chế độ 1 Người Chơi (AI Minimax)');
    if (aiModeSelection) { 
        aiModeSelection.classList.add('hidden');
    }
    initializeGame();
});

aiAlphaBetaBtn.addEventListener('click', () => {
    gameMode = 'player-vs-ai';
    aiAlgorithm = 'alpha-beta'; // Chọn thuật toán Alpha-Beta (có cắt tỉa)
    displayMessage('Chế độ 1 Người Chơi (AI Alpha-Beta)');
    if (aiModeSelection) { 
        aiModeSelection.classList.add('hidden');
    }
    initializeGame();
});

// START GAME ON LOAD
document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    if (aiModeSelection) { 
        aiModeSelection.classList.add('hidden'); 
    }
    // Đặt cấp độ khó mặc định khi tải trang
    if (aiDifficultySelect) {
        aiDifficultySelect.value = 'MEDIUM'; // Thiết lập giá trị mặc định cho dropdown
        currentAIDifficulty = AI_DIFFICULTY_LEVELS.MEDIUM; // Cập nhật biến global
    }
});