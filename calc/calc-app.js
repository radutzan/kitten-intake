/**
 * /calc/ controller — wires the weight input to the meds table.
 *
 * The table is built once on load. On weight changes only the dose cells
 * are re-rendered (cheap; ~16 cells). Weight is persisted in localStorage
 * under its own key so refreshes / returns keep the value.
 */

(function () {
    'use strict';

    const KG_PER_LB = 0.45359237;
    const STORAGE_KEY = 'calc-weight-grams';

    const weightInput = document.getElementById('calc-weight');
    const weightDisplay = document.getElementById('calc-weight-display');
    const tbody = document.getElementById('meds-tbody');

    function gramsToLb(g) { return g / 1000 / KG_PER_LB; }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function renderTable() {
        const meds = MedsData.all();
        const rows = meds.map(med => `
            <tr data-med-id="${med.id}">
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

    weightInput.addEventListener('input', () => {
        updateDoses();
        persist();
    });
})();
