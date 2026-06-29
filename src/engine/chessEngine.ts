import { BoardState, ChessMove } from '../types';

export type Color = 'w' | 'b';
type Pieces = Record<string, string>;

const PIECE_VALUES: Record<string, number> = {
    P: 100, N: 320, B: 330, R: 500, Q: 900, K: 200000,
};

// Piece-square tables — white perspective, index 0 = a8, index 63 = h1
const PST: Record<string, number[]> = {
    P: [
         0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0,
    ],
    N: [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50,
    ],
    B: [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20,
    ],
    R: [
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         0,  0,  0,  5,  5,  0,  0,  0,
    ],
    Q: [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20,
    ],
    K: [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20,
    ],
};

function pstIndex(square: string, color: Color): number {
    const file = square.charCodeAt(0) - 97;
    const rank = parseInt(square[1]) - 1;
    const whiteIdx = (7 - rank) * 8 + file;
    return color === 'w' ? whiteIdx : 63 - whiteIdx;
}

export function evaluate(board: BoardState): number {
    let score = 0;
    for (const [sq, piece] of Object.entries(board.pieces)) {
        const color = piece[0] as Color;
        const type = piece[1];
        const base = PIECE_VALUES[type] ?? 0;
        const pos = PST[type]?.[pstIndex(sq, color)] ?? 0;
        score += color === 'w' ? base + pos : -(base + pos);
    }
    return score;
}

function sq(file: number, rank: number): string | null {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return String.fromCharCode(97 + file) + (rank + 1);
}

function coords(square: string): [number, number] {
    return [square.charCodeAt(0) - 97, parseInt(square[1]) - 1];
}

function slide(from: string, dirs: [number, number][], pieces: Pieces, color: Color): ChessMove[] {
    const moves: ChessMove[] = [];
    const [fx, fy] = coords(from);
    const enemy = color === 'w' ? 'b' : 'w';
    for (const [dx, dy] of dirs) {
        let x = fx + dx, y = fy + dy;
        while (true) {
            const to = sq(x, y);
            if (!to) break;
            const target = pieces[to];
            if (target) {
                if (target[0] === enemy) moves.push({ from, to, piece: pieces[from][1] });
                break;
            }
            moves.push({ from, to, piece: pieces[from][1] });
            x += dx; y += dy;
        }
    }
    return moves;
}

function pseudoMoves(from: string, pieces: Pieces): ChessMove[] {
    const piece = pieces[from];
    if (!piece) return [];
    const color = piece[0] as Color;
    const type = piece[1];
    const enemy = color === 'w' ? 'b' : 'w';
    const [fx, fy] = coords(from);
    const moves: ChessMove[] = [];

    const push = (to: string, promotion?: string) => {
        const t = pieces[to];
        if (!t || t[0] === enemy) moves.push({ from, to, piece: type, promotion });
    };

    switch (type) {
        case 'P': {
            const dir = color === 'w' ? 1 : -1;
            const start = color === 'w' ? 1 : 6;
            const prom = color === 'w' ? 7 : 0;
            const fwd = sq(fx, fy + dir);
            if (fwd && !pieces[fwd]) {
                if (fy + dir === prom) {
                    for (const p of ['Q', 'R', 'B', 'N']) moves.push({ from, to: fwd, piece: type, promotion: p });
                } else {
                    moves.push({ from, to: fwd, piece: type });
                    const fwd2 = sq(fx, fy + 2 * dir);
                    if (fy === start && fwd2 && !pieces[fwd2])
                        moves.push({ from, to: fwd2, piece: type });
                }
            }
            for (const df of [-1, 1]) {
                const cap = sq(fx + df, fy + dir);
                if (cap && pieces[cap]?.[0] === enemy) {
                    if (fy + dir === prom) {
                        for (const p of ['Q', 'R', 'B', 'N']) moves.push({ from, to: cap, piece: type, promotion: p });
                    } else {
                        moves.push({ from, to: cap, piece: type });
                    }
                }
            }
            break;
        }
        case 'N':
            for (const [dx, dy] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                const to = sq(fx + dx, fy + dy);
                if (to) push(to);
            }
            break;
        case 'B': return slide(from, [[-1,-1],[-1,1],[1,-1],[1,1]], pieces, color);
        case 'R': return slide(from, [[-1,0],[1,0],[0,-1],[0,1]], pieces, color);
        case 'Q': return slide(from, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], pieces, color);
        case 'K':
            for (const [dx, dy] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
                const to = sq(fx + dx, fy + dy);
                if (to) push(to);
            }
            break;
    }
    return moves;
}

function applyMove(board: BoardState, move: ChessMove): BoardState {
    const pieces = { ...board.pieces };
    const piece = pieces[move.from];
    delete pieces[move.from];
    pieces[move.to] = piece[0] + (move.promotion ?? move.piece);
    return { pieces, turn: board.turn === 'white' ? 'black' : 'white' };
}

function kingSquare(pieces: Pieces, color: Color): string | null {
    for (const [sq, p] of Object.entries(pieces)) {
        if (p === color + 'K') return sq;
    }
    return null;
}

function isAttacked(square: string, byColor: Color, pieces: Pieces): boolean {
    const enemy = byColor;
    const [tx, ty] = coords(square);

    // Pawn attacks
    const pawnDir = enemy === 'w' ? -1 : 1;
    for (const df of [-1, 1]) {
        const attSq = sq(tx + df, ty + pawnDir);
        if (attSq && pieces[attSq] === enemy + 'P') return true;
    }

    // Knight attacks
    for (const [dx, dy] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const attSq = sq(tx + dx, ty + dy);
        if (attSq && pieces[attSq] === enemy + 'N') return true;
    }

    // Bishop / queen diagonals
    for (const [dx, dy] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
        let x = tx + dx, y = ty + dy;
        while (true) {
            const s = sq(x, y);
            if (!s) break;
            const p = pieces[s];
            if (p) {
                if (p === enemy + 'B' || p === enemy + 'Q') return true;
                break;
            }
            x += dx; y += dy;
        }
    }

    // Rook / queen straights
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        let x = tx + dx, y = ty + dy;
        while (true) {
            const s = sq(x, y);
            if (!s) break;
            const p = pieces[s];
            if (p) {
                if (p === enemy + 'R' || p === enemy + 'Q') return true;
                break;
            }
            x += dx; y += dy;
        }
    }

    // King proximity
    for (const [dx, dy] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const s = sq(tx + dx, ty + dy);
        if (s && pieces[s] === enemy + 'K') return true;
    }

    return false;
}

function inCheck(board: BoardState, color: Color): boolean {
    const ks = kingSquare(board.pieces, color);
    if (!ks) return true;
    const enemy: Color = color === 'w' ? 'b' : 'w';
    return isAttacked(ks, enemy, board.pieces);
}

function legalMoves(board: BoardState, color: Color): ChessMove[] {
    const moves: ChessMove[] = [];
    for (const [square, piece] of Object.entries(board.pieces)) {
        if (piece[0] !== color) continue;
        for (const move of pseudoMoves(square, board.pieces)) {
            const next = applyMove(board, move);
            if (!inCheck(next, color)) moves.push(move);
        }
    }
    return moves;
}

const INF = 10000000;

function alphaBeta(board: BoardState, depth: number, alpha: number, beta: number, color: Color): number {
    if (depth === 0) return evaluate(board);

    const moves = legalMoves(board, color);
    if (moves.length === 0) {
        return inCheck(board, color) ? (color === 'w' ? -INF + depth : INF - depth) : 0;
    }

    const next: Color = color === 'w' ? 'b' : 'w';

    if (color === 'w') {
        let best = -INF;
        for (const m of moves) {
            best = Math.max(best, alphaBeta(applyMove(board, m), depth - 1, alpha, beta, next));
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = INF;
        for (const m of moves) {
            best = Math.min(best, alphaBeta(applyMove(board, m), depth - 1, alpha, beta, next));
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

export function getBestMove(board: BoardState, playerColor: Color, depth = 3): ChessMove | null {
    const moves = legalMoves(board, playerColor);
    if (moves.length === 0) return null;

    const enemy: Color = playerColor === 'w' ? 'b' : 'w';
    let bestMove: ChessMove | null = null;
    let bestScore = playerColor === 'w' ? -INF : INF;

    for (const m of moves) {
        const score = alphaBeta(applyMove(board, m), depth - 1, -INF, INF, enemy);
        if (playerColor === 'w' ? score > bestScore : score < bestScore) {
            bestScore = score;
            bestMove = m;
        }
    }

    return bestMove;
}

export function formatMove(move: ChessMove): string {
    const prefix = move.piece === 'P' ? '' : move.piece;
    const promo = move.promotion ? `=${move.promotion}` : '';
    return `${prefix}${move.to.toUpperCase()}${promo}`;
}

export function detectPlayerColor(): Color {
    // chess.com flips the board visually when playing as black
    const flipped = document.querySelector('.flipped, .board-flipped, [class*="flipped"]');
    return flipped ? 'b' : 'w';
}
