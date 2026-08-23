/**
 * /calc/ controller — wires the weight input to the meds table.
 *
 * The table is built once on load, sorted alphabetically by medication name.
 * On weight changes only the dose cells are re-rendered (cheap; ~16 cells).
 * The search box filters rows in place by toggling a class, so dose cells
 * survive filtering and never need recomputing.
 *
 * Weight is persisted in localStorage under its own key so refreshes /
 * returns keep the value. The search term is deliberately NOT persisted —
 * a stale filter on load would look like missing medications.
 */

(function () {
    'use strict';

    const KG_PER_LB = 0.45359237;
    const STORAGE_KEY = 'calc-weight-grams';

    const weightInput = document.getElementById('calc-weight');
    const weightDisplay = document.getElementById('calc-weight-display');
    const searchInput = document.getElementById('calc-search');
    const table = document.querySelector('.meds-table');
    const tbody = document.getElementById('meds-tbody');
    const noResults = document.getElementById('calc-no-results');
    const noResultsTerm = document.getElementById('calc-no-results-term');

    function gramsToLb(g) { return g / 1000 / KG_PER_LB; }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /** Alphabetical by display name, case- and accent-insensitive. */
    function sortedMeds() {
        return MedsData.all().slice().sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
    }

    /** Everything a search term can match against, lowercased once at build time. */
    function searchHaystack(med) {
        return [med.name, med.concentration, med.calculationText, med.notes, med.warning]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
    }

    function renderTable() {
        const rows = sortedMeds().map(med => `
            <tr data-med-id="${med.id}" data-search="${escapeHtml(searchHaystack(med))}">
                <td class="col-name">${escapeHtml(med.name)}</td>
                <td class="col-conc">${escapeHtml(med.concentration || '')}</td>
                <td class="col-calc calc-text">${escapeHtml(med.calculationText || '')}</td>
                <td class="col-dose dose-cell" data-dose-cell="${med.id}"></td>
                <td class="col-notes notes-cell">${renderNotesCell(med)}</td>
            </tr>
        `).join('');
        tbody.innerHTML = rows;
    }

    function renderNotesCell(med) {
        const parts = [];
        if (med.notes) parts.push(escapeHtml(med.notes));
        if (med.warning) parts.push(`<span class="warning">⚠ ${escapeHtml(med.warning)}</span>`);
        return parts.join('');
    }

    /**
     * Filters rows against the search box. Multiple words are ANDed, so
     * "onda inj" finds Ondansetron (Injectable) regardless of word order.
     */
    function applyFilter() {
        const query = searchInput.value.trim().toLowerCase();
        const terms = query ? query.split(/\s+/) : [];
        let visible = 0;

        for (const row of tbody.rows) {
            const haystack = row.dataset.search || '';
            const match = terms.every(term => haystack.includes(term));
            row.classList.toggle('is-filtered-out', !match);
            if (match) visible++;
        }

        const empty = visible === 0;
        table.classList.toggle('is-empty', empty);
        noResults.hidden = !empty;
        if (empty) noResultsTerm.textContent = searchInput.value.trim();
    }

    function updateDoses() {
        const grams = parseFloat(weightInput.value);

        if (!grams || grams <= 0) {
            weightDisplay.textContent = '';
            for (const cell of tbody.querySelectorAll('[data-dose-cell]')) {
                cell.textContent = '';
                cell.classList.remove('out-of-range');
            }
            return;
        }

        const weightLb = gramsToLb(grams);
        weightDisplay.textContent = `${weightLb.toFixed(2)} lb`;

        for (const med of MedsData.all()) {
            const cell = tbody.querySelector(`[data-dose-cell="${med.id}"]`);
            if (!cell) continue;
            const result = MedCalculator.compute(med, weightLb);
            cell.textContent = result.displayValue;
            cell.classList.toggle('out-of-range', result.isOutOfRange);
        }
    }

    function loadPersisted() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) weightInput.value = saved;
        } catch (e) {
            // localStorage may be unavailable; non-fatal.
        }
    }

    function persist() {
        try {
            if (weightInput.value) {
                localStorage.setItem(STORAGE_KEY, weightInput.value);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch (e) {
            // non-fatal
        }
    }

    renderTable();
    loadPersisted();
    updateDoses();
    applyFilter();

    weightInput.addEventListener('input', () => {
        updateDoses();
        persist();
    });

    searchInput.addEventListener('input', applyFilter);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchInput.value) {
            searchInput.value = '';
            applyFilter();
        }
    });
})();
