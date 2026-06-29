import React, { useEffect, useState } from 'react';
import { MoveEstimator, getPredictedMoves } from '../models/moveEstimator';
import { scanBoardPhoto } from '../utils/photoScanner';
import { scanBoardText } from '../utils/boardParser';
import { ChessMove } from '../types';
import './popup.css';

const Popup = () => {
    const [predictedMoves, setPredictedMoves] = useState<string[]>([]);
    const [eloRating, setEloRating] = useState<number>(1200);
    const [photoStatus, setPhotoStatus] = useState<string>('No photo uploaded');
    const [photoMove, setPhotoMove] = useState<ChessMove | null>(null);
    const [pasteInput, setPasteInput] = useState<string>('');
    const [pasteMove, setPasteMove] = useState<ChessMove | null>(null);
    const [pasteStatus, setPasteStatus] = useState<string>('Paste FEN or ASCII board text here');

    useEffect(() => {
        const fetchPredictedMoves = async () => {
            const moves = await getPredictedMoves(eloRating);
            setPredictedMoves(moves);
        };

        fetchPredictedMoves();
    }, [eloRating]);

    const handleEloChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(event.target.value);
        setEloRating(Number.isNaN(value) ? 0 : value);
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            setPhotoStatus('No photo selected.');
            return;
        }

        setPhotoStatus('Scanning photo...');

        try {
            const boardState = await scanBoardPhoto(file);
            const moveEstimator = new MoveEstimator(eloRating);
            const predictedMove = moveEstimator.estimateMove(boardState);
            setPhotoMove(predictedMove);
            setPhotoStatus('Photo scanned. Prediction generated from placeholder board extraction.');
        } catch (error) {
            setPhotoStatus('Photo scan failed. Please try another image.');
            console.error('Photo scan error:', error);
        }
    };

    const handlePasteChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPasteInput(event.target.value);
    };

    const handlePasteSubmit = () => {
        try {
            const boardState = scanBoardText(pasteInput);
            const moveEstimator = new MoveEstimator(eloRating);
            const predictedMove = moveEstimator.estimateMove(boardState);
            setPasteMove(predictedMove);
            setPasteStatus('Paste input parsed successfully.');
        } catch (error) {
            setPasteStatus(`Parse failed: ${error instanceof Error ? error.message : 'invalid board text'}`);
            setPasteMove(null);
        }
    };

    return (
        <div className="popup">
            <h1>Chess Move Predictor</h1>
            <label>
                Elo Rating:
                <input
                    type="number"
                    value={eloRating}
                    onChange={handleEloChange}
                />
            </label>
            <label>
                Upload Board Photo:
                <input type="file" accept="image/*" onChange={handlePhotoUpload} />
            </label>
            <p>{photoStatus}</p>
            {photoMove && (
                <div>
                    <h2>Photo Prediction:</h2>
                    <p>
                        {photoMove.piece} from {photoMove.from} to {photoMove.to}
                        {photoMove.promotion ? ` promotion ${photoMove.promotion}` : ''}
                    </p>
                </div>
            )}
            <section>
                <h2>Paste Board Text</h2>
                <textarea
                    value={pasteInput}
                    onChange={handlePasteChange}
                    placeholder="Paste FEN or ASCII board text here"
                    rows={8}
                />
                <button type="button" onClick={handlePasteSubmit}>
                    Parse and Predict
                </button>
                <p>{pasteStatus}</p>
                {pasteMove && (
                    <div>
                        <h3>Paste Prediction:</h3>
                        <p>
                            {pasteMove.piece} from {pasteMove.from} to {pasteMove.to}
                            {pasteMove.promotion ? ` promotion ${pasteMove.promotion}` : ''}
                        </p>
                    </div>
                )}
            </section>
            <h2>Predicted Moves:</h2>
            <ul>
                {predictedMoves.map((move, index) => (
                    <li key={index}>{move}</li>
                ))}
            </ul>
        </div>
    );
};

export default Popup;
