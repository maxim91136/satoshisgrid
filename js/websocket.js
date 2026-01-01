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

        this.isConnected = false;
        this.lastBlockHeight = null;

        // Price polling
        this.priceInterval = null;
        this.currentPrice = null;

        // Demo mode (simulated data when WS unavailable)
        this.demoMode = false;
        this.demoInterval = null;
    }

    connect() {
        const wsUrl = 'wss://mempool.space/api/v1/ws';

        console.log('🔌 Connecting to mempool.space...');

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
    }

    onOpen() {
        console.log('✅ Connected to mempool.space');
        this.isConnected = true;
        this.reconnectAttempts = 0;

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
                // Initial blocks data
                if (data.blocks.length > 0) {
                    this.lastBlockHeight = data.blocks[0].height;
                    this.hud.updateBlockHeight(this.lastBlockHeight);
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
        this.hud.updateMempoolSize(info.size);
    }

    handleMempoolBlocks(blocks) {
        if (blocks.length > 0) {
            const nextBlock = blocks[0];
            this.hud.updateFeeRate(nextBlock.medianFee);
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
        const value = tx.value || (tx.vout ? tx.vout.reduce((sum, out) => sum + out.value, 0) : 0);

        const txData = {
            txid: tx.txid,
            value: value,
            feeRate: tx.rate || tx.feePerVsize || Math.round(tx.fee / tx.vsize),
            fee: tx.fee,
            vsize: tx.vsize,
            timestamp: Date.now()
        };

        // Add to visualization
        const transaction = this.transactionManager.addTransaction(txData);

        // Add to mining cube
        this.lightCycle.addTransaction(txData);

        // Check for whale
        const btcValue = value / 100000000;
        if (btcValue >= 10) {
            this.audioManager.playWhaleSound(btcValue >= 100);
        } else if (Math.random() < 0.1) {
            // Play transaction sound for some regular transactions
            this.audioManager.playTransactionSound();
        }
    }

    onError(error) {
        console.error('❌ WebSocket error:', error);
    }

    onClose() {
        console.log('🔌 WebSocket disconnected');
        this.isConnected = false;

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

            setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
        } else {
            console.log('⚠️ Max reconnection attempts reached. Starting demo mode.');
            this.startDemoMode();
        }
    }

    // Price polling (CoinGecko)
    async startPricePolling() {
        const fetchPrice = async () => {
            try {
                const response = await fetch(
                    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'
                );
                const data = await response.json();
                this.currentPrice = data.bitcoin.usd;
                this.hud.updatePrice(this.currentPrice);
            } catch (error) {
                console.error('❌ Price fetch failed:', error);
            }
        };

        // Initial fetch
        fetchPrice();

        // Poll every 30 seconds
        this.priceInterval = setInterval(fetchPrice, 30000);
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

        // Generate random transactions
        this.demoInterval = setInterval(() => {
            this.generateDemoTransaction();
        }, 200 + Math.random() * 800);

        // Occasional block (every 1-2 minutes in demo)
        setInterval(() => {
            if (Math.random() < 0.02) {
                const newHeight = (this.lastBlockHeight || 878000) + 1;
                this.handleNewBlock({ height: newHeight });
            }
        }, 1000);
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
        if (this.ws) {
            this.ws.close();
        }
        if (this.priceInterval) {
            clearInterval(this.priceInterval);
        }
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
        }
    }
}
