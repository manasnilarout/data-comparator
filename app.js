require('dotenv').config()

/**
 * 1. Read CSV and create JSON objects out of it.
 * 2. Find similar sentences.
 * 3. Convert all the titles to english for comparison.
 * 4. Find best match from similar sentences.
 * 5. Log the similar ones as per the search term.
 * 6. Remove other best matches.
 * 7. Repeat till all the duplicates are removed.
 * 8. Write final info to new CSV in output directory.
 */

const csv = require('csvtojson');
const jsonexport = require('jsonexport');
const { findBestMatch } = require('string-similarity');
const { Translate } = require('@google-cloud/translate').v2;

const { writeFile } = require('fs');

const translator = new Translate({ projectId: process.env.PROJECT_ID })
const sentenceFilters = ["does", "isn't", "it's", "into", "in", "is", "it"];
const stringMatchPercentage = 40;
const defaultLanguage = 'en';
let socket;

// Logger method
const logger = (message) => {
    console.log(`[${new Date().toISOString()}]: ${message}`);

    if (socket) {
        socket.emit('logs', {
            message
        });
    }
}

// Find the best match from given array
const getBestMatch = (arr) => {
    let bestPercentage = 0;
    let bestResult;
    let index;

    logger('Finding best match.');
    arr.forEach(el => {
        if (el.rating > bestPercentage) {
            bestPercentage = el.rating;
            bestResult = el.target;
            index = el.index;
        }
    });

    return { bestPercentage, bestResult, index };
}

const writeDataToCSV = (obj) => {
    return new Promise(async (res, rej) => {
        jsonexport(obj, (err, csvInfo) => {
            if (err) {
                return rej(err);
            }

            const outputFile = './output/output.csv'
            writeFile(outputFile, csvInfo, (err) => {
                if (err) {
                    return rej(err);
                }

                logger('Writing to CSV succeeded.');
                return res(outputFile);
            });
        })
    })
}

const main = async (filePath) => {
    try {
        logger('Started execution');
        logger(`File path => ${filePath}`)
        let articles = await csv().fromFile(filePath || './input/sample.csv');
        const clonedArticles = JSON.parse(JSON.stringify(articles));

        for (const article of clonedArticles) {
            if (article.language !== 'english') {
                const [translation] = await translator.translate(article.title, defaultLanguage);
                logger(`Translating ${article.language} to English.\n Original => ${article.title} | Translated => ${translation}`);
                article.title = translation;
            }
        }

        const newTitles = [];

        // Collect all articles
        const titles = clonedArticles.map(article => {
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

                if (matchPercentage >= stringMatchPercentage) {
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
                    clonedArticles.splice(idx, 1);
                    newTitles.splice(idx, 1);
                }
            }

            mainIndex = bestMatch.index + 1;

            if (mainIndex >= clonedArticles.length) {
                duplicatesPresence = false;
            }
        }

        return await writeDataToCSV(articles);
    } catch (err) {
        throw err;
    }
}

const registerSocket = (socketInstance) => {
    if (socketInstance) {
        logger('Registering socket');
        socket = socketInstance;
    }
}

module.exports = { main, registerSocket };