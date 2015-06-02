# prouter
<p>
    <a href="https://travis-ci.org/rogerpadilla/prouter"><img src="https://travis-ci.org/rogerpadilla/prouter.svg" alt="build status" /></a>
    <a href="https://gemnasium.com/rogerpadilla/prouter"><img src="https://gemnasium.com/rogerpadilla/prouter.svg" alt="Dependency Status" /></a>
    <a href='https://coveralls.io/r/rogerpadilla/prouter'><img src='https://coveralls.io/repos/rogerpadilla/prouter/badge.svg' alt='Coverage Status' /></a>
</p>

In rich web applications, we still want to provide linkable, bookmarkable, and shareable URLs to meaningful locations within the app, without needing to reload the whole pages. prouter provides methods for routing client-side pages and connecting them to actions and events; for browsers which don't yet support the History API ([pushState](http://diveintohtml5.info/history.html) and real URLs), prouter handles graceful fallback and transparent translation to the fragment version of the URL ([onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange) and URL fragments).

### Why prouter?

* __Unobtrusive:__ it is designed from the beginning to play well with others libraries, frameworks and vanilla JS.
* __Absence of dependencies__ and still __really lightweight:__ 6kb.
* __Forward-thinking:__ learns from other Router components like the ones from Express, Backbone and Aurelia. Written in TypeScript for the future and transpiled to ES5 with UMD format for the present... thus it transparently supports almost every modules' style out there:
commonJs, AMD. And as global browser.
* KISS principle: unnecessary complexity avoided.
* Proper JSDoc comments are used in all the [source code](https://github.com/rogerpadilla/prouter/blob/master/src/prouter.ts).
* [Unit tests](https://github.com/rogerpadilla/prouter/blob/master/test/router.spec.js) for every feature are automatically executed in major browsers: Chrome, Firefox and IE9+.

### Special features
* The powerful express's [routing-expressions style](#parametersAndQuery) now available in the client-side.
* [Group of routes](#routeGroup). You can group your routes in a modular way, thus for example, you may organize your routes in external files, them import and mount them in the main file.
* Complete [request data](#parametersAndQuery) is passed as a parameter (object with properties) to the `activate` callback.
* [Default handler](#defaultHandler) - you may set a callback function for any routing without a path; thus this function will be executed for any path.
* [End the routing cycle](#endRoutingCycle) (by returning `false` from a callback).

### Routing

In client-side apps, routing refers to the declaration of end points (paths) to an application and how it responds to URL changes.

The Router component of prouter is essentially a collection of helpers which operates on a series of handlers. A handler is created in the following way `Router.use(path, activate)`,
where `Router` is the singleton instance provided by prouter, `path` is a path on the app, and `activate` is the function (callback)
to be executed when the path is matched.

### Installation

``` bash
npm install prouter --save

# or

bower install prouter --save
```

### Examples

#### basic with default options

``` js
var Router = prouter.Router;

// Adds a handler linked to the path 'about'.
Router.use('/about', function (req) {
  console.log(req);
  // {params: {}, query: {}, path: 'about', oldPath: ''}
});

// Initializes the path-changes handling using default options.
Router.listen();

// Navigates to the path 'about'.
Router.navigate('/about');
```

#### basic with custom options

``` js
var Router = prouter.Router;

Router.use('/about', function (req) {
  console.log(req);
  // {params: {}, query: {}, path: 'about', oldPath: ''}
});

// Initializes with given options (same as default in this case).
Router.listen({root: '/', usePushState: false, hashChange: true, silent: false});

Router.navigate('/about');

console.log(Router.getCurrent());
// 'about'
```

#### leading slashes (/) does not affect paths

``` js
var Router = prouter.Router;

var counter = 0;

Router.use('docs', function (req) {
  counter++;
  console.log(req.path);
  // 'docs'
});

Router.listen();

Router.navigate('docs');
console.log(Router.getCurrent());
// 'about'

Router.navigate('/docs');
console.log(Router.getCurrent());
// 'about'

Router.navigate('/docs/');
console.log(Router.getCurrent());
// 'about'

Router.navigate('docs/');
console.log(Router.getCurrent());
// 'about'

console.log(counter);
// 4
```

#### <a name="defaultHandler"></a>default handler

``` js
var Router = prouter.Router;

Router.use('other', function (req) {
  console.log(req);
  // {params: {}, query: {}, path: 'other', oldPath: ''}
  req.params.something = 'any';
}).use(function (req) {
  console.log(req);
  // {params: {something: 'any'}, query: {}, path: 'other', oldPath: ''}
});

Router.listen();

Router.navigate('other');
```

#### parameters (path's tokens)

``` js
var Router = prouter.Router;

Router.use('about/:id/:num', function (req) {
  console.log(req);
  // {params: {id: '16', num: '18'}, query: {}, path: 'about/16/18', oldPath: ''}
}).listen();

Router.navigate('about/16/18');
```

#### query (search string)

``` js
var Router = prouter.Router;

Router.use('about', function (req) {
  console.log(req);
  // {params: {}, query: {first: '5', second: '6'}, path: 'about', oldPath: ''}}
}).listen();

Router.navigate('about?first=5&second=6');
```

#### <a name="parametersAndQuery"></a>parameters and query

``` js
var Router = prouter.Router;

Router.use('/about/:id/:num', function (req) {
  console.log(req);
  // {params: {id: '16', num: '18'}, query: {first: '5', second: '6'}, path: 'about', oldPath: ''}}
}).listen();

Router.navigate('/about/16/18?first=5&second=6');
```

#### optional parameters

``` js
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

#### <a name="endRoutingCycle"></a>end routing cycle

``` js
var Router = prouter.Router;

Router.use(function (req) {
  // This callback will be executed.
  return false;
}).use('/about', function () {
  // Will not enter here.
});

Router.listen();

Router.navigate('/about');
```

#### nested paths

``` js
var Router = prouter.Router;

var sequence = '';

Router.use('/about/docs', function () {
  sequence += '1';
}).use('about/docs/about', function () {
  sequence += '2';
}).use('/about/docs/stub', function () {
  sequence += '3';
}).use('/about/*', function () {
  sequence += '*';
});

Router.listen();

Router.navigate('/about/docs');
Router.navigate('/about/docs/about');
Router.navigate('/about/docs/stub');

console.log(sequence);
// '1*2*3*''
```

#### <a name="routeGroup"></a>route group

``` js
var Router = prouter.Router;
var RouteGroup = prouter.RouteGroup;

var sequence = '';

var userGroup = new RouteGroup();
userGroup.use('', function () {
  sequence += '1';
}).use(':id', function () {
  sequence += '2';
});

var aboutGroup = new RouteGroup();
aboutGroup.use('owner', function () {
  sequence += '3';
}).use('year/:num', function () {
  sequence += '4';
});

Router.use('users', userGroup);
Router.use('about', aboutGroup);

Router.navigate('users');
Router.navigate('users/9');
Router.navigate('about/owner');
Router.navigate('about/year/2015');

console.log(sequence);
// '1234'
```
___


### Supported Routing expressions (compatible with the express's routing-expressions style):

#### Named Parameters

Named parameters are defined by prefixing a colon to the parameter name (`:foo`). By default, this parameter will match up to the next path segment.

``` js
':foo/:bar'
// Given 'any/thing' => newRouteData.params = {foo: 'any', bar: 'thing'}
```

#### Suffixed Parameters

##### Optional

Parameters can be suffixed with a question mark (`?`) to make the entire parameter optional.

``` js
':foo/:bar?'
// Given 'any' => newRouteData.params = {foo: 'any', bar: undefined}
// Given 'any/thing' => newRouteData.params = {foo: 'any', bar: 'thing'}
```

##### Zero or more

Parameters can be suffixed with an asterisk (`*`) to denote a zero or more parameter match.

``` js
':foo*'
// Given '' => newRouteData.params = {foo: ''}
// Given 'one/two/three' => newRouteData.params = {foo: 'one/two/three'}
```

##### One or more

Parameters can be suffixed with a plus sign (`+`) to denote a one or more parameters match.

``` js
':foo+'
// Given 'one/two/three' => newRouteData.params = {foo: 'one/two/three'}
```

#### Custom Match Parameters

All parameters can be provided a custom matching regexp and override the default. Please note: Backslashes need to be escaped in strings.

``` js
':foo(\\d+)'
// Given '123' => newRouteData.params = {foo: '123'}
```

#### Unnamed Parameters

It is possible to write an unnamed parameter that is only a matching group. It works the same as a named parameter, except it will be numerically indexed.

``` js
':foo/(.*)'
// Given 'test/route' => newRouteData.params = {foo: 'test', '0': 'route'}
```

#### Asterisk

An asterisk can be used for matching everything. It is equivalent to an unnamed matching group of `(.*)`.

``` js
'foo/*'
// Given 'foo/bar/baz' => newRouteData.params = {'0': 'bar/baz'}

':foo/*'
// Given 'foo/bar/baz' => newRouteData.params = {foo: 'foo', '0': 'bar/baz'}
```
