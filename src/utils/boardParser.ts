import { BoardState } from '../types';

const pieceMap: { [key: string]: string } = {
    K: 'wK',
    Q: 'wQ',
    R: 'wR',
    B: 'wB',
    N: 'wN',
    P: 'wP',
    k: 'bK',
    q: 'bQ',
    r: 'bR',
    b: 'bB',
    n: 'bN',
    p: 'bP',
};

export function scanBoardText(text: string): BoardState {
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error('Board text is empty');
    }

    const fenPattern = /^([1-8KQRBNPkqrbnp]+\/[1-8KQRBNPkqrbnp]+\/[1-8KQRBNPkqrbnp]+\/[1-8KQRBNPkqrbnp]+\/[1-8KQRBNPkqrbnp]+\/[1-8KQRBNPkqrbnp]+\/[1-8KQRBNPkqrbnp]+\/[1-8KQRBNPkqrbnp]+)(\s+[wb]\s+[-KQRBNPkmqrbnp]+\s+[-\w]*)?/;
    const fenMatch = trimmed.match(fenPattern);
    if (fenMatch) {
        return parseFEN(trimmed);
    }

    return parseAsciiBoard(trimmed);
}

function parseFEN(fen: string): BoardState {
    const parts = fen.split(/\s+/);
    const rows = parts[0].split('/');
    if (rows.length !== 8) {
        throw new Error('Invalid FEN board layout');
    }

    const pieces: { [key: string]: string } = {};
    let rank = 8;

    rows.forEach((row) => {
        let file = 97;
        for (const char of row) {
            if (/[1-8]/.test(char)) {
                file += Number(char);
                continue;
            }

            const square = `${String.fromCharCode(file)}${rank}`;
            const piece = pieceMap[char];
            if (!piece) {
                throw new Error(`Invalid FEN piece character: ${char}`);
            }
            pieces[square] = piece;
            file += 1;
        }
        rank -= 1;
    });

    const turn = parts[1] === 'b' ? 'black' : 'white';
    return { pieces, turn };
}

function parseAsciiBoard(text: string): BoardState {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !/^\+[-+]+\+$/.test(line));

    const boardLines = lines.filter((line) => /[KQRBNPkrqnbp1-8]/.test(line));
    if (boardLines.length < 8) {
        throw new Error('Invalid ASCII board input');
    }

    const pieces: { [key: string]: string } = {};
    let rank = 8;

    boardLines.slice(0, 8).forEach((line) => {
        const cleaned = line.replace(/[^KQRBNPkrqnbp1-8\s]/g, '').replace(/\s+/g, ' ').trim();
        const tokens = cleaned.split(' ');
        let file = 97;

        tokens.forEach((token) => {
            if (!token) {
                return;
            }
            if (/^[1-8]$/.test(token)) {
                file += Number(token);
                return;
            }
            if (token.length === 1 && pieceMap[token]) {
                const square = `${String.fromCharCode(file)}${rank}`;
                pieces[square] = pieceMap[token];
                file += 1;
                return;
            }

            for (const char of token) {
                if (/^[1-8]$/.test(char)) {
                    file += Number(char);
                    continue;
                }
                if (pieceMap[char]) {
                    const square = `${String.fromCharCode(file)}${rank}`;
                    pieces[square] = pieceMap[char];
                    file += 1;
                    continue;
                }
                throw new Error(`Invalid board character: ${char}`);
            }
        });

        rank -= 1;
    });

    return { pieces, turn: 'white' };
}
