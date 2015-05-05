# prouter
<p>
    <a href="https://travis-ci.org/rogerpadilla/prouter"><img src="https://travis-ci.org/rogerpadilla/prouter.svg?branch=master" alt="build status" /></a>
    <a href="https://gemnasium.com/rogerpadilla/prouter"><img src="https://gemnasium.com/rogerpadilla/prouter.svg" alt="Dependency Status" /></a>
    <a href='https://coveralls.io/r/rogerpadilla/prouter?branch=master'><img src='https://coveralls.io/repos/rogerpadilla/prouter/badge.svg?branch=master' alt='Coverage Status' /></a>
</p>

Unobtrusive, forward-thinking and ultra-lightweight client-side router library.
* __Small footprint__, 5kb for the [minified](https://raw.githubusercontent.com/rogerpadilla/prouter/master/dist/prouter.min.js) version.
* __Great performance__, only native functions are used.
* __No dependencies__, no jQuery, no Underscore... no dependencies at all.
* __Unobtrusive__, it is designed from the beginning to be integrated with other libraries / frameworks (also vanilla JS).
* __Forward-thinking__, written in [TypeScript](http://www.typescriptlang.org/) for the future and transpiled to ES5 with UMD format for the present... thus it transparently supports almost every modules' style out there: [es6](https://github.com/lukehoban/es6features#modules), [commonJs](http://webpack.github.io/docs/commonjs.html), [AMD](http://requirejs.org/docs/commonjs.html), and normal browser.
* Proper [JSDoc](http://en.wikipedia.org/wiki/JSDoc) comments are used in all the [source code](https://github.com/rogerpadilla/prouter/blob/master/src/prouter.ts).
* [Unit tests](https://github.com/rogerpadilla/prouter/blob/master/test/router.spec.js) for each feature are included in the build process.

__Unique features__:
* Allows to pass "flash" messages when navigating.
* Supports optionally using a _deactivate_ callback, called when leaving the current route.
* Allows to register listeners related to navigation's events: _route:before_ and _route:after_.
* Cancel navigation by setting _event.canceled_ to true inside the callback listener for _route:before_ event.
* Additional to the routing parameters extracted from the URL, an _event_ is passed as last parameter to the callbacks when navigating, allowing to obtain complete information about the navigation (_event.old_ and _event.new_ properties).
* Want to create a hibrid-mobile-app or a web-spa using something like [React](https://facebook.github.io/react/), [Polymer](https://www.polymer-project.org/) or just vanilla JS? Want to render in both sides, the backend and the front-end? Have an existing project and want to modernize? Want a router component for integrated it on your own framework? Good news, prouter was created with all of those use cases in mind!

Web applications often provide linkable, bookmarkable, shareable URLs for important locations in the app. Until recently, hash fragments (#page) were used to provide these permalinks, but with the arrival of the History API, it's now possible to use standard URLs (/page). prouter provides methods for routing client-side pages, and connecting them to actions and events; for browsers which don't yet support the History API ([pushState](http://diveintohtml5.info/history.html) and real URLs), the Router handles graceful fallback and transparent translation to the fragment version of the URL ([onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange) and URL fragments).

During page load, after your application has finished creating all of its routers, be sure to call _Router.history.start()_, or _Router.history.start({pushState: true})_ to route the initial URL.

Install it via [Bower](http://bower.io/):
``` bash
bower install prouter --save
```

Install it via [npm](https://www.npmjs.com/):
``` bash
npm install prouter --save
```

prouter is inspired from the Router components of [Backbone](http://backbonejs.org/#Router) and [Aurelia](http://aurelia.io/get-started.html):

```javascript
var Router = prouter.Router;

// Instantiate router and declaring some handlers.
var appRouter = new Router({
    map: [
        {
            route: '',
            activate: function () {
                console.log('Entering home page');
                ...
            },
            deactivate: function() {
                // note you can optionally declare an 'deactivate' callback
                // (called before leaving) for each handler.
                console.log('Leaving home page');
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
        {
            route: 'some-path/:param1/sub-path/:param2',
            activate: function (param1, param2, queryString, evt) {
                ...
            }
        },
		...
    ]
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


// initialize the routers.
Router.history.start({pushState: true});


// client-side redirect to the 'items/:id' handler, it will receive this custom message.
Router.history.navigate('items/a12b', {msg: 'Item saved', type: 'success'});
