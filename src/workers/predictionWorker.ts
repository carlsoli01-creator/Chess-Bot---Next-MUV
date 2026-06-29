import { MoveEstimator } from '../models/moveEstimator';
import { EloModel } from '../models/eloModel';

self.onmessage = (event) => {
    const { boardState, eloRating } = event.data;

    const moveEstimator = new MoveEstimator(eloRating);
    const eloModel = new EloModel(eloRating);

    const predictedMove = moveEstimator.estimateMove(boardState);
    const moveProbability = eloModel.calculateProbability(predictedMove.to);
    const eloCategory = eloModel.getCategory();

    self.postMessage({ predictedMove, moveProbability, eloCategory });
};
