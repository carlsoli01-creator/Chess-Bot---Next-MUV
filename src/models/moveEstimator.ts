import { BoardState, ChessMove } from '../types';

export type EloBucket = 'below_800' | '800_1100' | '1100_1400' | '1400_1700' | '1700_2000' | '2000_plus';

type MoveProbabilities = { [move: string]: number };
type PositionDatabase = { [positionKey: string]: { [bucket in EloBucket]?: MoveProbabilities } };

const eloMoveDatabase: PositionDatabase = {
    start: {
        below_800: {
            e4: 0.40,
            d4: 0.20,
            d3: 0.14,
            Nf3: 0.12,
            g3: 0.07,
            c4: 0.07,
        },
        '800_1100': {
            e4: 0.45,
            d4: 0.25,
            Nf3: 0.13,
            c4: 0.10,
            g3: 0.05,
            d3: 0.02,
        },
        '1100_1400': {
            e4: 0.42,
            d4: 0.27,
            Nf3: 0.14,
            c4: 0.10,
            g3: 0.05,
            b3: 0.02,
        },
        '1400_1700': {
            e4: 0.38,
            d4: 0.28,
            Nf3: 0.18,
            c4: 0.09,
            g3: 0.05,
            b3: 0.02,
        },
        '1700_2000': {
            e4: 0.34,
            d4: 0.26,
            Nf3: 0.20,
            c4: 0.11,
            g3: 0.06,
            b3: 0.03,
        },
        '2000_plus': {
            e4: 0.30,
            d4: 0.24,
            Nf3: 0.24,
            c4: 0.12,
            g3: 0.06,
            b3: 0.04,
        },
    },
    'midgame-example': {
        below_800: {
            e5: 0.32,
            Nf3: 0.26,
            d4: 0.18,
            g3: 0.12,
            c4: 0.08,
            h3: 0.04,
        },
        '1100_1400': {
            e5: 0.28,
            Nf3: 0.24,
            d4: 0.18,
            c4: 0.14,
            g3: 0.10,
            Nb3: 0.06,
        },
    },
};

const defaultMoveSets: { [bucket in EloBucket]: MoveProbabilities } = {
    below_800: {
        e4: 0.37,
        d4: 0.22,
        d3: 0.15,
        Nf3: 0.12,
        c4: 0.08,
        g3: 0.06,
    },
    '800_1100': {
        e4: 0.41,
        d4: 0.24,
        Nf3: 0.14,
        c4: 0.11,
        g3: 0.06,
        b3: 0.04,
    },
    '1100_1400': {
        e4: 0.39,
        d4: 0.26,
        Nf3: 0.15,
        c4: 0.11,
        g3: 0.05,
        b3: 0.04,
    },
    '1400_1700': {
        e4: 0.35,
        d4: 0.27,
        Nf3: 0.18,
        c4: 0.12,
        g3: 0.05,
        b3: 0.03,
    },
    '1700_2000': {
        e4: 0.33,
        d4: 0.26,
        Nf3: 0.20,
        c4: 0.13,
        g3: 0.05,
        b3: 0.03,
    },
    '2000_plus': {
        e4: 0.30,
        d4: 0.25,
        Nf3: 0.22,
        c4: 0.13,
        g3: 0.06,
        b3: 0.04,
    },
};

const algebraicFromMap: { [move: string]: { white: string; black: string } } = {
    e4: { white: 'e2', black: 'e7' },
    d4: { white: 'd2', black: 'd7' },
    c4: { white: 'c2', black: 'c7' },
    e5: { white: 'e4', black: 'e7' },
    d5: { white: 'd4', black: 'd7' },
    Nf3: { white: 'g1', black: 'g8' },
    Nc3: { white: 'b1', black: 'b8' },
    Nf6: { white: 'g8', black: 'g8' },
    Nb3: { white: 'b1', black: 'b8' },
    g3: { white: 'g2', black: 'g7' },
    h3: { white: 'h2', black: 'h7' },
};

export class MoveEstimator {
    private eloRating: number;

    constructor(eloRating: number = 1500) {
        this.eloRating = eloRating;
    }

    public estimateMove(boardState: BoardState, eloRating?: number): ChessMove {
        const rating = eloRating ?? this.eloRating;
        const bucket = MoveEstimator.getEloBucket(rating);
        const positionKey = this.getPositionKey(boardState);
        const knownPosition = eloMoveDatabase[positionKey];
        const moveProbabilities = knownPosition?.[bucket] ?? defaultMoveSets[bucket];
        const algebraic = this.getTopAlgebraicMove(moveProbabilities);

        return this.createMoveObject(algebraic, boardState);
    }

    public getPredictedMoves(eloRating: number = this.eloRating, boardState: BoardState = { pieces: {}, turn: 'white' }, limit: number = 5): string[] {
        const bucket = MoveEstimator.getEloBucket(eloRating);
        const positionKey = this.getPositionKey(boardState);
        const knownPosition = eloMoveDatabase[positionKey];
        const moveProbabilities = knownPosition?.[bucket] ?? defaultMoveSets[bucket];

        return Object.entries(moveProbabilities)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([move]) => move);
    }

    public getEloDescription(rating: number = this.eloRating): string {
        if (rating < 800) {
            return 'beginner / slightly below average';
        }
        if (rating < 1100) {
            return 'developing player / below average';
        }
        if (rating < 1400) {
            return 'club player / average';
        }
        if (rating < 1700) {
            return 'strong club player / above average';
        }
        if (rating < 2000) {
            return 'expert / advanced';
        }
        return 'master and up';
    }

    private createMoveObject(algebraic: string, boardState: BoardState): ChessMove {
        const destinationMatch = algebraic.match(/([a-h][1-8])$/i);
        const destination = destinationMatch ? destinationMatch[1].toLowerCase() : 'e4';
        const promotionMatch = algebraic.match(/=([QRBNqrbn])/);
        const promotion = promotionMatch ? promotionMatch[1].toUpperCase() : undefined;
        const piece = /^[KQRBN]/.test(algebraic) ? algebraic[0] : 'P';
        const from = this.resolveFromSquare(piece, destination, algebraic, boardState);

        return {
            from,
            to: destination,
            promotion,
            piece,
        };
    }

    private resolveFromSquare(piece: string, destination: string, algebraic: string, boardState: BoardState): string {
        const candidates = this.findCandidateSources(piece, destination, boardState);
        if (candidates.length > 0) {
            return candidates[0];
        }

        const fallback = algebraicFromMap[algebraic];
        if (fallback) {
            return boardState.turn === 'black' ? fallback.black : fallback.white;
        }

        return '';
    }

    private findCandidateSources(piece: string, destination: string, boardState: BoardState): string[] {
        const color = boardState.turn === 'black' ? 'b' : 'w';
        const targetColor = boardState.pieces[destination]?.[0];

        return Object.entries(boardState.pieces)
            .filter(([from, pieceCode]) => pieceCode === `${color}${piece}`)
            .filter(([from]) => this.canReach(piece, from, destination, boardState, color))
            .map(([from]) => from);
    }

    private canReach(piece: string, from: string, to: string, boardState: BoardState, color: string): boolean {
        if (from === to) {
            return false;
        }

        const [fx, fy] = this.squareToCoords(from);
        const [tx, ty] = this.squareToCoords(to);
        const dx = tx - fx;
        const dy = ty - fy;

        switch (piece) {
            case 'P':
                return this.canPawnMove(from, to, boardState, color);
            case 'N':
                return (Math.abs(dx) === 1 && Math.abs(dy) === 2) || (Math.abs(dx) === 2 && Math.abs(dy) === 1);
            case 'B':
                return Math.abs(dx) === Math.abs(dy) && this.isPathClear(from, to, boardState);
            case 'R':
                return (dx === 0 || dy === 0) && this.isPathClear(from, to, boardState);
            case 'Q':
                return ((dx === 0 || dy === 0) || Math.abs(dx) === Math.abs(dy)) && this.isPathClear(from, to, boardState);
            case 'K':
                return Math.max(Math.abs(dx), Math.abs(dy)) === 1;
            default:
                return false;
        }
    }

    private canPawnMove(from: string, to: string, boardState: BoardState, color: string): boolean {
        const [fx, fy] = this.squareToCoords(from);
        const [tx, ty] = this.squareToCoords(to);
        const direction = color === 'w' ? 1 : -1;
        const rankDifference = ty - fy;
        const fileDifference = tx - fx;

        if (fileDifference === 0 && rankDifference === direction) {
            return !boardState.pieces[to];
        }

        if (fileDifference === 0 && rankDifference === 2 * direction) {
            const startingRank = color === 'w' ? 1 : 6;
            const intermediate = this.coordsToSquare([fx, fy + direction]);
            return fy === startingRank && !boardState.pieces[to] && !boardState.pieces[intermediate];
        }

        if (Math.abs(fileDifference) === 1 && rankDifference === direction) {
            return !!boardState.pieces[to] && boardState.pieces[to][0] !== color;
        }

        return false;
    }

    private isPathClear(from: string, to: string, boardState: BoardState): boolean {
        const [fx, fy] = this.squareToCoords(from);
        const [tx, ty] = this.squareToCoords(to);
        const dx = Math.sign(tx - fx);
        const dy = Math.sign(ty - fy);
        let x = fx + dx;
        let y = fy + dy;

        while (x !== tx || y !== ty) {
            const square = this.coordsToSquare([x, y]);
            if (boardState.pieces[square]) {
                return false;
            }
            x += dx;
            y += dy;
        }

        return true;
    }

    private squareToCoords(square: string): [number, number] {
        return [square.charCodeAt(0) - 97, Number(square[1]) - 1];
    }

    private coordsToSquare(coords: [number, number]): string {
        return String.fromCharCode(97 + coords[0]) + (coords[1] + 1);
    }

    private getTopAlgebraicMove(moveProbabilities: MoveProbabilities): string {
        return Object.entries(moveProbabilities)
            .sort((a, b) => b[1] - a[1])
            .map(([move]) => move)[0] || 'e4';
    }

    private getPositionKey(boardState: BoardState): string {
        const positions = Object.entries(boardState.pieces)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([square, piece]) => `${square}:${piece}`)
            .join('|');

        if (!positions) {
            return 'start';
        }

        return positions;
    }

    private static getEloBucket(rating: number): EloBucket {
        if (rating < 800) return 'below_800';
        if (rating < 1100) return '800_1100';
        if (rating < 1400) return '1100_1400';
        if (rating < 1700) return '1400_1700';
        if (rating < 2000) return '1700_2000';
        return '2000_plus';
    }
}

export async function getPredictedMoves(eloRating: number, boardState: BoardState = { pieces: {}, turn: 'white' }): Promise<string[]> {
    const estimator = new MoveEstimator(eloRating);
    return estimator.getPredictedMoves(eloRating, boardState);
}
