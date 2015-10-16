// index.js

var LunchBot = require('./lib/lunchbot.js');
var config = require('config');
var FacebookSource = require('./lib/sources/facebook.js');
var Tokenizer = require('sentence-tokenizer');
var Promise = require('bluebird');

var token = config.get('slack.api');
var name = config.get('slack.name');

process.on('uncaughtException', function(err) {
  console.log(err);
});

var bot = new LunchBot({
    token: token,
    name: name
});

//
// Helpers for source parsing
//
var tokenizer = new Tokenizer('Chuck');
var priceRegex = /((?:€\d+(?:(?:\.|,)\d{1,2})?)|(?:\b\d+(?:\.|,)\d{2}\b)|(?:\d+(?:(?:\.|,)\d{1,2})?€))/g;

function capitalize(s) {
    // returns the first letter capitalized + the string from index 1 and out aka. the rest of the string
    return s[0].toUpperCase() + s.substr(1);
}

function basicPriceParsing(post) {
    if (!post.message) {
        return undefined;
    }

    // Split into lines (as people don't properly finish their sentences...)
    var lines = post.message.split('\n');
    var messages = [];

    for (line of lines) {
        if (line.length == 0) {
            continue;
        }

        tokenizer.setEntry(line);
        var sentences = tokenizer.getSentences().filter(function(e) {
            return e.length != 0 && e.match(priceRegex);
        }).map(function(e) {
            return capitalize(e);
        });

        if (sentences.length > 0) {
            messages.push(sentences.join(' '));
        }
    }

    var result = messages.join('. ');
    if (result.length > 0) {
        result += ' - _<https://facebook.com/' + post.id + '|Source>_';
        return new Promise.resolve(result);
    }

    return undefined;
}

//
//  Sources
//

// La Tabla
const latabla = new FacebookSource('es', 'La Tabla', "827767180609816", {parser: basicPriceParsing});

// KPK
const kpk = new FacebookSource('scissors', 'Kivi Paber Käärid', 'kivipaberkaarid', {parser: basicPriceParsing});

// Apelsini Raudtee
const apelsin = new FacebookSource('tangerine', 'Apelsini Raudtee', 'apelsiniraudtee', {parser: basicPriceParsing});

// F-Hoone
const fhoone = new FacebookSource('house', 'F-Hoone', 'Fhoone', {parser: basicPriceParsing});

// Kukeke, occassionally has an offer posted
const kukeke = new FacebookSource('rooster', 'Kukeke', 'kukekene', {parser: basicPriceParsing});

// Foody Allen, sometimes posts
const allen = new FacebookSource('boy', 'Foody Allen', 'foodyallenrestoran', {parser: basicPriceParsing});

// Trühvel, special because only posts once a week (on Mondays)
const truhvel = new FacebookSource('coffee', 'Trühvel', '1829502837275034', {parser: function (post, context) {
    var lines = post.message.split('\n').map(function(l) {
        return l.trim();
    });

    var day = context.date.getDay();
    if (day < 1 || day > 5) {
        return undefined;
    }

    var startIdx = 0;
    const days = ["ESMASPÄEV", "TEISIPÄEV", "KOLMAPÄEV", "NELJAPÄEV", "REEDE"];
    var currentDay = days[day - 1];
    var boundary = days.concat(["RESTORAN TRÜHVEL"]);

    // Look for textual posts
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (boundary.indexOf(line) != -1 || i == lines.length - 1) {
            var chunk = lines.slice(startIdx, i).filter(function(e) {
                return e.length > 0;
            });

            if (chunk[0] == currentDay) {
                return new Promise.resolve(chunk.slice(1).join('. ') + ' - _<https://facebook.com/' + post.id + '|Source>_');
            }

            startIdx = i;
        }
    }

    // Didn't find any, try to find image based ones (that still contain some keywords in the textual part)
    const keywords = ["pakkumine", "nädala", "lõuna"];
    if (post.message.containsAny(keywords)) {
        // Grab additional details
        return this.fetchPostPhotos(post).then(function(photo) {
            return {
                text: post.message + ' - _<https://facebook.com/' + post.id + '|Source>_',
                image: photo
            };
        });
    }

    return undefined;
}, filter: function (post, context) {
    var day = context.date.getDay(),
    diff = context.date.getDate() - day + (day == 0 ? -6 : 1);

    var comparison = new Date(context.date.setDate(diff));
    var base = new Date(post.created_time);
    return new Promise.resolve(comparison.toDateString() == base.toDateString());
}
});

bot.services = [latabla, kpk, apelsin, fhoone, truhvel, kukeke, allen];
bot.run();
