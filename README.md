# SATOSHI'S GRID

A cinematic 3D visualization of the Bitcoin blockchain, inspired by TRON: Legacy.

**Live Demo:** [satoshisgrid.com](https://satoshisgrid.com)

## Features

- **Real-time Bitcoin Data** - Live transactions from mempool.space
- **Tron Light Cycle** - Animated 3D model with Bitcoin orange glow
- **Cyberpunk Soundtrack** - Epic ambient music with procedural fallback
- **Block Events** - Visual and audio effects when new blocks are mined
- **Whale Alerts** - Inception-style horn for large transactions (>10 BTC)

## Tech Stack

- Three.js (WebGL)
- Web Audio API
- mempool.space WebSocket API
- Vanilla JavaScript (ES6 modules)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/maxim91136/satoshisgrid.git

# Serve locally (any static server works)
npx serve .

# Open http://localhost:3000
```

## Project Structure

```
satoshisgrid/
├── index.html          # Entry point
├── css/styles.css      # Tron-style dark theme
├── js/
│   ├── main.js         # App initialization
│   ├── scene.js        # Three.js setup
│   ├── grid.js         # Infinite scrolling grid
│   ├── light-cycle.js  # Tron bike + trail
│   ├── transactions.js # Transaction visualization
│   ├── websocket.js    # mempool.space connection
│   ├── audio.js        # Web Audio system
│   ├── hud.js          # UI overlay
│   └── effects.js      # Camera shake, flash
├── audio/
│   └── soundtrack.mp3  # Background music
├── models/
│   └── light-cycle.glb # 3D bike model
└── VERSION
```

## Credits

- **Light Cycle Model:** "TRON: Uprising - ArgonCity Light Cycle" by TheTinDog ([CC BY 4.0](https://skfb.ly/pEW9S))
- **Soundtrack:** "Cyberpunk Epic Trailer Kit" by cleanmindsounds
- **Bitcoin Data:** [mempool.space](https://mempool.space)

## License

MIT
