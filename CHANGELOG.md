# Changelog

All notable changes to SATOSHI'S GRID will be documented in this file.

## [1.0.0] - 2026-01-01

### Added
- **Cyberpunk Soundtrack** - Epic trailer music with 3s fade-in and loop
- **Tron-Style Light Cycle** - GLB model with Bitcoin orange neon glow
- **Vertical Light Trail** - Animated shader trail behind the bike
- **Procedural Audio System** - Tron-style synth drone as fallback
- **Event Sounds** - Transaction whoosh, whale alert (Inception horn), block mined impact
- **Live Bitcoin Data** - WebSocket connection to mempool.space
- **Real-time Transactions** - Visual representation of Bitcoin mempool activity
- **Block Mining Events** - Monument drops when new block is found
- **HUD Overlay** - Block height, BTC price, mempool size, fee rate
- **Bloom Post-Processing** - Cinematic glow effects
- **Demo Mode** - Simulated transactions when WebSocket unavailable

### Visual
- Eye-friendly dark theme with reduced bloom intensity
- Bitcoin orange (#f7931a) accent color throughout
- Infinite scrolling grid with fog depth effect
- Camera shake on block events

### Audio
- Audio starts on first click (browser autoplay policy compliant)
- Mute toggle button in UI
- Stereo panning and filter sweeps for immersion

### Technical
- Three.js r150+ with ES6 modules
- No build step required (static files)
- Responsive design
- Cloudflare Pages deployment ready
