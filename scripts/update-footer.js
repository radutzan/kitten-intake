#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Updates the footer information in index.html including commit count and date
 */
function updateFooter() {
    try {
        // Get the total commit count from git
        const currentCommitCount = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim());
        
        // Determine if running in GitHub Actions or locally
        const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
        
        // If local: add 1 for upcoming manual commit
        // If GitHub Actions: use current count (workflow will commit after script runs)
        const displayCommitCount = isGitHubActions ? currentCommitCount : currentCommitCount + 1;
        
        // Get today's date in MM/DD/YY format in US Pacific timezone
        const today = new Date();
        const pacificDate = new Date(today.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
        const month = (pacificDate.getMonth() + 1).toString().padStart(2, '0');
        const day = pacificDate.getDate().toString().padStart(2, '0');
        const year = pacificDate.getFullYear().toString().slice(-2);
        const todayFormatted = `${month}/${day}/${year}`;
        
        const context = isGitHubActions ? 'GitHub Actions' : 'local execution';
        console.log(`Found ${currentCommitCount} commits, updating footer to show ${displayCommitCount} (${context})`);
        console.log(`Updating date to ${todayFormatted}`);
        
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

// Run the update
updateFooter();