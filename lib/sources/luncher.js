'use strict';

const Promise = require('bluebird');
const request = require('request-promise');

let _lastFetch = null;
let _fetchPromise = null;

function isCacheValid() {
    return _fetchPromise !== null && _lastFetch !== null && new Date() - _lastFetch < 1000 * 60 * 60 *5;
}

function fetchOffers() {
    return request.get({
        url: 'https://luncher.ee/api/v1/regions/Tallinn/offers',
        json: true
    });
}

function getOffers() {
    if (!isCacheValid()) {
        _lastFetch = new Date();
        _fetchPromise = fetchOffers();
    }
    return _fetchPromise;
}

function formatResponse(offers) {
    const responseText = offers.map(function(offer) {
        return offer.title + ' ' + offer.price + '€';
    }).join('. ');
    const responseImage = offers.filter(function(offer) {
        return offer.image && offer.image.large;
    }).pop();
    return [{
        text: responseText,
        image: responseImage
    }];
}

function fetchForRestaurant(emoji, name, restaurantId) {
    return getOffers()
        .then(offers => offers.filter(offer => offer.restaurant.id == restaurantId))
        .then(formatResponse);
}

module.exports = function(emoji, name, restaurantId) {
    return {
        emoji: emoji,
        name: name,
        fetch: function() {
            return fetchForRestaurant(emoji, name, restaurantId);
        }
    }
}
