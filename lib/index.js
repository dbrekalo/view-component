var typeFactory = require('type-factory');
var mitty = require('mitty');
var toolkit = require('./toolkit');
var viewCounter = 0;

var View = typeFactory({

    bindEvents: true,
    parseEventVariables: false,

    constructor: function(options) {

        this.cid = 'view' + (++viewCounter);
        this.$eventRegistry = [];
        this.$dismissListeners = {};
        this.$views = {};

        var element = options && options.el;

        if (element) {
            this.$el = element.jquery
                ? element.get(0)
                : (typeof element === 'string' ? this.find(element) : element)
            ;
        }

        // if (this.assignOptions) {
        //     this.writeOptions.apply(this, arguments);
        //     this.optionRules && this.validateOptions(this.options, this.optionRules);
        // }

        if (this.initialize) {
            this.initialize.apply(this, arguments);
        }

        if (this.bindEvents && this.events && this.$el) {
            this.setupEvents();
        }

    },

    setupEvents: function(eventsMap) {

        var self = this;
        var specialSelectors = {'window': window, 'document': window.document};
        var eventsProvider = eventsMap || this.events;
        var eventList = typeof eventsProvider === 'function'
            ? eventsProvider.call(this)
            : eventsProvider
        ;
        var eventProcessor = function(eventString, handler) {

            if (self.parseEventVariables) {
                eventString = toolkit.parseEventVariables(eventString, self);
            }

            var isOneEvent = eventString.indexOf('one:') === 0;
            var splitEventString = (isOneEvent ? eventString.slice(4) : eventString).split(' ');
            var eventName = splitEventString[0];
            var eventSelector = splitEventString.slice(1).join(' ');
            var element = self.$el;
            var eventHandler = typeof handler === 'function' ? handler : self[handler];

            var proxyEventHandler = isOneEvent ? function(e) {
                eventHandler.call(self, e);
                self.removeEvent(element, eventName, eventSelector, proxyEventHandler);
            } : eventHandler;

            if (eventSelector && specialSelectors[eventSelector]) {
                element = specialSelectors[eventSelector];
                eventSelector = undefined;
            }

            this.addEvent(element, eventName, eventSelector, proxyEventHandler);

        };

        if (eventList) {
            toolkit.each(eventList, eventProcessor);
        }

        return this;

    },

    addEvent: function(element, eventName, selector, handler) {

        var self = this;

        var proxyHandler = function(e) {

            if (selector) {

                if (toolkit.delegateEventHit(e.target, selector, element)) {
                    handler.call(self, e);
                }

            } else {
                handler.call(self, e);
            }

        };

        element.addEventListener(eventName, proxyHandler);

        this.$eventRegistry.push({
            element: element,
            eventName: eventName,
            selector: selector,
            handler: handler,
            proxyHandler: proxyHandler
        });

        return this;

    },

    removeEvent: function(element, eventName, selector, handler) {

        this.$eventRegistry = this.$eventRegistry.filter(function(item) {

            if (
                item.element === element &&
                item.eventName === eventName &&
                selector && (item.selector === selector) &&
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
        var params = toolkit.assign({element: this.$el}, options);
        var callback = self[listenerName];
        var el = params.element;

        var handler = function(e) {

            if (event.keyCode) {
                event.keyCode === 27 && callback.call(self);
            } else if (!(event.target === el) && !el.contains(event.target)) {
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

        if (this.$el) {
            toolkit.removeNode(this.$el);
        }

        this.trigger('afterRemove');
        this.afterRemove && this.afterRemove();
        this.off().stopListening();

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

        return element
            ? this.addView(new View(toolkit.assign({el: element}, params)))
            : undefined
        ;

    },

    mapViews: function(selector, View, params) {

        var self = this;

        var elements = typeof selector === 'string'
            ? this.findAll(selector)
            : (selector.jquery ? selector.get() : selector)
        ;

        return elements.map(function(element) {
            return self.addView(new View(toolkit.assign({el: element}, params)));
        });

    },

    removeViews: function() {

        toolkit.each(this.$views, function(id, view) {
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

        return context.querySelectorAll(selector);

    }

}, {
    isViewComponent: true
});

mitty(View.prototype);

module.exports = View;
