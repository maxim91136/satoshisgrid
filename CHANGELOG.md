# Changelog

All notable changes to SATOSHI'S GRID will be documented in this file.

## [1.0.10] - 2026-01-02

### Added
- **"Tick Tock, Next Block"** - Added to rotating quotes

### Fixed
- **Horizon Flicker** - Fixed z-fighting on horizon glow line

## [1.0.9] - 2026-01-02

### Fixed
- **Pushing Block Position** - Block now correctly appears IN FRONT of bike (z-12)
- **Block Disappears** - Block now disappears after 30s instead of becoming monument

## [1.0.8] - 2026-01-02

### Added
- **Pushing Block** - New block appears in front of bike for 30s after block event
- **Block Height Sync** - REST API fallback polls every 30s to keep block height accurate

## [1.0.7] - 2026-01-01

### Added
- **Epilepsy Warning** - Photosensitivity warning on splash screen

### Fixed
- **Mobile HUD Overlap** - Bottom elements now in 3 stacked rows (Logo, Stats, Audio)

## [1.0.6] - 2026-01-01

### Fixed
- **White Screen on Block** - Flash overlay now properly resets inline opacity after animation

## [1.0.5] - 2026-01-01

### Fixed
- **TX Click Detection** - Added invisible hitboxes (3-10x larger) for easier clicking on moving transactions

## [1.0.4] - 2026-01-01

### Changed
- **Price API** - Binance as primary source, CoinGecko as fallback (more reliable)

## [1.0.3] - 2026-01-01

### Fixed
- **Memory Stability** - Reduced maxTransactions to 50, monument animations now cancel on dispose
- **Z-Fighting** - Grid highway and trail no longer flicker/disappear
- **Mobile Layout** - Bottom HUD now stacked, no overlap on small screens

### Added
- **Menu Indicator** - CSS hamburger icon (3 cyan lines) before logo text
- **Hover Effects** - Logo text underlines + glows on hover

### Removed
- **Unused Particle Burst** - Removed createParticleBurst function (memory optimization)

## [1.0.2] - 2026-01-01

### Fixed
- **Memory Leak** - Monument geometries now use shared SHARED_MONUMENT_GEOMETRIES
- **Removed Hamburger Button** - Redundant menu toggle removed (logo opens menu)

## [1.0.1] - 2026-01-01

### Added
- **Rotating Bitcoin Quotes** - Famous quotes fade in/out in the void area
- **Hamburger Menu Button** - Visible menu toggle in bottom right corner
- **Hashrate API** - REST API fallback for hashrate display

### Fixed
- **Memory Leak** - Shared geometries for all transaction types (major fix)
- **Mobile HUD** - Responsive layout for screens <500px
- **Transaction Panel Close** - Proper event handling with stopPropagation
- **Demo Mode Interval Leak** - demoBlockInterval now properly tracked and cleared

### Improved
- **Console Spam Reduced** - Loading progress logs removed, memory log interval increased to 5min
- **Demo Mode** - Now shows realistic hashrate value (700 EH/s)

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
