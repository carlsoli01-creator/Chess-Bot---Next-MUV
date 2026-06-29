import { MoveEstimator } from '../models/moveEstimator';
import { EloModel } from '../models/eloModel';
import { ChessMove, BoardState } from '../types';

chrome.runtime.onInstalled.addListener(() => {
    console.log('Chess Move Predictor Extension Installed');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'PREDICTED_MOVE') {
        const { boardState, predictedMove, playerElo, estimatedAccuracy, accuracyDescription } = message as {
            boardState: BoardState;
            predictedMove?: ChessMove;
            playerElo: number;
            estimatedAccuracy?: number;
            accuracyDescription?: string;
        };

        const eloModel = new EloModel(playerElo);
        const moveEstimator = new MoveEstimator(playerElo);
        const move = predictedMove ?? moveEstimator.estimateMove(boardState || { pieces: {}, turn: 'white' }, playerElo);
        const accuracy = estimatedAccuracy ?? eloModel.getEstimatedAccuracy();
        const accuracyDesc = accuracyDescription ?? eloModel.getAccuracyDescription();

        console.log('Predicted move:', move.piece, 'from', move.from, 'to', move.to);
        console.log('Player Elo:', playerElo);
        console.log('Estimated accuracy %:', accuracy);
        console.log('Accuracy description:', accuracyDesc);
    }
});
