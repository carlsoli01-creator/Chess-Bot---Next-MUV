import { BoardState } from '../types';

export async function requestCameraAccess(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
}

export interface DetectionResult {
    detected: boolean;
    confidence: number;
}

export function detectChessboardInFrame(video: HTMLVideoElement): DetectionResult {
    const W = 128;
    const H = 128;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { detected: false, confidence: 0 };

    ctx.drawImage(video, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);

    const brightness = (x: number, y: number): number => {
        const i = (y * W + x) * 4;
        return (data[i] + data[i + 1] + data[i + 2]) / 3;
    };

    let bestScore = 0;
    const sizes = [48, 64, 80, 96, 112, 124];

    for (const size of sizes) {
        const cell = size / 8;
        const maxStart = W - size;
        const step = Math.max(4, Math.floor(maxStart / 5));

        for (let sy = 0; sy <= maxStart; sy += step) {
            for (let sx = 0; sx <= maxStart; sx += step) {
                let score = 0;
                let total = 0;

                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 7; col++) {
                        const x1 = Math.floor(sx + (col + 0.5) * cell);
                        const x2 = Math.floor(sx + (col + 1.5) * cell);
                        const y = Math.floor(sy + (row + 0.5) * cell);
                        if (x2 >= W || y >= H) continue;
                        if (Math.abs(brightness(x1, y) - brightness(x2, y)) > 25) score++;
                        total++;
                    }
                    for (let col = 0; col < 8; col++) {
                        const x = Math.floor(sx + (col + 0.5) * cell);
                        const y1 = Math.floor(sy + (row + 0.5) * cell);
                        const y2 = Math.floor(sy + ((row < 7 ? row + 1 : row) + 0.5) * cell);
                        if (row >= 7 || x >= W || y2 >= H) continue;
                        if (Math.abs(brightness(x, y1) - brightness(x, y2)) > 25) score++;
                        total++;
                    }
                }

                const normalized = total > 0 ? score / total : 0;
                if (normalized > bestScore) bestScore = normalized;
            }
        }
    }

    return { detected: bestScore > 0.52, confidence: bestScore };
}

export function extractBoardStateFromFrame(_video: HTMLVideoElement): BoardState {
    // Without an on-device ML model we cannot reliably read piece positions from a
    // camera image, so we return an empty board state which causes the move estimator
    // to fall back to its ELO-bucketed opening-move probability table.
    return { pieces: {}, turn: 'white' };
}
