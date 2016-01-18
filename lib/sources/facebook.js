// facebook.js

var Promise = require('bluebird');
var Facebook = require('facebook-node-sdk');
var config = require('config');

var FB = new Facebook({
    appId: config.get('facebook.appID'),
    secret: config.get('facebook.secret')
});

//
//  Facebook source
//
//  emoji  -> Name of the emoji to use with the source, for example 'simple_smile'
//  name   -> Name to present next to the source
//  pageID -> FB page ID, used to fetch posts from FB API
//
//  params
//  filters -> Array of functions or one function, which is used to filter the posts
//              Should return true if valid, false otherwise
//  parser -> Array of functions or a single function that should return a promise, which resolves into a string representing the post (may include markdown)
//              If an array is provided, the first resolved value is used
//
var FacebookSource = function Constructor(emoji, name, pageID, params) {
    params = params || {};
    this.ID = pageID;
    this.emoji = emoji;
    this.name = name;
    this.href = 'https://facebook.com/' + this.ID;

    if (Function.prototype.isPrototypeOf(params.parsers)) {
        params.parsers = [params.parsers];
    }

    this.parsers = params.parsers;
    if (this.parsers == undefined) {
        this.parsers = [function(post, context) {
            return new Promise.resolve(post.message);
        }];
    }

    if (Function.prototype.isPrototypeOf(params.filters)) {
        params.filters = [params.filters];
    }

    this.filters = params.filters;
    if (this.filters == undefined) { 
        this.filters = [function(post, context) {
            var comparison = new Date(post.created_time);
            var date = context.date;

            return comparison.toDateString() == date.toDateString();
        }];
    }
};

FacebookSource.prototype.fetch = function (date) {
    var filters = this.filters;
    var parsers = this.parsers;
    var that = this;
    var id = this.ID.toString();

    return new Promise(function(resolve, reject) {
        var uri = '/' + id + '/posts';
        FB.api(uri, function(err, res) {
            if (err) return reject(err);
            resolve(res.data);
        });
    }).then(function(posts) {
        // Filter using our filters, all filters need to be true
        // This allows compound filters
        return Promise.filter(posts, function(p) {
            return filters.reduce(function(current, next) {
                return current && next.bind(that)(p, {
                    date: new Date((date || new Date()).getTime())
                });
            }, true);
        });
    }).then(function(posts) {
        // Then parse using all possible parsers
        return Promise.all(posts.map(function(p) {
            return Promise.all(parsers.map(function(parser) {
                return parser.bind(that)(p, {
                    date: new Date((date || new Date()).getTime())
                });
            })).filter(function(value) {
                return value != undefined;
            }).then(function(values) {
                return values.length > 0 ? values[0] : undefined;
            });
        }));
    }).then(function(posts) {
        // Final filtering to remove any posts that the parser didn't identify
        var filtered = posts.filter(function(e) {
            return e != undefined && e != false && e != null && e != '';
        });

        return filtered;
    });
};

FacebookSource.prototype.fetchPhoto = function(objectID) {
    return new Promise(function(resolve, reject) {
        var uri = '/' + objectID + '?fields=images';
        FB.api(uri, function(err, res) {
            if (err) return reject(err);
            if (res.images.length == 0) return resolve(undefined);
            resolve(res.images[0].source);
        });
    });
};

FacebookSource.prototype.fetchPostPhotos = function(post) {
    var that = this;

    return new Promise(function(resolve, reject) {
        var uri = '/' + post.id + '?fields=object_id';
        FB.api(uri, function(err, res) {
            if (err) return reject(err);
            if (!res || !res.object_id) return resolve(undefined);

            resolve(that.fetchPhoto(res.object_id));
        });
    });
};

module.exports = FacebookSource;
