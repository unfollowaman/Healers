import assert from 'node:assert';
import MurexSearch from '../js/search.js';

// SECTION 9 sample catalog
const sampleCatalog = [
    { file_id: '1', file_unique_id: 'u1', title: 'Tum Hi Ho', performer: 'Arijit Singh', duration: 262 },
    { file_id: '2', file_unique_id: 'u2', title: 'Kabhi Kabhie', performer: 'Mukesh', duration: 300 },
    { file_id: '3', file_unique_id: 'u3', title: 'Kesariya', performer: 'Arijit Singh', duration: 268 },
    { file_id: '4', file_unique_id: 'u4', title: 'Zindagi', performer: 'Jubin Nautiyal', duration: 240 },
    { file_id: '5', file_unique_id: 'u5', title: 'Channa Mereya', performer: 'Arijit Singh', duration: 289 },
    { file_id: '6', file_unique_id: 'u6', title: 'Raataan Lambiyan', performer: 'Tanishk Bagchi', duration: 230 },
    { file_id: '7', file_unique_id: 'u7', title: 'Apna Bana Le', performer: 'Arijit Singh', duration: 261 },
    { file_id: '8', file_unique_id: 'u8', title: 'Husn', performer: 'Anuv Jain', duration: 218 },
    { file_id: '9', file_unique_id: 'u9', title: 'Blinding Lights', performer: 'The Weeknd', duration: 200 },
    { file_id: '10', file_unique_id: 'u10', title: 'Shape of You', performer: 'Ed Sheeran', duration: 233 },
    { file_id: '11', file_unique_id: 'u11', title: 'तुम ही हो', performer: 'Arijit Singh', duration: 262 }
];

console.log('Building search index for sample catalog...');
MurexSearch.buildIndex(sampleCatalog);

const testCases = [
    { query: 'tumhiho', expected: 'Tum Hi Ho' },
    { query: 'tum hee ho', expected: 'Tum Hi Ho' },
    { query: 'kesaria', expected: 'Kesariya' },
    { query: 'jindagi', expected: 'Zindagi' },
    { query: 'chana mereya', expected: 'Channa Mereya' },
    { query: 'raataan lambiya', expected: 'Raataan Lambiyan' },
    { query: 'apna bana lo', expected: 'Apna Bana Le' },
    { query: 'hsn', expected: 'Husn' },
    { query: 'arjit singh', expectedArtist: 'Arijit Singh' },
    { query: 'shape of u', expected: 'Shape of You' },
    { query: 'blinding', expected: 'Blinding Lights' },
    { query: 'तुम', expected: 'तुम ही हो' },
    { query: 'qzxvw', expectedNone: true }
];

console.log('\nRunning test cases...');

testCases.forEach(({ query, expected, expectedArtist, expectedNone }, idx) => {
    const { results, fallback } = MurexSearch.search(query);

    if (expectedNone) {
        assert.strictEqual(
            results.length,
            0,
            `Query "${query}" should return no strong results, got ${results.length}`
        );
        console.log(`✓ Case ${idx + 1}: "${query}" -> No strong results as expected`);
        return;
    }

    assert.ok(results.length > 0, `Query "${query}" returned 0 results`);

    const top3 = results.slice(0, 3);
    let matched = false;

    if (expected) {
        matched = top3.some((r) => r.song.title === expected);
        assert.ok(
            matched,
            `Query "${query}" expected "${expected}" in top 3, got: ${top3.map((r) => r.song.title).join(', ')}`
        );
        console.log(`✓ Case ${idx + 1}: "${query}" -> Found "${expected}" in Top 3`);
    } else if (expectedArtist) {
        matched = top3.some((r) => r.song.performer === expectedArtist);
        assert.ok(
            matched,
            `Query "${query}" expected artist "${expectedArtist}" in top 3, got: ${top3.map((r) => `${r.song.title} (${r.song.performer})`).join(', ')}`
        );
        console.log(`✓ Case ${idx + 1}: "${query}" -> Found artist "${expectedArtist}" in Top 3`);
    }
});

console.log('\nRunning SECTION 8 Performance Test (5,000 synthetic songs)...');
const syntheticCatalog = [];
const words = ['Love', 'Heart', 'Night', 'Fire', 'Sky', 'Rain', 'Light', 'Dream', 'Shadow', 'Memory'];
const artists = ['Arijit', 'Mukesh', 'Weeknd', 'Sheeran', 'Taylor', 'Drake', 'Beyonce', 'Coldplay'];

for (let i = 0; i < 5000; i++) {
    const w1 = words[i % words.length];
    const w2 = words[(i * 3) % words.length];
    const art = artists[i % artists.length];
    syntheticCatalog.push({
        file_id: `syn_${i}`,
        file_unique_id: `u_syn_${i}`,
        title: `${w1} ${w2} Track ${i}`,
        performer: `${art} Artist`,
        duration: 180 + (i % 120)
    });
}

const buildStart = Date.now();
MurexSearch.buildIndex(syntheticCatalog);
const buildTime = Date.now() - buildStart;
console.log(`Index build time for 5,000 songs: ${buildTime} ms`);

const benchmarkQueries = [
    'love track',
    'heart shadow',
    'arijit night',
    'drk dream',
    'shelran light',
    'rmain memory',
    'trck 2500',
    'skye fire',
    'drake shadow',
    'coldplay rain'
];

let totalSearchTime = 0;
const iterations = 10;

for (let iter = 0; iter < iterations; iter++) {
    benchmarkQueries.forEach((q) => {
        const t0 = performance.now();
        MurexSearch.search(q);
        const t1 = performance.now();
        totalSearchTime += (t1 - t0);
    });
}

const totalQueries = benchmarkQueries.length * iterations;
const avgLatency = totalSearchTime / totalQueries;

console.log(`Average search latency across ${totalQueries} queries: ${avgLatency.toFixed(3)} ms`);
assert.ok(avgLatency < 50, `Average search time (${avgLatency} ms) exceeded limit of 50 ms`);
console.log('✓ Performance benchmark PASSED (< 50ms target)');

console.log('\nAll tests PASSED successfully!');
