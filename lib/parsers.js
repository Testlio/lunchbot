var Tokenizer = require('sentence-tokenizer');
var Promise = require('bluebird');

var tokenizer = new Tokenizer('Chuck');
var priceRegex = /((?:€\d+(?:(?:\.|,)\d{1,2})?)|(?:\b\d+(?:\.|,)\d{2}\b)|(?:\d+(?:(?:\.|,)\d{1,2})?€))/g;

module.exports = {
    basicPrice: function(post) {
        if (!post.message) {
            return new Promise.reject();
        }

        // Split into lines (as people don't properly finish their sentences...)
        var lines = post.message.split('\n');
        var messages = [];

        if (lines.length == 0) {
            return new Promise.reject();
        }

        for (line of lines) {
            if (line.length == 0) {
                continue;
            }

            tokenizer.setEntry(line);

            var sentences = [];

            try {
                sentences = tokenizer.getSentences().filter(function(e) {
                    return e.length != 0 && e.match(priceRegex);
                }).map(function(e) {
                    return e[0].toUpperCase() + e.substr(1);
                });
            } catch (err) {
                // Ignore
            }

            if (sentences.length > 0) {
                messages.push(tokenizer.getSentences().join(' '));
            }
        }

        if (messages.length === 0) {
            return new Promise.reject();
        }

        var result = messages.join('. ');
        if (result.length > 0) {
            result += ' - _<https://facebook.com/' + post.id + '|Source>_';
            return new Promise.resolve(result);
        }

        return new Promise.reject();
    },

    weeklyMenu: function(post, context) {
        if (!post.message) {
            return new Promise.reject();
        }

        var lines = post.message.split('\n').map(function(l) {
            return l.trim();
        });

        var day = context.date.getDay();
        if (day < 1 || day > 5) {
            return new Promise.reject();
        }

        const lowerCaseMessage = post.message.toLowerCase();

        var startIdx = 0;
        const days = ["esmaspäev", "teisipäev", "kolmapäev", "neljapäev", "reede"];
        var currentDay = days[day - 1];

        // Look for textual posts
        if (lowerCaseMessage.containsAny(days) && lowerCaseMessage.search(currentDay) != -1) {
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (days.indexOf(line.toLowerCase()) != -1 || i == lines.length - 1) {
                    var chunk = lines.slice(startIdx, i).filter(function(e) {
                        return e.length > 0;
                    });

                    if (chunk.length === 0) {
                        continue;
                    }

                    if (chunk[0].toLowerCase() == currentDay) {
                        console.log('Resulted in', chunk.slice(1).join('. '));
                        return new Promise.resolve(chunk.slice(1).join('. ') + ' - _<https://facebook.com/' + post.id + '|Source>_');
                    }

                    startIdx = i;
                }
            }
        }

        // Didn't find any, try to find image based ones (that still contain some keywords in the textual part)
        const keywords = ["selle nädala", "lõunamenüü", "nädala pakkumised", "nädala menüü"];
        if (lowerCaseMessage.containsAny(keywords)) {
            // Grab additional details
            return this.fetchPostPhotos(post).then(function(photo) {
                return new Promise.resolve({
                    text: post.message + ' - _<https://facebook.com/' + post.id + '|Source>_',
                    image: photo
                });
            });
        }

        return new Promise.reject();
    }
}
