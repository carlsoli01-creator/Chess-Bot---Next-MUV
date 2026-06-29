const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const common = {
    mode: 'production',
    resolve: { extensions: ['.ts', '.tsx', '.js'] },
    module: {
        rules: [
            { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
            { test: /\.css$/, use: ['style-loader', 'css-loader'] },
        ],
    },
    devtool: 'source-map',
};

module.exports = [
    {
        ...common,
        name: 'popup',
        entry: './src/popup/popup.tsx',
        output: { filename: 'popup.js', path: path.resolve(__dirname, 'dist') },
        plugins: [
            new CopyPlugin({
                patterns: [
                    { from: 'node_modules/stockfish/bin/stockfish-18-lite-single.js',   to: 'stockfish-18-lite-single.js' },
                    { from: 'node_modules/stockfish/bin/stockfish-18-lite-single.wasm', to: 'stockfish-18-lite-single.wasm' },
                ],
            }),
        ],
    },
    {
        ...common,
        name: 'content',
        entry: './src/content/contentScript.ts',
        output: { filename: 'contentScript.js', path: path.resolve(__dirname, 'dist') },
    },
    {
        ...common,
        name: 'background',
        entry: './src/background/background.ts',
        output: { filename: 'background.js', path: path.resolve(__dirname, 'dist') },
    },
    {
        ...common,
        name: 'worker',
        entry: './src/workers/predictionWorker.ts',
        output: { filename: 'predictionWorker.js', path: path.resolve(__dirname, 'dist') },
    },
];
