import BoardObserver from './boardObserver';
import { StockfishEngine } from '../engine/stockfishEngine';
import { boardStateToFEN, formatStockfishMove } from '../engine/fenConverter';
import { detectPlayerColor } from '../engine/chessEngine';
import { BoardState } from '../types';

// Start engine early so it's warmed up by the time the first move is needed
const engine = new StockfishEngine();

const playerColor = detectPlayerColor();
const playerTurnLabel: 'white' | 'black' = playerColor === 'w' ? 'white' : 'black';
const opponentTurnLabel: 'white' | 'black' = playerColor === 'w' ? 'black' : 'white';

let lastBoardState: BoardState | null = null;
let lastTurn: 'white' | 'black' | null = null;
let analysisRunning = false;

const overlay = createOverlay();
const observer = new BoardObserver();

observer.onBoardChange((board: BoardState) => {
    const turnChanged = lastTurn !== null && lastTurn !== board.turn;
    const playerJustMoved   = turnChanged && lastTurn === playerTurnLabel;   // it's now opponent's turn
    const opponentJustMoved = turnChanged && lastTurn === opponentTurnLabel; // it's now player's turn
    const firstLoad = !lastBoardState;

    if ((playerJustMoved || opponentJustMoved || firstLoad) && !analysisRunning) {
        analyse(board);
    }

    lastBoardState = board;
    lastTurn = board.turn;
});

async function analyse(board: BoardState) {
    analysisRunning = true;
    overlay.calculating();

    const fen = boardStateToFEN(board);
    // movetime 2500 ms → result arrives in ~2.5 s, well under 4 s
    const rawMove = await engine.search(fen, 2500);

    analysisRunning = false;

    if (!rawMove) {
        overlay.error();
        return;
    }

    const displayMove = formatStockfishMove(rawMove, board.pieces);
    overlay.show(displayMove);
}

// ─── Overlay UI ─────────────────────────────────────────────────────────────

function createOverlay() {
    const style = document.createElement('style');
    style.textContent = `
        .cmp-wrap {
            position: fixed; top: 14px; right: 14px; z-index: 2147483647;
            display: flex; align-items: center; gap: 8px;
            background: rgba(10,14,26,0.93);
            border: 1.5px solid rgba(99,102,241,0.45);
            border-radius: 999px;
            padding: 6px 14px 6px 10px;
            box-shadow: 0 4px 28px rgba(0,0,0,0.55);
            user-select: none; cursor: grab;
            backdrop-filter: blur(6px);
            transition: border-color 0.25s;
            font-family: ui-monospace, 'Courier New', monospace;
        }
        .cmp-wrap.calc  { border-color: rgba(250,204,21,0.6); }
        .cmp-wrap.ready { border-color: rgba(34,197,94,0.7); }
        .cmp-wrap.err   { border-color: rgba(239,68,68,0.6); }

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
            font-size: 16px; font-weight: 800;
            letter-spacing: 0.09em; color: #e2e8f0;
            text-transform: uppercase; min-width: 36px; text-align: center;
            transition: color 0.25s;
        }
        .cmp-wrap.calc  .cmp-text { color: #fde68a; }
        .cmp-wrap.ready .cmp-text { color: #86efac; }
        .cmp-wrap.err   .cmp-text { color: #fca5a5; }
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'cmp-wrap';

    const dot  = document.createElement('span');
    dot.className = 'cmp-dot';

    const text = document.createElement('span');
    text.className = 'cmp-text';
    text.textContent = '...';

    wrap.appendChild(dot);
    wrap.appendChild(text);
    document.body.appendChild(wrap);

    // Drag support
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
        calculating() { text.textContent = '...'; wrap.className = 'cmp-wrap calc'; },
        show(move: string) { text.textContent = move || '?'; wrap.className = 'cmp-wrap ready'; },
        error()  { text.textContent = '!'; wrap.className = 'cmp-wrap err'; },
    };
}
