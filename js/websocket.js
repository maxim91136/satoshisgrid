/**
 * SATOSHIS GRID - WebSocket Manager
 * Connection to mempool.space for live blockchain data
 */

export class WebSocketManager {
    constructor(transactionManager, lightCycle, hud, audioManager, effects) {
        this.transactionManager = transactionManager;
        this.lightCycle = lightCycle;
        this.hud = hud;
        this.audioManager = audioManager;
        this.effects = effects;

        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 2000;

        this.reconnectTimeout = null;
        this._manualClose = false;

        this.isConnected = false;
        this.lastBlockHeight = null;

        // Price polling
        this.priceInterval = null;
        this.currentPrice = null;

        // Block height polling
        this.blockHeightInterval = null;

        // Difficulty adjustment polling
        this.difficultyInterval = null;

        // Mempool stats polling (REST fallback)
        this.mempoolInterval = null;

        // Demo mode (simulated data when WS unavailable)
        this.demoMode = false;
        this.demoInterval = null;
        this.demoBlockInterval = null;
    }

    connect() {
        const wsUrl = 'wss://mempool.space/api/v1/ws';

        console.log('🔌 Connecting to mempool.space...');

        // Prevent interval/timer leaks across reconnects
        this.stopDemoMode();
        this.clearIntervals();
        this.clearReconnectTimeout();

        // If a previous socket exists, close it without triggering reconnect logic
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
            try {
                this._manualClose = true;
                this.ws.onopen = null;
                this.ws.onmessage = null;
                this.ws.onerror = null;
                this.ws.onclose = null;
                this.ws.close();
            } catch (_) {
                // ignore
            } finally {
                this._manualClose = false;
                this.ws = null;
            }
        }

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => this.onOpen();
            this.ws.onmessage = (event) => this.onMessage(event);
            this.ws.onerror = (error) => this.onError(error);
            this.ws.onclose = () => this.onClose();

        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            this.startDemoMode();
        }

        // Start price polling
        this.startPricePolling();

        // Start block height polling (REST fallback)
        this.startBlockHeightPolling();

        // Fetch initial hashrate
        this.fetchHashrate();

        // Fetch difficulty adjustment data
        this.fetchDifficultyAdjustment();
        this.startDifficultyPolling();

        // Fetch fee rate immediately (fast dedicated endpoint)
        this.fetchFeeRate();

        // Fetch mempool stats (REST fallback for WebSocket)
        this.fetchMempoolStats();
        this.startMempoolPolling();
    }

    onOpen() {
        console.log('✅ Connected to mempool.space');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        this.clearReconnectTimeout();
        this.stopDemoMode();

        // Subscribe to data streams
        this.subscribe();
    }

    subscribe() {
        // Request blocks, stats, and mempool info
        this.send({ action: 'want', data: ['blocks', 'stats', 'mempool-blocks'] });

        // Track the next block's transactions
        this.send({ 'track-mempool-block': 0 });
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    onMessage(event) {
        try {
            const data = JSON.parse(event.data);

            // Handle different message types
            if (data.block) {
                this.handleNewBlock(data.block);
            }

            if (data.blocks) {
                // Initial blocks data - only use if higher than what we have
                if (data.blocks.length > 0) {
                    const wsHeight = data.blocks[0].height;
                    if (!this.lastBlockHeight || wsHeight > this.lastBlockHeight) {
                        this.lastBlockHeight = wsHeight;
                        this.hud.updateBlockHeight(this.lastBlockHeight);
                    }
                }
            }

            if (data.mempoolInfo) {
                this.handleMempoolInfo(data.mempoolInfo);
            }

            if (data['mempool-blocks']) {
                this.handleMempoolBlocks(data['mempool-blocks']);
            }

            if (data.transactions) {
                this.handleTransactions(data.transactions);
            }

            if (data['projected-block-transactions']) {
                this.handleProjectedTransactions(data['projected-block-transactions']);
            }

            if (data.da) {
                // Difficulty adjustment data
                this.hud.updateHashRate(data.da.currentHashrate);
            }

        } catch (error) {
            console.error('❌ Error parsing message:', error);
        }
    }

    handleNewBlock(block) {
        console.log('🔶 NEW BLOCK:', block.height);

        this.lastBlockHeight = block.height;
        this.hud.updateBlockHeight(block.height);

        // Notify mining cube
        this.lightCycle.onBlockFound(block);

        // Play block sound
        this.audioManager.playBlockSound();

        // Re-subscribe to track next block
        this.send({ 'track-mempool-block': 0 });
    }

    handleMempoolInfo(info) {
        // mempool.space uses 'size' for tx count in WebSocket
        const txCount = info.size || info.count;
        if (txCount) {
            this.hud.updateMempoolSize(txCount);
        }
    }

    handleMempoolBlocks(blocks) {
        if (blocks.length > 0) {
            const nextBlock = blocks[0];
            const fee = Number(nextBlock.medianFee);
            if (Number.isFinite(fee) && fee > 0) {
                this.hud.updateFeeRate(fee);
            }
        }
    }

    handleTransactions(transactions) {
        // Process new transactions
        transactions.forEach(tx => {
            this.processTransaction(tx);
        });
    }

    handleProjectedTransactions(data) {
        // Transactions projected for the next block
        if (data.added) {
            data.added.forEach(tx => {
                this.processTransaction(tx);
            });
        }
    }

    processTransaction(tx) {
        // Calculate transaction value
        const value = (typeof tx.value === 'number' && Number.isFinite(tx.value))
            ? tx.value
            : (tx.vout ? tx.vout.reduce((sum, out) => sum + (out?.value || 0), 0) : 0);

        // Calculate fee rate safely (avoid NaN)
        const vsize = Number(tx.vsize);
        const fee = Number(tx.fee);
        let feeRate = Number(tx.rate);
        if (!Number.isFinite(feeRate)) feeRate = Number(tx.feePerVsize);
        if (!Number.isFinite(feeRate) && Number.isFinite(fee) && Number.isFinite(vsize) && vsize > 0) {
            feeRate = Math.round(fee / vsize);
        }
        if (!Number.isFinite(feeRate) || feeRate <= 0) {
            feeRate = 10;
        }

        const txData = {
            txid: tx.txid,
            value: value,
            feeRate,
            fee: Number.isFinite(fee) ? fee : tx.fee,
            vsize: Number.isFinite(vsize) ? vsize : tx.vsize,
            timestamp: Date.now()
        };

        // Add to visualization
        const transaction = this.transactionManager.addTransaction(txData);

        // Add to mining cube
        this.lightCycle.addTransaction(txData);

        // Only whale alerts (≥10 BTC), no transaction beeps
        const btcValue = value / 100000000;
        if (btcValue >= 10) {
            this.audioManager.playWhaleSound(btcValue >= 100);
        }
    }

    onError(error) {
        console.error('❌ WebSocket error:', error);
    }

    onClose() {
        console.log('🔌 WebSocket disconnected');
        this.isConnected = false;

        // If we closed intentionally (cleanup/restart), do nothing
        if (this._manualClose) return;

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            this.clearReconnectTimeout();
            this.reconnectTimeout = setTimeout(
                () => this.connect(),
                this.reconnectDelay * this.reconnectAttempts
            );
        } else {
            console.log('⚠️ Max reconnection attempts reached. Starting demo mode.');
            this.startDemoMode();
        }
    }

    // Price polling (Binance primary, CoinGecko fallback)
    async startPricePolling() {
        // Prevent duplicate intervals on reconnect
        if (this.priceInterval) {
            clearInterval(this.priceInterval);
            this.priceInterval = null;
        }

        const fetchPrice = async () => {
            // Try Binance first (more reliable)
            try {
                const response = await fetch(
                    'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'
                );
                const data = await response.json();
                if (data.price) {
                    this.currentPrice = parseFloat(data.price);
                    this.hud.updatePrice(this.currentPrice);
                    return;
                }
            } catch (e) {
                // Binance failed, try CoinGecko
            }

            // Fallback: CoinGecko
            try {
                const response = await fetch(
                    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
                );
                const data = await response.json();
                if (data.bitcoin?.usd) {
                    this.currentPrice = data.bitcoin.usd;
                    this.hud.updatePrice(this.currentPrice);
                }
            } catch (error) {
                // Both APIs failed, keep last known price
            }
        };

        // Initial fetch
        fetchPrice();

        // Poll every 30 seconds
        this.priceInterval = setInterval(fetchPrice, 30000);
    }

    // Fetch current block height (REST fallback)
    async fetchBlockHeight() {
        try {
            const response = await fetch('https://mempool.space/api/blocks/tip/height');
            const height = await response.json();
            if (height && height !== this.lastBlockHeight) {
                // Only update if different and higher
                if (!this.lastBlockHeight || height > this.lastBlockHeight) {
                    console.log('📊 Block height sync:', height);
                    this.lastBlockHeight = height;
                    this.hud.updateBlockHeight(height);
                }
            }
        } catch (error) {
            // Silent fail
        }
    }

    // Start block height polling (fallback for missed WS events)
    startBlockHeightPolling() {
        // Prevent duplicate intervals on reconnect
        if (this.blockHeightInterval) {
            clearInterval(this.blockHeightInterval);
            this.blockHeightInterval = null;
        }

        // Initial fetch
        this.fetchBlockHeight();

        // Poll every 30 seconds
        this.blockHeightInterval = setInterval(() => {
            this.fetchBlockHeight();
        }, 30000);
    }

    // Fetch hashrate from mempool.space API
    async fetchHashrate() {
        try {
            const response = await fetch('https://mempool.space/api/v1/mining/hashrate/3d');
            const data = await response.json();
            if (data.currentHashrate) {
                this.hud.updateHashRate(data.currentHashrate);
            }
        } catch (error) {
            // Fallback: try difficulty endpoint
            try {
                const response = await fetch('https://mempool.space/api/v1/difficulty-adjustment');
                const data = await response.json();
                if (data.estimatedHashrate) {
                    this.hud.updateHashRate(data.estimatedHashrate);
                }
            } catch (err) {
                // Silent fail - hashrate will remain at "---"
            }
        }
    }

    // Fetch difficulty adjustment data
    async fetchDifficultyAdjustment() {
        try {
            const response = await fetch('https://mempool.space/api/v1/difficulty-adjustment');
            const data = await response.json();
            if (data) {
                this.hud.updateDifficultyAdjustment(data);
            }
        } catch (error) {
            // Silent fail
        }
    }

    // Start difficulty adjustment polling
    startDifficultyPolling() {
        // Prevent duplicate intervals on reconnect
        if (this.difficultyInterval) {
            clearInterval(this.difficultyInterval);
            this.difficultyInterval = null;
        }

        // Poll every 60 seconds (difficulty data doesn't change often)
        this.difficultyInterval = setInterval(() => {
            this.fetchDifficultyAdjustment();
        }, 60000);
    }

    // Fetch fee rate immediately via fast dedicated endpoint
    async fetchFeeRate() {
        try {
            const response = await fetch('https://mempool.space/api/v1/fees/recommended');
            const data = await response.json();
            if (data.fastestFee && data.fastestFee > 0) {
                this.hud.updateFeeRate(data.fastestFee);
            }
        } catch (error) {
            console.error('Fee fetch error:', error);
        }
    }

    // Fetch mempool stats (size + fees) via REST
    async fetchMempoolStats() {
        try {
            // Fetch mempool size
            const mempoolRes = await fetch('https://mempool.space/api/mempool');
            const mempoolData = await mempoolRes.json();
            if (mempoolData.count) {
                this.hud.updateMempoolSize(mempoolData.count);
            }

            // Fetch fee rates from projected blocks
            const blocksRes = await fetch('https://mempool.space/api/v1/fees/mempool-blocks');
            const blocksData = await blocksRes.json();
            if (blocksData.length > 0 && blocksData[0].medianFee) {
                this.hud.updateFeeRate(blocksData[0].medianFee);
            }
        } catch (error) {
            // Silent fail - keep existing values
        }
    }

    // Start mempool stats polling
    startMempoolPolling() {
        // Prevent duplicate intervals on reconnect
        if (this.mempoolInterval) {
            clearInterval(this.mempoolInterval);
            this.mempoolInterval = null;
        }

        // Poll every 30 seconds
        this.mempoolInterval = setInterval(() => {
            this.fetchMempoolStats();
        }, 30000);
    }

    // Demo mode - simulated transactions when WS unavailable
    startDemoMode() {
        if (this.demoMode) return;

        console.log('🎮 Starting demo mode...');
        this.demoMode = true;

        // Set initial values
        this.hud.updateBlockHeight(878000);
        this.hud.updateMempoolSize(50000);
        this.hud.updateFeeRate(15);
        this.hud.updateHashRate(700e18); // ~700 EH/s demo value

        // Generate random transactions (slower rate for stability)
        this.demoInterval = setInterval(() => {
            this.generateDemoTransaction();
        }, 800 + Math.random() * 1200);

        // Occasional block (every 1-2 minutes in demo) - STORE THE INTERVAL!
        this.demoBlockInterval = setInterval(() => {
            if (Math.random() < 0.02) {
                const newHeight = (this.lastBlockHeight || 878000) + 1;
                this.handleNewBlock({ height: newHeight });
            }
        }, 1000);
    }

    stopDemoMode() {
        if (!this.demoMode) return;

        this.demoMode = false;
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
            this.demoInterval = null;
        }
        if (this.demoBlockInterval) {
            clearInterval(this.demoBlockInterval);
            this.demoBlockInterval = null;
        }
    }

    clearReconnectTimeout() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    clearIntervals() {
        if (this.priceInterval) {
            clearInterval(this.priceInterval);
            this.priceInterval = null;
        }
        if (this.blockHeightInterval) {
            clearInterval(this.blockHeightInterval);
            this.blockHeightInterval = null;
        }
        if (this.difficultyInterval) {
            clearInterval(this.difficultyInterval);
            this.difficultyInterval = null;
        }
        if (this.mempoolInterval) {
            clearInterval(this.mempoolInterval);
            this.mempoolInterval = null;
        }
    }

    generateDemoTransaction() {
        // Random transaction size distribution
        const rand = Math.random();
        let value;

        if (rand < 0.7) {
            // Small transaction (< 0.1 BTC)
            value = Math.random() * 0.1 * 100000000;
        } else if (rand < 0.95) {
            // Medium transaction (0.1 - 10 BTC)
            value = (0.1 + Math.random() * 9.9) * 100000000;
        } else if (rand < 0.99) {
            // Large transaction (10 - 100 BTC)
            value = (10 + Math.random() * 90) * 100000000;
        } else {
            // Whale transaction (> 100 BTC)
            value = (100 + Math.random() * 900) * 100000000;
        }

        const txData = {
            txid: this.generateRandomTxid(),
            value: Math.round(value),
            feeRate: 5 + Math.floor(Math.random() * 50),
            fee: Math.floor(Math.random() * 50000),
            vsize: 200 + Math.floor(Math.random() * 500),
            timestamp: Date.now()
        };

        this.processTransaction(txData);
    }

    generateRandomTxid() {
        const chars = '0123456789abcdef';
        let txid = '';
        for (let i = 0; i < 64; i++) {
            txid += chars[Math.floor(Math.random() * chars.length)];
        }
        return txid;
    }

    disconnect() {
        this.clearReconnectTimeout();
        this.stopDemoMode();
        this.clearIntervals();

        if (this.ws) {
            try {
                this._manualClose = true;
                this.ws.onopen = null;
                this.ws.onmessage = null;
                this.ws.onerror = null;
                this.ws.onclose = null;
                this.ws.close();
            } catch (_) {
                // ignore
            } finally {
                this._manualClose = false;
                this.ws = null;
            }
        }
    }
}
