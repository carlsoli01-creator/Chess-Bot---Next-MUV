// Stockfish 18 WASM engine wrapper using UCI protocol.
// The worker is loaded from the extension bundle via chrome.runtime.getURL.
// The WASM URL is passed to the worker via the URL hash as required by stockfish.js.

export class StockfishEngine {
    private worker: Worker | null = null;
    private ready = false;
    private pendingResolve: ((move: string | null) => void) | null = null;
    private safetyTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        this.boot();
    }

    private boot() {
        try {
            const jsUrl   = chrome.runtime.getURL('dist/stockfish-18-lite-single.js');
            const wasmUrl = encodeURIComponent(chrome.runtime.getURL('dist/stockfish-18-lite-single.wasm'));
            // stockfish.js detects worker mode via the URL hash fragment
            this.worker = new Worker(`${jsUrl}#${wasmUrl},worker`);
            this.worker.onmessage = (e) => this.onLine(typeof e.data === 'string' ? e.data : '');
            this.worker.onerror   = (e) => console.error('[Stockfish] worker error', e);
            this.worker.postMessage('uci');
        } catch (err) {
            console.error('[Stockfish] failed to start worker', err);
        }
    }

    private onLine(line: string) {
        if (line === 'uciok') {
            this.worker?.postMessage('setoption name Threads value 1');
            this.worker?.postMessage('setoption name Hash value 16');
            this.worker?.postMessage('isready');
        } else if (line === 'readyok') {
            this.ready = true;
        } else if (line.startsWith('bestmove')) {
            this.clearSafety();
            const rawMove = line.split(' ')[1] ?? null;
            const move = rawMove && rawMove !== '(none)' ? rawMove : null;
            const resolve = this.pendingResolve;
            this.pendingResolve = null;
            resolve?.(move);
        }
    }

    private clearSafety() {
        if (this.safetyTimer !== null) {
            clearTimeout(this.safetyTimer);
            this.safetyTimer = null;
        }
    }

    // Returns a UCI move string like 'e2e4' or 'g1f3', within moveTime ms.
    search(fen: string, moveTime = 2500): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            if (!this.worker) return resolve(null);

            // Cancel any in-progress search
            if (this.pendingResolve) {
                this.pendingResolve(null);
                this.pendingResolve = null;
                this.worker.postMessage('stop');
                this.clearSafety();
            }

            const run = () => {
                if (!this.ready) {
                    // Engine not ready yet — retry in 100 ms (max 3 s total)
                    setTimeout(run, 100);
                    return;
                }
                this.pendingResolve = resolve;
                this.worker!.postMessage(`position fen ${fen}`);
                this.worker!.postMessage(`go movetime ${moveTime}`);

                // Hard cap: force stop slightly after moveTime so we never exceed 4 s
                this.safetyTimer = setTimeout(() => {
                    this.worker?.postMessage('stop');
                    // give stockfish 300 ms to emit bestmove after stop
                    setTimeout(() => {
                        if (this.pendingResolve) {
                            this.pendingResolve(null);
                            this.pendingResolve = null;
                        }
                    }, 300);
                }, moveTime + 500);
            };

            run();
        });
    }

    terminate() {
        this.clearSafety();
        this.worker?.postMessage('quit');
        this.worker?.terminate();
        this.worker = null;
    }
}
