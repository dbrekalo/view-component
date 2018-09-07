# View component

[![Build Status](https://travis-ci.org/dbrekalo/view-component.svg?branch=master)](https://travis-ci.org/dbrekalo/view-component)
[![Coverage Status](https://coveralls.io/repos/github/dbrekalo/view-component/badge.svg?branch=master)](https://coveralls.io/github/dbrekalo/view-component?branch=master)
[![NPM Status](https://img.shields.io/npm/v/view-component.svg)](https://www.npmjs.com/package/view-component)

Library for building user interfaces with smart event system, strict component props and clear way of defining view hierarchy.
Works great with server side rendered html.
Weighs around 3.7 KB.

Designed to be versatile for small widgets and complete web applications.
Best companion of server rendered applications where frameworks like Vue and React are difficult to adopt.
Requires no build setup and can be easily integrated to existing project.
Supports all browsers that are ES5-compliant (IE8 and below are not supported).

---

### Features
* delegated event listeners with automatic cleanup
* one time event listeners for lazy loading anything
* props definition and validation with simple schema setup
* publish and subscribe api for component to component communication
* hierarchy api for mapping child views to parent view html tree
* extending api for sub-classing components with prototype and static properties
* mixins for sharing reusable functionality across components

---

```js
npm install view-component --save
```

## Examples
---
### Dropdown component with toggle UI
Component html:
```html
<nav class="dropdown">
    <button type="button" class="toggleBtn"></button>
    <ul>
        <li>...</li>
    </ul>
</nav>
```
Component javascript:
```js
// define Dropdown component
var Dropdown = ViewComponent.extend({
    props: {
        activeClass: {
            type: String,
            default: 'opened'
        }
    },
    events: {
        'click .toggleBtn': 'toggle'
    },
    toggle: function() {
        this.isOpened() ? this.close() : this.open();
    },
    isOpened: function() {
        return this.el.classList.contains(this.activeClass);
    },
    open: function() {
        this.el.classList.add(this.activeClass);
    },
    close: function() {
        this.el.classList.remove(this.activeClass);
    }
});

// create dropdown instance
new Dropdown({el: '.dropdown'});
```

----

### List component with view tree
Component html:
```html
<ul>
    <li>...</li>
    <li>...</li>
</ul>
```
```js
// define List item component
var ListItem = ViewComponent.extend({...});

// define List component
var List = ViewComponent.extend({
    initialize: function() {
        this.mapViews('li', ListItem);
    }
});

// create list instance
new List({el: 'ul'});
```

## Api and options

---

### ViewComponent.extend(prototypeProperties, [staticProperties])
Used to define view types / constructor functions.
Define prototype methods for view via object hash. Static properties are optional.
```js
var View = ViewComponent.extend({
    prototypeAttribute: 42,
    prototypeMethod: function() {}
}, {
    staticAttribute: 'foo',
    staticMethod: function() {}
});

// prototype method call
new View().prototypeMethod();

// static method call
View.staticMethod();
```
Subclassing components:
```js
var Animal = ViewComponent.extend({
    cuddle: function() {
        console.log('Cuddling...');
    }
});

var Dog = Animal.extend({
    cuddle: function() {
        Animal.prototype.cuddle.call(this);
        console.log('And barking');
    }
});

var Cat = Animal.extend({
    cuddle: function() {
        throw new Error('Meeeow');
    }
});

```

---

### mixins: Array
Used to inject reusable functionality into components.
Mixins can contain hooks (initialize, beforeRemove and afterRemove), events, and prototype properties.
Multiple mixins can be attached to component.
```js
var dropdownMixin = {
    initialize: function() {
        console.log('Dropdown mixin inside');
    },
    events: 'click .dropdown': 'toggle',
    toggle: function() {
        this.el.classList.contains('opened')
            ? this.close()
            : this.open()
        ;
    },
    open: function() {
        this.el.classList.add('opened');
    },
    close: function() {
        this.el.classList.remove('opened');
    }
};

var View = ViewComponent.extend({
    mixins: [dropdownMixin]
});

new View(); // outputs "Dropdown mixin inside"
```

---

### props: object
Validate component props. Set expectations for valid property types.
Mark properties as required and provide default values.
Custom validation logic can also be used when simple type checks are not enough.
```js
ViewComponent.extend({
    props: {
        firstName: String,
        lastName: {
            type: String,
            required: true
        },
        address: String,
        zipCode: [String, Number],
        age: {
            type: Number,
            validator: age => age > 17
        },
        acceptsCookies: {
            type: Boolean,
            default: false
        }
    }
});
```
---

### initialize()
Method / hook called on view bootstrap.
```js
var View = ViewComponent.extend({
    initialize: function() {
        // do some work
    }
});
```

---

### beforeRemove()
Method / hook called before view removal.
```js
var View = ViewComponent.extend({
    initialize: function() {
        this.plugin = new Plugin();
    },
    beforeRemove: function() {
        this.plugin.destroy();
    }
});
```

---

### events: object | function
Declare events with object hash or custom function.
Event delegation is used so there is no need to rebind events when view html content is updated (with ajax or otherwise).
All declared listeners are removed when view is removed.

```js
// with object definition
ViewComponent.extend({
    events: {
        'click .selector': 'handler', // bound to this.handler
        'one:submit form': 'oneSubmit', // listener will fire only once
        'click button': function(e) {}, // inline handler
        'resize window': 'onWindowResize', // window events
        'keyup document': 'onDocumentKeyup' // document events
    }
});
// with function definition
ViewComponent.extend({
    events: function() {
        return {'click .selector': 'handler'};
    }
});
```

---

### addDismissListener(listener)
When escape key is pressed or element outside view is clicked listener will be called.
```js
var dismissListener = require('view-component/lib/mixins/dismissListener');

ViewComponent.extend({
    mixins: [dismissListener],
    open: function() {
        // after open logic
        this.addDismissListener(this.close);
    },
    close: function() {
        // after close logic
        this.removeDismissListener(this.close);
    }
});
```

---

### removeDismissListener(listener)
Remove dismiss listener.

---

### mapView(selector, View, [props])
Create View instance with first html element inside current view found via selector. Returns mapped instance.
Optional component props can be set as object or function returning object.
```html
<body>
    <header class="mainHeader"></header>
</body>
```
```js
var Controller = ViewComponent.extend({
    initialize: function() {
        var headerView = this.mapView('.mainHeader', MainHeader);
    }
});

var MainHeader = ViewComponent.extend({});

new Controller({el: 'body'});
```

View components can be lazyloaded via view provider function which will be executed only if element is found via selector.
mapView will return promise which resolves to view intance (if element is found) or undefined if not.
Requires promise browser support or polyfill.

```js
ViewComponent.extend({
    initialize: function() {
        this.mapView('.mainHeader', () => import(./MainHeader))
            .then(headerView => console.log(headerView));
    }
});
```

----
### mapViews(selector, View, [props])
Map View instances to all elements inside current view found via selector. Returns mapped instances array.
Optional component props can be set as object or function returning object.
```html
<ul>
    <li>...</li>
    <li>...</li>
</ul>
```
```js
// define List component
var List = ViewComponent.extend({
    initialize: function() {
        this.mapViews('li', ListItem);
    }
});

// define List item component
var ListItem = ViewComponent.extend();

// create list instance
new List({el: 'ul'});
```

View components can be lazyloaded via view provider function which will be executed only if elements are found via selector.
mapViews will return promise which resolves to view intances array (if elements are found) or empty array if not.
Requires promise browser support or polyfill.

```js
ViewComponent.extend({
    initialize: function() {
        this.mapViews('li', () => import(./ListItem));
            .then(listViews => console.log(listViews));
    }
});
```

---

### addView(viewInstance)
Adds view instance to sub view registry. This binding enables effective cleanup of view hierarchy.
```js
ViewComponent.extend({
    initialize: function() {
        var view = this.addView(new ViewComponent());
    }
});
```

---

### trigger(eventName, [data])
Trigger custom event and optionally provide data to handler callback.
```js
ViewComponent.extend({
    initialize: function() {
        this.trigger('componentInitialized');
    }
});
```

---

### on(eventName, callback)
Subscribe to custom view events
```js
ViewComponent.extend({
    initialize: function() {
        this.on('foo', function(data) {
            console.log(data);
        });
        this.trigger('foo', {foo: 'bar'});
    }
});
```

---

### once(eventName, callback)
Subscribe to one time custom view events
```js
ViewComponent.extend({
    initialize: function() {
        this.once('foo', () => console.log(foo));
        this.trigger('foo').trigger('foo');
    }
});
```

---

### off([eventName, [callback]])
Removes listeners to custom view events.
```js
ViewComponent.extend({
    initialize: function() {
        this.off('foo');
    }
});
```

---

### listenTo(publisher, eventName, callback)
Listen to other object events.
```js
ViewComponent.extend({
    initialize: function() {
        initialize: function() {
            var headerView = this.mapView('.mainHeader', HeaderView);
            this.listenTo(headerView, 'customEvent' function(data) {
                console.log(data);
            });
        }
    }
});
```

---

### listenToOnce(publisher, eventName, callback)
Listen to other object events one time.
```js
ViewComponent.extend({
    initialize: function() {
        initialize: function() {
            var headerView = this.mapView('.mainHeader', HeaderView);
            this.listenToOnce(headerView, 'customEvent' function(data) {
                console.log(data);
            });
        }
    }
});
```

---

### stopListening([publisher, [eventName, [callback]]])
Removes listeners to custom publisher events.
```js
ViewComponent.extend({
    initialize: function() {
        initialize: function() {
            var headerView = this.mapView('.mainHeader', HeaderView);
            this.listenTo(headerView, 'customEvent' function(data) {
                console.log(data);
            });
            this.stopListening(headerView, 'customEvent');
        }
    }
});
```

---

### find(selector)
Returns single html element found via selector inside current component element context.
```js
ViewComponent.extend({
    initialize: function() {
       var mainHeaderElement = this.find('.mainHeader');
    }
});
```

---

### findAll(selector)
Returns array of html elements found via selector inside current component element context.
```js
ViewComponent.extend({
    initialize: function() {
       var listElements = this.findAll('ul li');
    }
});
```

---

### validateData(schema, obj)
Validate object properties against schema (identical to props validation)

---

### removeViews()
Removes all registered sub views (added with mapView, mapViews and addView methods).

---

### remove()
Removes view from DOM and does cleanup of all bound events.


## Installation
View component is packaged as UMD library and can be used in client and server environments.

```js
// install via npm
npm install view-component --save

// if you use bundler
var ViewComponent = require('view-component');

// or use browser globals
var ViewComponent = window.ViewComponent;
```
