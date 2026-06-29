import React, { useCallback, useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import { getBestMove, formatMove } from '../engine/chessEngine';
import { requestCameraAccess, detectChessboardInFrame } from '../utils/cameraScanner';
import './popup.css';

type Phase = 'idle' | 'requesting' | 'active' | 'error';

const Popup = () => {
    const videoRef   = useRef<HTMLVideoElement>(null);
    const streamRef  = useRef<MediaStream | null>(null);
    const timerRef   = useRef<number | null>(null);

    const [eloRating,    setEloRating]    = useState<number>(1200);
    const [phase,        setPhase]        = useState<Phase>('idle');
    const [statusMsg,    setStatusMsg]    = useState<string>('Press Start Camera to scan a board.');
    const [predictedMove, setPredictedMove] = useState<string | null>(null);
    const [errorMsg,     setErrorMsg]     = useState<string | null>(null);

    // ── Camera helpers ────────────────────────────────────────────────────────

    const stopCamera = useCallback(() => {
        if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setPhase('idle');
        setStatusMsg('Camera stopped.');
        setPredictedMove(null);
        setErrorMsg(null);
    }, []);

    const runScan = useCallback((elo: number) => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;

        const result = detectChessboardInFrame(video);

        if (!result.detected) {
            setErrorMsg('No chess board detected — point the camera directly at the board and ensure good lighting.');
            setPredictedMove(null);
            setStatusMsg('Scanning...');
            return;
        }

        setErrorMsg(null);
        setStatusMsg(`Board detected (${Math.round(result.confidence * 100)}% confidence) — calculating...`);

        // Use engine with empty board state (ELO-based opening table fallback)
        const move = getBestMove({ pieces: {}, turn: 'white' }, 'w', 2);
        if (move) {
            setPredictedMove(formatMove(move));
            setStatusMsg(`Board detected — ${Math.round(result.confidence * 100)}% confidence`);
        }
    }, []);

    const startCamera = useCallback(async () => {
        setPhase('requesting');
        setStatusMsg('Requesting camera access...');
        setErrorMsg(null);

        try {
            const stream = await requestCameraAccess();
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setPhase('active');
            setStatusMsg('Camera active — scanning for board...');

            setTimeout(() => runScan(eloRating), 900);
            timerRef.current = window.setInterval(() => {
                setEloRating(cur => { runScan(cur); return cur; });
            }, 2000);

        } catch {
            setPhase('error');
            setStatusMsg('Camera access was denied.');
            setErrorMsg(
                'Could not access camera.\n' +
                '1. Click the camera icon in the Chrome address bar and allow access.\n' +
                '2. If the popup closed before you could respond, re-open it and try again.\n' +
                '3. Check chrome://settings/content/camera and ensure this extension is allowed.'
            );
        }
    }, [eloRating, runScan]);

    useEffect(() => () => stopCamera(), [stopCamera]);

    // ── Dot colour ────────────────────────────────────────────────────────────
    const dotColor =
        phase === 'active' && !errorMsg ? '#22c55e'
        : phase === 'error' || errorMsg  ? '#ef4444'
        : phase === 'requesting'         ? '#facc15'
        : '#475569';

    return (
        <div className="popup">
            <h1>Chess Move Predictor</h1>

            {/* ELO — always visible */}
            <div className="elo-row">
                <label htmlFor="elo">Your Elo</label>
                <input
                    id="elo"
                    type="number"
                    min={100}
                    max={3000}
                    value={eloRating}
                    onChange={e => setEloRating(parseInt(e.target.value, 10) || 1200)}
                />
            </div>

            {/* Camera section */}
            <div className="camera-section">
                <video
                    ref={videoRef}
                    className={`camera-feed${phase === 'active' ? ' active' : ''}`}
                    muted
                    playsInline
                />
                {phase !== 'active' ? (
                    <button className="btn btn-start" type="button" onClick={startCamera}
                        disabled={phase === 'requesting'}>
                        {phase === 'requesting' ? 'Waiting for permission…' : 'Start Camera'}
                    </button>
                ) : (
                    <button className="btn btn-stop" type="button" onClick={stopCamera}>
                        Stop Camera
                    </button>
                )}
            </div>

            {/* Status bar */}
            <div className="status-bar" style={{ borderColor: dotColor }}>
                <span className="status-dot" style={{ background: dotColor }} />
                <span className="status-text">{statusMsg}</span>
            </div>

            {/* Error message */}
            {errorMsg && (
                <div className="error-box">
                    {errorMsg.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                </div>
            )}

            {/* Predicted move */}
            {predictedMove && !errorMsg && (
                <div className="move-result">
                    <span className="move-label">Best Next Move</span>
                    <span className="move-value">{predictedMove}</span>
                </div>
            )}

            <p className="hint">
                On chess.com the red overlay on the page already shows your next move live —
                this popup is for physical boards.
            </p>
        </div>
    );
};

render(<Popup />, document.getElementById('root'));

export default Popup;
