# View component

[![Build Status](https://travis-ci.org/dbrekalo/view-component.svg?branch=master)](https://travis-ci.org/dbrekalo/view-component)
[![Coverage Status](https://coveralls.io/repos/github/dbrekalo/view-component/badge.svg?branch=master)](https://coveralls.io/github/dbrekalo/view-component?branch=master)
[![NPM Status](https://img.shields.io/npm/v/view-component.svg)](https://www.npmjs.com/package/view-component)

Build user interfaces with smart event system, strict component props and clear way of defining view hierarchy.
Works great with server side rendered html.
Weighs around 3.5 KB.

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

---

```js
npm install view-component --save
```

## Examples
---
### Dropdown component with toggle UI
View component for dropdown with following html structure:
```html
<nav class="dropdown">
    <button type="button" class="toggleBtn"></button>
    <ul>
        <li>...</li>
    </ul>
</nav>
```
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
        this.addDismissListener(this.close);
    },
    close: function() {
        this.el.classList.remove(this.activeClass);
        this.removeDismissListener(this.close);
    }
});

// create dropdown instance
new Dropdown({el: '.dropdown'});
```

----

### List component with view hierarchy and custom events
Component html structure:
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
        this.listViews = this.mapViews('li', ListItem);
        this.listViews.forEach(listItemView => {
            this.listenTo(listItemView, 'workDone', () => {
                console.log('Work done', listItemView);
            });
        });
    }
});

// define List component
var ListItem = ViewComponent.extend({
    initialize: function() {
        setTimeout(() => {
            this.trigger('workDone');
        }, 100);
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

### events: object | function
Declare events with object hash or custom function in prototype properties.
All declared listeners are removed when view is removed.

```js
// with object definition
ViewComponent.extend({
    events: {
        'click .selector': 'handler',
        'one:submit form': 'oneSubmit', // one time events
        'click button': function(e) {},
        'resize window': 'onWindowResize',
        'keyup document': 'onDocumentKeyup'
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
ViewComponent.extend({
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

### find(selector)
Returns single html element found via selector inside current component element context.

---

### findAll(selector)
Returns array of html elements found via selector inside current component element context.

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
