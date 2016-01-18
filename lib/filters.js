var Promise = require('bluebird');

module.exports = {
    weekday: function(post, context) {
        var day = context.date.getDay(),
        diff = context.date.getDate() - day + (day == 0 ? -6 : 1);

        var comparison = new Date(context.date.setDate(diff));
        var base = new Date(post.created_time);

        return new Promise.resolve(comparison.toDateString() == base.toDateString());
    }
}
