# easy-router
Unobtrusive, forward-thinking and ultra-lightweight client-side router library.
* __Small footprint__, 6kb for the [minified](https://developers.google.com/closure/compiler/) version.
* __Great performance__, only native functions are used.
* __No dependencies__, no jQuery, no Underscore... zero dependencies.
* __Unobtrusive__, it is designed from the beginning to be integrated with other libraries / frameworks (also vanilla JS).
* __Forward-thinking__, written in [ESNext](https://babeljs.io/) for the future and transpiled to ES5 with UMD format for the present... thus it transparently supports almost every modules' style out there: [es6](https://github.com/lukehoban/es6features#modules), [commonJs](http://webpack.github.io/docs/commonjs.html), [AMD](http://requirejs.org/docs/commonjs.html), and normal browser.
* Proper [JSDoc](http://en.wikipedia.org/wiki/JSDoc) comments are used in all the [source code](https://github.com/rogerpadilla/easy-router/blob/master/js/easy-router.js).
* Supports passing "flash" parameters between routes when navigating.
* Supports "off" optional-callback, called when leaving the current route.
* Supports registering listeners when routes changes.

Want to create a modern hibrid-mobile-app or web-app using something like [React](https://facebook.github.io/react/), [Web Components](http://webcomponents.org/), [Handlebars](http://handlebarsjs.com/), or vanilla JS? Want to render in both sides, the backend and the front-end? Have an existing Backbone project and want to migrate? Want a router component for integrated it on your own framework? Good news, EasyRouter was created with all of those use cases in mind!

EasyRouter provides methods for routing client-side pages, and connecting them to actions; basically, it's configured by providing a list of entries and done! then start handling your routes using cross-browser history management, based on either [pushState](http://diveintohtml5.info/history.html) and real URLs, or [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange) and URL fragments. EasyRouter also includes unit testing in the build process and is tested in every common browser: Chrome, Firefox, IE9+.

Install it via [Bower](http://bower.io/) (npm support coming soon):
``` bash
bower install easy-router -S
```

Use it like the future Angular 2 Router component or the Aurelia's [Router](http://aurelia.io/get-started.html) components:

```javascript
var Router = easyRouter.Router;

var appRouter = new Router({
    map: [
        {
            route: '',
            on: function () {
                console.log('Entering home page);
                ...
            },
            off: function() {
                console.log('Leaving home page);   
                ...
            }
        },
        {
            route: 'companies/new',
            on: function () {
                ...
            }
        },
        {
            route: 'companies/:id',
            on: function (id) {
                ...
            }
        },
        {
            route: 'signup',
            on: function () {
                ...
            }
        },
		...
    ]
});


// you can alternatively use the function "addHandler" for adding handlers:
appRouter.addHandler({
    route: 'item/:id',
    on: function (id, message) {
        // prints {msg: 'Item saved'}
        console.log(message);
        ...
    },
    off: function() {
        // note you can optionally declare an 'off' callback (called on exit) for each handler.
    }
});


// Listen when navigation happens in this router.
appRouter.on('route', function (evt) {
    // prints information about the previous handler (if so)
    console.log(args.old);
    // prints information about the new handler
    console.log(args.new);    
});


// Listen when navigation happens in any router.
Router.history.on('route', function (router, evt) {
    // prints information about the involved router.
    console.log(router);
    // prints information about the previous handler (if so)
    console.log(args.old);
    // prints information about the new handler (if so)
    console.log(args.new);    
});


// initialize the routers.
Router.history.start({pushState: true});


// client-side redirect to the 'items/:id' handler, it will receive this custom message.
Router.history.navigate('items/a12b', {msg: 'Item saved'});

```