# Medication Checklist Behavior Documentation

## Overview

The application manages **5 medications** with various controls that determine what appears in the foster care output:

| Medication | Type | Form | Calculation |
|------------|------|------|-------------|
| **Panacur** | Dewormer | Liquid (mL) | `weight_lb × 0.2` |
| **Ponazuril** | Antiprotozoan | Liquid (mL) | `weight_lb × 0.23` |
| **Drontal** | Dewormer | Tablets | Weight-based tiers |
| **Revolution** | Topical flea/parasite | Liquid (mL) | Weight-based tiers |
| **Advantage II** | Topical flea | Liquid (mL) | Weight-based tiers |

---

## 1. Panacur

**Controls:**
- Duration radio buttons: 1, 3, or **5 days** (default)
- "Given" checkbox: **checked by default**

**Dose calculation:** `weight_lb × 0.2` mL (linear, no out-of-range)

**Checklist behavior:**

| Given checkbox | Duration | Foster schedule | Dispense summary |
|----------------|----------|-----------------|------------------|
| ✓ checked | 5 days | 4 days starting tomorrow | dose × 4 days |
| ✓ checked | 3 days | 2 days starting tomorrow | dose × 2 days |
| ✓ checked | 1 day | 0 days (nothing scheduled) | 0 mL |
| ☐ unchecked | 5 days | 5 days starting tomorrow | dose × 5 days |
| ☐ unchecked | 3 days | 3 days starting tomorrow | dose × 3 days |
| ☐ unchecked | 1 day | 1 day starting tomorrow | dose × 1 day |

**Formula:** `remaining_days = given ? (duration - 1) : duration`

---

## 2. Ponazuril

**Controls:**
- Duration radio buttons: 1 or **3 days** (default)
- "Given" checkbox: **checked by default**

**Dose calculation:** `weight_lb × 0.23` mL (linear, no out-of-range)

**Checklist behavior:** Identical logic to Panacur

| Given checkbox | Duration | Foster schedule | Dispense summary |
|----------------|----------|-----------------|------------------|
| ✓ checked | 3 days | 2 days starting tomorrow | dose × 2 days |
| ✓ checked | 1 day | 0 days (nothing scheduled) | 0 mL |
| ☐ unchecked | 3 days | 3 days starting tomorrow | dose × 3 days |
| ☐ unchecked | 1 day | 1 day starting tomorrow | dose × 1 day |

---

## 3. Drontal

**Controls:**
- "Given" checkbox: **checked by default**
- No duration option (always single dose)

**Dose calculation:** Weight-based tiers (tablets)

| Weight (lb) | Dose |
|-------------|------|
| 1.5 – 2 | ¼ tablet |
| 2 – 4 | ½ tablet |
| 4 – 9 | 1 tablet |
| 9 – 13 | 1½ tablets |
| 13 – 16 | 2 tablets |
| Outside range | "Out of range" |

**Checklist behavior:**

| Given checkbox | Weight valid | Foster schedule | Dispense summary |
|----------------|--------------|-----------------|------------------|
| ✓ checked | Any | Not included | 0 tablets |
| ☐ unchecked | In range | 1 dose on first foster day* | 1 tablet(s) |
| ☐ unchecked | Out of range | Not included | Not shown |

*Drontal is optimized to the first day that has other medications scheduled (`optimizeDrontalScheduling` in `results-display.js:202`).

---

## 4. Flea Medication (Revolution / Advantage II)

**Controls:**
- Topical selection radio: **Revolution** (default), Advantage, or Skip
- "Given" checkbox: **unchecked by default**, **disabled when Skip selected**

**Dose calculations:**

**Revolution:**

| Weight (lb) | Dose |
|-------------|------|
| 1.1 – 2.2 | 0.05 mL |
| 2.2 – 4.4 | 0.1 mL |
| 4.4 – 9 | 0.2 mL |
| 9 – 19.9 | 0.45 mL |
| Outside range | "Out of range" |

**Advantage II:**

| Weight (lb) | Dose |
|-------------|------|
| 0 – 1 | 0.05 mL |
| 1 – 5 | 0.1 mL |
| 5 – 9 | 0.2 mL |
| 9+ | 0.45 mL |

**Checklist behavior:**

| Topical selection | Given checkbox | Weight valid | Foster schedule | Dispense summary |
|-------------------|----------------|--------------|-----------------|------------------|
| Skip | (disabled, unchecked) | Any | Not included | Not shown |
| Revolution | ✓ checked | Any | Not included | 0 mL Revolution |
| Revolution | ☐ unchecked | In range | 1 dose, **2 days from today** | dose shown |
| Revolution | ☐ unchecked | Out of range | Not included | Not shown |
| Advantage | ✓ checked | Any | Not included | 0 mL Advantage |
| Advantage | ☐ unchecked | In range | 1 dose, **2 days from today** | dose shown |
| Advantage | ☐ unchecked | Out of range | Not included | Not shown |

**Key difference:** Flea medication has a **2-day delay** (`fleaDelayOffset = 2`) when scheduled for foster, vs 1-day delay for all other medications.

---

## Checkbox State Interactions

**Flea Given checkbox disabled state:**
```
Topical = Skip  →  fleaGiven.disabled = true, fleaGiven.checked = false
Topical = Revolution/Advantage  →  fleaGiven.disabled = false
```

**Copy settings from first kitten:** When adding subsequent kittens, these values are copied from kitten #1 (`form-manager.js:232`):
- Topical selection
- Flea Given state
- Panacur/Ponazuril/Drontal Given states
- Panacur duration
- Ponazuril duration
- Ringworm status

---

## Schedule Generation Summary

| Medication | Start offset | Condition to appear in foster schedule |
|------------|--------------|----------------------------------------|
| Panacur | Tomorrow (+1) | `remaining_days > 0` |
| Ponazuril | Tomorrow (+1) | `remaining_days > 0` |
| Drontal | First med day | `!given && dose ≠ "Out of range"` |
| Topical | +2 days | `selection ≠ "none" && !given && dose valid && dose > 0` |

See `schedule-manager.js:11-73` for the full schedule generation logic.

---

## Dispense Summary Display Rules

| Medication | Shown in summary when... |
|------------|--------------------------|
| Panacur | Always (shows 0 mL if nothing remaining) |
| Ponazuril | Always (shows 0 mL if nothing remaining) |
| Revolution | `totals.revolution > 0` |
| Advantage II | `totals.advantage > 0` |
| Drontal | `totals.drontal > 0` |

See `results-display.js:216-281` for the dispense summary logic.

---

## Default State on Form Creation

| Control | Default value |
|---------|---------------|
| Panacur duration | 5 days |
| Ponazuril duration | 3 days |
| Topical selection | Revolution |
| Panacur Given | ✓ checked |
| Ponazuril Given | ✓ checked |
| Drontal Given | ✓ checked |
| Flea Given | ☐ unchecked |
| Ringworm status | Not scanned |

This means with defaults: foster receives 4 days Panacur, 2 days Ponazuril, and 1 dose Revolution (delayed 2 days). No Drontal for foster.

---

## Key Source Files

- `js/dose-calculator.js` - All dose calculation formulas
- `js/form-manager.js` - Form HTML generation, checkbox defaults, event listeners
- `js/schedule-manager.js` - Schedule generation logic for foster checklist
- `js/results-display.js` - Foster checklist table and dispense summary rendering
