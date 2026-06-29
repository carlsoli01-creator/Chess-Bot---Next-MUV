const path = require('path');

module.exports = [
    {
        name: 'popup',
        mode: 'production',
        entry: './src/popup/popup.tsx',
        output: {
            filename: 'popup.js',
            path: path.resolve(__dirname, 'dist'),
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader'],
                },
            ],
        },
        devtool: 'source-map',
    },
    {
        name: 'content',
        mode: 'production',
        entry: './src/content/contentScript.ts',
        output: {
            filename: 'contentScript.js',
            path: path.resolve(__dirname, 'dist'),
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        devtool: 'source-map',
    },
    {
        name: 'background',
        mode: 'production',
        entry: './src/background/background.ts',
        output: {
            filename: 'background.js',
            path: path.resolve(__dirname, 'dist'),
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        devtool: 'source-map',
    },
    {
        name: 'worker',
        mode: 'production',
        entry: './src/workers/predictionWorker.ts',
        output: {
            filename: 'predictionWorker.js',
            path: path.resolve(__dirname, 'dist'),
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js'],
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        devtool: 'source-map',
    },
];
