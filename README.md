# easy-router
Unobtrusive and ultra-lightweight router library 100% compatible with the Backbone.Router
providing the following advantages:
* Great performance (only native functions are used).
* Small footprint (5kb for minified version).
* No dependencies (no jQuery, no Underscore... zero dependencies).
* Proper JSDoc used in the source code.

EasyRouter provides methods for routing client-side pages, and connecting them to actions.

Just use it like the Backbone.Router:

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