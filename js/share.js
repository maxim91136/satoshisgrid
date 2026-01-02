/**
 * SATOSHIS GRID - Share Moment
 * Captures a branded 1200x630 image from the WebGL canvas and overlays key HUD metrics.
 */

function getCssVar(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name);
    const trimmed = (value || '').trim();
    return trimmed || fallback;
}

function getTextById(id, fallback = '---') {
    const el = document.getElementById(id);
    const text = el?.textContent?.trim();
    return text && text.length ? text : fallback;
}

function isTypingTarget(target) {
    const tag = target?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;
}

function formatTimestampUtc() {
    // 2026-01-02 13:37 UTC
    return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

export class ShareManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;

        this.elements = {
            toggle: document.getElementById('share-toggle'),
            modal: document.getElementById('share-modal'),
            panel: document.querySelector('#share-modal .share-modal-panel'),
            close: document.getElementById('share-close'),
            preview: document.getElementById('share-preview'),
            download: document.getElementById('share-download'),
            copy: document.getElementById('share-copy'),
            postX: document.getElementById('share-x'),
        };

        this._toggleClickHandler = null;
        this._closeClickHandler = null;
        this._modalClickHandler = null;
        this._panelClickHandler = null;
        this._docKeydownHandler = null;
        this._downloadClickHandler = null;
        this._copyClickHandler = null;
        this._postXClickHandler = null;

        this._currentBlobUrl = null;
        this._currentShareText = '';
    }

    init() {
        if (!this.elements.toggle || !this.elements.modal) return;

        this._toggleClickHandler = async () => {
            await this.captureAndOpen();
        };
        this.elements.toggle.addEventListener('click', this._toggleClickHandler);

        this._closeClickHandler = () => this.close();
        this.elements.close?.addEventListener('click', this._closeClickHandler);

        // Click outside panel closes
        this._modalClickHandler = (e) => {
            // Prevent clicks from reaching the scene/window click handler.
            e.stopPropagation();
            if (!this.elements.panel) return;
            if (e.target === this.elements.modal) {
                this.close();
            }
        };
        this.elements.modal.addEventListener('click', this._modalClickHandler);

        // Prevent clicks inside the panel from bubbling to window
        this._panelClickHandler = (e) => {
            e.stopPropagation();
        };
        this.elements.panel?.addEventListener('click', this._panelClickHandler);

        this._docKeydownHandler = async (e) => {
            if (isTypingTarget(e.target)) return;

            const key = (e.key || '').toLowerCase();
            if (key === 'escape') {
                if (!this.elements.modal.classList.contains('hidden')) {
                    this.close();
                }
                return;
            }

            // Share shortcut
            if (key === 's' && !e.metaKey && !e.ctrlKey && !e.altKey) {
                if (!this.elements.modal.classList.contains('hidden')) return;
                await this.captureAndOpen();
            }
        };
        document.addEventListener('keydown', this._docKeydownHandler);

        this._downloadClickHandler = () => {
            if (!this._currentBlobUrl) return;
            const a = document.createElement('a');
            a.href = this._currentBlobUrl;
            a.download = `satoshisgrid-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        };
        this.elements.download?.addEventListener('click', this._downloadClickHandler);

        this._copyClickHandler = async () => {
            const text = this._currentShareText || this.buildShareText();
            const ok = await this.copyToClipboard(text);
            if (ok && this.elements.copy) {
                const old = this.elements.copy.textContent;
                this.elements.copy.textContent = 'COPIED';
                setTimeout(() => {
                    if (this.elements.copy) this.elements.copy.textContent = old;
                }, 900);
            }
        };
        this.elements.copy?.addEventListener('click', this._copyClickHandler);

        this._postXClickHandler = () => {
            const text = this._currentShareText || this.buildShareText();
            const url = `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank', 'noopener,noreferrer');
        };
        this.elements.postX?.addEventListener('click', this._postXClickHandler);
    }

    async captureAndOpen() {
        try {
            const pngBlob = await this.capturePngBlob({ width: 1200, height: 630 });
            if (!pngBlob) return;

            this._setBlobUrl(pngBlob);
            this._currentShareText = this.buildShareText();

            if (this.elements.preview) {
                this.elements.preview.src = this._currentBlobUrl;
            }

            this.open();
        } catch (err) {
            console.error('❌ Share capture failed:', err);
        }
    }

    open() {
        if (!this.elements.modal) return;
        this.elements.modal.classList.remove('hidden');
        this.elements.close?.focus?.();
    }

    close() {
        if (!this.elements.modal) return;
        this.elements.modal.classList.add('hidden');
    }

    buildShareText() {
        const blockHeight = getTextById('block-height', '---');
        const feeRate = getTextById('fee-rate', '---');
        const mempoolSize = getTextById('mempool-size', '---');
        const btcPrice = getTextById('btc-price', '---');

        const base = `SATOSHIS GRID — Block ${blockHeight} • ${feeRate} • ${mempoolSize} • ${btcPrice}`;

        // Include URL if meaningful
        const href = (typeof location !== 'undefined' && location.href) ? location.href : '';
        if (href && href.startsWith('http')) {
            return `${base}\n${href}`;
        }
        return base;
    }

    async capturePngBlob({ width, height }) {
        const renderer = this.sceneManager?.renderer;
        const srcCanvas = renderer?.domElement;
        if (!srcCanvas) return null;
        if (this.sceneManager?.contextLost) return null;

        // Ensure the latest frame is rendered before capture.
        if (typeof this.sceneManager.render === 'function') {
            this.sceneManager.render();
        }

        const out = document.createElement('canvas');
        out.width = width;
        out.height = height;
        const ctx = out.getContext('2d');
        if (!ctx) return null;

        // Draw the WebGL canvas as a covered background.
        const srcW = srcCanvas.width;
        const srcH = srcCanvas.height;
        const scale = Math.max(width / srcW, height / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        const dx = (width - drawW) / 2;
        const dy = (height - drawH) / 2;

        ctx.drawImage(srcCanvas, dx, dy, drawW, drawH);

        this.drawOverlay(ctx, { width, height });

        const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
        return blob;
    }

    drawOverlay(ctx, { width, height }) {
        const cyan = getCssVar('--electric-cyan', '#00ffff');
        const orange = getCssVar('--core-orange', '#f7931a');
        const white = getCssVar('--pure-white', '#ffffff');
        const dim = getCssVar('--text-dim', '#666666');

        // Bottom info bar
        const barH = Math.round(height * 0.22);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, height - barH, width, barH);

        // Brand (top-left)
        ctx.fillStyle = orange;
        ctx.font = '700 48px JetBrains Mono, Consolas, monospace';
        ctx.fillText('₿', 42, 72);

        ctx.fillStyle = cyan;
        ctx.font = '700 34px JetBrains Mono, Consolas, monospace';
        ctx.fillText('SATOSHIS GRID', 92, 72);

        // Timestamp (top-right)
        const timestamp = formatTimestampUtc();
        ctx.font = '500 16px JetBrains Mono, Consolas, monospace';
        ctx.fillStyle = dim;
        const tw = ctx.measureText(timestamp).width;
        ctx.fillText(timestamp, width - tw - 28, 40);

        // Metrics (bottom)
        const blockHeight = getTextById('block-height', '---');
        const btcPrice = getTextById('btc-price', '---');
        const mempoolSize = getTextById('mempool-size', '---');
        const feeRate = getTextById('fee-rate', '---');

        const leftX = 40;
        const baseY = height - barH + 58;

        ctx.fillStyle = white;
        ctx.font = '700 26px JetBrains Mono, Consolas, monospace';
        ctx.fillText(`Block ${blockHeight}`, leftX, baseY);

        ctx.fillStyle = cyan;
        ctx.font = '700 28px JetBrains Mono, Consolas, monospace';
        ctx.fillText(btcPrice, leftX, baseY + 40);

        ctx.fillStyle = white;
        ctx.font = '600 20px JetBrains Mono, Consolas, monospace';
        ctx.fillText(`Mempool: ${mempoolSize}`, leftX + 360, baseY);
        ctx.fillText(`Fee: ${feeRate}`, leftX + 360, baseY + 36);

        // Small signature
        ctx.fillStyle = dim;
        ctx.font = '500 14px JetBrains Mono, Consolas, monospace';
        const sig = 'satoshisgrid';
        const sw = ctx.measureText(sig).width;
        ctx.fillText(sig, width - sw - 28, height - 20);
    }

    async copyToClipboard(text) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch {
            // fallback below
        }

        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            ta.remove();
            return ok;
        } catch {
            return false;
        }
    }

    _setBlobUrl(blob) {
        if (this._currentBlobUrl) {
            URL.revokeObjectURL(this._currentBlobUrl);
            this._currentBlobUrl = null;
        }
        this._currentBlobUrl = URL.createObjectURL(blob);
    }

    dispose() {
        if (this.elements.toggle && this._toggleClickHandler) {
            this.elements.toggle.removeEventListener('click', this._toggleClickHandler);
        }
        if (this.elements.close && this._closeClickHandler) {
            this.elements.close.removeEventListener('click', this._closeClickHandler);
        }
        if (this.elements.modal && this._modalClickHandler) {
            this.elements.modal.removeEventListener('click', this._modalClickHandler);
        }
        if (this.elements.panel && this._panelClickHandler) {
            this.elements.panel.removeEventListener('click', this._panelClickHandler);
        }
        if (this._docKeydownHandler) {
            document.removeEventListener('keydown', this._docKeydownHandler);
        }
        if (this.elements.download && this._downloadClickHandler) {
            this.elements.download.removeEventListener('click', this._downloadClickHandler);
        }
        if (this.elements.copy && this._copyClickHandler) {
            this.elements.copy.removeEventListener('click', this._copyClickHandler);
        }
        if (this.elements.postX && this._postXClickHandler) {
            this.elements.postX.removeEventListener('click', this._postXClickHandler);
        }

        if (this._currentBlobUrl) {
            URL.revokeObjectURL(this._currentBlobUrl);
            this._currentBlobUrl = null;
        }

        this._toggleClickHandler = null;
        this._closeClickHandler = null;
        this._modalClickHandler = null;
        this._panelClickHandler = null;
        this._docKeydownHandler = null;
        this._downloadClickHandler = null;
        this._copyClickHandler = null;
        this._postXClickHandler = null;
    }
}
