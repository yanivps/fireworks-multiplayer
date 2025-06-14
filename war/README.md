# War Card Game

An online multiplayer implementation of the classic War card game using the multiplayer-card-game-framework.

## Game Rules

*[Rules will be added once provided]*

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3002`

## Development

```bash
npm run dev
```

## Project Structure

```
war/
├── src/
│   ├── WarGame.js          # War game implementation
│   └── server.js           # Game server
├── public/
│   ├── index.html          # Game client
│   ├── game.js             # Client-side game logic
│   └── styles.css          # Game styling
└── README.md
```

## How It Works

This game uses the multiplayer-card-game-framework to handle:
- Room creation and management
- Player connections and reconnections
- Turn-based game flow
- Real-time state synchronization

The War-specific game logic is implemented in `src/WarGame.js` by extending the `GameImplementation` class. 