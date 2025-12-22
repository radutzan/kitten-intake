/**
 * URL State Manager - Encodes/decodes form state to/from URL parameters
 * Supports temporary loading of shared URLs with eject-to-restore functionality
 *
 * Format: ?k=VERSION|name|weight|flags|name|weight|flags|...
 *
 * Version 1 bitfield layout (11 bits, encoded as 2 base64url chars):
 *   Bits 0-1:  topical (0=revolution, 1=advantage, 2=none)
 *   Bit 2:     fleaStatus (0=given, 1=bathed)
 *   Bits 3-4:  ringwormStatus (0=not-scanned, 1=negative, 2=positive)
 *   Bits 5-6:  panacurDays (0=1, 1=3, 2=5)
 *   Bit 7:     ponazurilDays (0=1, 1=3)
 *   Bit 8:     day1Given.panacur
 *   Bit 9:     day1Given.ponazuril
 *   Bit 10:    day1Given.drontal
 */

class UrlStateManager {
    constructor() {
        this.version = 1;
        this.paramKey = 'k';
        this.backupStorageKey = 'cat-intake-form-backup';
        this.loadedStateKey = 'cat-intake-url-loaded';

        // Base64url alphabet (RFC 4648 - URL safe)
        this.b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

        // Enum mappings for version 1
        this.v1 = {
            topical: ['revolution', 'advantage', 'none'],
            fleaStatus: ['given', 'bathed'],
            ringwormStatus: ['not-scanned', 'negative', 'positive'],
            panacurDays: ['1', '3', '5'],
            ponazurilDays: ['1', '3']
        };

        // Debounce timer for real-time URL updates
        this._updateTimer = null;
        this._updateDelay = 300; // ms
    }

    /**
     * Update URL in real-time (debounced)
     * Call this on every form change
     */
    updateUrlRealtime() {
        // Don't update URL while viewing temporary shared state
        if (this.isTemporaryStateLoaded()) return;

        // Debounce to avoid excessive URL updates
        clearTimeout(this._updateTimer);
        this._updateTimer = setTimeout(() => {
            this._doUpdateUrl();
        }, this._updateDelay);
    }

    /**
     * Immediately update URL (no debounce)
     */
    updateUrlNow() {
        if (this.isTemporaryStateLoaded()) return;
        clearTimeout(this._updateTimer);
        this._doUpdateUrl();
    }

    _doUpdateUrl() {
        const kittenForms = document.querySelectorAll('.kitten-form');
        if (kittenForms.length === 0) {
            // No forms, clear URL
            this.clearUrlState();
            return;
        }

        const encoded = this._encodeCurrentState();
        if (encoded) {
            const url = new URL(window.location.href);
            url.search = `?${this.paramKey}=${encoded}`;
            window.history.replaceState({}, '', url.toString());
        }
    }

    _encodeCurrentState() {
        const kittenForms = document.querySelectorAll('.kitten-form');
        if (kittenForms.length === 0) return null;

        const parts = [this.version.toString()];

        kittenForms.forEach(form => {
            const kittenId = form.id;

            const name = document.getElementById(`${kittenId}-name`)?.value.trim() || '';
            const weight = document.getElementById(`${kittenId}-weight`)?.value || '';

            const topical = document.querySelector(`input[name="${kittenId}-topical"]:checked`)?.value || 'revolution';
            const fleaStatus = document.querySelector(`input[name="${kittenId}-flea-status"]:checked`)?.value || 'bathed';
            const panacur = document.querySelector(`input[name="${kittenId}-panacur"]:checked`)?.value || '5';
            const ponazuril = document.querySelector(`input[name="${kittenId}-ponazuril"]:checked`)?.value || '3';
            const ringwormStatus = document.querySelector(`input[name="${kittenId}-ringworm-status"]:checked`)?.value || 'not-scanned';

            const day1Given = {
                panacur: document.getElementById(`${kittenId}-panacur-day1`)?.checked ?? true,
                ponazuril: document.getElementById(`${kittenId}-ponazuril-day1`)?.checked ?? true,
                drontal: document.getElementById(`${kittenId}-drontal-day1`)?.checked ?? true
            };

            const kitten = { topical, fleaStatus, ringwormStatus, panacur, ponazuril, day1Given };
            const flags = this.encodeFlags(kitten);

            parts.push(encodeURIComponent(name), weight, flags);
        });

        return parts.join('|');
    }

    /**
     * Encode a number to base64url (2 chars for up to 12 bits)
     */
    toBase64Url(num, chars = 2) {
        let result = '';
        for (let i = 0; i < chars; i++) {
            result += this.b64Chars[num & 63];
            num >>= 6;
        }
        return result;
    }

    /**
     * Decode base64url back to a number
     */
    fromBase64Url(str) {
        let num = 0;
        for (let i = str.length - 1; i >= 0; i--) {
            num = (num << 6) | this.b64Chars.indexOf(str[i]);
        }
        return num;
    }

    /**
     * Encode flags for a single kitten (version 1)
     */
    encodeFlags(kitten) {
        let bits = 0;

        // Bits 0-1: topical
        const topicalIndex = this.v1.topical.indexOf(kitten.topical);
        bits |= (topicalIndex >= 0 ? topicalIndex : 0);

        // Bit 2: fleaStatus
        const fleaIndex = this.v1.fleaStatus.indexOf(kitten.fleaStatus);
        bits |= (fleaIndex >= 0 ? fleaIndex : 0) << 2;

        // Bits 3-4: ringwormStatus
        const ringwormIndex = this.v1.ringwormStatus.indexOf(kitten.ringwormStatus);
        bits |= (ringwormIndex >= 0 ? ringwormIndex : 0) << 3;

        // Bits 5-6: panacurDays (1, 3, or 5)
        const panacurIndex = this.v1.panacurDays.indexOf(kitten.panacur);
        bits |= (panacurIndex >= 0 ? panacurIndex : 2) << 5; // default to 5 days

        // Bit 7: ponazurilDays (1 or 3)
        const ponazurilIndex = this.v1.ponazurilDays.indexOf(kitten.ponazuril);
        bits |= (ponazurilIndex >= 0 ? ponazurilIndex : 1) << 7; // default to 3 days

        // Bits 8-10: day1Given
        bits |= (kitten.day1Given?.panacur ? 1 : 0) << 8;
        bits |= (kitten.day1Given?.ponazuril ? 1 : 0) << 9;
        bits |= (kitten.day1Given?.drontal ? 1 : 0) << 10;

        return this.toBase64Url(bits, 2);
    }

    /**
     * Decode flags for a single kitten (version 1)
     */
    decodeFlags(flagStr) {
        const bits = this.fromBase64Url(flagStr);

        return {
            topical: this.v1.topical[bits & 0x3] || 'revolution',
            fleaStatus: this.v1.fleaStatus[(bits >> 2) & 0x1] || 'given',
            ringwormStatus: this.v1.ringwormStatus[(bits >> 3) & 0x3] || 'not-scanned',
            panacur: this.v1.panacurDays[(bits >> 5) & 0x3] || '5',
            ponazuril: this.v1.ponazurilDays[(bits >> 7) & 0x1] || '3',
            day1Given: {
                panacur: !!((bits >> 8) & 0x1),
                ponazuril: !!((bits >> 9) & 0x1),
                drontal: !!((bits >> 10) & 0x1)
            }
        };
    }

    /**
     * Encode current form state to URL string
     * Returns the full URL with encoded state
     */
    encodeToUrl() {
        const kittenForms = document.querySelectorAll('.kitten-form');
        if (kittenForms.length === 0) return null;

        const parts = [this.version.toString()];

        kittenForms.forEach(form => {
            const kittenId = form.id;

            // Collect kitten data
            const name = document.getElementById(`${kittenId}-name`)?.value.trim() || '';
            const weight = document.getElementById(`${kittenId}-weight`)?.value || '';

            const topical = document.querySelector(`input[name="${kittenId}-topical"]:checked`)?.value || 'revolution';
            const fleaStatus = document.querySelector(`input[name="${kittenId}-flea-status"]:checked`)?.value || 'bathed';
            const panacur = document.querySelector(`input[name="${kittenId}-panacur"]:checked`)?.value || '5';
            const ponazuril = document.querySelector(`input[name="${kittenId}-ponazuril"]:checked`)?.value || '3';
            const ringwormStatus = document.querySelector(`input[name="${kittenId}-ringworm-status"]:checked`)?.value || 'not-scanned';

            const day1Given = {
                panacur: document.getElementById(`${kittenId}-panacur-day1`)?.checked ?? true,
                ponazuril: document.getElementById(`${kittenId}-ponazuril-day1`)?.checked ?? true,
                drontal: document.getElementById(`${kittenId}-drontal-day1`)?.checked ?? true
            };

            const kitten = { topical, fleaStatus, ringwormStatus, panacur, ponazuril, day1Given };
            const flags = this.encodeFlags(kitten);

            // URL-encode the name to handle special characters
            parts.push(encodeURIComponent(name), weight, flags);
        });

        const encoded = parts.join('|');
        const url = new URL(window.location.href);
        url.search = `?${this.paramKey}=${encoded}`;

        return url.toString();
    }

    /**
     * Decode URL parameter to form data structure
     * Returns data compatible with LocalStorageManager.restoreFormData()
     */
    decodeFromUrl(urlString = window.location.href) {
        const url = new URL(urlString);
        const encoded = url.searchParams.get(this.paramKey);

        if (!encoded) return null;

        const parts = encoded.split('|');
        if (parts.length < 4) return null; // At least version + 1 kitten (name, weight, flags)

        const version = parseInt(parts[0]);
        if (version !== 1) {
            console.warn(`Unknown URL state version: ${version}`);
            return null;
        }

        // Parse kittens (3 parts each: name, weight, flags)
        const kittens = {};
        const activeKittens = [];
        let kittenIndex = 1;

        for (let i = 1; i < parts.length; i += 3) {
            if (i + 2 >= parts.length) break; // Incomplete kitten data

            const name = decodeURIComponent(parts[i]);
            const weight = parts[i + 1];
            const flags = this.decodeFlags(parts[i + 2]);

            const kittenId = `kitten-${kittenIndex}`;
            activeKittens.push(kittenId);

            kittens[kittenId] = {
                name,
                weight,
                ...flags
            };

            kittenIndex++;
        }

        if (activeKittens.length === 0) return null;

        return {
            appState: {
                kittenCounter: kittenIndex - 1,
                activeKittens
            },
            kittens
        };
    }

    /**
     * Check if current URL has encoded state
     */
    hasUrlState() {
        const url = new URL(window.location.href);
        return url.searchParams.has(this.paramKey);
    }

    /**
     * Clear state from URL without reloading
     */
    clearUrlState() {
        const url = new URL(window.location.href);
        url.searchParams.delete(this.paramKey);
        window.history.replaceState({}, '', url.toString());
    }

    // ========================================
    // Temporary Load / Eject Functionality
    // ========================================

    /**
     * Check if we're currently viewing a temporarily loaded URL state
     */
    isTemporaryStateLoaded() {
        try {
            return sessionStorage.getItem(this.loadedStateKey) === 'true';
        } catch (e) {
            return false;
        }
    }

    /**
     * Backup current localStorage data before loading URL state
     */
    backupCurrentState() {
        try {
            const currentData = localStorage.getItem('cat-intake-form-data');
            if (currentData) {
                sessionStorage.setItem(this.backupStorageKey, currentData);
            }
            sessionStorage.setItem(this.loadedStateKey, 'true');
            return true;
        } catch (e) {
            console.warn('Failed to backup current state:', e);
            return false;
        }
    }

    /**
     * Check if there's a backup available to restore
     */
    hasBackup() {
        try {
            return sessionStorage.getItem(this.backupStorageKey) !== null;
        } catch (e) {
            return false;
        }
    }

    /**
     * Get info about the backed up state (for UI display)
     */
    getBackupInfo() {
        try {
            const backup = sessionStorage.getItem(this.backupStorageKey);
            if (!backup) return null;

            const data = JSON.parse(backup);
            const kittenCount = data.data?.appState?.activeKittens?.length || 0;
            const timestamp = data.timestamp ? new Date(data.timestamp) : null;

            return {
                kittenCount,
                timestamp,
                formattedTime: timestamp ? timestamp.toLocaleString() : 'Unknown'
            };
        } catch (e) {
            return null;
        }
    }

    /**
     * Eject the temporary URL state and restore the backed up data
     * Returns true if successful
     */
    ejectAndRestore() {
        try {
            const backup = sessionStorage.getItem(this.backupStorageKey);

            // Clear the URL state
            this.clearUrlState();

            // Clear temporary state flag
            sessionStorage.removeItem(this.loadedStateKey);

            if (backup) {
                // Restore the backed up localStorage data
                localStorage.setItem('cat-intake-form-data', backup);
                sessionStorage.removeItem(this.backupStorageKey);

                // Reload the page to restore the form
                window.location.reload();
                return true;
            } else {
                // No backup - just clear and reload with empty form
                localStorage.removeItem('cat-intake-form-data');
                window.location.reload();
                return true;
            }
        } catch (e) {
            console.warn('Failed to eject and restore:', e);
            return false;
        }
    }

    /**
     * Keep the URL state as the new permanent state
     * Clears the backup and saves URL state to localStorage
     */
    keepUrlState() {
        try {
            // Clear the backup
            sessionStorage.removeItem(this.backupStorageKey);
            sessionStorage.removeItem(this.loadedStateKey);

            // Clear URL parameter (data is now in localStorage via auto-save)
            this.clearUrlState();

            // Trigger a save to localStorage
            if (window.localStorageManager) {
                window.localStorageManager.saveFormData();
            }

            return true;
        } catch (e) {
            console.warn('Failed to keep URL state:', e);
            return false;
        }
    }

    /**
     * Load URL state temporarily, backing up current data first
     * Call this on page load when URL has state parameter
     */
    loadTemporarily() {
        if (!this.hasUrlState()) return false;

        const urlData = this.decodeFromUrl();
        if (!urlData) return false;

        // Backup current localStorage data
        this.backupCurrentState();

        // The actual form restoration will be handled by the app
        // This just prepares the backup
        return urlData;
    }

    /**
     * Copy shareable URL to clipboard
     * Returns true if successful
     */
    async copyShareUrl() {
        const url = this.encodeToUrl();
        if (!url) return false;

        try {
            await navigator.clipboard.writeText(url);
            return true;
        } catch (e) {
            console.warn('Failed to copy to clipboard:', e);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    }

    /**
     * Get a preview of the encoded URL (for display)
     */
    getUrlPreview() {
        const url = this.encodeToUrl();
        if (!url) return null;

        return {
            full: url,
            length: url.length,
            paramOnly: new URL(url).search
        };
    }
}

// Export to global namespace
window.UrlStateManager = UrlStateManager;
