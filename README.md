# SATOSHI'S GRID

A cinematic 3D visualization of the Bitcoin blockchain, inspired by TRON: Legacy.

**Live Demo:** [satoshisgrid.com](https://satoshisgrid.com)

## Features

- **Real-time Bitcoin Data** - Live transactions from mempool.space
- **Tron Light Cycle** - Animated 3D model with Bitcoin orange glow
- **Dual Ride Modes** - Chilled Ride and Wild Ride with different soundtracks
- **Cyberpunk Soundtrack** - Epic ambient music with procedural fallback
- **Custom Radio Stream** - Paste your own audio stream URL (MP3/OGG, e.g., SomaFM)
- **Block Events** - Visual and audio effects when new blocks are mined
- **Clickable Block Info** - Click the pushing block to see Miner, Height, Hash, TX count, Size, Time
- **3-Tier Whale Alerts** - Inception-style horn with escalating effects:
  - 10+ BTC: WHALE (orange)
  - 50+ BTC: MEGA WHALE (bright orange)
  - 500+ BTC: LEVIATHAN (red, maximum effects, pulsing)
- **Whale Watching Hours** - Splash screen shows peak whale activity times (UTC)
- **Mempool Load Indicator** - Real-time congestion status above horizon (Clear/Normal/Busy/Congested/Full)
- **Fee Rate Colors** - Green/Yellow/Orange/Red based on sat/vB thresholds
- **Lightning Network Capacity** - Total LN capacity in BTC (click to explore)
- **Halving Countdown** - Blocks remaining until next halving
- **Difficulty Adjustment** - Epoch progress and expected change
- **Separate Audio Controls** - Independent toggles for Music and Sound Effects
- **Fullscreen Mode** - Immersive fullscreen toggle (press F)
- **Share Moment** - Capture branded 1200x630 screenshot with HUD overlay (press S)
- **Keyboard Shortcuts** - M (music), X (SFX), S (share), Esc (close), F (fullscreen)
- **Clickable TXIDs** - Transaction IDs link to mempool.space
- **Clickable Block Height** - Block height in HUD links to mempool.space
- **Mobile Responsive** - Optimized splash screen for all screen sizes (320px+)
- **iOS Audio Resume** - Tap overlay to resume audio after background/foreground switch

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
│   ├── effects.js      # Camera shake, flash
│   └── share.js        # Screenshot capture & sharing
├── audio/
│   ├── chilled.mp3     # Chilled Ride soundtrack
│   └── wild.mp3        # Wild Ride soundtrack
├── models/
│   └── light-cycle.glb # 3D bike model
└── VERSION
```

## Data Sources

| Data | API | Update |
|------|-----|--------|
| Transactions | [mempool.space WebSocket](https://mempool.space/docs/api/websocket) | Real-time |
| Block Events | [mempool.space WebSocket](https://mempool.space/docs/api/websocket) | Real-time |
| BTC Price | [Binance API](https://binance-docs.github.io/apidocs/) | 30s |
| BTC Price (Fallback) | [CoinGecko API](https://www.coingecko.com/api/documentation) | 30s |
| Hashrate | [mempool.space REST](https://mempool.space/docs/api/rest) | 5min |
| Difficulty Adjustment | [mempool.space REST](https://mempool.space/docs/api/rest) | 60s |
| Fee Rate | [mempool.space REST](https://mempool.space/docs/api/rest) | Real-time |
| Lightning Capacity | [mempool.space REST](https://mempool.space/docs/api/rest) | 5min |
| Chain Size | Calculated from block height | Per block |

## Credits

### Assets
- **Light Cycle Model:** "TRON: Uprising - ArgonCity Light Cycle" by TheTinDog ([CC BY 4.0](https://skfb.ly/pEW9S))
- **Chilled Ride Soundtrack:** "80's Synth Futuristic Cyberpunk" by Roman Forster ([Pond5](https://www.pond5.com/de/royalty-free-music/item/94791064-80s-synth-futuristic-cyberpunk-fashion-film-music-ads-youtub))
- **Wild Ride Soundtrack:** "Cyberpunk Energy Electro" by AleXZavesa ([Pond5](https://www.pond5.com/royalty-free-music/item/163053128-cyberpunk-energy-electro-main-version))

### Libraries
- [Three.js](https://threejs.org/) - 3D WebGL rendering
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Procedural audio

### Inspiration
- TRON: Legacy (2010)
- Bitcoin Genesis Block (2009)

## License

MIT
