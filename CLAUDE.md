# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page HTML/JS application for rescued cat and kitten intake. It calculates medication dosages based on weight, documents medications given at intake, and generates printable records for fosters. No build step or server required—just open `index.html` in a browser.

## Development

**Local development:** Open `index.html` directly in a browser.

**Update footer before committing:**
```bash
node scripts/update-footer.js
```

## Architecture

The application uses vanilla JavaScript with a modular class-based architecture. All modules are loaded via `<script>` tags in `index.html` and communicate through the global `window.KittenApp` namespace.

### Module Hierarchy

```
MainApp (main-app.js)
├── AppState (app-state.js)      - Central state management, utilities
├── FormManager (form-manager.js) - Kitten form creation/validation
├── DoseCalculator (dose-calculator.js) - Medication dose calculations
├── ScheduleManager (schedule-manager.js) - Treatment schedules
├── ResultsDisplay (results-display.js) - Output rendering
├── PrintManager (print-manager.js) - Print functionality
└── localStorageManager (localStorage-manager.js) - Persistence
```

`MainApp` initializes all modules and sets up legacy global function wrappers (`window.addKitten`, `window.removeKitten`, etc.) for HTML event handlers.

### State Management

`AppState` holds centralized state (`kittens` array, `kittenCounter`). Global variables `window.kittens` and `window.kittenCounter` are defined as property accessors that sync with `AppState`.

### Data Flow

1. User interacts with form → `FormManager` handles input
2. `FormManager` calls `updateResultsAutomatically()` on `ResultsDisplay`
3. `ResultsDisplay` uses `DoseCalculator` for medication calculations
4. `localStorageManager` auto-saves form data on changes

## Deployment

Three deployment contexts (see `scripts/deploy/DEPLOYMENT_WORKFLOW.md`):
- **Local:** Manual commit, footer gets +1 to commit count
- **GitHub Actions:** Auto-deploys to GitHub Pages on push to main
- **Ubuntu Server:** Polls every 3 minutes via systemd timer
