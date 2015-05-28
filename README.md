# prouter
<p>
    <a href="https://travis-ci.org/rogerpadilla/prouter"><img src="https://travis-ci.org/rogerpadilla/prouter.svg" alt="build status" /></a>
    <a href="https://gemnasium.com/rogerpadilla/prouter"><img src="https://gemnasium.com/rogerpadilla/prouter.svg" alt="Dependency Status" /></a>
    <a href='https://coveralls.io/r/rogerpadilla/prouter'><img src='https://coveralls.io/repos/rogerpadilla/prouter/badge.svg' alt='Coverage Status' /></a>
</p>

In rich web applications, we still want to provide linkable, bookmarkable, and shareable URLs to meaningful locations within the app without needing to reload the whole pages. prouter provides methods for routing client-side pages and connecting them to actions and events; for browsers which don't yet support the History API ([pushState](http://diveintohtml5.info/history.html) and real URLs), prouter handles graceful fallback and transparent translation to the fragment version of the URL ([onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange) and URL fragments).

### Why prouter?

* __Unobtrusive:__ it is designed from the beginning to play well with others libraries, frameworks and vanilla JS. Want to create a hibrid-mobile-app or a web-spa using something like [React](https://facebook.github.io/react/), [Polymer](https://www.polymer-project.org/), [Handlebars](http://handlebarsjs.com/) or just vanilla JS? Have an existing project and want to modernize it? Want a router component for integrating it on your own framework? Good news, prouter is created with all of those use cases in mind!
* __No dependencies:__ no jQuery, no underscore... no dependencies at all.
* __Lightweight:__ 7kb for the [minified](https://raw.githubusercontent.com/rogerpadilla/prouter/master/dist/prouter.min.js) version.
* __Forward-thinking:__ learns from other Router components like the ones from Backbone, Aurelia and Express. Written in [TypeScript](http://www.typescriptlang.org/) for the future and transpiled to ES5 with UMD format for the present... thus it transparently supports almost every modules' style out there:
[commonJs](http://webpack.github.io/docs/commonjs.html), [AMD](http://requirejs.org/docs/commonjs.html), and global browser.
* [KISS principle](http://en.wikipedia.org/wiki/KISS_principle): unnecessary complexity avoided.
* Proper [JSDoc](http://en.wikipedia.org/wiki/JSDoc) comments are used in all the [source code](https://github.com/rogerpadilla/prouter/blob/master/src/prouter.ts).
* [Unit tests](https://github.com/rogerpadilla/prouter/blob/master/test/router.spec.js) for every feature are included in the build process.

### Unique features
* Ability to pass **_flash_ messages** when triggering navigation.
* Supports optionally declaring **_deactivate_ callbacks**.
* Ability to **register listeners for navigation's events**: _route:before_ and _route:after_.
* Supports **preventing navigation** by returning _false_ from the callback for the _route:before_ event or from the _deactivate_ callback.
* Complete __navigation data__ is passed in two parameters (objects with properties) to the activate / deactivate / event callbacks, allowing to obtain full information about the navigation.

### Installation
``` bash
npm install prouter --save

# or

bower install prouter --save
```

### Examples

```js
var Router = prouter.Router;

// Instantiate router and declare some handlers.
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
                // Optional 'deactivate' callbacks like this,
                // can be declared for a handler.
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
                // The query (parsed as object).
                console.log(newRouteData.query);
                // The flash message (if any).
                console.log(newRouteData.message);
                // Information about the previous handler (if any).
                console.log(oldRouteData);
            }
        },
        {
            route: '*',
            activate: function() {
                console.log('Default route.');
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

// You can alternatively use the function "add" for adding handlers:
appRouter.add({
    route: 'item/:id',
    activate: function (newRouteData, oldRouteData) {
        console.log(newRouteData);
        console.log(oldRouteData);
    }
});

// Activate routers (default options used for this example).
// During page load, after your application has finished creating all of
// its routers, be sure to call Router.history.start() or
// Router.history.start(options) to enable routers.
Router.history.start({root: '/', hashChange: true, pushState: false, silent: false});

// Client-side redirect to the 'items/:id' handler and send a flash message.
Router.history.navigate('items/a12b', {msg: 'Item saved', type: 'success'});
```

### Supported Routing expressions (compatible with express / [path-to-regexp](https://github.com/pillarjs/path-to-regexp)):

#### Named Parameters

Named parameters are defined by prefixing a colon to the parameter name (`:foo`). By default, this parameter will match up to the next path segment.

```js
':foo/:bar'
// Given 'any/thing' => newRouteData.params = {foo: 'any', bar: 'thing'}
```

#### Suffixed Parameters

##### Optional

Parameters can be suffixed with a question mark (`?`) to make the entire parameter optional.

```js
':foo/:bar?'
// Given 'any' => newRouteData.params = {foo: 'any', bar: undefined}
// Given 'any/thing' => newRouteData.params = {foo: 'any', bar: 'thing'}
```

##### Zero or more

Parameters can be suffixed with an asterisk (`*`) to denote a zero or more parameter match.

```js
':foo*'
// Given '' => newRouteData.params = {foo: ''}
// Given 'one/two/three' => newRouteData.params = {foo: 'one/two/three'}
```

##### One or more

Parameters can be suffixed with a plus sign (`+`) to denote a one or more parameters match.

```js
':foo+'
// Given 'one/two/three' => newRouteData.params = {foo: 'one/two/three'}
```

#### Custom Match Parameters

All parameters can be provided a custom matching regexp and override the default. Please note: Backslashes need to be escaped in strings.

```js
':foo(\\d+)'
// Given '123' => newRouteData.params = {foo: '123'}
```

#### Unnamed Parameters

It is possible to write an unnamed parameter that is only a matching group. It works the same as a named parameter, except it will be numerically indexed.

```js
':foo/(.*)'
// Given 'test/route' => newRouteData.params = {foo: 'test', '0': 'route'}
```

#### Asterisk

An asterisk can be used for matching everything. It is equivalent to an unnamed matching group of `(.*)`.

```js
'foo/*'
// Given 'foo/bar/baz' => newRouteData.params = {'0': 'bar/baz'}

':foo/*'
// Given 'foo/bar/baz' => newRouteData.params = {foo: 'foo', '0': 'bar/baz'}
```
