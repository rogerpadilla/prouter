# easy-router
Unobtrusive and ultra-lightweight router library 100% compatible with the Backbone.Router's style for declaring routes,
while providing the following advantages:
* __Unobtrusive__, it is designed from the beginning to be integrated with other libraries / frameworks (also vanilla JS).
* __Great performance__, only native functions are used.
* __Small footprint__, 5kb for the [minified](https://developers.google.com/closure/compiler/) version.
* __No dependencies__, no jQuery, no Underscore... zero dependencies.
* __Supports both routes' styles__, [hash](https://developer.mozilla.org/en-US/docs/Web/API/Window/location) and [pushState](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history) of the History API.
* __Unit testing__ included in the build process.
* Written in [ESNext](https://babeljs.io/) for the future and transpiled to ES5 with UMD format, thus it transparently supports almost every modules' style out there: [es6](https://github.com/lukehoban/es6features#modules), [commonJs](http://webpack.github.io/docs/commonjs.html), [AMD](http://requirejs.org/docs/commonjs.html), and normal browser.
* Proper [JSDoc](http://en.wikipedia.org/wiki/JSDoc) comments are used in all the [source code](https://github.com/rogerpadilla/easy-router/blob/master/js/easy-router.js).
* Tested in every common browser: Chrome, Firefox, IE9+.

¿Want to create a modern hibrid-mobile-app or website using something like [React](https://facebook.github.io/react/), [Web Components](http://webcomponents.org/), [Handlebars](http://handlebarsjs.com/), and of course, vanilla JS, etc.?
¿Have an existing Backbone project and want to migrate? Good news, EasyRouter integrates perfectly fine in all of those use cases!

EasyRouter provides methods for routing client-side pages, and connecting them to actions; basically, it's configured by providing a list of entries, each one with a route an a callback, and done!

Install it via [Bower](http://bower.io/) (or just download it [here](https://github.com/rogerpadilla/easy-router/tree/master/dist)):
``` bash
bower install easy-router -S
```

Just use it in the same way than the [Backbone.Router](http://backbonejs.org/#Router) component:

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