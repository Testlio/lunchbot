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
//  params
//  filter -> function that returns false if post should be ignored
//  parser -> function that should return a string for a post
//
var FacebookSource = function Constructor(emoji, name, pageID, params) {
    params = params || {};
    this.ID = pageID;
    this.emoji = emoji;
    this.name = name;

    this.parser = params.parser;
    if (this.parser == undefined) {
        this.parser = function(post, context) {
            return post.message;
        };
    }

    this.filter = params.filter;
    if (this.filter == undefined) { 
        this.filter = function(post, context) {
            var comparison = new Date(post.created_time);
            var date = context.date;

            return comparison.toDateString() == date.toDateString();
        };
    }
};

FacebookSource.prototype.fetch = function(date) {
    var f = this.filter;
    var p = this.parser;
    var id = this.ID.toString();
    
    return new Promise(function(resolve, reject) {
        var uri = '/' + id + '/posts';
        FB.api(uri, function(err, res) {
            if (err) return reject(err);
            resolve(res.data);
        });
    }).then(function(posts) {
        return posts.filter(function(e) {
            return f(e, {
                date: new Date((date || new Date()).getTime())
            });
        });
    }).then(function(posts) {
        return posts.map(function(e) {
            return p(e, {
                date: new Date((date || new Date()).getTime())
            });
        }).filter(function(e) {
            return e != undefined && e != '';
        });
    });
};

module.exports = FacebookSource;
