import { BoardState } from '../types';

export async function scanBoardPhoto(file: File): Promise<BoardState> {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Canvas rendering context unavailable');
    }

    ctx.drawImage(bitmap, 0, 0);

    // TODO: Replace this placeholder pipeline with a real image-based board recognition model.
    // This currently establishes the photo scanning API and returns a placeholder board state.

    console.warn('scanBoardPhoto: image loaded, but optical board parsing is not yet implemented.');

    return {
        pieces: {},
        turn: 'white',
    };
}
