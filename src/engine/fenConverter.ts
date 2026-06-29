import { BoardState } from '../types';

export function boardStateToFEN(board: BoardState): string {
    let position = '';

    for (let rank = 8; rank >= 1; rank--) {
        let empty = 0;
        for (let fileCode = 97; fileCode <= 104; fileCode++) {
            const square = String.fromCharCode(fileCode) + rank;
            const piece = board.pieces[square];
            if (!piece) {
                empty++;
            } else {
                if (empty > 0) { position += empty; empty = 0; }
                const color = piece[0]; // 'w' or 'b'
                const type = piece[1]; // P N B R Q K
                position += color === 'w' ? type : type.toLowerCase();
            }
        }
        if (empty > 0) position += empty;
        if (rank > 1) position += '/';
    }

    const active = board.turn === 'white' ? 'w' : 'b';

    // Infer castling rights from king/rook positions
    let castling = '';
    if (board.pieces['e1'] === 'wK') {
        if (board.pieces['h1'] === 'wR') castling += 'K';
        if (board.pieces['a1'] === 'wR') castling += 'Q';
    }
    if (board.pieces['e8'] === 'bK') {
        if (board.pieces['h8'] === 'bR') castling += 'k';
        if (board.pieces['a8'] === 'bR') castling += 'q';
    }

    return `${position} ${active} ${castling || '-'} - 0 1`;
}

// Convert Stockfish move string ('e2e4', 'e7e8q') to display text given board pieces
export function formatStockfishMove(move: string, pieces: Record<string, string>): string {
    if (!move || move === '(none)') return '?';
    const from = move.slice(0, 2);
    const to   = move.slice(2, 4);
    const promo = move.length > 4 ? '=' + move[4].toUpperCase() : '';
    const piece = pieces[from];
    const type  = piece ? piece[1] : 'P';
    const prefix = type === 'P' ? '' : type;
    return `${prefix}${to.toUpperCase()}${promo}`;
}
