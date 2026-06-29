// contentScript.ts
import BoardObserver from './boardObserver';
import { MoveEstimator } from '../models/moveEstimator';
import { sendMessageToBackground } from '../utils/chessUtils';
import { BoardState, ChessMove } from '../types';

const boardObserver = new BoardObserver();
const scanOverlay = createScanOverlay();

let lastBoardState: BoardState | null = null;
let lastTurn: 'white' | 'black' | null = null;
let predictionVisible = false;
let awaitingPlayerMove = false;

boardObserver.onBoardChange((boardState: BoardState) => {
    const playerElo = getPlayerElo();
    const moveEstimator = new MoveEstimator(playerElo);
    const predictedMove: ChessMove = moveEstimator.estimateMove(boardState);

    sendMessageToBackground({
        type: 'PREDICTED_MOVE',
        boardState,
        predictedMove,
        playerElo,
    });

    updateScanOverlay(boardState, predictedMove);
});

function updateScanOverlay(boardState: BoardState, predictedMove: ChessMove) {
    if (!scanOverlay) {
        return;
    }

    const boardChanged = !lastBoardState || !areBoardStatesEqual(lastBoardState, boardState);
    const turnChanged = lastTurn !== null && lastTurn !== boardState.turn;

    if (!lastBoardState) {
        scanOverlay.setText(formatMoveText(predictedMove));
        predictionVisible = true;
        awaitingPlayerMove = false;
    } else if (boardChanged || turnChanged) {
        if (predictionVisible) {
            scanOverlay.clearText();
            predictionVisible = false;
            awaitingPlayerMove = true;
        } else if (awaitingPlayerMove) {
            scanOverlay.setText(formatMoveText(predictedMove));
            predictionVisible = true;
            awaitingPlayerMove = false;
        }
    }

    lastBoardState = boardState;
    lastTurn = boardState.turn;
}

function areBoardStatesEqual(a: BoardState, b: BoardState) {
    if (a.turn !== b.turn) {
        return false;
    }

    const aKeys = Object.keys(a.pieces).sort();
    const bKeys = Object.keys(b.pieces).sort();
    if (aKeys.length !== bKeys.length) {
        return false;
    }

    for (let i = 0; i < aKeys.length; i += 1) {
        if (aKeys[i] !== bKeys[i]) {
            return false;
        }
        if (a.pieces[aKeys[i]] !== b.pieces[bKeys[i]]) {
            return false;
        }
    }

    return true;
}

function formatMoveText(move: ChessMove) {
    const pieceType = move.piece.replace(/^[wb]/i, '');
    const destination = move.to.toUpperCase();
    const promotion = move.promotion ? move.promotion.toUpperCase() : '';

    const rawText = pieceType === 'P' ? `${destination}${promotion}` : `${pieceType}${destination}${promotion}`;
    return rawText.length <= 3 ? rawText : rawText.slice(0, 3);
}

function createScanOverlay() {
    const container = document.createElement('div');
    const button = document.createElement('div');
    const screen = document.createElement('div');
    const style = document.createElement('style');

    style.textContent = `
        .cmp-scan-overlay {
            position: fixed;
            top: 12px;
            right: 12px;
            z-index: 999999999;
            display: flex;
            align-items: center;
            background: transparent;
            border-radius: 999px;
            pointer-events: auto;
            user-select: none;
            box-shadow: 0 8px 30px rgba(0,0,0,0.25);
        }

        .cmp-scan-button {
            width: 18px;
            height: 18px;
            background: #d12d2d;
            border-radius: 50%;
            box-shadow: 0 0 0 rgba(209, 45, 45, 0.7);
            animation: cmp-blink 1.2s infinite ease-in-out;
            margin-right: 8px;
            border: 1px solid rgba(255,255,255,0.35);
        }

        @keyframes cmp-blink {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(209,45,45,0.7); }
            50% { transform: scale(1.15); box-shadow: 0 0 10px 6px rgba(209,45,45,0.2); }
        }

        .cmp-move-screen {
            min-width: 40px;
            min-height: 24px;
            padding: 4px 8px;
            background: rgba(255,255,255,0.95);
            color: #111;
            font-family: monospace, ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo;
            font-size: 14px;
            letter-spacing: 0.04em;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-transform: uppercase;
            pointer-events: none;
        }

        .cmp-scan-overlay.dragging {
            opacity: 0.88;
        }
    `;

    container.className = 'cmp-scan-overlay';
    button.className = 'cmp-scan-button';
    screen.className = 'cmp-move-screen';
    screen.textContent = '...';

    container.appendChild(button);
    container.appendChild(screen);
    document.body.appendChild(container);
    document.head.appendChild(style);

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    container.style.left = 'auto';
    container.style.top = '12px';
    container.style.right = '12px';

    container.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) {
            return;
        }

        isDragging = true;
        container.classList.add('dragging');
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        const rect = container.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        container.setPointerCapture(event.pointerId);
        event.preventDefault();
    });

    container.addEventListener('pointermove', (event) => {
        if (!isDragging) {
            return;
        }

        const deltaX = event.clientX - dragStartX;
        const deltaY = event.clientY - dragStartY;
        const nextLeft = Math.max(0, Math.min(window.innerWidth - container.offsetWidth, initialLeft + deltaX));
        const nextTop = Math.max(0, Math.min(window.innerHeight - container.offsetHeight, initialTop + deltaY));
        container.style.left = `${nextLeft}px`;
        container.style.top = `${nextTop}px`;
        container.style.right = 'auto';
    });

    container.addEventListener('pointerup', (event) => {
        if (!isDragging) {
            return;
        }

        isDragging = false;
        container.classList.remove('dragging');
        container.releasePointerCapture(event.pointerId);
    });

    return {
        setText(text: string) {
            screen.textContent = text || '';
        },
        clearText() {
            screen.textContent = '';
        },
    };
}

function getPlayerElo(): number {
    const topEloSelectors = [
        '.user-elo',
        '.player-elo',
        '.rating',
        '.game-player-elo',
        '.player-rating',
        '.top-user-elo',
        '.top-player-rating',
        '.header-elo',
        '.profile-elo',
    ];

    for (const selector of topEloSelectors) {
        const eloElement = document.querySelector<HTMLElement>(selector);
        const eloText = eloElement?.textContent?.trim();
        if (eloText) {
            const parsed = Number(eloText.replace(/[^\d]/g, ''));
            if (!Number.isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }

    const topSection = document.querySelector<HTMLElement>('header, .top-bar, .top-section, .top-content');
    if (topSection) {
        const topText = topSection.textContent?.trim();
        if (topText) {
            const parsed = Number(topText.replace(/[^\d]/g, ''));
            if (!Number.isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }
    }

    return 1500;
}
