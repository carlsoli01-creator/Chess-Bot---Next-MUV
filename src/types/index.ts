export interface ChessMove {
    piece: string;
    from: string;
    to: string;
    promotion?: string; // Optional, for pawn promotion
}

export interface BoardState {
    pieces: { [key: string]: string }; // Maps positions to piece types (e.g., 'e4': 'wP')
    turn: 'white' | 'black';
}

export interface Player {
    name: string;
    eloRating: number;
}

export interface MovePrediction {
    move: ChessMove;
    probability: number; // Probability of the move being played
}