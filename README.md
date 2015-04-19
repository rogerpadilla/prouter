# easy-router
Unobtrusive and ultra-lightweight router library 100% compatible with the Backbone.Router's style for declaring routes,
while providing the following advantages:
* __Unobtrusive__, it is designed from the beginning to be integrated with other libraries / frameworks (also vanilla).
* __Great performance__, only native functions are used.
* __Small footprint__, 5kb for minified version.
* __No dependencies__, no jQuery, no Underscore... zero dependencies.
* __Supports both routes' styles__, hash and the pushState of History API.
* __Unit tested__.
* Written in ESNext and transpiled to ES5 with UMD format: then it supports: es6, commonJs, AMD, and normal browser.
* Proper JSDoc used in the source code.

EasyRouter provides methods for routing client-side pages, and connecting them to actions.

¿Want to create a modern hibrid-mobile-app or website using something like React, Web Components, Handlebars, vanilla JS, etc.?
¿Have an existing Backbone project and want to migrate to a more modern framework? Good news, EasyRouter will integrates perfectly with all of those!

Install it via [Bower](http://bower.io/):
``` bash
bower install easy-router -S
```

Just use it like the [Backbone.Router](http://backbonejs.org/#Router):

```javascript
var appRouter = new EasyRouter({
    routes: {
        '': function () {
            ...
        },
        'companies/new': function () {
            ...
        },
        'companies/:id': function (id) {
            ...
        },
        'signup': function () {
            ...
        },
        'login': function () {
            ...
        },
        'logout': function () {
            ...
        },
        'forgot-password': function () {
            ...
        },
		...
    }
});

EasyRouter.history.start({pushState: true});
```