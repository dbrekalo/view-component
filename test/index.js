var assert = require('chai').assert;
var $ = require('jquery');
var ViewComponent = require('../');
var dismissListener = require('../lib/mixins/dismissListener');

beforeEach(function() {
    document.querySelector('body').innerHTML = `
        <div class="guestbook">
            <form>
                <input class="entryInput" placeholder="Type here..." type="text">
                <button class="submitBtn" type="submit">+</button>
            </form>
            <ul class="entryList">
                <li></li>
                <li></li>
            </ul>
        </div>
    `;
});

describe('View component constructor', function() {

    it('creates instance and assigns client id property', function() {

        var view = new ViewComponent();
        assert.instanceOf(view, ViewComponent);
        assert.isString(view.cid);

    });

    it('assigns dom reference when one is given', function() {

        var guestbookEl = document.querySelector('.guestbook');

        var view1 = new ViewComponent({el: '.guestbook'});
        var view2 = new ViewComponent({el: guestbookEl});
        var view3 = new ViewComponent({el: document.querySelector('.notFound')});
        var view4 = new ViewComponent();

        assert.strictEqual(view1.el, guestbookEl);
        assert.strictEqual(view2.el, guestbookEl);
        assert.isUndefined(view3.el);
        assert.isUndefined(view4.el);

    });

    it('assigns props to instance', function() {

        var View = ViewComponent.extend({
            props: {foo: {default: 'bar'}}
        });

        assert.equal(new View().foo, 'bar');
        assert.equal(new View({foo: 'bar2'}).foo, 'bar2');

    });

    it('type check provided options', function() {

        var View = ViewComponent.extend({
            props: {foo: String}
        });

        assert.throws(function() {
            new View({foo: 42});
        });

    });

    it('disallows props overwriting instance members', function() {

        var View = ViewComponent.extend({
            props: {remove: Boolean}
        });

        assert.throws(function() {
            new View({remove: false});
        });

    });

    it('calls initialize when view is created', function() {

        var View = ViewComponent.extend({
            initialize: function() {
                this.foo = 'bar';
            }
        });

        assert.equal(new View().foo, 'bar');

    });

});

describe('View component events', function() {

    it('can be defined as function or pointer to view function', function() {

        var View = ViewComponent.extend({
            events: {
                'submit form': 'submitForm',
                'click .entryList': function(e) {
                    this.entryListIsClicked = true;
                },
            },
            submitForm: function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.formIsSubmited = true;
            }
        });

        var view = new View({el: '.guestbook'});

        document.querySelector('.entryList li').click();
        document.querySelector('.submitBtn').click();

        assert.isTrue(view.formIsSubmited);
        assert.isTrue(view.entryListIsClicked);

    });

    it('can be defined from hash produced by function', function() {

        var View = ViewComponent.extend({
            events: function() {
                return {'submit form': 'submitForm'};
            },
            submitForm: function(e) {
                e.preventDefault();
                this.formIsSubmited = true;
            }
        });

        var view = new View({el: '.guestbook'});

        document.querySelector('.submitBtn').click();

        assert.isTrue(view.formIsSubmited);

    });

    it('can be defined as one time events', function() {

        var clickCounter = 0;

        ViewComponent.extend({
            events: {
                'one:click form': function(e) {
                    e.preventDefault();
                    clickCounter++;
                }
            }
        }).create({el: '.guestbook'});

        document.querySelector('form').click();
        document.querySelector('form').click();
        document.querySelector('form').click();

        assert.equal(clickCounter, 1);

    });

    it('are properly handled when called with special selectors (window or document)', function() {

        var view = ViewComponent.extend({
            events: {
                'resize window': function(e) {
                    this.windowIsResized = true;
                },
                'click document': function(e) {
                    this.documentIsClicked = true;
                }
            }
        }).create({el: '.guestbook'});

        window.dispatchEvent(new Event('resize'));
        document.dispatchEvent(new Event('click'));

        assert.isTrue(view.windowIsResized);
        assert.isTrue(view.documentIsClicked);

    });

    it('can be removed and cleaned up', function() {

        var view = ViewComponent.extend({
            events: {
                'click form': function(e) {
                    e.preventDefault();
                    this.formIsClicked = true;
                },
                'resize window': function(e) {
                    this.windowIsResized = true;
                },
                'click document': function(e) {
                    this.documentIsClicked = true;
                }
            }
        }).create({el: '.guestbook'});

        view.removeEvents();

        document.querySelector('form').click();
        window.dispatchEvent(new Event('resize'));
        document.dispatchEvent(new Event('click'));

        assert.isUndefined(view.formIsClicked);
        assert.isUndefined(view.windowIsResized);
        assert.isUndefined(view.documentIsClicked);

    });

});

describe('View component selector engine', function() {

    it('single or multiple elements can be retrieved', function() {

        var view = ViewComponent.extend({
            initialize: function() {

                this.form = this.find('form');
                this.submitBtn = this.find('button', {context: this.form});
                this.formList = this.find('.entryList', {context: this.form});
                this.listItems = this.findAll('.entryList > li');
                this.formListItems = this.findAll('li', {context: this.form});

            }
        }).create({el: '.guestbook'});

        assert.strictEqual(view.form, document.querySelector('form'));
        assert.strictEqual(view.submitBtn, document.querySelector('form button'));
        assert.isNull(view.formList);
        assert.isArray(view.listItems);
        assert.deepEqual(view.listItems, [].slice.call(document.querySelectorAll('.entryList > li')));
        assert.lengthOf(view.formListItems, 0);

    });

});

describe('View component subviews', function() {

    it('can be added to parent registry', function() {

        var parentView = new ViewComponent({el: '.guestbook'});

        var childView = parentView.addView(
            new ViewComponent({el: parentView.find('form')})
        );

        assert.strictEqual(childView, parentView.$views[childView.cid]);

    });

    it('can be removed by parent', function() {

        var parentView = new ViewComponent({el: '.guestbook'});

        parentView.addView(new ViewComponent({el: parentView.find('form')}));

        assert.isNotEmpty(parentView.$views);

        parentView.removeViews();

        assert.isEmpty(parentView.$views);

    });

    it('can be removed by child remove call', function() {

        var parentView = new ViewComponent({el: '.guestbook'});

        var childView = parentView.addView(
            new ViewComponent({el: parentView.find('form')
        }));

        assert.isNotEmpty(parentView.$views);

        childView.remove();

        assert.isEmpty(parentView.$views);

    });

    it('before and after remove hooks are called', function() {

        var ChildView = ViewComponent.extend({
            beforeRemove: function() {
                this.beforeRemoveWasCalled = true;
            },
            afterRemove: function() {
                this.afterRemoveWasCalled = true;
            }
        });

        ViewComponent.create().mapViews('.entryList li', ChildView).forEach(function(childView) {

            childView.remove();

            assert.isTrue(childView.beforeRemoveWasCalled);
            assert.isTrue(childView.afterRemoveWasCalled);

        });

    });

    it('maps single view and returns instance', function() {

        var ChildView = ViewComponent.extend({
            props: {foo: {default: 'bar'}}
        });

        var parentView = ViewComponent.create({el: '.guestbook'});

        var childView1 = parentView.mapView('form', ChildView);
        var childView2 = parentView.mapView('form', ChildView, {foo: 'bar2'});
        var childView3 = parentView.mapView(document.querySelector('form'), ChildView, function(element) {
            assert.strictEqual(this, parentView);
            return {foo: element};
        });

        assert.equal(childView1.foo, 'bar');
        assert.equal(childView2.foo, 'bar2');
        assert.equal(childView3.foo, document.querySelector('form'));

        assert.strictEqual(childView1, parentView.$views[childView1.cid]);
        assert.isUndefined(parentView.mapView('.undefinedClass', ChildView));

    });

    it('mapView returns promise when called with view provider function', function() {

        var view = ViewComponent.extend({
            initialize: function() {
                this.formViewPromise = this.mapView('form', () => ViewComponent);
                this.undefinedViewPromise = this.mapView('undefined', () => ViewComponent);
            }
        }).create({el: '.guestbook'});

        assert.instanceOf(view.formViewPromise, Promise);
        assert.instanceOf(view.undefinedViewPromise, Promise);

        return Promise.all([view.formViewPromise, view.undefinedViewPromise]).then(values => {
            assert.instanceOf(values[0], ViewComponent);
            assert.isUndefined(values[1]);
        });

    });

    it('maps multiple views and returns view instances as array', function() {

        var ChildView = ViewComponent.extend({
            props: {foo: {default: 'bar'}}
        });

        var parentView = ViewComponent.create({el: '.guestbook'});
        var childViews1 = parentView.mapViews('.entryList li', ChildView);
        var childViews2 = parentView.mapViews('.entryList li', ChildView, {foo: 'bar2'});
        var childViews3 = parentView.mapViews(parentView.findAll('.entryList li'), ChildView, function(element) {
            assert.strictEqual(this, parentView);
            return {foo: element};
        });

        assert.lengthOf(childViews1, 2);

        childViews1.forEach(function(childView) {
            assert.equal(childView.foo, 'bar');
        });

        childViews2.forEach(function(childView) {
            assert.equal(childView.foo, 'bar2');
        });

        childViews3.forEach(function(childView) {
            assert.isTrue(childView.foo.matches('.entryList li'));
        });

        assert.lengthOf(parentView.mapViews('.undefinedClass', ChildView), 0);

    });

    it('mapViews returns promise when called with view provider function', function() {

        var view = ViewComponent.extend({
            initialize: function() {
                this.listViewsPromise = this.mapViews('.entryList li', () => ViewComponent);
                this.undefinedViewPromise = this.mapViews('undefined', () => ViewComponent);
            }
        }).create({el: '.guestbook'});

        assert.instanceOf(view.listViewsPromise, Promise);
        assert.instanceOf(view.undefinedViewPromise, Promise);

        return Promise.all([view.listViewsPromise, view.undefinedViewPromise]).then(values => {
            assert.isArray(values[0]);
            assert.lengthOf(values[0], 2);
            assert.isArray(values[1]);
        });

    });

});

describe('Dismiss listener mixin', function() {

    it('executes dismiss listener when clicked outside view', function() {

        var view = ViewComponent.extend({
            mixins: [dismissListener],
            initialize: function() {
                this.timesClosed = 0;
            },
            open: function() {
                this.isOpened = true;
                return this.addDismissListener(this.close);
            },
            close: function() {
                this.isOpened = false;
                this.timesClosed++;
                this.removeDismissListener(this.close);
            }
        }).create({el: '.guestbook'}).open();

        assert.lengthOf(view.$eventRegistry, 2);

        document.dispatchEvent(new Event('click'));
        document.dispatchEvent(new Event('click'));
        document.dispatchEvent(new Event('click'));

        assert.lengthOf(view.$eventRegistry, 0);

        assert.strictEqual(view.isOpened, false);
        assert.strictEqual(view.timesClosed, 1);

        view.remove();

        assert.deepEqual(view.$dismissListeners, []);


    });

    it('executes dismiss listener with custom element container defined', function() {

        var view = ViewComponent.extend({
            mixins: [dismissListener],
            open: function() {
                this.isOpened = true;
                this.addDismissListener(this.close, {container: this.find('form')});
                return this;
            },
            close: function() {
                this.isOpened = false;
                this.removeDismissListener(this.close);
            }
        }).create({el: '.guestbook'}).open();

        document.querySelector('.guestbook').click();

        assert.strictEqual(view.isOpened, false);

    });

    it('executes dismiss listener on escape key', function() {

        var view = ViewComponent.extend({
            mixins: [dismissListener],
            initialize: function() {
                this.dismissCount = 0;
                this.addDismissListener(() => {
                    this.dismissCount++;
                });
            },
            openMenu: function() {
                this.isOpened = true;
                return this.addDismissListener(this.closeMenu);
            },
            closeMenu: function() {
                this.isOpened = false;
                this.removeDismissListener(this.closeMenu);
            }
        }).create({el: '.guestbook'});

        view.openMenu();

        var event = new Event('keyup');
        event.which = event.keyCode = 27;
        document.dispatchEvent(event);
        document.dispatchEvent(event);

        assert.strictEqual(view.isOpened, false);
        assert.strictEqual(view.dismissCount, 2);

    });

});
