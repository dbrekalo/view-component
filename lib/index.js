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

        this.$views = {};

        if (this.props) {
            this.writeProps(props);
        }

        if (element) {
            this.el = typeof element === 'string' ? this.find(element) : element;
        }

        this.$runMixins('initialize');

        if (this.initialize) {
            this.initialize();
        }

        if (this.events && this.el) {
            this.setupEvents();
        }

    },

    $runMixins: function(name, processor) {

        var self = this;

        if (this.$mixins) {
            this.$mixins[name].forEach(processor || function(item) {
                item.call(self);
            });
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

    setupEvents: function() {

        var self = this;
        var specialSelectors = {'window': window, 'document': window.document};

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

        var processEventList = function(provider) {
            var list = typeof provider === 'function' ? provider.call(self) : provider;
            list && utils.each(list, eventProcessor);
        };

        this.$runMixins('events', processEventList);

        processEventList(this.events);

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

        return this;

    },

    remove: function() {

        this.$runMixins('beforeRemove');
        this.beforeRemove && this.beforeRemove();
        this.trigger('beforeRemove');
        this.removeEvents().removeViews();

        if (this.removesElement && this.el) {
            this.removeElement();
        }

        this.$runMixins('afterRemove');
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

        var self = this;
        var element = typeof selector === 'string'
            ? this.find(selector)
            : selector
        ;

        if (View.isViewComponent) {
            return element
                ? this.addView(new View(this.$buildElementProps(element, params)))
                : undefined;
        } else {
            return element
                ? this.$resolveViewProvider(View).then(function(ViewComponent) {
                    return self.mapView(element, ViewComponent, params);
                })
                : Promise.resolve(undefined)
            ;
        }

    },

    mapViews: function(selector, View, params) {

        var self = this;
        var elements = typeof selector === 'string'
            ? this.findAll(selector)
            : selector
        ;

        if (View.isViewComponent) {
            return elements.map(function(element) {
                return self.addView(new View(self.$buildElementProps(element, params)));
            });
        } else {
            return elements && elements.length
                ? this.$resolveViewProvider(View).then(function(ViewComponent) {
                    return self.mapViews(elements, ViewComponent, params);
                })
                : Promise.resolve([])
            ;
        }

    },

    $resolveViewProvider: function(provider) {

        return Promise.resolve(provider()).then(function(importedModule) {
            return importedModule.__esModule ? importedModule.default : importedModule;
        });

    },

    $buildElementProps: function(element, props) {

        return utils.assign({el: element}, typeof props === 'function'
            ? props.call(this, element)
            : props
        );

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

var factoryExtend = View.extend;

View.extend = function(protoProps, staticProps) {

    if (protoProps.mixins) {

        protoProps = utils.assign({}, protoProps);

        protoProps.$mixins = {
            initialize: [],
            events: [],
            beforeRemove: [],
            afterRemove: []
        };

        protoProps.mixins.forEach(function(mixin) {
            utils.each(mixin, function(method, key) {
                if (protoProps.$mixins[key]) {
                    protoProps.$mixins[key].push(method);
                } else {
                    protoProps[key] = method;
                }
            });
        });

    }

    return factoryExtend.call(this, protoProps, staticProps);

};

mitty(View.prototype);

module.exports = View;
