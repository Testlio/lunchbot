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
//  filter -> function that should return a promise, which will resolve to either the post or false (if a post should be discarded)
//  parser -> function that should return a promise, which resolves into a string representing the post (may include markdown)
//
var FacebookSource = function Constructor(emoji, name, pageID, params) {
    params = params || {};
    this.ID = pageID;
    this.emoji = emoji;
    this.name = name;
    this.href = 'https://facebook.com/' + this.ID;

    this.parser = params.parser;
    if (this.parser == undefined) {
        this.parser = function(post, context) {
            return new Promise.resolve(post.message);
        };
    }

    this.filter = params.filter;
    if (this.filter == undefined) { 
        this.filter = function(post, context) {
            var comparison = new Date(post.created_time);
            var date = context.date;

            return new Promise.resolve(comparison.toDateString() == date.toDateString());
        };
    }
};

FacebookSource.prototype.fetch = function (date) {
    var f = this.filter;
    var p = this.parser;
    var id = this.ID.toString();
    var that = this;

    return new Promise(function(resolve, reject) {
        var uri = '/' + id + '/posts';
        FB.api(uri, function(err, res) {
            if (err) return reject(err);
            resolve(res.data);
        });
    }).then(function(posts) {
        return new Promise.all(posts.map(function(e) {
            return f.call(that, e, {
                date: new Date((date || new Date()).getTime())
            });
        })).then(function(flags) {
            return posts.filter(function(e, idx) {
                return flags[idx];
            });
        });
    }).then(function(posts) {
        return posts.filter(function(e) {
            return e != undefined && e != false && e != null;
        });
    }).then(function(posts) {
        return new Promise.all(posts.map(function(e) {
            return p.call(that, e, {
                date: new Date((date || new Date()).getTime())
            });
        }));
    }).then(function(posts) {
        return posts.filter(function(e) {
            return e != undefined && e != '';
        });
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
