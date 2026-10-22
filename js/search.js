const SEARCH_CONFIG = {
    // Field weights
    FIELD_WEIGHTS: {
        title: 1.0,
        performer: 0.7
    },

    // Query scoring thresholds and weights
    SCORES: {
        EXACT: 1.00,
        PREFIX_LAST: 0.92,
        PREFIX_OTHER: 0.80,
        PHONETIC_EQUAL: 0.85,
        PHONETIC_PREFIX_LAST: 0.72,
        EDIT_DISTANCE_BASE: 0.80,
        EDIT_DISTANCE_PENALTY: 0.12,
        PHONETIC_EDIT1: 0.68,
        SKELETON_EQUAL: 0.58,
        SUBSTRING: 0.55,
        COMPACT_SUBSTRING: 0.85,
        COMPACT_TRIGRAM_FACTOR: 0.80,
        COMPACT_TRIGRAM_MIN_DICE: 0.60
    },

    // Bonuses
    BONUSES: {
        ALL_TOKENS_MATCHED: 0.10,
        TITLE_EXACT_MATCH: 0.30,
        TITLE_STARTS_WITH: 0.15,
        IN_ORDER: 0.05,
        LEARNED_EXACT_PICK: 0.20,
        LEARNED_PREFIX_PICK: 0.10
    },

    // Tiers
    STRONG_THRESHOLD: 0.55,
    FALLBACK_THRESHOLD: 0.30,
    FALLBACK_MAX_COUNT: 5,
    MATCH_KEEP_THRESHOLD: 0.50,
    MAX_RESULTS: 50,
    CACHE_SIZE: 20,

    // Noise words
    INDEX_NOISE_WORDS: [
        'official', 'video', 'audio', 'lyrics', 'lyrical', 'hd', '320kbps'
    ],
    QUERY_NOISE_WORDS: [
        'song', 'songs', 'mp3', 'lyrics', 'video', 'official', 'audio', 'full', 'download', 'by', 'new', 'hd'
    ],

    // Separators replaced with space during normalization
    SEPARATORS: [/feat\./gi, /ft\./gi, /\bx\b/gi, /-/g, /_/g, /\|/g, /\//g],

    // Bracketed noise regexes
    BRACKET_NOISE_REGEX: /[\(\[][^\)\]]*[\)\]]/g,
    FILE_EXT_REGEX: /\.(mp3|m4a|wav|flac|aac|ogg|opus|wma)\b/gi,
    URL_REGEX: /(https?:\/\/[^\s]+|www\.[^\s]+)/gi,
    LEADING_TRACK_NUM_REGEX: /^\d{1,3}\s*[\.\-]?\s+/,

    // Phonetic replacement pipeline rules (ordered)
    PHONETIC_RULES: [
        { pattern: /igh/g, replacement: 'i' },
        { pattern: /ph/g, replacement: 'f' },
        { pattern: /w/g, replacement: 'v' },
        { pattern: /z/g, replacement: 'j' },
        { pattern: /q/g, replacement: 'k' },
        { pattern: /x/g, replacement: 'ks' },
        { pattern: /ck/g, replacement: 'k' },
        { pattern: /sh/g, replacement: 's' },
        { pattern: /ch/g, replacement: '#' },
        { pattern: /c/g, replacement: 'k' },
        { pattern: /#/g, replacement: 'c' },
        // Aspirates
        { pattern: /kh/g, replacement: 'k' },
        { pattern: /gh/g, replacement: 'g' },
        { pattern: /bh/g, replacement: 'b' },
        { pattern: /dh/g, replacement: 'd' },
        { pattern: /th/g, replacement: 't' },
        { pattern: /jh/g, replacement: 'j' },
        // Vowel classes
        { pattern: /(aa|ah)/g, replacement: 'a' },
        { pattern: /(ee|ii|ie|ea)/g, replacement: 'i' },
        { pattern: /(oo|uu)/g, replacement: 'u' },
        { pattern: /(ai|ay|ae|ei|ey)/g, replacement: 'e' },
        { pattern: /(au|ow|ou|oa)/g, replacement: 'o' }
    ]
};

// Damerau-Levenshtein edit distance with early exit thresholding
function damerauLevenshtein(a, b, maxDist = Infinity) {
    const lenA = a.length;
    const lenB = b.length;
    if (Math.abs(lenA - lenB) > maxDist) return maxDist + 1;
    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;

    // Use a 2D matrix or optimized flat array
    const d = Array.from({ length: lenA + 1 }, () => new Int32Array(lenB + 1));

    for (let i = 0; i <= lenA; i++) d[i][0] = i;
    for (let j = 0; j <= lenB; j++) d[0][j] = j;

    for (let i = 1; i <= lenA; i++) {
        let minInRow = d[i][0];
        for (let j = 1; j <= lenB; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            let val = Math.min(
                d[i - 1][j] + 1,     // deletion
                d[i][j - 1] + 1,     // insertion
                d[i - 1][j - 1] + cost // substitution
            );

            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                val = Math.min(val, d[i - 2][j - 2] + cost); // transposition
            }

            d[i][j] = val;
            if (val < minInRow) minInRow = val;
        }
        if (minInRow > maxDist) return maxDist + 1;
    }

    return d[lenA][lenB];
}

function getMaxEditDistance(tokenLen) {
    if (tokenLen <= 3) return 0;
    if (tokenLen <= 5) return 1;
    if (tokenLen <= 8) return 2;
    return 3;
}

function normalize(text, isIndex = false) {
    if (!text || typeof text !== 'string') return '';

    // 1. Lowercase
    let str = text.toLowerCase();

    // 2. Unicode NFKD, then strip only Latin combining marks (U+0300 to U+036F)
    str = str.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

    // 3. Replace & with "and". Treat feat., ft., x, "-", "_", "|", "/" as spaces
    str = str.replace(/&/g, ' and ');
    for (const sep of SEARCH_CONFIG.SEPARATORS) {
        str = str.replace(sep, ' ');
    }

    // 4. Bracketed noise & cleanups for index copy
    if (isIndex) {
        // Strip URLs, www
        str = str.replace(SEARCH_CONFIG.URL_REGEX, ' ');
        // Strip file extensions
        str = str.replace(SEARCH_CONFIG.FILE_EXT_REGEX, ' ');

        // Remove bracketed content matching noise words (keep remix, etc.)
        str = str.replace(SEARCH_CONFIG.BRACKET_NOISE_REGEX, (match) => {
            const inner = match.slice(1, -1).trim();
            const lowerInner = inner.toLowerCase();
            const containsNoise = SEARCH_CONFIG.INDEX_NOISE_WORDS.some((nw) => lowerInner.includes(nw));
            return containsNoise ? ' ' : match;
        });

        // Strip leading track numbers like "01 "
        str = str.replace(SEARCH_CONFIG.LEADING_TRACK_NUM_REGEX, '');
    }

    // 5. Remove punctuation using Unicode classes (keep \p{L}, \p{N}, \p{M})
    str = str.replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ');

    // Collapse whitespace
    return str.trim().replace(/\s+/g, ' ');
}

function getPhoneticKey(token) {
    if (!token) return '';
    let key = token.toLowerCase();

    // Apply phonetic pipeline rules
    for (const rule of SEARCH_CONFIG.PHONETIC_RULES) {
        key = key.replace(rule.pattern, rule.replacement);
    }

    // Rule 6: "y" between two vowels -> removed. Terminal "y" -> "i".
    // Vowels in current key state: a, e, i, o, u
    key = key.replace(/([aeiou])y([aeiou])/g, '$1$2');
    key = key.replace(/y$/g, 'i');

    // Rule 7: Collapse repeated letters (dill -> dil, channa -> chana)
    key = key.replace(/(.)\1+/g, '$1');

    // Rule 8: Drop a trailing "h" that follows a vowel
    key = key.replace(/([aeiou])h$/g, '$1');

    return key;
}

function getSkeleton(phoneticKey) {
    if (!phoneticKey) return '';
    if (phoneticKey.length <= 2) return phoneticKey;

    const firstChar = phoneticKey[0];
    const rest = phoneticKey.slice(1).replace(/[aeiou]/g, '');

    return firstChar + rest;
}

function generateTrigrams(str) {
    const trigrams = new Set();
    if (!str) return trigrams;
    const padded = `  ${str} `;
    for (let i = 0; i < padded.length - 2; i++) {
        trigrams.add(padded.slice(i, i + 3));
    }
    return trigrams;
}

function diceSimilarity(setA, setB) {
    if (!setA.size || !setB.size) return 0;
    let intersection = 0;
    for (const item of setA) {
        if (setB.has(item)) intersection++;
    }
    return (2 * intersection) / (setA.size + setB.size);
}

let currentIndexStore = null;
let queryCache = new Map();

function buildIndex(songs) {
    const docs = [];
    const vocabulary = new Map(); // token -> { phoneticKey, skeleton, postings: [{ docId, field }] }

    if (!Array.isArray(songs)) {
        songs = [];
    }

    songs.forEach((song, docId) => {
        const normTitle = normalize(song.title || '', true);
        const normPerformer = normalize(song.performer || '', true);

        const titleTokens = normTitle ? normTitle.split(' ').filter(Boolean) : [];
        const performerTokens = normPerformer ? normPerformer.split(' ').filter(Boolean) : [];

        const compactTitle = normTitle.replace(/\s+/g, '');
        const compactPerformer = normPerformer.replace(/\s+/g, '');
        const compactString = compactTitle + compactPerformer;
        const trigrams = generateTrigrams(compactString);

        docs.push({
            docId,
            song,
            normTitle,
            normPerformer,
            titleTokens,
            performerTokens,
            compactTitle,
            compactPerformer,
            compactString,
            trigrams
        });

        const addTokenToVocab = (token, field) => {
            if (!vocabulary.has(token)) {
                const phoneticKey = getPhoneticKey(token);
                const skeleton = getSkeleton(phoneticKey);
                vocabulary.set(token, {
                    phoneticKey,
                    skeleton,
                    postings: []
                });
            }
            vocabulary.get(token).postings.push({ docId, field });
        };

        titleTokens.forEach((t) => addTokenToVocab(t, 'title'));
        performerTokens.forEach((t) => addTokenToVocab(t, 'performer'));
    });

    currentIndexStore = { docs, vocabulary };
    queryCache.clear();
    return currentIndexStore;
}

function search(query, options = {}) {
    if (!currentIndexStore) return { results: [], fallback: false };

    const { docs, vocabulary } = currentIndexStore;
    if (docs.length === 0) return { results: [], fallback: false };

    // Check query cache
    const cacheKey = query + '||' + JSON.stringify(options.picks || {});
    if (queryCache.has(cacheKey)) {
        return queryCache.get(cacheKey);
    }

    // 5.1 Normalize the query
    let normQuery = normalize(query, false);
    if (!normQuery) return { results: [], fallback: false };

    let queryTokens = normQuery.split(' ').filter(Boolean);

    // Remove query-only noise words if at least one token remains
    const filteredQueryTokens = queryTokens.filter((t) => !SEARCH_CONFIG.QUERY_NOISE_WORDS.includes(t));
    if (filteredQueryTokens.length > 0) {
        queryTokens = filteredQueryTokens;
    }

    const numQueryTokens = queryTokens.length;
    const compactQuery = normQuery.replace(/\s+/g, '');

    // Map docId -> Map of queryTokenIndex -> bestScore
    const docTokenScores = new Map();

    queryTokens.forEach((qToken, qIdx) => {
        const isLastToken = qIdx === numQueryTokens - 1;
        const qLen = qToken.length;
        const qPhonetic = getPhoneticKey(qToken);
        const qSkeleton = getSkeleton(qPhonetic);
        const maxEditDist = getMaxEditDistance(qLen);

        for (const [vToken, vData] of vocabulary.entries()) {
            let tierScore = 0;
            const vLen = vToken.length;

            // Tier 1: exact token
            if (qToken === vToken) {
                tierScore = SEARCH_CONFIG.SCORES.EXACT;
            }
            // Tier 2: prefix
            else if (qLen >= 2 && vToken.startsWith(qToken)) {
                tierScore = isLastToken ? SEARCH_CONFIG.SCORES.PREFIX_LAST : SEARCH_CONFIG.SCORES.PREFIX_OTHER;
            }
            // Tier 3: phonetic key equal
            else if (qPhonetic && qPhonetic === vData.phoneticKey) {
                tierScore = SEARCH_CONFIG.SCORES.PHONETIC_EQUAL;
            }
            // Tier 4: phonetic key prefix (last query token only)
            else if (isLastToken && qPhonetic && qPhonetic.length >= 2 && vData.phoneticKey.startsWith(qPhonetic)) {
                tierScore = SEARCH_CONFIG.SCORES.PHONETIC_PREFIX_LAST;
            }
            // Tier 5: Damerau-Levenshtein edit distance
            else if (maxEditDist > 0 && Math.abs(qLen - vLen) <= maxEditDist) {
                const dist = damerauLevenshtein(qToken, vToken, maxEditDist);
                if (dist <= maxEditDist) {
                    tierScore = SEARCH_CONFIG.SCORES.EDIT_DISTANCE_BASE - (SEARCH_CONFIG.SCORES.EDIT_DISTANCE_PENALTY * dist);
                }
            }

            // Tier 6: Edit distance 1 between phonetic keys (key length 5 or more)
            if (tierScore < SEARCH_CONFIG.SCORES.PHONETIC_EDIT1 && qPhonetic.length >= 5 && vData.phoneticKey.length >= 5) {
                const pDist = damerauLevenshtein(qPhonetic, vData.phoneticKey, 1);
                if (pDist === 1) {
                    tierScore = Math.max(tierScore, SEARCH_CONFIG.SCORES.PHONETIC_EDIT1);
                }
            }

            // Tier 7: skeleton equal (length 3 or more)
            if (tierScore < SEARCH_CONFIG.SCORES.SKELETON_EQUAL && qSkeleton.length >= 3 && qSkeleton === vData.skeleton) {
                tierScore = Math.max(tierScore, SEARCH_CONFIG.SCORES.SKELETON_EQUAL);
            }

            // Tier 8: substring inside vocab token (query token length 3 or more)
            if (tierScore < SEARCH_CONFIG.SCORES.SUBSTRING && qLen >= 3 && vToken.includes(qToken)) {
                tierScore = Math.max(tierScore, SEARCH_CONFIG.SCORES.SUBSTRING);
            }

            if (tierScore >= SEARCH_CONFIG.MATCH_KEEP_THRESHOLD) {
                for (const posting of vData.postings) {
                    const fieldWeight = SEARCH_CONFIG.FIELD_WEIGHTS[posting.field] || 1.0;
                    const weightedScore = tierScore * fieldWeight;

                    if (!docTokenScores.has(posting.docId)) {
                        docTokenScores.set(posting.docId, new Map());
                    }
                    const tokenScoresMap = docTokenScores.get(posting.docId);
                    const existing = tokenScoresMap.get(qIdx) || 0;
                    if (weightedScore > existing) {
                        tokenScoresMap.set(qIdx, weightedScore);
                    }
                }
            }
        }
    });

    // 5.3 Compact-form pass
    const compactQueryTrigrams = compactQuery.length >= 4 ? generateTrigrams(compactQuery) : null;

    const scoredDocs = [];

    docs.forEach((doc) => {
        const tokenScoresMap = docTokenScores.get(doc.docId);
        let sumTokenScores = 0;
        let matchedCount = 0;

        if (tokenScoresMap) {
            for (let i = 0; i < numQueryTokens; i++) {
                const score = tokenScoresMap.get(i) || 0;
                sumTokenScores += score;
                if (score > 0) matchedCount++;
            }
        }

        const tokenScore = sumTokenScores / numQueryTokens;

        // Compact score calculation
        let compactScore = 0;
        if (compactQuery.length >= 4) {
            if (doc.compactString.includes(compactQuery)) {
                compactScore = SEARCH_CONFIG.SCORES.COMPACT_SUBSTRING;
            } else if (compactQueryTrigrams) {
                const dice = diceSimilarity(compactQueryTrigrams, doc.trigrams);
                if (dice >= SEARCH_CONFIG.SCORES.COMPACT_TRIGRAM_MIN_DICE) {
                    compactScore = dice * SEARCH_CONFIG.SCORES.COMPACT_TRIGRAM_FACTOR;
                }
            }
        }

        let finalScore = Math.max(tokenScore, compactScore);

        if (finalScore > 0) {
            // Bonuses
            if (matchedCount === numQueryTokens) {
                finalScore += SEARCH_CONFIG.BONUSES.ALL_TOKENS_MATCHED;
            }
            if (doc.normTitle === normQuery) {
                finalScore += SEARCH_CONFIG.BONUSES.TITLE_EXACT_MATCH;
            } else if (doc.normTitle.startsWith(normQuery)) {
                finalScore += SEARCH_CONFIG.BONUSES.TITLE_STARTS_WITH;
            }

            // In-order bonus
            if (numQueryTokens > 1 && matchedCount > 1) {
                let inOrder = true;
                let lastPos = -1;
                for (let i = 0; i < numQueryTokens; i++) {
                    const pos = doc.normTitle.indexOf(queryTokens[i]);
                    if (pos === -1 || pos < lastPos) {
                        inOrder = false;
                        break;
                    }
                    lastPos = pos;
                }
                if (inOrder) {
                    finalScore += SEARCH_CONFIG.BONUSES.IN_ORDER;
                }
            }

            // Section 7 - Learned Boost
            if (options.picks) {
                const songId = doc.song.file_unique_id || doc.song.file_id;
                const pickedForExact = options.picks[normQuery] && options.picks[normQuery][songId];
                if (pickedForExact) {
                    finalScore += SEARCH_CONFIG.BONUSES.LEARNED_EXACT_PICK;
                } else {
                    let hasPrefixPick = false;
                    for (const storedQuery in options.picks) {
                        if (storedQuery.length >= 3 && normQuery.startsWith(storedQuery)) {
                            if (options.picks[storedQuery] && options.picks[storedQuery][songId]) {
                                hasPrefixPick = true;
                                break;
                            }
                        }
                    }
                    if (hasPrefixPick) {
                        finalScore += SEARCH_CONFIG.BONUSES.LEARNED_PREFIX_PICK;
                    }
                }
            }

            scoredDocs.push({
                song: doc.song,
                score: finalScore,
                docId: doc.docId,
                titleLen: doc.normTitle.length
            });
        }
    });

    // 5.5 Output tiers
    let results = [];
    let fallback = false;

    const strongResults = scoredDocs.filter((d) => d.score >= SEARCH_CONFIG.STRONG_THRESHOLD);

    if (strongResults.length > 0) {
        results = strongResults;
    } else {
        const fallbackResults = scoredDocs.filter((d) => d.score >= SEARCH_CONFIG.FALLBACK_THRESHOLD);
        if (fallbackResults.length > 0) {
            fallback = true;
            results = fallbackResults;
        }
    }

    // 5.6 Sort by score descending, then shorter title first, then original catalog order
    results.sort((a, b) => {
        if (Math.abs(b.score - a.score) > 0.001) {
            return b.score - a.score;
        }
        if (a.titleLen !== b.titleLen) {
            return a.titleLen - b.titleLen;
        }
        return a.docId - b.docId;
    });

    if (fallback) {
        results = results.slice(0, SEARCH_CONFIG.FALLBACK_MAX_COUNT);
    } else {
        results = results.slice(0, SEARCH_CONFIG.MAX_RESULTS);
    }

    const output = {
        results: results.map((r) => ({ song: r.song, score: r.score })),
        fallback
    };

    // Cache results (max 20)
    if (queryCache.size >= SEARCH_CONFIG.CACHE_SIZE) {
        const firstKey = queryCache.keys().next().value;
        queryCache.delete(firstKey);
    }
    queryCache.set(cacheKey, output);

    return output;
}

const MurexSearch = {
    SEARCH_CONFIG,
    normalize,
    getPhoneticKey,
    getSkeleton,
    buildIndex,
    search
};

export { SEARCH_CONFIG, normalize, getPhoneticKey, getSkeleton, buildIndex, search };
export default MurexSearch;

if (typeof window !== 'undefined') {
    window.MurexSearch = MurexSearch;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MurexSearch;
}
