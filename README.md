# prouter
<p>
    <a href="https://travis-ci.org/rogerpadilla/prouter?branch=master" title="build status"><img src="https://travis-ci.org/rogerpadilla/prouter.svg?branch=master" alt="build status" /></a>
    <a href="https://coveralls.io/r/rogerpadilla/prouter?branch=master" title="coverage status"><img src="https://coveralls.io/repos/rogerpadilla/prouter/badge.svg?branch=master" alt="coverage status" /></a>
    <a href="https://david-dm.org/rogerpadilla/prouter" title="dependencies status"><img src="https://david-dm.org/rogerpadilla/prouter/status.svg" alt="dependencies status" /></a>
    <a href="https://david-dm.org/rogerpadilla/prouter#info=devDependencies" title="dev dependencies status"><img src="https://david-dm.org/rogerpadilla/prouter/dev-status.svg" alt="dev dependencies status" /></a>
</p>

In rich web applications, without needing to reload the whole pages, we still want to provide linkable, bookmarkable, and shareable URLs to meaningful locations within the app. prouter provides methods for routing client-side pages and connecting them to actions and events. prouter is [configurable](#customOptions), you can opt by using [pushState](http://diveintohtml5.info/history.html) and/or [hashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange); and if you choose _pushState_, prouter can handle graceful fallback and transparent translation to the fragment version (#hash) of the URL if you wish.

## Why prouter?
- **Unobtrusive:** it is designed from the beginning to play well with UI libraries like [Polymer](https://www.polymer-project.org/1.0/), [React](http://facebook.github.io/react/), [Handlebars](http://handlebarsjs.com/), etc.
- **No dependencies** and still **really lightweight:** 6kb.
- **Forward-thinking:** learns from others Router components like the ones of Express, Backbone and Aurelia. Written in TypeScript for the future and transpiled to ES5 with UMD format for the present... thus it transparently supports almost every modules' style out there: commonJs, AMD. And as global browser variable.
- KISS principle: unnecessary complexity avoided.
- Proper JSDoc comments are used in all the [source code](https://github.com/rogerpadilla/prouter/blob/master/src/prouter.ts).
- [Unit tests](https://github.com/rogerpadilla/prouter/blob/master/test/router.spec.js) for every feature are automatically executed in major browsers: Chrome, Firefox and IE9+.

## Special features
- The powerful express's [routing-expressions style](#parametersAndQuery) now available on the client-side.
- [Group of routes](#routeGroup). You can group your routes in a modular way, thus for example, you may organize your routes in external files, them import and mount them in the main file.
- Complete [request data](#parametersAndQuery) is passed as a parameter (object with properties) to the `activate` callback.
- [Routing cycle (Nested paths)](#nestedPathsCallNext): if the current callback want to continue the routing-cycle (i.e. processing next handler in the queue), it must do one of the following things.  
  1. Call the [`next`](#nestedPathsCallNext) function. Also useful for async-nested callbacks (express's style).
  2. Or return [`true`](#nestedPathsReturnTrue). Maintained for backwards compatibility.
- [Default handler](#defaultHandler) - you may set a callback function for any routing without a path; thus this function will be executed for any path.

## Routing
In client-side apps, routing refers to the declaration of end points (paths) to an application and how it responds to URL changes.

The Router component of prouter is essentially a collection of helpers which operates on a series of handlers. A handler is created in the following way `Router.use(path, activate)`, where `Router` is the singleton instance provided by prouter, `path` is a path on the app, and `activate` is the function (callback) to be executed when the path is matched.

## Installation

```bash
npm install prouter --save

# or

bower install prouter --save
```

## Examples

### basic with default options

```js
var Router = prouter.Router;

// Adds a handler linked to the path 'about'.
Router.use('/about', function (req) {
  console.log(req);
  // {params: {}, query: {}, path: 'about', oldPath: undefined}
});

// Initialize the path-changes handling using default options.
Router.listen();

// Navigate to path 'about'.
Router.navigate('/about');
```

### <a name="customOptions"></a>custom options and several handlers including default

```js
var Router = prouter.Router;

Router.use('/', function(req) {

}).use('/login', function(req) {

}).use('/signup', function(req) {

}).use('/users/:username', function(req) {

}).use('/about', function (req) {
  console.log(req);
  // {params: {}, query: {}, path: 'about', oldPath: undefined}
}).use(function() {

});

// Initialize the Router with custom options (same as default for this example).
Router.listen({
  root: '/', // base path for the handlers.
  usePushState: false, // is pushState of history API desired?
  hashChange: true, // is hashChange desired?
  silent: false // don't try to load handlers for the current path?
});

Router.navigate('/about');

console.log(Router.getCurrent());
// 'about'
```

### leading slashes (/) does not differentiate paths

```js
var Router = prouter.Router;

var counter = 0;

Router.use('docs', function (req) {
  counter++;
}).listen();

Router.navigate('docs');
console.log(Router.getCurrent());
// 'docs'

Router.navigate('/docs');
console.log(Router.getCurrent());
// 'docs'

Router.navigate('/docs/');
console.log(Router.getCurrent());
// 'docs'

Router.navigate('docs/');
console.log(Router.getCurrent());
// 'docs'

console.log(counter);
// 4
```

### <a name="defaultHandler"></a>default handler

```js
var Router = prouter.Router;

Router.use('other', function (req, next) {
  console.log(req);
  // {params: {}, query: {}, path: 'other', oldPath: undefined}
  req.params.something = 'any';
  next();
}).use(function (req) {
  console.log(req);
  // {params: {something: 'any'}, query: {}, path: 'other', oldPath: undefined}
}).listen();

Router.navigate('other');
```

### parameters (path's tokens)

```js
var Router = prouter.Router;

Router.use('about/:id/:num', function (req) {
  console.log(req);
  // {params: {id: '16', num: '18'}, query: {}, path: 'about/16/18', oldPath: undefined}
}).listen();

Router.navigate('about/16/18');
```

### query (search string)

```js
var Router = prouter.Router;

Router.use('about', function (req) {
  console.log(req);
  // {params: {}, query: {first: '5', second: '6'}, path: 'about', oldPath: undefined}}
}).listen();

Router.navigate('about?first=5&second=6');
```

### <a name="parametersAndQuery"></a>parameters and query

```js
var Router = prouter.Router;

Router.use('/about/:id/:num', function (req) {
  console.log(req);
  // {params: {id: '16', num: '18'}, query: {first: '5', second: '6'}, path: 'about/16/18', oldPath: undefined}}
}).listen();

Router.navigate('/about/16/18?first=5&second=6');
```

### optional parameters

```js
var Router = prouter.Router;

var counter = 0;

Router.use('docs/:section/:subsection?', function (req) {
  counter += parseInt(req.params.section);
  if (req.params.subsection) {
    counter += parseInt(req.params.subsection);
  }
}).listen();

Router.navigate('docs/1');
Router.navigate('docs/2/3');

console.log(counter);
// 6
```

### custom match parameters

```js
var Router = prouter.Router;

Router.use(':foo(\\d+)', function(req) {
  console.log(req);
  // {params: {foo: '123'}, query: {}, path: '123', oldPath: undefined}
}).use('some/:other(\\d+)', function(req) {
  console.log(req);
  // {params: {other: '987'}, query: {}, path: 'some/987', oldPath: '123'}
}).listen();

Router.navigate('123');
Router.navigate('some/987');
```

### <a name="endRoutingCycle"></a>conditionally end routing cycle (can acts like a filter)

```js
var Router = prouter.Router;

Router.use(function (req, next) {
  // Will enter here first since this is a default handler (any url)
  // and it is at first position in the queue (can acts like a filter).
  if (ifSomeCustomConditionIsMet) {
    // Continue routing-cycle.
    next();
  }
}).use('/about', function () {
  // Will enter here only if the previous callback call 'next' or return true.
});

Router.listen();

Router.navigate('/about');
```

### <a name="nestedPathsCallNext"></a>nested paths - call next

```js
var Router = prouter.Router;

var sequence = '';

Router.use('/about/docs', function (req, next) {
  sequence += '1';
  next();
}).use('about/docs/about', function (req, next) {
  sequence += '2';
  next();
}).use('/about/docs/stub', function (req, next) {
  sequence += '3';
  next();
}).use('/about/*', function () {
  sequence += '*';
}).listen();

Router.navigate('/about/docs');
Router.navigate('/about/docs/about');
Router.navigate('/about/docs/stub');

console.log(sequence);
// '1*2*3*
```

### <a name="nestedPathsReturnTrue"></a>nested paths - return true

```js
var Router = prouter.Router;

var sequence = '';

Router.use('/about/docs', function () {
  sequence += '1';
  return true;
}).use('about/docs/about', function () {
  sequence += '2';
  return true;
}).use('/about/docs/stub', function () {
  sequence += '3';
  return true;
}).use('/about/*', function () {
  sequence += '*';
}).listen();

Router.navigate('/about/docs');
Router.navigate('/about/docs/about');
Router.navigate('/about/docs/stub');

console.log(sequence);
// '1*2*3*
```

### <a name="routeGroup"></a>route group

```js
var Router = prouter.Router;
var RouteGroup = prouter.RouteGroup;

var sequence = '';

// Note that each route-group may be placed in a separate file.
var userGroup = new RouteGroup();
userGroup.use('', function () {
  sequence += '1';
}).use(':id', function () {
  sequence += '2';
});

// Note that each route-group may be placed in a separate file.
var aboutGroup = new RouteGroup();
aboutGroup.use('owner', function () {
  sequence += '3';
}).use('year/:num', function () {
  sequence += '4';
});

Router
  .use('users', userGroup)
  .use('about', aboutGroup)
  .listen();

Router.navigate('users');
Router.navigate('users/9');
Router.navigate('about/owner');
Router.navigate('about/year/2015');

console.log(sequence);
// '1234'
```

___


## Supported Routing expressions (compatible with the express's routing-expressions style):
### Named Parameters
Named parameters are defined by prefixing a colon to the parameter name (`:foo`). By default, this parameter will match up to the next path segment.

```js
':foo/:bar'
// Given 'any/thing' => newRouteData.params = {foo: 'any', bar: 'thing'}
```

### Suffixed Parameters
#### Optional
Parameters can be suffixed with a question mark (`?`) to make the entire parameter optional.

```js
':foo/:bar?'
// Given 'any' => newRouteData.params = {foo: 'any', bar: undefined}
// Given 'any/thing' => newRouteData.params = {foo: 'any', bar: 'thing'}
```

#### Zero or more
Parameters can be suffixed with an asterisk (`*`) to denote a zero or more parameter match.

```js
':foo*'
// Given '' => newRouteData.params = {foo: ''}
// Given 'one/two/three' => newRouteData.params = {foo: 'one/two/three'}
```

#### One or more
Parameters can be suffixed with a plus sign (`+`) to denote a one or more parameters match.

```js
':foo+'
// Given 'one/two/three' => newRouteData.params = {foo: 'one/two/three'}
```

### Custom Match Parameters
All parameters can be provided a custom matching regexp and override the default. Please note: Backslashes need to be escaped in strings.

```js
':foo(\\d+)'
// Given '123' => newRouteData.params = {foo: '123'}
```

### Unnamed Parameters
It is possible to write an unnamed parameter that is only a matching group. It works the same as a named parameter, except it will be numerically indexed.

```js
':foo/(.*)'
// Given 'test/route' => newRouteData.params = {foo: 'test', '0': 'route'}
```

### Asterisk
An asterisk can be used for matching everything. It is equivalent to an unnamed matching group of `(.*)`.

```js
'foo/*'
// Given 'foo/bar/baz' => newRouteData.params = {'0': 'bar/baz'}

':foo/*'
// Given 'foo/bar/baz' => newRouteData.params = {foo: 'foo', '0': 'bar/baz'}
```

___


See [unit tests](https://github.com/rogerpadilla/prouter/blob/master/test/router.spec.js) for more detailed use cases.
