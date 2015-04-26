# easy-router
Unobtrusive, forward-thinking and ultra-lightweight client-side router library.
* __Small footprint__, 6kb for the [minified](https://developers.google.com/closure/compiler/) version.
* __Great performance__, only native functions are used.
* __No dependencies__, no jQuery, no Underscore... zero dependencies.
* __Unobtrusive__, it is designed from the beginning to be integrated with other libraries / frameworks (also vanilla JS).
* __Forward-thinking__, written in [ESNext](https://babeljs.io/) for the future and transpiled to ES5 with UMD format for the present... thus it transparently supports almost every modules' style out there: [es6](https://github.com/lukehoban/es6features#modules), [commonJs](http://webpack.github.io/docs/commonjs.html), [AMD](http://requirejs.org/docs/commonjs.html), and normal browser.
* Proper [JSDoc](http://en.wikipedia.org/wiki/JSDoc) comments are used in all the [source code](https://github.com/rogerpadilla/easy-router/blob/master/js/easy-router.js).

Unique features:
* Send "flash" messages between routes when navigating.
* Supports "deactivate" optional-callback, called when leaving the current route.
* Register listeners before and after the routes changes.
* Cancel navigation by setting evt.canceled to true inside the callback for the event 'route:before'.

Want to create a modern hibrid-mobile-app or web-app using something like [React](https://facebook.github.io/react/), [Web Components](http://webcomponents.org/), [Handlebars](http://handlebarsjs.com/), or vanilla JS? Want to render in both sides, the backend and the front-end? Have an existing project and want to modernize? Want a router component for integrated it on your own framework? Good news, EasyRouter was created with all of those use cases in mind!

EasyRouter provides methods for routing client-side pages, and connecting them to actions; basically, it's configured by providing a list of entries and done! then start handling your routes using cross-browser history management, based on either [pushState](http://diveintohtml5.info/history.html) and real URLs, or [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange) and URL fragments. EasyRouter also includes unit testing in the build process and is tested in every common browser: Chrome, Firefox, IE9+.

Install it via [Bower](http://bower.io/) (npm support coming soon):
``` bash
bower install easy-router -S
```

Routes declaration is inspired from the upcoming Angular 2's Router and the Aurelia's [Router](http://aurelia.io/get-started.html) components:

```javascript
var Router = easyRouter.Router;

var appRouter = new Router({
    map: [
        {
            route: '',
            activate: function () {
                console.log('Entering home page);
                ...
            },
            deactivate: function() {
                // note you can optionally declare an 'deactivate' callback (called before leaving) for each handler.
                console.log('Leaving home page);   
                ...
            }
        },
        {
            route: 'companies/new',
            activate: function () {
                ...
            }
        },
        {
            route: 'companies/:id',
            activate: function (id) {
                ...
            }
        },
        {
            route: 'signup',
            activate: function () {
                ...
            }
        },
		...
    ]
});


// Listen before navigation happens in this router.
appRouter.on('route:before', function (evt) {
    // prints information about the previous handler (if so)
    console.log(evt.old);
    // prints information about the new handler
    console.log(evt.new);  
    // Check if the current user can access the route; if not,
    // cancel navigation and redirect to 'login'.
    var isAuthenticatedRoute = checkIfRouteNeedsAuthenticatedUser(evt.new.fragment);
    var isAnonymousUser = checkIfAnonymousUser();
    if (isAuthenticatedRoute && isAnonymousUser) {
        evt.canceled = true;
        appRouter.navigate('login');
        return;
    }
    ...
});


// Listen after navigation happens in any router.
Router.history.on('route:after', function (router, evt) {
    // prints information about the involved router.
    console.log(router);
    ...
});


// you can alternatively use the function "addHandler" for adding handlers:
appRouter.addHandler({
    route: 'item/:id',
    activate: function (id, queryString, message) {
        // prints {msg: 'Item saved', type: 'success'}
        console.log(message);
        ...
    }
});


// initialize the routers.
Router.history.start({pushState: true});


// client-side redirect to the 'items/:id' handler, it will receive this custom message.
Router.history.navigate('items/a12b', {msg: 'Item saved', type: 'success'});