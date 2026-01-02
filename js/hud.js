/**
 * SATOSHIS GRID - HUD (Heads-Up Display)
 * Overlay UI for blockchain stats
 */

// Famous Bitcoin Quotes
const QUOTES = [
    { text: "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks", author: "Genesis Block" },
    { text: "Running bitcoin", author: "Hal Finney, 2009" },
    { text: "If you don't believe it or don't get it, I don't have the time to try to convince you, sorry.", author: "Satoshi Nakamoto" },
    { text: "The root problem with conventional currency is all the trust that's required to make it work.", author: "Satoshi Nakamoto" },
    { text: "Bitcoin is a technological tour de force.", author: "Bill Gates" },
    { text: "Bitcoin is a remarkable cryptographic achievement.", author: "Eric Schmidt" },
    { text: "We have elected to put our money and faith in a mathematical framework that is free of politics and human error.", author: "Tyler Winklevoss" },
    { text: "I think the internet is going to be one of the major forces for reducing the role of government. The one thing that's missing but that will soon be developed, is a reliable e-cash.", author: "Milton Friedman, 1999" },
    { text: "Bitcoin is not just code. It is energy.", author: "Unknown" },
    { text: "In cryptography we trust.", author: "Bitcoiner Wisdom" },
    { text: "Not your keys, not your coins.", author: "Bitcoin Proverb" },
    { text: "Stay humble, stack sats.", author: "Bitcoin Proverb" },
    { text: "HODL", author: "GameKyuubi, 2013" },
    { text: "Money is just information. Bitcoin is the purest form of that information.", author: "Michael Saylor" },
    { text: "Bitcoin is the first money that is not controlled by an army.", author: "Saifedean Ammous" },
    { text: "Every informed person needs to know about Bitcoin because it might be one of the world's most important developments.", author: "Leon Luow" },
    { text: "The blockchain is an incorruptible digital ledger.", author: "Don Tapscott" },
    { text: "21 million. Forever.", author: "The Protocol" },
    { text: "Tick Tock, Next Block.", author: "Bitcoin Proverb" },
];

export class HUD {
    constructor() {
        // Cache DOM elements
        this.elements = {
            blockHeight: document.getElementById('block-height'),
            hashRate: document.getElementById('hash-rate'),
            btcPrice: document.getElementById('btc-price'),
            mempoolSize: document.getElementById('mempool-size'),
            feeRate: document.getElementById('fee-rate'),
            logoBtn: document.getElementById('logo-btn'),
            sideMenu: document.getElementById('side-menu'),
            menuClose: document.getElementById('menu-close'),
        };

        this._logoClickHandler = null;
        this._menuCloseClickHandler = null;
        this._docClickHandler = null;
        this._docKeydownHandler = null;

        this._quoteStartTimeout = null;
        this._quoteFadeTimeout = null;
        this._quoteNextTimeout = null;
        this._priceColorTimeout = null;

        this.setupEventListeners();
        this.startClock();
        this.initQuoteSystem();
    }

    setupEventListeners() {
        // Logo click opens side menu
        if (this.elements.logoBtn) {
            this._logoClickHandler = () => {
                this.toggleMenu();
            };
            this.elements.logoBtn.addEventListener('click', this._logoClickHandler);
        }

        // Menu close button
        if (this.elements.menuClose) {
            this._menuCloseClickHandler = () => {
                this.closeMenu();
            };
            this.elements.menuClose.addEventListener('click', this._menuCloseClickHandler);
        }

        // Close menu on outside click
        this._docClickHandler = (e) => {
            if (this.elements.sideMenu &&
                !this.elements.sideMenu.classList.contains('hidden') &&
                !this.elements.sideMenu.contains(e.target) &&
                !this.elements.logoBtn.contains(e.target)) {
                this.closeMenu();
            }
        };
        document.addEventListener('click', this._docClickHandler);

        // Keyboard shortcut (Escape to close menu)
        this._docKeydownHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeMenu();
            }
        };
        document.addEventListener('keydown', this._docKeydownHandler);
    }

    toggleMenu() {
        if (this.elements.sideMenu) {
            this.elements.sideMenu.classList.toggle('hidden');
        }
    }

    closeMenu() {
        if (this.elements.sideMenu) {
            this.elements.sideMenu.classList.add('hidden');
        }
    }

    // Update block height display
    updateBlockHeight(height) {
        if (this.elements.blockHeight && height) {
            const formatted = height.toLocaleString();
            this.elements.blockHeight.textContent = formatted;

            // Flash effect on new block
            this.flashElement(this.elements.blockHeight);
        }
    }

    // Update hash rate display
    updateHashRate(hashrate) {
        if (this.elements.hashRate && hashrate) {
            // Convert to EH/s
            const ehps = (hashrate / 1e18).toFixed(0);
            this.elements.hashRate.textContent = `${ehps} EH/s`;
        }
    }

    // Update BTC price display
    updatePrice(price) {
        if (this.elements.btcPrice && price) {
            const formatted = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(price);

            // Check for price change
            const previousPrice = this.elements.btcPrice.dataset.price;
            if (previousPrice) {
                const prev = parseFloat(previousPrice);
                if (price > prev) {
                    this.elements.btcPrice.style.color = '#00ff00';
                } else if (price < prev) {
                    this.elements.btcPrice.style.color = '#ff0000';
                }
                if (this._priceColorTimeout) {
                    clearTimeout(this._priceColorTimeout);
                }
                this._priceColorTimeout = setTimeout(() => {
                    this.elements.btcPrice.style.color = '';
                }, 1000);
            }

            this.elements.btcPrice.textContent = formatted;
            this.elements.btcPrice.dataset.price = price;
        }
    }

    // Update mempool size display
    updateMempoolSize(size) {
        if (this.elements.mempoolSize && size != null) {
            const formatted = size.toLocaleString();
            this.elements.mempoolSize.textContent = `${formatted} TX`;
        }
    }

    // Update fee rate display
    updateFeeRate(feeRate) {
        if (this.elements.feeRate && feeRate != null) {
            this.elements.feeRate.textContent = `${Math.round(feeRate)} sat/vB`;

            // Color code based on fee level
            if (feeRate > 50) {
                this.elements.feeRate.style.color = '#ff0000';
            } else if (feeRate > 20) {
                this.elements.feeRate.style.color = '#f7931a';
            } else {
                this.elements.feeRate.style.color = '#00ffff';
            }
        }
    }

    // Flash animation for element
    flashElement(element) {
        element.style.transform = 'scale(1.1)';
        element.style.transition = 'transform 0.2s ease';

        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 200);
    }

    // Real-time clock (optional)
    startClock() {
        // Could add a clock element if desired
    }

    // Initialize rotating quote system
    initQuoteSystem() {
        // Create quote container
        this.quoteContainer = document.createElement('div');
        this.quoteContainer.className = 'floating-quote';
        this.quoteContainer.style.cssText = `
            position: fixed;
            top: 15%;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            pointer-events: none;
            z-index: 50;
            max-width: 70%;
            opacity: 0;
            transition: opacity 2s ease-in-out;
        `;

        this.quoteText = document.createElement('div');
        this.quoteText.style.cssText = `
            font-family: 'JetBrains Mono', monospace;
            font-size: 16px;
            font-style: italic;
            color: rgba(0, 255, 255, 0.4);
            text-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
            letter-spacing: 1px;
            line-height: 1.6;
            margin-bottom: 12px;
        `;

        this.quoteAuthor = document.createElement('div');
        this.quoteAuthor.style.cssText = `
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            color: rgba(247, 147, 26, 0.5);
            text-shadow: 0 0 15px rgba(247, 147, 26, 0.2);
            letter-spacing: 2px;
        `;

        this.quoteContainer.appendChild(this.quoteText);
        this.quoteContainer.appendChild(this.quoteAuthor);
        document.body.appendChild(this.quoteContainer);

        // Track shown quotes to avoid immediate repeats
        this.shownQuotes = [];
        this.currentQuoteIndex = -1;

        // Start rotation after a delay
        this._quoteStartTimeout = setTimeout(() => this.showNextQuote(), 3000);
    }

    showNextQuote() {
        // Pick a random quote (avoid recent ones)
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * QUOTES.length);
        } while (this.shownQuotes.includes(nextIndex) && this.shownQuotes.length < QUOTES.length - 2);

        // Track shown quotes (keep last 5)
        this.shownQuotes.push(nextIndex);
        if (this.shownQuotes.length > 5) {
            this.shownQuotes.shift();
        }

        const quote = QUOTES[nextIndex];

        // Fade out
        this.quoteContainer.style.opacity = '0';

        // Change quote after fade out
        if (this._quoteFadeTimeout) {
            clearTimeout(this._quoteFadeTimeout);
        }
        this._quoteFadeTimeout = setTimeout(() => {
            this.quoteText.textContent = `"${quote.text}"`;
            this.quoteAuthor.textContent = `— ${quote.author}`;

            // Fade in
            this.quoteContainer.style.opacity = '1';
        }, 2000);

        // Schedule next quote (30-45 seconds - longer display time)
        const nextDelay = 30000 + Math.random() * 15000;
        if (this._quoteNextTimeout) {
            clearTimeout(this._quoteNextTimeout);
        }
        this._quoteNextTimeout = setTimeout(() => this.showNextQuote(), nextDelay);
    }

    dispose() {
        if (this.elements.logoBtn && this._logoClickHandler) {
            this.elements.logoBtn.removeEventListener('click', this._logoClickHandler);
        }
        if (this.elements.menuClose && this._menuCloseClickHandler) {
            this.elements.menuClose.removeEventListener('click', this._menuCloseClickHandler);
        }
        if (this._docClickHandler) {
            document.removeEventListener('click', this._docClickHandler);
        }
        if (this._docKeydownHandler) {
            document.removeEventListener('keydown', this._docKeydownHandler);
        }

        this._logoClickHandler = null;
        this._menuCloseClickHandler = null;
        this._docClickHandler = null;
        this._docKeydownHandler = null;

        if (this._quoteStartTimeout) clearTimeout(this._quoteStartTimeout);
        if (this._quoteFadeTimeout) clearTimeout(this._quoteFadeTimeout);
        if (this._quoteNextTimeout) clearTimeout(this._quoteNextTimeout);
        if (this._priceColorTimeout) clearTimeout(this._priceColorTimeout);

        this._quoteStartTimeout = null;
        this._quoteFadeTimeout = null;
        this._quoteNextTimeout = null;
        this._priceColorTimeout = null;

        if (this.quoteContainer && this.quoteContainer.parentNode) {
            this.quoteContainer.parentNode.removeChild(this.quoteContainer);
        }
        this.quoteContainer = null;
        this.quoteText = null;
        this.quoteAuthor = null;
    }

    // Format large numbers
    formatNumber(num) {
        if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toString();
    }

    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 16px 32px;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid ${type === 'whale' ? '#f7931a' : '#00ffff'};
            color: ${type === 'whale' ? '#f7931a' : '#00ffff'};
            font-family: var(--font-mono);
            font-size: 14px;
            letter-spacing: 2px;
            z-index: 1000;
            animation: notification-fade 2s ease-out forwards;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    // Show whale alert
    showWhaleAlert(btcAmount) {
        const formatted = btcAmount.toFixed(2);
        this.showNotification(`🐋 WHALE ALERT: ${formatted} BTC`, 'whale');
    }
}

// Add notification animation to document (guard to avoid duplicates)
const existingStyle = document.getElementById('notification-style');
if (!existingStyle) {
    const style = document.createElement('style');
    style.id = 'notification-style';
    style.textContent = `
    @keyframes notification-fade {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    }
`;
    document.head.appendChild(style);
}
