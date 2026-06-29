// Approximate Elo-to-accuracy mapping. This is illustrative only and not an official
// chess.com accuracy formula; actual accuracy varies by position complexity, time control,
// and analysis engine.
export class EloModel {
    private eloRating: number;

    private static readonly eloAccuracyMap: { maxElo: number; accuracy: number; description: string }[] = [
        { maxElo: 100, accuracy: 25, description: 'Random legal moves, hangs pieces constantly' },
        { maxElo: 200, accuracy: 30, description: 'Occasionally captures free pieces, still blunders often' },
        { maxElo: 300, accuracy: 35, description: 'Recognizes basic threats sometimes, frequent blunders' },
        { maxElo: 400, accuracy: 38, description: 'Avoids the most obvious one-move blunders occasionally' },
        { maxElo: 500, accuracy: 41, description: 'Basic piece values understood, tactical blindness' },
        { maxElo: 600, accuracy: 44, description: 'Starts noticing simple forks/pins after they happen' },
        { maxElo: 700, accuracy: 47, description: 'Develops pieces somewhat sensibly, still loses material often' },
        { maxElo: 800, accuracy: 50, description: 'Basic opening moves memorized, no real strategy' },
        { maxElo: 900, accuracy: 52, description: 'Occasional one-move tactics spotted' },
        { maxElo: 1000, accuracy: 55, description: 'Beginner club level; safe-ish opening, midgame falls apart' },
        { maxElo: 1100, accuracy: 57, description: 'Some awareness of king safety' },
        { maxElo: 1200, accuracy: 59, description: 'Recognizes most simple tactics in isolation' },
        { maxElo: 1300, accuracy: 61, description: 'Basic endgame technique (king+pawn)' },
        { maxElo: 1400, accuracy: 63, description: 'Reasonable opening principles, occasional planning' },
        { maxElo: 1500, accuracy: 65, description: 'Solid club player; spots 2-move tactics' },
        { maxElo: 1600, accuracy: 67, description: 'Decent positional sense starting to form' },
        { maxElo: 1700, accuracy: 69, description: 'Calculates 2-3 moves ahead reliably' },
        { maxElo: 1800, accuracy: 71, description: 'Good tactical awareness, fewer outright blunders' },
        { maxElo: 1900, accuracy: 73, description: 'Understands pawn structure basics' },
        { maxElo: 2000, accuracy: 75, description: 'Strong club/expert level; consistent, few blunders' },
        { maxElo: 2100, accuracy: 77, description: 'Good positional understanding, calculates accurately' },
        { maxElo: 2200, accuracy: 79, description: 'National master level; rarely misses tactics' },
        { maxElo: 2300, accuracy: 81, description: 'Strong calculation, deep opening prep' },
        { maxElo: 2400, accuracy: 83, description: 'FIDE master level; very few inaccuracies' },
        { maxElo: 2500, accuracy: 85, description: 'International master level' },
        { maxElo: 2600, accuracy: 87, description: 'Grandmaster level; near-optimal in most positions' },
        { maxElo: 2700, accuracy: 89, description: 'Elite GM; top 50 in world' },
        { maxElo: 2800, accuracy: 91, description: 'World championship contender level' },
        { maxElo: 2900, accuracy: 93, description: 'Beyond any human ever recorded (theoretical)' },
        { maxElo: 3000, accuracy: 94.5, description: 'Early-generation engine level' },
        { maxElo: 3100, accuracy: 95.5, description: 'Strong engine territory' },
        { maxElo: 3200, accuracy: 96.5, description: 'Modern strong engine' },
        { maxElo: 3300, accuracy: 97, description: 'Top-tier engine (depth-limited)' },
        { maxElo: 3400, accuracy: 97.5, description: 'Near-optimal engine play' },
        { maxElo: 3500, accuracy: 98, description: 'Stockfish-tier (high depth)' },
        { maxElo: 3600, accuracy: 98.5, description: 'Best known engine performance ceiling' },
        { maxElo: 3700, accuracy: 99, description: 'Speculative — beyond confirmed engine strength' },
        { maxElo: 3800, accuracy: 99.3, description: 'Purely theoretical' },
        { maxElo: 3900, accuracy: 99.6, description: 'Purely theoretical' },
        { maxElo: 4000, accuracy: 99.9, description: 'Effectively perfect/solved-position play (theoretical)' },
    ];

    constructor(eloRating: number = 1500) {
        this.eloRating = eloRating;
    }

    public getCategory(): string {
        if (this.eloRating < 800) {
            return 'below average';
        }
        if (this.eloRating < 1100) {
            return 'slightly below average';
        }
        if (this.eloRating < 1400) {
            return 'average';
        }
        if (this.eloRating < 1700) {
            return 'above average';
        }
        if (this.eloRating < 2000) {
            return 'strong';
        }
        return 'expert';
    }

    public getEstimatedAccuracy(): number {
        const entry = EloModel.eloAccuracyMap.find((item) => this.eloRating <= item.maxElo);
        return entry ? entry.accuracy : 99.9;
    }

    public getAccuracyDescription(): string {
        const entry = EloModel.eloAccuracyMap.find((item) => this.eloRating <= item.maxElo);
        return entry ? entry.description : 'Effectively perfect/solved-position play (theoretical)';
    }

    public calculateProbability(move: string, eloRating: number = this.eloRating): number {
        const skillWeight = Math.min(Math.max((eloRating - 400) / 1600, 0), 1);
        const moveQuality = this.getMoveQualityFactor(move);
        const probability = 0.35 + skillWeight * 0.45 + moveQuality * 0.20;
        return Math.min(Math.max(probability, 0.01), 0.99);
    }

    private getMoveQualityFactor(move: string): number {
        if (!move) {
            return 0.1;
        }
        if (move.startsWith('e') || move.startsWith('d')) {
            return 0.9;
        }
        if (move.startsWith('N') || move.startsWith('B') || move.startsWith('c')) {
            return 0.75;
        }
        return 0.55;
    }
}
