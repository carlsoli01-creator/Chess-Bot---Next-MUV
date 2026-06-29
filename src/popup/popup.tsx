import React, { useCallback, useEffect, useRef, useState } from 'react';
import { render } from 'react-dom';
import { MoveEstimator } from '../models/moveEstimator';
import { requestCameraAccess, detectChessboardInFrame, extractBoardStateFromFrame } from '../utils/cameraScanner';
import './popup.css';

type ScanStatus = 'idle' | 'requesting' | 'scanning' | 'detected' | 'not-detected' | 'error';

const Popup = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);

    const [eloRating, setEloRating] = useState<number>(1200);
    const [status, setStatus] = useState<ScanStatus>('idle');
    const [statusMessage, setStatusMessage] = useState<string>('Press Start Camera to begin.');
    const [predictedMove, setPredictedMove] = useState<string | null>(null);
    const [cameraActive, setCameraActive] = useState<boolean>(false);

    const stopCamera = useCallback(() => {
        if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCameraActive(false);
        setStatus('idle');
        setStatusMessage('Camera stopped. Press Start Camera to try again.');
        setPredictedMove(null);
    }, []);

    const scanFrame = useCallback((elo: number) => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;

        setStatus('scanning');
        const result = detectChessboardInFrame(video);

        if (result.detected) {
            const boardState = extractBoardStateFromFrame(video);
            const estimator = new MoveEstimator(elo);
            const move = estimator.estimateMove(boardState);
            const moveText = move.piece === 'P'
                ? move.to.toUpperCase()
                : `${move.piece}${move.to.toUpperCase()}`;
            setPredictedMove(moveText);
            setStatus('detected');
            setStatusMessage(`Chess board detected — ${Math.round(result.confidence * 100)}% confidence`);
        } else {
            setPredictedMove(null);
            setStatus('not-detected');
            setStatusMessage('No chess board visible. Point your camera at the board.');
        }
    }, []);

    const startCamera = useCallback(async () => {
        setStatus('requesting');
        setStatusMessage('Requesting camera access...');
        try {
            const stream = await requestCameraAccess();
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            setCameraActive(true);
            setStatusMessage('Camera active — scanning...');

            // First scan after video is ready (~800 ms), then every 2 seconds
            setTimeout(() => scanFrame(eloRating), 800);
            timerRef.current = window.setInterval(() => {
                setEloRating((current) => {
                    scanFrame(current);
                    return current;
                });
            }, 2000);
        } catch {
            setStatus('error');
            setStatusMessage('Camera access denied. Please allow camera permissions and try again.');
        }
    }, [eloRating, scanFrame]);

    useEffect(() => () => stopCamera(), [stopCamera]);

    const handleEloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        setEloRating(Number.isNaN(val) ? 1200 : val);
    };

    const statusColor =
        status === 'detected' ? '#22c55e'
        : status === 'not-detected' || status === 'error' ? '#ef4444'
        : status === 'scanning' || status === 'requesting' ? '#facc15'
        : '#64748b';

    return (
        <div className="popup">
            <h1>Chess Move Predictor</h1>

            <div className="elo-row">
                <label htmlFor="elo-input">Your Elo</label>
                <input
                    id="elo-input"
                    type="number"
                    value={eloRating}
                    onChange={handleEloChange}
                    min={100}
                    max={3000}
                />
            </div>

            <div className="camera-section">
                <video
                    ref={videoRef}
                    className={`camera-feed${cameraActive ? ' active' : ''}`}
                    muted
                    playsInline
                />
                {!cameraActive ? (
                    <button className="btn btn-start" type="button" onClick={startCamera}>
                        Start Camera
                    </button>
                ) : (
                    <button className="btn btn-stop" type="button" onClick={stopCamera}>
                        Stop Camera
                    </button>
                )}
            </div>

            <div className="status-bar" style={{ borderColor: statusColor }}>
                <span className="status-dot" style={{ background: statusColor }} />
                <span className="status-text">{statusMessage}</span>
            </div>

            {predictedMove && (
                <div className="move-result">
                    <span className="move-label">Predicted Move</span>
                    <span className="move-value">{predictedMove}</span>
                </div>
            )}

            {status === 'not-detected' && (
                <p className="error-msg">
                    No chess board detected. Make sure the board fills most of the camera view and is well-lit.
                </p>
            )}

            {status === 'error' && (
                <p className="error-msg">
                    Could not access camera. Open Chrome settings and allow camera for this extension, then try again.
                </p>
            )}
        </div>
    );
};

export default Popup;

render(<Popup />, document.getElementById('root'));
