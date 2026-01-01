/**
 * SATOSHIS GRID - HUD (Heads-Up Display)
 * Overlay UI for blockchain stats
 */

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
            menuClose: document.getElementById('menu-close')
        };

        this.setupEventListeners();
        this.startClock();
    }

    setupEventListeners() {
        // Logo click opens side menu
        if (this.elements.logoBtn) {
            this.elements.logoBtn.addEventListener('click', () => {
                this.toggleMenu();
            });
        }

        // Menu close button
        if (this.elements.menuClose) {
            this.elements.menuClose.addEventListener('click', () => {
                this.closeMenu();
            });
        }

        // Close menu on outside click
        document.addEventListener('click', (e) => {
            if (this.elements.sideMenu &&
                !this.elements.sideMenu.classList.contains('hidden') &&
                !this.elements.sideMenu.contains(e.target) &&
                !this.elements.logoBtn.contains(e.target)) {
                this.closeMenu();
            }
        });

        // Keyboard shortcut (Escape to close menu)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMenu();
            }
        });
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
                setTimeout(() => {
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

// Add notification animation to document
const style = document.createElement('style');
style.textContent = `
    @keyframes notification-fade {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    }
`;
document.head.appendChild(style);
