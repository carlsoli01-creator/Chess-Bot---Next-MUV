import BoardObserver from './boardObserver';
import { boardStateToFEN } from '../engine/fenConverter';
import { detectPlayerColor } from '../engine/chessEngine';
import { MoveEstimator } from '../models/moveEstimator';
import { EloModel } from '../models/eloModel';
import { BoardState } from '../types';

const playerColor = detectPlayerColor();
const opponentTurnLabel: 'white' | 'black' = playerColor === 'w' ? 'black' : 'white';

let lastBoardState: BoardState | null = null;
let lastTurn: 'white' | 'black' | null = null;
let analysisRunning = false;

let lastDisplayMove: string | null = null;
let lastFen: string | null = null;
let lastConfidence: number = 0;
let lastEloCategory: string = '';
let isCalculating = false;

function scrapeOpponentElo(): number {
    const flipped = !!document.querySelector('.board.flipped, .board-layout-chessboard.flipped');
    const ratingEls = Array.from(document.querySelectorAll<HTMLElement>('.player-tagline-rating, .user-tagline-rating'));
    const opponentEl = flipped ? ratingEls[1] : ratingEls[0];
    if (opponentEl) {
        const text = opponentEl.textContent?.replace(/[^\d]/g, '');
        const rating = text ? parseInt(text, 10) : NaN;
        if (!isNaN(rating) && rating > 0) return rating;
    }
    return 1200;
}

function scrapePlayerRatings() {
    const flipped = !!document.querySelector('.board.flipped, .board-layout-chessboard.flipped');
    const ratingEls = Array.from(document.querySelectorAll<HTMLElement>('.player-tagline-rating, .user-tagline-rating'));
    const topRating    = ratingEls[0]?.textContent?.trim() || '--';
    const bottomRating = ratingEls[1]?.textContent?.trim() || '--';
    return {
        whiteRating: flipped ? bottomRating : topRating,
        blackRating:  flipped ? topRating   : bottomRating,
    };
}

const overlay = createOverlay();
const observer = new BoardObserver();

observer.onBoardChange((board: BoardState) => {
    const turnChanged = lastTurn !== null && lastTurn !== board.turn;
    const opponentJustMoved = turnChanged && lastTurn === opponentTurnLabel;
    const firstLoad = !lastBoardState;

    if ((opponentJustMoved || firstLoad) && !analysisRunning) {
        analyse(board);
    }

    lastBoardState = board;
    lastTurn = board.turn;
});

function analyse(board: BoardState) {
    analysisRunning = true;
    isCalculating = true;
    overlay.calculating();

    const fen = boardStateToFEN(board);
    lastFen = fen;

    const opponentElo = scrapeOpponentElo();
    const eloModel = new EloModel(opponentElo);
    const estimator = new MoveEstimator(opponentElo);

    const predicted = estimator.estimateMove(board, opponentElo);
    const probability = eloModel.calculateProbability(predicted.to, opponentElo);
    const confidence = Math.round(probability * 100);
    const eloCategory = eloModel.getCategory();

    lastDisplayMove = predicted.to.toUpperCase();
    lastConfidence = confidence;
    lastEloCategory = eloCategory;

    analysisRunning = false;
    isCalculating = false;

    overlay.show(lastDisplayMove, `Opp likely (${eloCategory}) · ${confidence}% conf`);
}

// ── Popup messaging ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type !== 'GET_STATE') return false;

    const board = lastBoardState;
    const { whiteRating, blackRating } = scrapePlayerRatings();

    if (!board) {
        sendResponse({
            displayMove: null, fen: null, pieces: {}, turn: null,
            playerColor, calculating: false, moveNumber: null,
            whiteRating, blackRating, confidence: 0, eloCategory: '',
            reason: 'No board detected',
        });
        return false;
    }

    const fen = lastFen || boardStateToFEN(board);
    const moveNumber = fen.split(' ')[5] || '--';

    sendResponse({
        displayMove: lastDisplayMove,
        fen,
        pieces: board.pieces,
        turn: board.turn,
        playerColor,
        calculating: isCalculating,
        moveNumber,
        whiteRating,
        blackRating,
        confidence: lastConfidence,
        eloCategory: lastEloCategory,
        reason: lastDisplayMove
            ? `Opponent likely plays (${lastEloCategory}) · ${lastConfidence}% confidence`
            : (isCalculating ? 'Calculating...' : 'Waiting for opponent move...'),
    });
    return false;
});

// ─── Overlay UI ─────────────────────────────────────────────────────────────

function createOverlay() {
    const style = document.createElement('style');
    style.textContent = `
        .cmp-wrap {
            position: fixed; top: 14px; right: 14px; z-index: 2147483647;
            display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
            background: rgba(10,14,26,0.93);
            border: 1.5px solid rgba(99,102,241,0.45);
            border-radius: 10px;
            padding: 8px 14px 8px 12px;
            box-shadow: 0 4px 28px rgba(0,0,0,0.55);
            user-select: none; cursor: grab;
            backdrop-filter: blur(6px);
            transition: border-color 0.25s;
            font-family: ui-monospace, 'Courier New', monospace;
            min-width: 130px;
        }
        .cmp-wrap.calc  { border-color: rgba(250,204,21,0.6); }
        .cmp-wrap.ready { border-color: rgba(34,197,94,0.7); }
        .cmp-wrap.err   { border-color: rgba(239,68,68,0.6); }

        .cmp-row { display: flex; align-items: center; gap: 8px; }

        .cmp-dot {
            width: 10px; height: 10px; border-radius: 50%;
            background: #6366f1; flex-shrink: 0; transition: background 0.25s;
        }
        .cmp-wrap.calc  .cmp-dot { background: #facc15; animation: cmp-p 0.9s infinite; }
        .cmp-wrap.ready .cmp-dot { background: #22c55e; }
        .cmp-wrap.err   .cmp-dot { background: #ef4444; }

        @keyframes cmp-p {
            0%,100% { transform: scale(1);    opacity: 1;   }
            50%      { transform: scale(1.35); opacity: 0.5; }
        }

        .cmp-text {
            font-size: 18px; font-weight: 800;
            letter-spacing: 0.09em; color: #e2e8f0;
            text-transform: uppercase; transition: color 0.25s;
        }
        .cmp-wrap.calc  .cmp-text { color: #fde68a; }
        .cmp-wrap.ready .cmp-text { color: #86efac; }
        .cmp-wrap.err   .cmp-text { color: #fca5a5; }

        .cmp-sub {
            font-size: 10px; color: #94a3b8;
            max-width: 210px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'cmp-wrap';

    const row = document.createElement('div');
    row.className = 'cmp-row';

    const dot = document.createElement('span');
    dot.className = 'cmp-dot';

    const text = document.createElement('span');
    text.className = 'cmp-text';
    text.textContent = '...';

    row.appendChild(dot);
    row.appendChild(text);

    const sub = document.createElement('div');
    sub.className = 'cmp-sub';

    wrap.appendChild(row);
    wrap.appendChild(sub);
    document.body.appendChild(wrap);

    let dragging = false, ox = 0, oy = 0, il = 0, it = 0;
    wrap.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        dragging = true;
        const r = wrap.getBoundingClientRect();
        ox = e.clientX; oy = e.clientY; il = r.left; it = r.top;
        wrap.style.right = 'auto'; wrap.style.left = il + 'px'; wrap.style.top = it + 'px';
        wrap.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    wrap.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        wrap.style.left = Math.max(0, Math.min(window.innerWidth  - wrap.offsetWidth,  il + e.clientX - ox)) + 'px';
        wrap.style.top  = Math.max(0, Math.min(window.innerHeight - wrap.offsetHeight, it + e.clientY - oy)) + 'px';
    });
    wrap.addEventListener('pointerup', (e) => { dragging = false; wrap.releasePointerCapture(e.pointerId); });

    return {
        calculating() { text.textContent = '...'; sub.textContent = 'Analysing...'; wrap.className = 'cmp-wrap calc'; },
        show(move: string, reason = '') { text.textContent = move || '?'; sub.textContent = reason; wrap.className = 'cmp-wrap ready'; },
        error()  { text.textContent = '!'; sub.textContent = 'Error'; wrap.className = 'cmp-wrap err'; },
    };
}
