var utils = require('../utils');

module.exports = {

    initialize: function() {

        this.$dismissListeners = [];

    },

    addDismissListener: function(handler, options) {

        var self = this;
        var params = utils.assign({container: this.el}, options);
        var container = params.container;
        var proxyHandler = function(e) {

            if (e.keyCode) {
                e.keyCode === 27 && handler.call(self);
            } else if (!(e.target === container) && !container.contains(e.target)) {
                handler.call(self);
            }

        };

        this.removeDismissListener(handler);
        this.addEvent(document, 'click', null, proxyHandler);
        this.addEvent(document, 'keyup', null, proxyHandler);

        this.$dismissListeners.push({
            handler: handler,
            proxyHandler: proxyHandler
        });

        return this;

    },

    removeDismissListener: function(handler) {

        var self = this;

        this.$dismissListeners = this.$dismissListeners.filter(function(item) {

            if (item.handler === handler) {
                self.removeEvent(document, 'click', null, item.proxyHandler);
                self.removeEvent(document, 'keyup', null, item.proxyHandler);
                return false;
            } else {
                return true;
            }

        });

        return this;

    },

    beforeRemove: function() {

        this.$dismissListeners = [];

    }

};
