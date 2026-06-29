import { BoardState } from '../types';

class BoardObserver {
    private boardElement: HTMLElement | null;
    private observers: Array<(boardState: BoardState) => void>;
    private scanIntervalId: number | null;
    private pendingUpdate: boolean;
    private cachedSquareElements: HTMLElement[];

    constructor() {
        this.boardElement = document.querySelector('.board, .board__board, .board-wrap, .board-view');
        this.observers = [];
        this.scanIntervalId = null;
        this.pendingUpdate = false;
        this.cachedSquareElements = [];
        this.init();
    }

    private init() {
        if (this.boardElement) {
            const observer = new MutationObserver(this.handleBoardChange.bind(this));
            observer.observe(this.boardElement, { childList: true, subtree: true });
            this.refreshSquareCache();
            this.scanIntervalId = window.setInterval(() => this.handleBoardChange(), 1500);
        }
    }

    private handleBoardChange() {
        this.scheduleUpdate();
    }

    public onBoardChange(observer: (boardState: BoardState) => void) {
        this.observers.push(observer);
        observer(this.getBoardState());
    }

    private notifyObservers() {
        const boardState = this.getBoardState();
        this.observers.forEach(observer => observer(boardState));
    }

    private scheduleUpdate() {
        if (this.pendingUpdate) {
            return;
        }
        this.pendingUpdate = true;
        window.requestAnimationFrame(() => {
            this.pendingUpdate = false;
            this.refreshSquareCache();
            this.notifyObservers();
        });
    }

    public getBoardState(): BoardState {
        return {
            pieces: this.extractBoardPieces(),
            turn: this.extractTurn(),
        };
    }

    private extractBoardPieces(): { [key: string]: string } {
        const pieces: { [key: string]: string } = {};

        if (!this.boardElement) {
            return pieces;
        }

        if (!this.cachedSquareElements.length) {
            this.refreshSquareCache();
        }

        this.cachedSquareElements.forEach((squareEl) => {
            const square = this.getSquareName(squareEl);
            if (!square) {
                return;
            }

            const pieceElement = this.findPieceElement(squareEl);
            if (!pieceElement) {
                return;
            }

            const piece = this.parsePiece(pieceElement);
            if (piece) {
                pieces[square] = piece;
            }
        });

        return pieces;
    }

    private getSquareName(squareEl: HTMLElement): string | null {
        const dataSquare = squareEl.getAttribute('data-square');
        if (dataSquare && /^[a-h][1-8]$/i.test(dataSquare.trim())) {
            return dataSquare.trim().toLowerCase();
        }

        const classMatch = squareEl.className.match(/\b([a-h][1-8])\b/i);
        if (classMatch) {
            return classMatch[1].toLowerCase();
        }

        const dataSquareAttribute = squareEl.getAttribute('data-square-name');
        if (dataSquareAttribute && /^[a-h][1-8]$/i.test(dataSquareAttribute.trim())) {
            return dataSquareAttribute.trim().toLowerCase();
        }

        return null;
    }

    private refreshSquareCache() {
        if (!this.boardElement) {
            this.cachedSquareElements = [];
            return;
        }

        this.cachedSquareElements = Array.from(
            this.boardElement.querySelectorAll<HTMLElement>('[data-square], [data-square-name], .square, .board-cell, .board-square')
        );
    }

    private findPieceElement(squareEl: HTMLElement): HTMLElement | null {
        return squareEl.querySelector<HTMLElement>(
            '.piece, [data-piece], [class*="piece"], [class*="pawn"], [class*="knight"], [class*="bishop"], [class*="rook"], [class*="queen"], [class*="king"]'
        );
    }

    private parsePiece(pieceEl: HTMLElement): string | null {
        const classes = Array.from(pieceEl.classList).map((c) => c.toLowerCase());
        const textAttr = pieceEl.getAttribute('data-piece')?.toLowerCase() ?? '';
        const combined = [...classes, textAttr].join(' ');

        const color = combined.includes('white') || combined.includes('w-') || combined.includes(' w ') ? 'w' : combined.includes('black') || combined.includes('b-') || combined.includes(' b ') ? 'b' : '';

        const typeMap: { [key: string]: string } = {
            king: 'K',
            queen: 'Q',
            rook: 'R',
            bishop: 'B',
            knight: 'N',
            pawn: 'P',
            k: 'K',
            q: 'Q',
            r: 'R',
            b: 'B',
            n: 'N',
            p: 'P',
        };

        for (const token of combined.split(/\s+/)) {
            if (token in typeMap) {
                return `${color}${typeMap[token]}`;
            }
        }

        const normalized = textAttr.replace(/[^a-z0-9]/g, '').replace('white', 'w').replace('black', 'b');
        if (/^[wb][kqrbnp]$/i.test(normalized)) {
            return normalized.toLowerCase();
        }

        return null;
    }

    private extractTurn(): 'white' | 'black' {
        const blackTurnSelectors = ['.flipped', '.board-flipped', '.black-to-move', '.black-turn'];
        for (const selector of blackTurnSelectors) {
            if (document.querySelector(selector)) {
                return 'black';
            }
        }

        return 'white';
    }
}

export default BoardObserver;
