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

    // Test base64 encoding with 4 chars (v2 uses 4)
    console.log('\n   4-char base64 test (v2 range):');
    for (let i = 0; i < 1048576; i += 200000) {
        const encoded = manager.toBase64Url(i, 4);
        const decoded = manager.fromBase64Url(encoded);
        console.log(`   ${i} → "${encoded}" → ${decoded} ${i === decoded ? '✓' : '✗'}`);
    }

    // Test v2 flag encoding
    console.log('\n2. Flag encoding test (v2 - 20 bits):');
    const testCasesV2 = [
        {
            name: 'All defaults (unknown sex, rev, not-scanned, 3d pan, 3d pon, all todo)',
            kitten: {
                sex: 'unknown',
                topical: 'revolution',
                ringwormStatus: 'not-scanned',
                panacurDays: '3',
                ponazurilDays: '3',
                fleaStatus: 'todo',
                capstarStatus: 'todo',
                panacurStatus: 'todo',
                ponazurilStatus: 'todo',
                drontalStatus: 'todo',
                pyrantelStatus: 'todo'
            }
        },
        {
            name: 'All done, female, advantage, positive ringworm',
            kitten: {
                sex: 'female',
                topical: 'advantage',
                ringwormStatus: 'positive',
                panacurDays: '5',
                ponazurilDays: '1',
                fleaStatus: 'done',
                capstarStatus: 'done',
                panacurStatus: 'done',
                ponazurilStatus: 'done',
                drontalStatus: 'done',
                pyrantelStatus: 'done'
            }
        },
        {
            name: 'Mixed: male, some skipped, flea delayed',
            kitten: {
                sex: 'male',
                topical: 'revolution',
                ringwormStatus: 'negative',
                panacurDays: '1',
                ponazurilDays: '1',
                fleaStatus: 'delay',
                capstarStatus: 'skip',
                panacurStatus: 'done',
                ponazurilStatus: 'todo',
                drontalStatus: 'skip',
                pyrantelStatus: 'done'
            }
        },
        {
            name: 'All skipped',
            kitten: {
                sex: 'unknown',
                topical: 'revolution',
                ringwormStatus: 'not-scanned',
                panacurDays: '3',
                ponazurilDays: '3',
                fleaStatus: 'skip',
                capstarStatus: 'skip',
                panacurStatus: 'skip',
                ponazurilStatus: 'skip',
                drontalStatus: 'skip',
                pyrantelStatus: 'skip'
            }
        }
    ];

    testCasesV2.forEach(tc => {
        const encoded = manager.encodeFlagsV2(tc.kitten);
        const decoded = manager.decodeFlagsV2(encoded);

        // Check that round-trip preserves values
        const match =
            decoded.sex === tc.kitten.sex &&
            decoded.topical === tc.kitten.topical &&
            decoded.ringwormStatus === tc.kitten.ringwormStatus &&
            decoded.panacurDays === tc.kitten.panacurDays &&
            decoded.ponazurilDays === tc.kitten.ponazurilDays &&
            checkMedStatus(decoded.medications.flea, tc.kitten.fleaStatus) &&
            checkMedStatus(decoded.medications.capstar, tc.kitten.capstarStatus) &&
            checkMedStatus(decoded.medications.panacur, tc.kitten.panacurStatus) &&
            checkMedStatus(decoded.medications.ponazuril, tc.kitten.ponazurilStatus) &&
            checkMedStatus(decoded.medications.drontal, tc.kitten.drontalStatus) &&
            checkMedStatus(decoded.medications.pyrantel, tc.kitten.pyrantelStatus);

        console.log(`   ${tc.name}:`);
        console.log(`     "${encoded}" (${encoded.length} chars) ${match ? '✓' : '✗'}`);
        if (!match) {
            console.log('     Expected:', tc.kitten);
            console.log('     Got:', decoded);
        }
    });

    // Test v1 backward compatibility
    console.log('\n3. V1 backward compatibility test:');
    const v1Decoded = manager.decodeFlagsV1('oG');
    console.log('   Decode v1 "oG":', v1Decoded);
    console.log('   Has medications object:', !!v1Decoded.medications, '✓');
    console.log('   Has sex field:', !!v1Decoded.sex, '✓');

    // Test full URL encoding if forms exist
    console.log('\n4. Current form encoding:');
    const preview = manager.getUrlPreview();
    if (preview) {
        console.log(`   URL length: ${preview.length} chars`);
        console.log(`   Param: ${preview.paramOnly}`);
        console.log(`   Full URL: ${preview.full}`);

        // Test round-trip
        console.log('\n5. Round-trip test:');
        const decoded = manager.decodeFromUrl(preview.full);
        console.log('   Decoded data:', decoded);
    } else {
        console.log('   (No kitten forms found - add some kittens first)');
    }

    // Test temporary state functionality
    console.log('\n6. Temporary state check:');
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

/**
 * Helper: check if decoded medication state matches expected status
 */
function checkMedStatus(medObj, expectedStatus) {
    if (expectedStatus === 'skip') {
        return medObj.enabled === false;
    }
    return medObj.enabled === true && medObj.status === expectedStatus;
}

// Example URLs for reference
function showExampleUrls() {
    const manager = new UrlStateManager();

    console.log('=== Example Encoded URLs ===\n');

    console.log('V2 format (4-char flags):');
    console.log('  ?k=2|Mittens|450|ABCD');
    console.log('  ?k=2|Mittens|450|ABCD|Whiskers|380|EFGH\n');

    console.log('V1 format (2-char flags, legacy):');
    console.log('  ?k=1|Mittens|450|oG');
    console.log('  ?k=1|Mittens|450|oG|Whiskers|380|VB\n');

    // Decode v1 example to show backward compatibility
    console.log('V1 backward compatibility - decoding "?k=1|Mittens|450|oG":');
    const decoded = manager.decodeFromUrl('http://example.com/?k=1|Mittens|450|oG');
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
