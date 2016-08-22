'use strict';

const Promise = require('bluebird');
const request = require('request-promise');

let _lastFetch = null;
let _fetchPromise = null;

function isCacheValid() {
    return _fetchPromise !== null && _lastFetch !== null && new Date() - _lastFetch < 1000;
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
    return [{
        text: offers.map(offer => offer.title + ' ' + offer.price + '€').join('. '),
        image: offers.filter(offer => offer.image && offer.image.large).pop()
    }];
}

function fetchForRestaurant(emoji, name, restaurantId) {
    return getOffers()
        .then(offers => offers.filter(offer => offer.restaurant.id == restaurantId))
        .then(formatResponse)
        .catch(err => {
            console.warn('luncher fetch failed with:', err);
            return [];
        });
}

module.exports = function(emoji, name, restaurantId) {
    return {
        href: 'https://luncher.ee',
        emoji: emoji,
        name: name,
        fetch: () => fetchForRestaurant(emoji, name, restaurantId)
    }
}
