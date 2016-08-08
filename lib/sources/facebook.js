// facebook.js

var Promise = require('bluebird');
var Facebook = require('facebook-node-sdk');
var config = require('config');
var _ = require('lodash');

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
//  chains -> Array of objects defining parsing sequences
//              Sequence may contain:
//              1. filter - A filter function determining if a post should be parsed (OPTIONAL, defaults to TRUE)
//              2. parser - A parser function deriving the Slack attachment from a post
//
//  If more than one parser results in an attachment, then first is used
//  Both filter/parser values are functions that take a post and a context of the query
//
var FacebookSource = function Constructor(emoji, name, pageID, params) {
    params = params || {};
    this.ID = pageID;
    this.emoji = emoji;
    this.name = name;
    this.href = 'https://facebook.com/' + this.ID;

    if (Function.prototype.isPrototypeOf(params.chains)) {
        params.chains = [params.chains];
    }

    this.chains = params.chains;
    if (this.chains == undefined) {
        this.chains = [{
            parser: function(post, context) {
                return new Promise.resolve(post.message);
            }
        }];
    }
};

FacebookSource.prototype.fetch = function (date) {
    var chains = this.chains;
    var that = this;
    var id = this.ID.toString();
    var context = {
        date: new Date((date || new Date()).getTime())
    };

    return new Promise(function(resolve, reject) {
        var uri = '/' + id + '/posts';
        FB.api(uri, function(err, res) {
            if (err) return reject(err);
            resolve(res.data);
        });
    }).then(function(posts) {
        // Sort based on time (latest first)
        return posts.sort(function(a, b) {
            return new Date(b.created_time).getTime() - new Date(a.created_time).getTime();
        });
    }).then(function(posts) {
        // Process using our chains
        return Promise.map(posts, function(p) {
            return Promise.map(chains, function(c) {
                if (c.filter && !c.filter(p, _.cloneDeep(context))) {
                    return undefined;
                }

                return c.parser.bind(that)(p, _.cloneDeep(context)).catch(function() {
                    return undefined;
                });
            }).then(function(messages) {
                messages = messages.filter(function(e) {
                    return e != undefined && e != false && e != null && e != '';
                });

                return messages.length > 0 ? messages[0] : undefined;
            });
        });
    }).then(function(posts) {
        // Final filtering to remove any posts that the parser didn't identify
        var filtered = posts.filter(function(e) {
            return e != undefined && e != false && e != null && e != '';
        });

        return filtered.length > 0 ? [filtered[0]] : [];
    }).catch(function(err) {
        console.warn('facebook fetch failed with:', err);
        return [];
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
