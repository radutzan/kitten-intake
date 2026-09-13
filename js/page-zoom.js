/**
 * Page Zoom Module - Safari-style page zoom via a bottom sheet
 * Scales the whole page with CSS zoom (--page-zoom) and persists the level.
 * The initial level is applied by an inline script in <head> to avoid a flash.
 */

class PageZoomManager {
    constructor() {
        this.storageKey = 'cat-intake-page-zoom';
        // 100% is the max: larger levels overflow narrow phone layouts
        this.levels = [0.5, 0.75, 0.85, 1];

        this.sheet = document.getElementById('page-zoom-sheet');
        this.backdrop = document.getElementById('page-zoom-backdrop');
        this.valueBtn = this.sheet.querySelector('[data-zoom="reset"]');
        this.outBtn = this.sheet.querySelector('[data-zoom="out"]');
        this.inBtn = this.sheet.querySelector('[data-zoom="in"]');

        this.level = this.loadLevel();
        this.setupEventListeners();
        this.apply();
    }

    loadLevel() {
        try {
            const saved = parseFloat(localStorage.getItem(this.storageKey));
            if (this.levels.includes(saved)) return saved;
        } catch (e) {
            // localStorage unavailable; fall through to default
        }
        return 1;
    }

    setupEventListeners() {
        this.sheet.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-zoom]');
            if (!btn) return;

            switch (btn.dataset.zoom) {
                case 'out':
                    this.step(-1);
                    break;
                case 'in':
                    this.step(1);
                    break;
                case 'reset':
                    this.setLevel(1);
                    break;
            }
        });

        this.backdrop.addEventListener('click', () => this.close());

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) this.close();
        });
    }

    isOpen() {
        return this.sheet.classList.contains('open');
    }

    open() {
        this.sheet.classList.add('open');
        this.backdrop.classList.add('open');
    }

    close() {
        this.sheet.classList.remove('open');
        this.backdrop.classList.remove('open');
    }

    step(direction) {
        const index = this.levels.indexOf(this.level) + direction;
        if (index < 0 || index >= this.levels.length) return;
        this.setLevel(this.levels[index]);
    }

    setLevel(level) {
        this.level = level;
        this.apply();
        try {
            if (level === 1) {
                localStorage.removeItem(this.storageKey);
            } else {
                localStorage.setItem(this.storageKey, String(level));
            }
        } catch (e) {
            // Not persisted; zoom still applies for this session
        }
    }

    apply() {
        document.documentElement.style.setProperty('--page-zoom', this.level);

        const index = this.levels.indexOf(this.level);
        this.valueBtn.textContent = `${Math.round(this.level * 100)}%`;
        this.outBtn.disabled = index === 0;
        this.inBtn.disabled = index === this.levels.length - 1;
    }
}
