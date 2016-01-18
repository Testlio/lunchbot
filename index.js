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

var bot = new LunchBot({
    token: token,
    name: name,
    usesReactionVoting: config.get('slack.usesReactionVoting')
});

//
//  Sources
//

// La Tabla
const latabla = new FacebookSource('es', 'La Tabla', "827767180609816", { parser: Parsers.weeklyMenu, filters: Filters.weekday });

// KPK
const kpk = new FacebookSource('scissors', 'Kivi Paber Käärid', 'kivipaberkaarid', { parser: Parsers.basicPrice });

// Apelsini Raudtee
const apelsin = new FacebookSource('tangerine', 'Apelsini Raudtee', 'apelsiniraudtee', { parser: Parsers.basicPrice });

// F-Hoone
const fhoone = new FacebookSource('house', 'F-Hoone', 'Fhoone', { parser: Parsers.basicPrice });

// Kukeke, occassionally has an offer posted
const kukeke = new FacebookSource('rooster', 'Kukeke', 'kukekene', { parser: Parsers.basicPrice });

// Foody Allen, sometimes posts
const allen = new FacebookSource('boy', 'Foody Allen', 'foodyallenrestoran', { parser: Parsers.basicPrice });

// Trühvel, special because only posts once a week (on Mondays)
const truhvel = new FacebookSource('coffee', 'Trühvel', '1829502837275034', { parser: Parsers.weeklyMenu, filter: Filters.weekday });

const services = [latabla, kpk, apelsin, fhoone, truhvel, kukeke, allen];
console.log('Starting LunchBot with services', services);

bot.services = services;
bot.run();

console.log('LunchBot is up and running');
