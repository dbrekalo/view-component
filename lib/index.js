var typeFactory = require('type-factory');
var mitty = require('mitty');
var utils = require('./utils');
var validateTypes = require('validate-types');
var viewCounter = 0;

var View = typeFactory({

    removesElement: true,

    constructor: function(props) {

        this.cid = 'view' + (++viewCounter);
        this.$eventRegistry = [];
        this.$dismissListeners = {};
        this.$views = {};

        var element = props && props.el;

        if (element) {
            this.$el = element.jquery
                ? element.get(0)
                : (typeof element === 'string' ? this.find(element) : element)
            ;
        }

        if (this.props) {
            this.writeProps(props);
        }

        if (this.initialize) {
            this.initialize();
        }

        if (this.events && this.$el) {
            this.setupEvents();
        }

    },

    validateData: function(schema, data) {

        return validateTypes(schema, data, this);

    },

    writeProps: function(props) {

        var validationData = this.validateData(this.props, props);

        if (validationData.hasErrors) {
            this.handlePropValidationErrors(validationData.errors);
        }

        utils.each(validationData.data, function(value, key) {

            if (typeof this[key] !== 'undefined') {
                this.handlePropValidationErrors([{
                    key: key,
                    message: 'Prop "' + key + '" overwrites instance member'
                }]);
            } else {
                this[key] = value;
            }

        }, this);

        return this;

    },

    handlePropValidationErrors: function(errors) {

        errors.forEach(function(errorObj) {
            throw new Error(errorObj.message);
        });

    },

    setupEvents: function(eventsMap) {

        var self = this;
        var specialSelectors = {'window': window, 'document': window.document};
        var eventsProvider = eventsMap || this.events;
        var eventList = typeof eventsProvider === 'function'
            ? eventsProvider.call(this)
            : eventsProvider
        ;
        var eventProcessor = function(handler, eventString) {

            var isOneEvent = eventString.indexOf('one:') === 0;
            var splitEventString = (isOneEvent ? eventString.slice(4) : eventString).split(' ');
            var eventName = splitEventString[0];
            var eventSelector = splitEventString.slice(1).join(' ');
            var element = self.$el;
            var eventHandler = typeof handler === 'function' ? handler : self[handler];

            if (eventSelector && specialSelectors[eventSelector]) {
                element = specialSelectors[eventSelector];
                eventSelector = undefined;
            }

            self[isOneEvent ? 'addOneEvent' : 'addEvent'](element, eventName, eventSelector, eventHandler);

        };

        if (eventList) {
            utils.each(eventList, eventProcessor);
        }

        return this;

    },

    addEvent: function(element, eventName, selector, handler) {

        var self = this;

        var proxyHandler = function(e) {

            if (selector) {

                var matchingEl = utils.getMatchingElement(e.target, selector, element);

                matchingEl && handler.call(self, self.normalizeEvent(e, {
                    currentTarget: matchingEl
                }));

            } else {

                handler.call(self, e);

            }

        };

        element.addEventListener(eventName, proxyHandler, false);

        this.$eventRegistry.push({
            element: element,
            eventName: eventName,
            selector: selector,
            handler: handler,
            proxyHandler: proxyHandler
        });

        return this;

    },

    addOneEvent: function(element, eventName, selector, handler) {

        var self = this;

        var proxyHandler = function(e) {
            handler.call(self, e);
            self.removeEvent(element, eventName, selector, proxyHandler);
        };

        return self.addEvent(element, eventName, selector, proxyHandler);

    },

    removeEvent: function(element, eventName, selector, handler) {

        this.$eventRegistry = this.$eventRegistry.filter(function(item) {

            if (
                item.element === element &&
                item.eventName === eventName &&
                (item.selector ? item.selector === selector : true) &&
                item.handler === handler
            ) {
                item.element.removeEventListener(item.eventName, item.proxyHandler);
                return false;
            } else {
                return true;
            }

        });

        return this;

    },

    normalizeEvent: function(e, params) {

        var normalizedEvent = {};

        for (var key in e) {
            normalizedEvent[key] = e[key];
        }

        utils.assign(normalizedEvent, {
            preventDefault: function() { e.preventDefault(); },
            stopPropagation: function() { e.stopPropagation(); },
            originalEvent: e
        });

        utils.assign(normalizedEvent, params);

        return normalizedEvent;

    },

    removeEvents: function() {

        this.$eventRegistry.forEach(function(item) {
            item.element.removeEventListener(item.eventName, item.proxyHandler);
        });

        this.$eventRegistry = [];
        this.$dismissListeners = {};

        return this;

    },

    addDismissListener: function(listenerName, options) {

        var self = this;
        var params = utils.assign({container: this.$el}, options);
        var callback = self[listenerName];
        var container = params.container;

        var handler = function(e) {

            if (event.keyCode) {
                event.keyCode === 27 && callback.call(self);
            } else if (!(event.target === container) && !container.contains(event.target)) {
                callback.call(self);
            }

        };

        this.addEvent(document, 'click', null, handler);
        this.addEvent(document, 'keyup', null, handler);

        this.$dismissListeners[listenerName] = handler;

        return this;

    },

    removeDismissListener: function(listenerName) {

        var handler = this.$dismissListeners[listenerName];

        if (handler) {
            this.removeEvent(document, 'click', null, handler);
            this.removeEvent(document, 'keyup', null, handler);
            delete this.$dismissListeners[listenerName];
        }

        return this;

    },

    remove: function() {

        this.beforeRemove && this.beforeRemove();
        this.trigger('beforeRemove');
        this.removeEvents().removeViews();

        if (this.removesElement && this.$el) {
            this.removeElement();
        }

        this.afterRemove && this.afterRemove();
        this.trigger('afterRemove');
        this.off().stopListening();

        return this;

    },

    removeElement: function() {

        utils.removeNode(this.$el);
        return this;

    },

    addView: function(view) {

        this.$views[view.cid] = view;

        this.listenTo(view, 'afterRemove', function() {
            delete this.$views[view.cid];
        });

        return view;

    },

    mapView: function(selector, View, params) {

        var element = typeof selector === 'string'
            ? this.find(selector)
            : (selector.jquery ? selector.get(0) : selector)
        ;
        var props = utils.assign({el: element}, typeof params === 'function'
            ? params.call(this, element)
            : params
        );

        return element ? this.addView(new View(props)) : undefined;

    },

    mapViews: function(selector, View, params) {

        var self = this;

        var elements = typeof selector === 'string'
            ? this.findAll(selector)
            : (selector.jquery ? selector.get() : selector)
        ;

        return elements.map(function(element) {
            var props = utils.assign({el: element}, typeof params === 'function'
                ? params.call(self, element)
                : params
            );
            return self.addView(new View(props));
        });

    },

    removeViews: function() {

        utils.each(this.$views, function(view) {
            view.remove();
        });

        return this;

    },

    find: function(selector) {

        var context = this.$el || document;

        return context.querySelector(selector);

    },

    findAll: function(selector) {

        var context = this.$el || document;

        return [].slice.call(context.querySelectorAll(selector));

    }

}, {

    isViewComponent: true,

    create: function(props) {

        var ViewType = this;
        return new ViewType(props);

    }

});

mitty(View.prototype);

module.exports = View;
