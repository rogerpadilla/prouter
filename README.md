# easy-router
Unobtrusive and ultra-lightweight router library 100% compatible with the Backbone.Router
providing the following advantages:
* Great performance (only native functions are used).
* Small footprint (5kb for minified version).
* No dependencies (no jQuery, no Underscore... zero dependencies).
* Proper JSDoc used in the source code.
* Works with normal script include and as well in CommonJS style.

EasyRouter provides methods for routing client-side pages, and connecting them to actions.

¿Want to create a modern hibrid-app or website using something like React, Web Components, Handlebars, vanilla JS, etc.?
¿Have an existing Backbone project and want to migrate to a more modern framework? Good news, EasyRouter will integrates perfectly with it!

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