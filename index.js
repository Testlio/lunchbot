// index.js

var LunchBot = require('./lib/lunchbot');
var FacebookSource = require('./lib/sources/facebook');
var Parsers = require('./lib/parsers');
var Filters = require('./lib/filters');

var config = require('config');
var Promise = require('bluebird');

var token = config.get('slack.api');
var name = config.get('slack.name');

process.on('uncaughtException', function(err) {
    console.log(err);
});

process.on('exit', function() {
    console.log('Process exiting');
});

var bot = new LunchBot({
    token: token,
    name: name,
    usesReactionVoting: config.get('slack.usesReactionVoting')
});

var params = {
    chains: [
        {
            parser: Parsers.weeklyMenu,
            filter: Filters.startOfWeek
        },
        {
            parser: Parsers.basicPrice,
            filter: Filters.sameDay
        }
    ]
};

//
//  Sources
//

// La Tabla
const latabla = new FacebookSource('es', 'La Tabla', "827767180609816", params);

// KPK
const kpk = new FacebookSource('scissors', 'Kivi Paber Käärid', 'kivipaberkaarid', params);

// Apelsini Raudtee
const apelsin = new FacebookSource('tangerine', 'Apelsini Raudtee', 'apelsiniraudtee', params);

// F-Hoone
const fhoone = new FacebookSource('house', 'F-Hoone', 'Fhoone', params);

// Kukeke, occassionally has an offer posted
const kukeke = new FacebookSource('rooster', 'Kukeke', 'kukekene', params);

// Trühvel, special because only posts once a week (on Mondays)
const truhvel = new FacebookSource('coffee', 'Trühvel', '1829502837275034', params);

const services = [latabla, kpk, apelsin, fhoone, truhvel, kukeke];
console.log('Starting LunchBot with ' + services.length + ' services');

bot.services = services;
bot.run();
