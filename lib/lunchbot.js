// lunchbot.js

require('datejs');
var util = require('util');
var Bot = require('slackbots');

var LunchBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'LunchBot';
    this.services = [];
};

// Inherit stuffs from the original Bot
util.inherits(LunchBot, Bot);

//
//  Helpers
//

String.prototype.containsAny = function(terms) {
    for (term of terms) {
        var idx = this.indexOf(term);
        if (idx != -1) {
            return true;
        }
    }

    return false;
};

LunchBot.prototype._isValidJoinMessage = function(message) {
    if (message.type != 'channel_joined') {
        return false;
    }

    // Ignore anything other than messages in groups and channels
    if (typeof message.channel != 'string' || (message.channel[0] != 'C' && message.channel[0] != 'G')) {
        return false;
    }

    return true;
};

LunchBot.prototype._isValidActionMessage = function(message) {
    if (message.type != 'message' || !Boolean(message.text)) {
        return false;
    }

    // Ignore messages from other bots
    if (message.subtype == 'bot_message') {
        return false;
    }

    // Ignore anything other than messages in groups and channels
    if (typeof message.channel != 'string' || (message.channel[0] != 'C' && message.channel[0] != 'G')) {
        return false;
    }

    // Ignore our own messages
    if (message.user == this.user.id) {
        return false;
    }

    // Ignore messages not mentioning us
    if (message.text.indexOf('<@' + this.user.id + '>') == -1) {
        return false;
    }

    return true;
};

LunchBot.prototype._dateFromMessage = function(message) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const lowercaseText = message.text.toLowerCase();
    const today = new Date();
    var date = new Date(today);

    if (lowercaseText.indexOf('yesterday') != -1) {
        date.setDate(date.getDate() - 1);
    } else {
        for (i in days) {
            var term = days[i];

            if (lowercaseText.indexOf(term) != -1) {
                var distance = i - date.getDay();
                date.setDate(date.getDate() + distance);
                break;
            }
        }
    }

    return date;
};

//
//  Actions
//

LunchBot.prototype._showMenus = function(message) {
    var that = this;
    var date = this._dateFromMessage(message);

    var fetches = this.services.map(function(e) {
        return e.fetch(date);
    });

    Promise.all(fetches).then(function(values) {
        var attachments = [];
        var reactions = [];

        for (i in values) {
            var attachment = values[i];
            var service = that.services[i];

            var title = ':' + service.emoji + ': ' + service.name
            if (service.href) {
                title += ' - <' + service.href + '|Source>';
            }

            if (attachment.length == 0) {
                // Didn't find anything
                attachments.push({
                    "title": title,
                    "text": "_Couldn't find anything, sorry!_ :disappointed:",
                    "mrkdwn_in": ["text"]
                });
            } else {
                for (j in attachment) {
                    var result = attachment[j];

                    if (result.constructor === Array) {
                        attachments.push({
                            "title": title,
                            "text": result.length > 0 ? result.join(". ") : "_Couldn't find anything, sorry!_ :disappointed:",
                            "mrkdwn_in": ["text"]
                        });
                    } else if (result.constructor === Object) {
                        var text;

                        if (result.text) {
                            text = result.text;
                        } else if (result.texts) {
                            text = result.texts.join(". ");
                        } else {
                            text = "_Couldn't find anything, sorry!_ :disappointed:";
                        }

                        attachments.push({
                            "title": title,
                            "text": text,
                            "image_url": result.image,
                            "mrkdwn_in": ["text"]
                        });
                    } else {
                        attachments.push({
                            "title": title,
                            "text": result ? result : "_Couldn't find anything, sorry!_ :disappointed:",
                            "mrkdwn_in": ["text"]
                        });
                    }
                }

                // Add reaction to the queue
                reactions.push(service.emoji);
            }
        }

        that.postMessage(message.channel, undefined, {
            icon_emoji: ":fork_and_knife:",
            attachments: JSON.stringify(attachments)
        }).then(function(data) {
            // Post reactions to the message, if enabled
            if (that.settings.usesReactionVoting) {
                const timestamp = data.ts;
                const channel = data.channel;

                for (reaction of reactions) {
                    that._api('reactions.add', {
                        timestamp: timestamp,
                        channel: channel,
                        name: reaction
                    });
                }
            }
        });
    });
};

LunchBot.prototype._beSentient = function(channel) {
    var id = typeof channel == 'string' ? channel : channel.id;

    this.postMessage(id, 'I am a lonely web-scraping bot. Here to help you, or am I?', {
        icon_emoji: ":fork_and_knife:"
    });
}

LunchBot.prototype._announceInChannel = function(channel) {
    var id = typeof channel == 'string' ? channel : channel.id;

    this.postMessage(id, 'Hi! I am now active in this channel', {
        icon_emoji: ":fork_and_knife:"
    });
};

//
//  Events
//

LunchBot.prototype._onStart = function() {
    var needle = this.name.toLowerCase();
    this.user = this.users.filter(function(user) {
        return user.name === needle;
    })[0];
};

LunchBot.prototype._onMessage = function(message) {
    if (this._isValidActionMessage(message)) {
        const menuTerms = ['menu', 'offer', 'lunch'];
        const sentienceTerms = ['what are you', 'who are you'];

        if (message.text.containsAny(menuTerms)) {
            this._showMenus(message);
        } else if (message.text.containsAny(sentienceTerms)) {
            this._beSentient(message.channel);
        }
    } else if (this._isValidJoinMessage(message)) {
        this._announceInChannel(message.channel);
    }
};

//
//  Main
//

LunchBot.prototype.run = function() {
    LunchBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

module.exports = LunchBot;
