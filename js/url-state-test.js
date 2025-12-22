/**
 * Test script for UrlStateManager
 * Run in browser console after loading index.html with url-state-manager.js included
 *
 * Usage: load this file, then call testUrlState() in the console
 */

function testUrlState() {
    const manager = new UrlStateManager();

    console.log('=== URL State Manager Test ===\n');

    // Test base64 encoding
    console.log('1. Base64 encoding test:');
    for (let i = 0; i < 2048; i += 400) {
        const encoded = manager.toBase64Url(i, 2);
        const decoded = manager.fromBase64Url(encoded);
        console.log(`   ${i} → "${encoded}" → ${decoded} ${i === decoded ? '✓' : '✗'}`);
    }

    // Test flag encoding with sample data
    console.log('\n2. Flag encoding test (v1 - 11 bits):');
    const testCases = [
        {
            name: 'All defaults (rev, given, not-scanned, 5d pan, 3d pon, all day1)',
            kitten: {
                topical: 'revolution',
                fleaStatus: 'given',
                ringwormStatus: 'not-scanned',
                panacur: '5',
                ponazuril: '3',
                day1Given: { panacur: true, ponazuril: true, drontal: true }
            }
        },
        {
            name: 'All alternate values',
            kitten: {
                topical: 'none',
                fleaStatus: 'bathed',
                ringwormStatus: 'positive',
                panacur: '1',
                ponazuril: '1',
                day1Given: { panacur: false, ponazuril: false, drontal: false }
            }
        },
        {
            name: 'Mixed: advantage, bathed, negative, 3d pan, 1d pon',
            kitten: {
                topical: 'advantage',
                fleaStatus: 'bathed',
                ringwormStatus: 'negative',
                panacur: '3',
                ponazuril: '1',
                day1Given: { panacur: true, ponazuril: false, drontal: true }
            }
        },
        {
            name: 'Panacur 1 day only',
            kitten: {
                topical: 'revolution',
                fleaStatus: 'given',
                ringwormStatus: 'not-scanned',
                panacur: '1',
                ponazuril: '3',
                day1Given: { panacur: true, ponazuril: true, drontal: true }
            }
        }
    ];

    testCases.forEach(tc => {
        const encoded = manager.encodeFlags(tc.kitten);
        const decoded = manager.decodeFlags(encoded);
        const match =
            decoded.topical === tc.kitten.topical &&
            decoded.fleaStatus === tc.kitten.fleaStatus &&
            decoded.ringwormStatus === tc.kitten.ringwormStatus &&
            decoded.panacur === tc.kitten.panacur &&
            decoded.ponazuril === tc.kitten.ponazuril &&
            decoded.day1Given.panacur === tc.kitten.day1Given.panacur &&
            decoded.day1Given.ponazuril === tc.kitten.day1Given.ponazuril &&
            decoded.day1Given.drontal === tc.kitten.day1Given.drontal;

        console.log(`   ${tc.name}:`);
        console.log(`     "${encoded}" ${match ? '✓' : '✗'}`);
        if (!match) {
            console.log('     Expected:', tc.kitten);
            console.log('     Got:', decoded);
        }
    });

    // Test full URL encoding if forms exist
    console.log('\n3. Current form encoding:');
    const preview = manager.getUrlPreview();
    if (preview) {
        console.log(`   URL length: ${preview.length} chars`);
        console.log(`   Param: ${preview.paramOnly}`);
        console.log(`   Full URL: ${preview.full}`);

        // Test round-trip
        console.log('\n4. Round-trip test:');
        const decoded = manager.decodeFromUrl(preview.full);
        console.log('   Decoded data:', decoded);
    } else {
        console.log('   (No kitten forms found - add some kittens first)');
    }

    // Test temporary state functionality
    console.log('\n5. Temporary state check:');
    console.log(`   Is temporary state loaded: ${manager.isTemporaryStateLoaded()}`);
    console.log(`   Has backup: ${manager.hasBackup()}`);
    const backupInfo = manager.getBackupInfo();
    if (backupInfo) {
        console.log(`   Backup info: ${backupInfo.kittenCount} kittens from ${backupInfo.formattedTime}`);
    }

    console.log('\n=== Test Complete ===');
    console.log('\nUseful methods:');
    console.log('  manager.encodeToUrl()          - Get shareable URL');
    console.log('  manager.decodeFromUrl(url)     - Parse URL state');
    console.log('  manager.copyShareUrl()         - Copy URL to clipboard');
    console.log('  manager.hasUrlState()          - Check if URL has state');
    console.log('  manager.isTemporaryStateLoaded() - Check if viewing shared form');
    console.log('  manager.ejectAndRestore()      - Return to your own data');
    console.log('  manager.keepUrlState()         - Keep shared data as yours');

    return manager;
}

// Example URLs for reference
function showExampleUrls() {
    const manager = new UrlStateManager();

    console.log('=== Example Encoded URLs (v1) ===\n');

    // Simulate encoding for display purposes
    const examples = [
        {
            desc: 'Single kitten: Mittens, 450g, all defaults',
            url: '?k=1|Mittens|450|oG'
        },
        {
            desc: 'Two kittens with mixed settings',
            url: '?k=1|Mittens|450|oG|Whiskers|380|VB'
        },
        {
            desc: 'Three kittens, various weights',
            url: '?k=1|Luna|520|oG|Oliver|380|VB|Bella|290|oj'
        },
        {
            desc: 'Name with spaces and special chars',
            url: '?k=1|Mr%20Fluffy|400|oG|Princess%20%F0%9F%90%B1|350|oG'
        }
    ];

    examples.forEach(ex => {
        console.log(`${ex.desc}:`);
        console.log(`  ${ex.url}`);
        console.log(`  Length: ${ex.url.length} chars\n`);
    });

    // Decode an example
    console.log('Decoding example (Two kittens):');
    const decoded = manager.decodeFromUrl('http://example.com/?k=1|Mittens|450|oG|Whiskers|380|VB');
    console.log(decoded);
}

// Test the temporary load flow
function testTemporaryLoad() {
    const manager = new UrlStateManager();

    console.log('=== Temporary Load Flow Test ===\n');

    console.log('Current state:');
    console.log(`  URL has state: ${manager.hasUrlState()}`);
    console.log(`  Temporary loaded: ${manager.isTemporaryStateLoaded()}`);
    console.log(`  Has backup: ${manager.hasBackup()}`);

    const backupInfo = manager.getBackupInfo();
    if (backupInfo) {
        console.log(`\nBackup info:`);
        console.log(`  Kittens: ${backupInfo.kittenCount}`);
        console.log(`  Saved: ${backupInfo.formattedTime}`);
    }

    console.log('\nTo test the flow:');
    console.log('1. Fill in some kitten data');
    console.log('2. Copy a share URL from another session');
    console.log('3. Navigate to that URL');
    console.log('4. The banner should appear with Eject/Keep options');
    console.log('5. Click Eject to restore your original data');

    return manager;
}
