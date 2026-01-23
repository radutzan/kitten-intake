/**
 * Form Pagination Module - Handles mobile pagination dots and scroll behavior
 * Extracted from FormManager to improve modularity
 */

class FormPagination {
    constructor() {
        this.currentPageIndex = 0;
        this.scrollTimeout = null;
    }

    /**
     * Initialize scroll and overflow listeners
     */
    init() {
        this.setupScrollListener();
        this.setupDotsOverflowListeners();
    }

    /**
     * Set up scroll listener for tracking which form is visible
     */
    setupScrollListener() {
        const container = document.getElementById(Constants.ELEMENTS.KITTENS_CONTAINER);
        if (!container) return;

        container.addEventListener('scroll', () => {
            // Debounce scroll updates
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
            }
            this.scrollTimeout = setTimeout(() => {
                this.updateActiveDotFromScroll();
            }, 50);
        });
    }

    /**
     * Set up listeners for dots container overflow indicators
     */
    setupDotsOverflowListeners() {
        const dotsContainer = document.getElementById(Constants.ELEMENTS.PAGINATION_DOTS);
        if (!dotsContainer) return;

        dotsContainer.addEventListener('scroll', () => {
            this.updateDotsOverflow();
        });

        window.addEventListener('resize', () => {
            this.updateDotsOverflow();
        });
    }

    /**
     * Update pagination dots to match the number of kitten forms
     */
    updatePaginationDots() {
        const dotsContainer = document.getElementById(Constants.ELEMENTS.PAGINATION_DOTS);
        if (!dotsContainer) return;

        const kittenForms = document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`);
        const formCount = kittenForms.length;

        // Clear existing dots
        dotsContainer.innerHTML = '';

        // Only show dots if there's more than one form
        if (formCount <= 1) {
            this.updateDotsOverflow();
            return;
        }

        // Create dots
        for (let i = 0; i < formCount; i++) {
            const dot = document.createElement('button');
            dot.className = Constants.CSS.PAGINATION_DOT;
            dot.setAttribute('aria-label', `Go to cat ${i + 1}`);
            dot.setAttribute('type', 'button');

            if (i === this.currentPageIndex) {
                dot.classList.add(Constants.CSS.ACTIVE);
            }

            dot.addEventListener('click', () => {
                this.scrollToPage(i);
            });

            dotsContainer.appendChild(dot);
        }

        // Check for overflow after dots are added
        this.updateDotsOverflow();
    }

    /**
     * Update overflow indicators on the dots container
     */
    updateDotsOverflow() {
        const navCenter = document.getElementById(Constants.ELEMENTS.NAV_CENTER);
        const dotsContainer = document.getElementById(Constants.ELEMENTS.PAGINATION_DOTS);
        if (!navCenter || !dotsContainer) return;

        navCenter.classList.remove('overflow-left', 'overflow-right', 'overflow-both');

        const { scrollLeft, scrollWidth, clientWidth } = dotsContainer;
        const hasOverflow = scrollWidth > clientWidth;

        if (!hasOverflow) return;

        const atStart = scrollLeft <= 1;
        const atEnd = scrollLeft + clientWidth >= scrollWidth - 1;

        if (atStart && !atEnd) {
            navCenter.classList.add('overflow-right');
        } else if (!atStart && atEnd) {
            navCenter.classList.add('overflow-left');
        } else if (!atStart && !atEnd) {
            navCenter.classList.add('overflow-both');
        }
    }

    /**
     * Scroll to a specific page (kitten form) by index
     * @param {number} index - The page index to scroll to
     */
    scrollToPage(index) {
        const container = document.getElementById(Constants.ELEMENTS.KITTENS_CONTAINER);
        const kittenForms = document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`);

        if (!container || index < 0 || index >= kittenForms.length) return;

        const targetForm = kittenForms[index];
        const scrollLeft = targetForm.offsetLeft;

        container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
        });

        this.currentPageIndex = index;
        this.updateActiveDot();
    }

    /**
     * Update active dot based on current scroll position
     */
    updateActiveDotFromScroll() {
        const container = document.getElementById(Constants.ELEMENTS.KITTENS_CONTAINER);
        const kittenForms = document.querySelectorAll(`.${Constants.CSS.KITTEN_FORM}`);

        if (!container || kittenForms.length === 0) return;

        const scrollLeft = container.scrollLeft;
        const containerWidth = container.offsetWidth;

        // Find which form is most visible
        let newIndex = 0;
        let minDistance = Infinity;

        kittenForms.forEach((form, index) => {
            const formCenter = form.offsetLeft + (form.offsetWidth / 2);
            const viewCenter = scrollLeft + (containerWidth / 2);
            const distance = Math.abs(formCenter - viewCenter);

            if (distance < minDistance) {
                minDistance = distance;
                newIndex = index;
            }
        });

        if (newIndex !== this.currentPageIndex) {
            this.currentPageIndex = newIndex;
            this.updateActiveDot();
        }
    }

    /**
     * Update the active dot visual state and scroll it into view
     */
    updateActiveDot() {
        const dots = document.querySelectorAll(`.${Constants.CSS.PAGINATION_DOT}`);
        dots.forEach((dot, index) => {
            if (index === this.currentPageIndex) {
                dot.classList.add(Constants.CSS.ACTIVE);
                // Scroll active dot into view
                dot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            } else {
                dot.classList.remove(Constants.CSS.ACTIVE);
            }
        });
        // Update overflow state after scroll
        setTimeout(() => this.updateDotsOverflow(), 300);
    }

    /**
     * Get current page index
     * @returns {number} Current page index
     */
    getCurrentPageIndex() {
        return this.currentPageIndex;
    }

    /**
     * Set current page index (used when kitten is removed)
     * @param {number} index - New page index
     */
    setCurrentPageIndex(index) {
        this.currentPageIndex = index;
    }

    /**
     * Adjust page index when a kitten is removed
     * @param {number} formCount - Current number of forms after removal
     */
    adjustForRemovedKitten(formCount) {
        if (this.currentPageIndex >= formCount) {
            this.currentPageIndex = Math.max(0, formCount - 1);
        }
        this.updatePaginationDots();
    }

    /**
     * Scroll to newly added kitten on mobile
     * @param {number} formCount - Total number of forms
     */
    scrollToNewKitten(formCount) {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        if (isMobile && formCount > 1) {
            // On mobile, use horizontal scroll pagination
            const newIndex = formCount - 1;
            // Use setTimeout to ensure the DOM has updated
            setTimeout(() => {
                this.scrollToPage(newIndex);
            }, 50);
        }
    }
}

// Export to global namespace
window.FormPagination = FormPagination;
