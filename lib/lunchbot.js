// lunchbot.js

require('datejs');
var util = require('util');
var Bot = require('slackbots');
var Tokenizer = require('sentence-tokenizer');

var LunchBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'LunchBot';
    this.services = [];
    this.tokenizer = new Tokenizer('Chuck');
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
    this.tokenizer.setEntry(message.text);
    var sentences = this.tokenizer.getSentences();

    var date = new Date()
    for (var i = 0; i < sentences.length; i++) {
        var dates = this.tokenizer.getTokens(i).map(function(e) {
            return Date.parse(e);
        }).filter(function(e) {
            return e != undefined && e != null;
        });

        if (dates.length > 0) {
            date = dates[0];
            break;
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

        for (i in values) {
            var messages = values[i];
            var service = that.services[i];

            attachments.push({
                "title": ':' + service.emoji + ': ' + service.name,
                "text": messages.join('\n')
            });
        }

        that.postMessage(message.channel, undefined, {
            icon_emoji: ":fork_and_knife:",
            attachments: JSON.stringify(attachments)
        });
    });
};

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

    // Announce we are awake in all of the channels we belong to
    var channels = this.channels.filter(function(c) {
        return c.is_member == true;
    });

    for (channel of channels) {
        this._announceInChannel(channel);
    }

    var groups = this.groups;

    for (group of groups) {
        this._announceInChannel(group);
    }
};

LunchBot.prototype._onMessage = function(message) {
    if (this._isValidActionMessage(message)) {
        const menuTerms = ['menu', 'offer', 'lunch'];
        if (message.text.containsAny(menuTerms)) {
            this._showMenus(message);
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
