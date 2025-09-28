#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

/**
 * Updates the commit count in the footer of index.html
 */
function updateCommitCount() {
    try {
        // Get the total commit count from git and add 1 (for the upcoming commit)
        const currentCommitCount = parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim());
        const futureCommitCount = currentCommitCount + 1;
        
        // Get today's date in MM/DD/YY format
        const today = new Date();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const year = today.getFullYear().toString().slice(-2);
        const todayFormatted = `${month}/${day}/${year}`;
        
        console.log(`Found ${currentCommitCount} commits, updating to ${futureCommitCount} for upcoming commit`);
        console.log(`Updating date to ${todayFormatted}`);
        
        // Read the current index.html
        const htmlPath = path.join(__dirname, 'index.html');
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
        const newSmallContent = `<small>Updated ${todayFormatted} · <a href="https://github.com/radutzan/kitten-intake">Build ${futureCommitCount}</a> · For the cats</small>`;
        const newFooterContent = footerContent.substring(0, smallStart) + newSmallContent + footerContent.substring(smallEnd);
        
        // Replace the footer in the full HTML content
        const newHtmlContent = htmlContent.substring(0, footerStart) + newFooterContent + htmlContent.substring(footerEnd);
        
        // Write the updated content back
        fs.writeFileSync(htmlPath, newHtmlContent, 'utf8');
        console.log(`✅ Updated commit count to ${futureCommitCount} and date to ${todayFormatted} in index.html`);
        
    } catch (error) {
        if (error.message.includes('git rev-list')) {
            console.error('❌ Error: This script must be run in a git repository');
        } else {
            console.error('❌ Error updating commit count:', error.message);
        }
        process.exit(1);
    }
}

// Run the update
updateCommitCount();