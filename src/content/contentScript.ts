import BoardObserver from './boardObserver';
import { getBestMove, formatMove, detectPlayerColor } from '../engine/chessEngine';
import { BoardState } from '../types';

const playerColor = detectPlayerColor(); // 'w' = white at bottom, 'b' = black at bottom
const opponentTurn = playerColor === 'w' ? 'black' : 'white';
const playerTurn   = playerColor === 'w' ? 'white' : 'black';

let lastBoardState: BoardState | null = null;
let lastTurn: 'white' | 'black' | null = null;
let calculating = false;

const overlay = createOverlay();
const boardObserver = new BoardObserver();

boardObserver.onBoardChange((boardState: BoardState) => {
    const turnChanged = lastTurn !== null && lastTurn !== boardState.turn;
    const playerJustMoved = turnChanged && lastTurn === playerTurn;
    const opponentJustMoved = turnChanged && lastTurn === opponentTurn;

    // After player moves → opponent's turn → calculate best next move for player
    if (playerJustMoved && !calculating) {
        overlay.setStatus('calculating');
        calculating = true;
        // Defer so we don't block the page
        setTimeout(() => {
            const move = getBestMove(boardState, playerColor, 3);
            calculating = false;
            if (move) {
                overlay.showMove(formatMove(move));
            } else {
                overlay.setStatus('idle');
            }
        }, 0);
    }

    // After opponent moves → player's turn → refresh prediction immediately
    if (opponentJustMoved && !calculating) {
        overlay.setStatus('calculating');
        calculating = true;
        setTimeout(() => {
            const move = getBestMove(boardState, playerColor, 3);
            calculating = false;
            if (move) {
                overlay.showMove(formatMove(move));
            } else {
                overlay.setStatus('idle');
            }
        }, 0);
    }

    // Initial load — show first prediction
    if (!lastBoardState && !calculating) {
        calculating = true;
        setTimeout(() => {
            const move = getBestMove(boardState, playerColor, 3);
            calculating = false;
            if (move) {
                overlay.showMove(formatMove(move));
            } else {
                overlay.setStatus('idle');
            }
        }, 0);
    }

    lastBoardState = boardState;
    lastTurn = boardState.turn;
});

// ─── Overlay UI ──────────────────────────────────────────────────────────────

function createOverlay() {
    const style = document.createElement('style');
    style.textContent = `
        .cmp-overlay {
            position: fixed;
            top: 14px;
            right: 14px;
            z-index: 2147483647;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(15, 23, 42, 0.92);
            border: 1px solid rgba(99, 102, 241, 0.5);
            border-radius: 999px;
            padding: 6px 14px 6px 10px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.5);
            user-select: none;
            cursor: grab;
            backdrop-filter: blur(4px);
            transition: border-color 0.3s;
        }
        .cmp-overlay.calculating { border-color: rgba(250, 204, 21, 0.6); }
        .cmp-overlay.detected    { border-color: rgba(34, 197, 94, 0.6); }

        .cmp-dot {
            width: 10px; height: 10px;
            border-radius: 50%;
            background: #6366f1;
            flex-shrink: 0;
            transition: background 0.3s;
        }
        .cmp-overlay.calculating .cmp-dot {
            background: #facc15;
            animation: cmp-pulse 0.8s infinite;
        }
        .cmp-overlay.detected .cmp-dot { background: #22c55e; }

        @keyframes cmp-pulse {
            0%,100% { transform: scale(1); opacity: 1; }
            50%      { transform: scale(1.3); opacity: 0.6; }
        }

        .cmp-label {
            font-family: monospace, ui-monospace, 'Courier New';
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.08em;
            color: #e2e8f0;
            min-width: 32px;
            text-align: center;
            text-transform: uppercase;
        }
        .cmp-overlay.calculating .cmp-label { color: #fbbf24; }
        .cmp-overlay.detected    .cmp-label { color: #86efac; }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.className = 'cmp-overlay';

    const dot = document.createElement('span');
    dot.className = 'cmp-dot';

    const label = document.createElement('span');
    label.className = 'cmp-label';
    label.textContent = '...';

    container.appendChild(dot);
    container.appendChild(label);
    document.body.appendChild(container);

    // Draggable
    let dragging = false, ox = 0, oy = 0, il = 0, it = 0;
    container.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        dragging = true;
        const r = container.getBoundingClientRect();
        ox = e.clientX; oy = e.clientY;
        il = r.left; it = r.top;
        container.style.right = 'auto';
        container.style.left = il + 'px';
        container.style.top  = it + 'px';
        container.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    container.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const nl = Math.max(0, Math.min(window.innerWidth  - container.offsetWidth,  il + e.clientX - ox));
        const nt = Math.max(0, Math.min(window.innerHeight - container.offsetHeight, it + e.clientY - oy));
        container.style.left = nl + 'px';
        container.style.top  = nt + 'px';
    });
    container.addEventListener('pointerup', (e) => {
        dragging = false;
        container.releasePointerCapture(e.pointerId);
    });

    return {
        showMove(text: string) {
            label.textContent = text || '?';
            container.className = 'cmp-overlay detected';
        },
        setStatus(s: 'idle' | 'calculating') {
            if (s === 'calculating') {
                label.textContent = '...';
                container.className = 'cmp-overlay calculating';
            } else {
                label.textContent = '-';
                container.className = 'cmp-overlay';
            }
        },
    };
}
