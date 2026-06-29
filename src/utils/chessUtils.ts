export function isValidMove(move: string, board: string[][]): boolean {
    // Implement move validation logic based on the current board state
    // This is a placeholder for the actual validation logic
    return true; // Assume the move is valid for now
}

export function getBoardRepresentation(board: string[][]): string {
    // Convert the board state into a string representation for easier processing
    return board.map(row => row.join(' ')).join('\n');
}

export function calculatePossibleMoves(position: string[][], piece: string, currentPosition: [number, number]): string[] {
    // Implement logic to calculate possible moves for a given piece
    // This is a placeholder for the actual move calculation logic
    return []; // Return an empty array for now
}

export function sendMessageToBackground(message: any): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(message);
    }
}
