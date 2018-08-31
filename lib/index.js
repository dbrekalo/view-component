var typeFactory = require('type-factory');
var mitty = require('mitty');
var validateTypes = require('validate-types');
var utils = require('./utils');
var viewCounter = 0;

var View = typeFactory({

    removesElement: true,

    constructor: function(props) {

        var element = props && props.el;

        this.cid = 'view' + (++viewCounter);
        this.$eventRegistry = [];
        this.$dismissListeners = [];
        this.$views = {};

        if (this.props) {
            this.writeProps(props);
        }

        if (element) {
            this.$el = this.el = element.jquery
                ? element.get(0)
                : (typeof element === 'string' ? this.find(element) : element)
            ;
        }

        if (this.initialize) {
            this.initialize();
        }

        if (this.events && this.el) {
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
            var eventName = self.normalizeEventName(splitEventString[0]);
            var eventSelector = splitEventString.slice(1).join(' ');
            var element = self.el;
            var eventHandler = typeof handler === 'function' ? handler : self[handler];
            var eventMethod = isOneEvent ? 'addOneEvent' : 'addEvent';

            if (eventSelector && specialSelectors[eventSelector]) {
                element = specialSelectors[eventSelector];
                eventSelector = undefined;
            }

            self[eventMethod](element, eventName, eventSelector, eventHandler);

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

    normalizeEventName: function(name) {

        return name;

    },

    removeEvents: function() {

        this.$eventRegistry.forEach(function(item) {
            item.element.removeEventListener(item.eventName, item.proxyHandler);
        });

        this.$eventRegistry = [];
        this.$dismissListeners = [];

        return this;

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

    remove: function() {

        this.beforeRemove && this.beforeRemove();
        this.trigger('beforeRemove');
        this.removeEvents().removeViews();

        if (this.removesElement && this.el) {
            this.removeElement();
        }

        this.afterRemove && this.afterRemove();
        this.trigger('afterRemove');
        this.off().stopListening();

        return this;

    },

    removeElement: function() {

        utils.removeNode(this.el);
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

    find: function(selector, params) {

        var context = params && params.context || this.el || document;

        return context.querySelector(selector);

    },

    findAll: function(selector, params) {

        var context = params && params.context || this.el || document;

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
