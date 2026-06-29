# Chess Move Predictor

## Overview
The Chess Move Predictor is a browser extension designed to analyze chess positions on chess.com and predict the most likely moves based on the player's Elo rating. This project leverages TypeScript for type safety and React for the user interface.

## Features
- Monitors chess board state in real-time.
- Predicts the most likely move based on the current position and player's Elo rating.
- Provides a user-friendly popup interface for interaction.
- Utilizes web workers for efficient computation without blocking the main thread.

## Project Structure
```
chess-move-predictor
├── src
│   ├── content
│   │   ├── contentScript.ts
│   │   └── boardObserver.ts
│   ├── background
│   │   └── background.ts
│   ├── popup
│   │   ├── popup.html
│   │   ├── popup.tsx
│   │   └── popup.css
│   ├── models
│   │   ├── eloModel.ts
│   │   └── moveEstimator.ts
│   ├── workers
│   │   └── predictionWorker.ts
│   ├── utils
│   │   └── chessUtils.ts
│   └── types
│       └── index.ts
├── manifest.json
├── package.json
├── tsconfig.json
├── webpack.config.js
├── .vscode
│   └── launch.json
└── README.md
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd chess-move-predictor
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
1. Load the extension in your browser:
   - For Chrome: Go to `chrome://extensions/`, enable "Developer mode", and click "Load unpacked". Select the `chess-move-predictor` directory.
2. Open a chess game on chess.com.
3. Click on the extension icon to open the popup and view predicted moves.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.