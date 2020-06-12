/**
 * 1. Read CSV and create JSON objects out of it.
 * 2. Find similar sentences.
 * 3. Find best match from similar sentences.
 * 4. Log the similar ones as per the search term.
 */

const csv = require('csvtojson');
const { findBestMatch } = require('string-similarity');

const sentenceFilters = ["does", "isn't", "it's", "into", "in", "is", "it"];

// Logger method
const logger = (message) => {
    console.log(`[${new Date().toString()}]: ${message}`);
}

// Find the best match from given array
const getBestMatch = (arr) => {
    let bestPercentage = 0;
    let bestResult;
    let index;

    arr.forEach(el => {
        if (el.rating > bestPercentage) {
            bestPercentage = el.rating;
            bestResult = el.target;
            index = el.index;
        }
    });

    return { bestPercentage, bestResult, index };
}

const main = async () => {
    try {
        logger('Started execution');
        const filePath = './sample.csv';
        let articles = await csv().fromFile(filePath);

        const newTitles = [];

        // Collect all articles
        const titles = articles.map(article => {
            let str = article.title;

            sentenceFilters.forEach(filter => {
                str = str.replace(new RegExp(` ${filter} `, 'gi'), ' ');
            });

            newTitles.push(str);
            return str;
        });

        let duplicatesPresence = true;
        let mainIndex = 0;
        let searchTerm;

        while (duplicatesPresence) {
            searchTerm = newTitles[mainIndex];

            const matches = findBestMatch(searchTerm, newTitles);

            const bestMatches = matches.ratings.filter((match) => {
                const matchPercentage = Math.round(match.rating * 100);
                logger(`Match percentage => ${matchPercentage}, sentence => ${match.target}`);

                if (matchPercentage >= 40) {
                    match.rating = matchPercentage;
                    match.index = newTitles.indexOf(match.target)
                    return match;
                }
            });

            if (!bestMatches.length) {
                duplicatesPresence = false;
            }

            logger('Search finished.');

            const bestMatch = getBestMatch(bestMatches);

            // Remove other competitors
            for (const match of bestMatches) {
                const idx = newTitles.indexOf(match.target);

                if (idx !== bestMatch.index) {
                    articles.splice(idx, 1);
                    newTitles.splice(idx, 1);
                }
            }

            mainIndex = bestMatch.index + 1;
            console.log(mainIndex, articles.length);

            if (mainIndex >= articles.length) {
                duplicatesPresence = false;
            }
        }

        console.log(articles);
    } catch (err) {
        console.error(err);
    }
}

main();