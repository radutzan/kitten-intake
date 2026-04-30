#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Determines the execution context for the footer update
 * @returns {Object} Context information including type and commit count adjustment
 */
function determineContext() {
    // Check for explicit context override
    const explicitContext = process.env.FOOTER_CONTEXT;
    if (explicitContext) {
        switch (explicitContext.toLowerCase()) {
            case 'local':
            case 'precommit':
                return { type: 'local', addOne: true, description: 'local pre-commit' };
            case 'github':
            case 'github-actions':
                return { type: 'github', addOne: false, description: 'GitHub Actions' };
            case 'ubuntu':
            case 'deploy':
            case 'server':
                return { type: 'ubuntu', addOne: false, description: 'Ubuntu server deployment' };
            default:
                console.warn(`⚠️  Unknown FOOTER_CONTEXT: ${explicitContext}, falling back to auto-detection`);
        }
    }

    // Auto-detect context based on environment
    if (process.env.GITHUB_ACTIONS === 'true') {
        return { type: 'github', addOne: false, description: 'GitHub Actions (auto-detected)' };
    }

    if (process.env.DEPLOY_CONTEXT === 'ubuntu' || process.env.USER === 'ubuntu' || process.env.SERVER_DEPLOYMENT === 'true') {
        return { type: 'ubuntu', addOne: false, description: 'Ubuntu server deployment (auto-detected)' };
    }

    // Default to local context
    return { type: 'local', addOne: true, description: 'local execution (auto-detected)' };
}

/**
 * Rewrites src/href attributes on <script> and <link> tags to include ?v=<version>,
 * forcing browsers and installed PWAs to fetch fresh assets after each commit.
 * External URLs (http(s)://, //, data:) are left untouched.
 */
function stampAssetVersions(html, version) {
    return html.replace(/<(script|link)\b[^>]*>/g, (tag) => {
        return tag.replace(/(src|href)="([^"]+)"/g, (match, attr, url) => {
            if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('#')) {
                return match;
            }
            const base = url.split('?')[0];
            return `${attr}="${base}?v=${version}"`;
        });
    });
}

/**
 * Stamps asset versions in a standalone HTML file (no footer update).
 */
function stampHtmlFile(htmlPath, version) {
    if (!fs.existsSync(htmlPath)) return;
    const original = fs.readFileSync(htmlPath, 'utf8');
    const stamped = stampAssetVersions(original, version);
    const rel = path.relative(path.join(__dirname, '..'), htmlPath);
    if (stamped !== original) {
        fs.writeFileSync(htmlPath, stamped, 'utf8');
        console.log(`✅ Stamped asset versions (?v=${version}) in ${rel}`);
    } else {
        console.log(`✅ Asset versions in ${rel} already at v=${version}`);
    }
}

/**
 * Updates the footer information in index.html including commit count and date
 */
function updateFooter() {
    try {
        // Determine execution context
        const context = determineContext();
        
        // Get the total commit count from git
        const currentCommitCount = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim());
        
        // Calculate display commit count based on context
        const displayCommitCount = context.addOne ? currentCommitCount + 1 : currentCommitCount;
        
        // Get today's date in MM/DD/YY format in US Pacific timezone
        const today = new Date();
        const pacificDate = new Date(today.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
        const month = (pacificDate.getMonth() + 1).toString().padStart(2, '0');
        const day = pacificDate.getDate().toString().padStart(2, '0');
        const year = pacificDate.getFullYear().toString().slice(-2);
        const todayFormatted = `${month}/${day}/${year}`;
        
        console.log(`🔧 Context: ${context.description}`);
        console.log(`📊 Found ${currentCommitCount} commits, updating footer to show ${displayCommitCount}`);
        console.log(`📅 Updating date to ${todayFormatted}`);
        
        // Read the current index.html
        const htmlPath = path.join(__dirname, '..', 'index.html');
        const originalHtmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Stamp asset versions before footer rewrite so the version bump and
        // footer change land in the same write.
        let htmlContent = stampAssetVersions(originalHtmlContent, displayCommitCount);

        // Find the footer section and locate the small element within it
        const footerStart = htmlContent.indexOf('<footer>');
        const footerEnd = htmlContent.indexOf('</footer>') + '</footer>'.length;
        
        if (footerStart === -1 || footerEnd === -1) {
            console.error('❌ Could not find footer element');
            return;
        }
        
        // Extract footer content and find the small element
        const footerContent = htmlContent.substring(footerStart, footerEnd);
        const smallStart = footerContent.indexOf('<small>');
        const smallEnd = footerContent.indexOf('</small>') + '</small>'.length;
        
        if (smallStart === -1 || smallEnd === -1) {
            console.error('❌ Could not find small element in footer');
            console.log('Footer content:', footerContent);
            return;
        }
        
        // Create the new footer content
        const newSmallContent = `<small>Updated ${todayFormatted} · <a href="https://github.com/radutzan/kitten-intake">#${displayCommitCount}</a> · For the cats</small>`;
        const newFooterContent = footerContent.substring(0, smallStart) + newSmallContent + footerContent.substring(smallEnd);
        
        // Replace the footer in the full HTML content
        const newHtmlContent = htmlContent.substring(0, footerStart) + newFooterContent + htmlContent.substring(footerEnd);
        
        // Check if anything has actually changed (footer text or asset versions)
        if (newHtmlContent === originalHtmlContent) {
            console.log(`✅ index.html already up to date (commit count ${displayCommitCount}, date ${todayFormatted}, v=${displayCommitCount})`);
        } else {
            fs.writeFileSync(htmlPath, newHtmlContent, 'utf8');
            console.log(`✅ Updated footer (#${displayCommitCount}, ${todayFormatted}) and stamped asset versions (?v=${displayCommitCount}) in index.html`);
        }

        // Stamp asset versions in any other HTML entry points.
        stampHtmlFile(path.join(__dirname, '..', 'calc', 'index.html'), displayCommitCount);

    } catch (error) {
        if (error.message.includes('git rev-list')) {
            console.error('❌ Error: This script must be run in a git repository');
        } else {
            console.error('❌ Error updating footer:', error.message);
        }
        process.exit(1);
    }
}

// Export for testing
if (require.main === module) {
    // Run the update when called directly
    updateFooter();
} else {
    // Export functions for testing
    module.exports = { updateFooter, determineContext, stampAssetVersions, stampHtmlFile };
}