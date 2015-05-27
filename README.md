# prouter
<p>
    <a href="https://travis-ci.org/rogerpadilla/prouter"><img src="https://travis-ci.org/rogerpadilla/prouter.svg" alt="build status" /></a>
    <a href="https://gemnasium.com/rogerpadilla/prouter"><img src="https://gemnasium.com/rogerpadilla/prouter.svg" alt="Dependency Status" /></a>
    <a href='https://coveralls.io/r/rogerpadilla/prouter'><img src='https://coveralls.io/repos/rogerpadilla/prouter/badge.svg' alt='Coverage Status' /></a>
</p>

__Why prouter?__:

* __Unobtrusive:__ it is designed from the beginning to play well with others libraries, frameworks and vanilla JS. Want to create a hibrid-mobile-app or a web-spa using something like [React](https://facebook.github.io/react/), [Polymer](https://www.polymer-project.org/), [Handlebars](http://handlebarsjs.com/) or just vanilla JS? Want to render in both sides the backend and the front-end? Have an existing project and want to modernize? Want a router component for integrating it on your own framework? Good news, prouter is created with all of those use cases in mind!
* __No dependencies:__ no jQuery, no underscore... no dependencies at all.
* __Lightweight:__ 7kb for the [minified](https://raw.githubusercontent.com/rogerpadilla/prouter/master/dist/prouter.min.js) version.
* __Forward-thinking:__ written in [TypeScript](http://www.typescriptlang.org/) for the future and transpiled to ES5 with UMD format for the present... thus it transparently supports almost every modules' style out there:
[commonJs](http://webpack.github.io/docs/commonjs.html), [AMD](http://requirejs.org/docs/commonjs.html), and global browser.
* [KISS principle](http://en.wikipedia.org/wiki/KISS_principle): unnecessary complexity avoided.
* Proper [JSDoc](http://en.wikipedia.org/wiki/JSDoc) comments are used in all the [source code](https://github.com/rogerpadilla/prouter/blob/master/src/prouter.ts).
* [Unit tests](https://github.com/rogerpadilla/prouter/blob/master/test/router.spec.js) for every feature are included in the build process.

__Unique features__:
* Ability to pass **_flash_ messages** when triggering navigation.
* Supports optionally declaring a **_deactivate_ callback**.
* Ability to **register listeners for navigation's events**: _route:before_ and _route:after_.
* **Cancel navigation** by returning 'false' from the callback for the _route:before_ event or from the _deactivate_ callback.
* Complete __navigation data__ is passed in two parameters (objects with properties) to the activate / deactivate / event callbacks, allowing to obtain full information about the navigation.

prouter is inspired from the Router components of [Backbone](http://backbonejs.org/#Router), [Aurelia](http://aurelia.io/get-started.html) and [Express](http://expressjs.com/guide/routing.html).

Install it:
``` bash
npm install prouter --save

# or

bower install prouter --save
```

Web applications often provide linkable, bookmarkable, shareable URLs for important locations in the app. Until recently, hash fragments (#page) were used to provide these permalinks, but with the arrival of the History API, it's now possible to use standard URLs (/page). prouter provides methods for routing client-side pages, and connecting them to actions and events; for browsers which don't yet support the History API ([pushState](http://diveintohtml5.info/history.html) and real URLs), the Router handles graceful fallback and transparent translation to the fragment version of the URL ([onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange) and URL fragments).

**During page load, after your application has finished creating all of its routers, be sure to call _Router.history.start()_, or _Router.history.start({pushState: true})_ to route the initial URL**.

#### Examples:

```js
var Router = prouter.Router;

// Instantiate router and declaring some handlers.
var appRouter = new Router({
    map: [
        {
            route: '',
            activate: function () {
                console.log('Entering home page');
            }
        },
        {
            route: 'users/:id',
            activate: function (newRouteData) {
                var userId = newRouteData.params.id;
                console.log('The given userId is: ', userId);
            },
            deactivate: function() {
                // An optionally 'deactivate' callback like this,
                // can be declared for the handler.
                console.log('Leaving user page.');
            }
        },
        {
            route: 'some-path/:paramA/sub-path/:paramB',
            activate: function (newRouteData, oldRouteData) {
                // The value for the parameter 'paramA'.
                console.log(newRouteData.params.paramA);
                // The value for the parameter 'paramB'.
                console.log(newRouteData.params.paramB);
                console.log(newRouteData.path);
                // The query-string (search).
                console.log(newRouteData.query);
                // The flash message (if any).
                console.log(newRouteData.message);
                // Information about the previous handler (if any).
                console.log(oldRouteData);
            }
        }
    ]
});

// Listen before navigation happens in this router.
appRouter.on('route:before', function (newRouteData, oldRouteData) {
    // Information about the new handler.
    console.log(newRouteData);  
    // Information about the previous handler (if any).
    console.log(oldRouteData);
    // Check if the current user can access the path; if not,
    // cancel navigation and redirect to 'login'.
    var isAuthenticationNeeded = checkIfRouteNeedsAuthenticatedUser(newRouteData.path);
    var isAnonymousUser = isAnonymousUser();
    if (isAuthenticationNeeded && isAnonymousUser) {
        appRouter.navigate('login');
        return false;
    }
});

// You can alternatively use the function "addHandler" for adding handlers:
appRouter.addHandler({
    route: 'item/:id',
    activate: function (newRouteData, oldRouteData) {
        console.log(newRouteData);
        console.log(oldRouteData);
        ...
    },
    deactivate: function (newRouteData, oldRouteData) {
        console.log(newRouteData);
        console.log(oldRouteData);
        if (!someCondition) {
            // Prevents navigation.
            return false;
        }
    }
});

// Initialize the routers (default options used for this example).
Router.history.start({root: '/', hashChange: true, pushState: false, silent: false});

// Client-side redirect to the 'items/:id' handler, and send this flash message.
Router.history.navigate('items/a12b', {msg: 'Item saved', type: 'success'});
```

### Supportted Routing expressions.

#### Named Parameters

Named parameters are defined by prefixing a colon to the parameter name (`:foo`). By default, this parameter will match up to the next path segment.

```js
'/:foo/:bar'
```

#### Suffixed Parameters

##### Optional

Parameters can be suffixed with a question mark (`?`) to make the entire parameter optional. This will also make any prefixed path delimiter optional (`/` or `.`).

```js
'/:foo/:bar?'
```

##### Zero or more

Parameters can be suffixed with an asterisk (`*`) to denote a zero or more parameter match. The prefixed path delimiter is also taken into account for the match.

```js
'/:foo*'
```

##### One or more

Parameters can be suffixed with a plus sign (`+`) to denote a one or more parameters match. The prefixed path delimiter is included in the match.

```js
'/:foo+'
```

#### Custom Match Parameters

All parameters can be provided a custom matching regexp and override the default. Please note: Backslashes need to be escaped in strings.

```js
'/:foo(\\d+)'
```

#### Unnamed Parameters

It is possible to write an unnamed parameter that is only a matching group. It works the same as a named parameter, except it will be numerically indexed.

```js
'/:foo/(.*)'
```

#### Asterisk

An asterisk can be used for matching everything. It is equivalent to an unnamed matching group of `(.*)`.

```js
'/foo/*'
```
