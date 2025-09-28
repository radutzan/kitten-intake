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
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
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
        
        // Check if the content has actually changed
        if (newHtmlContent === htmlContent) {
            console.log(`✅ Footer is already up to date (commit count ${displayCommitCount}, date ${todayFormatted})`);
            return;
        }
        
        // Write the updated content back only if it has changed
        fs.writeFileSync(htmlPath, newHtmlContent, 'utf8');
        console.log(`✅ Updated footer with commit count ${displayCommitCount} and date ${todayFormatted} in index.html`);
        
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
    module.exports = { updateFooter, determineContext };
}