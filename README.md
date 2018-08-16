# prouter

[![build status](https://travis-ci.org/rogerpadilla/prouter.svg?branch=master)](https://travis-ci.org/rogerpadilla/prouter?branch=master)
[![coverage status](https://coveralls.io/repos/rogerpadilla/prouter/badge.svg?branch=master)](https://coveralls.io/r/rogerpadilla/prouter?branch=master)
[![dependencies status](https://david-dm.org/rogerpadilla/prouter/status.svg)](https://david-dm.org/rogerpadilla/prouter/status.svg)
[![dev dependencies status](https://david-dm.org/rogerpadilla/prouter/dev-status.svg)](https://david-dm.org/rogerpadilla/prouter/dev-status.svg)
[![npm downloads](https://img.shields.io/npm/dm/prouter.svg)](https://www.npmjs.com/package/prouter)
[![npm version](https://badge.fury.io/js/prouter.svg)](https://www.npmjs.com/prouter)

The power of the [express's routing-expressions style](https://expressjs.com/en/guide/routing.html) available in the frontend.

In web applications, it's useful to provide linkable, bookmarkable, and shareable URLs to meaningful locations within the app without reload the page. In that context, routing refers to the declaration that does the app that it wants to react to changes in the URL (path), and to trigger some callbacks (handlers) accordingly.

So basically, you give prouter a set of path expressions and a callback function for each of them (that tuple is known as a middleware), so prouter will call the callback(s) (passing contextual parameters) according to the activated path (URL). Read more information about middlewares [here](https://expressjs.com/en/guide/writing-middleware.html).

## Why prouter?
- **Unobtrusive:** it is designed from the beginning to play well with vanilla JS or with any library/framework out there.
- **Learn once and reuse it** express.js is very well known and used across the world, why not bringing a similar API (wherever possible) to the browser? Under the hood, prouter uses the same (wonderful) library than express for parsing URLs [Path-to-RegExp](https://github.com/pillarjs/path-to-regexp).
- **Really lightweight:** [great performance](https://github.com/rogerpadilla/prouter/blob/master/src/browser-router.spec.ts#L8) and tiny size (currently least than 7kb before gzipping) are must to have.
- **Forward-thinking:** learns from others Router components like the ones of Express and Angular. Written in TypeScript for the future and transpiled to es5 with UMD format for the present... thus it transparently supports almost every modules' style out there: es2015 (es6), CommonJS, AMD. And can be used also as global browser variable (via 'script' tag in your HTML).
- KISS principle: unnecessary complexity avoided.
- Unit tests for every feature are created.

## Installation

```bash
# Using NPM
npm install prouter --save

# Or with Yarn
yarn prouter --save

# Or just include it using a 'script' tag in your HTML file
```

## Examples

### basic

```js
// Using es2015 modules
import { browserRouter } from 'prouter';

// Instantiate the router
const router = browserRouter();

// Declare the paths and its respective handlers
router
  .use('/', async (req, resp)=> {
    const people = await personService.find();
    const html = PersonListCmp(people);
    document.querySelector('.router-outlet') = html;
    resp.end();
  })
  .use('/about', (req, resp)=> {
    send('<h1>Static About page.</h1>');
    resp.end();
  });

// start listening events for navigation events
router.listen();
```


### conditionally avoid executing other middlewares and prevent changing the path in the URL

```js
// Using CommonJs modules
const prouter = require('prouter');

// Instantiate the router
const router = prouter.browserRouter();

// Declare the paths and its respective handlers
router
  .use('(.*)', (req, resp, next) => {

    // this handler will be for any routing event, before other handlers
    const srcPath = router.getPath();
    const destPath = req.originalUrl;
    console.log('coming from', srcPath);
    console.log('going to', destPath);

    const isAllowed = authService.validateHasAccessToUrl(req.originalUrl);

    // (programmatically) end the request-response cycle, avoid executing other middlewares
    // and prevent changing the path in the URL.
    if (!isAllowed) {
      showAlert("You haven't rights to access the page: " + destPath);
      resp.end({ preventNavigation: true });
      return;
    }

    next();
  })
  .use('/', (req, resp)=> {
    // do some stuff...
    resp.end();
  })
  .use('/admin', (req, resp)=> {
    // do some stuff...
    resp.end();
  });

// start listening events for the routing
router.listen();

// programmatically try to navigate to any route in your router
router.push('/admin');
```


### conditionally avoid executing other middlewares but allow changing the path in the URL

```js
import { BrowserRouter } from 'prouter';

// Instantiate the router
const router = browserRouter();

// Declare the paths and its respective handlers
router
  .use('(.*)', (req, resp, next) => {
    
    // this handler will be for any routing event, before other handlers
    const srcPath = router.getPath();
    const destPath = req.originalUrl;
    console.log('coming from', srcPath);
    console.log('going to', destPath);
    
    const isAllowed = authService.validateHasAccessToUrl(req.originalUrl);
    // (programmatically) end the request-response cycle, avoid executing other middlewares
    // and allow changing the path in the URL.
    if (!isAllowed) {
      showAlert("You haven't rights to access the page: " + destPath);
      resp.end();
      return;
    }

    next();
  })
  .use('/', (req, resp)=> {
    // do some stuff...
    resp.end();
  })
  .use('/admin', (req, resp)=> {
    // do some stuff...
    resp.end();
  });

// start listening events for the routing
router.listen();

// programmatically try to navigate to any route in your router
router.push('/admin');
```

### run a generic middleware (for doing some generic stuff) after running specific middlewares

```js
import { BrowserRouter } from 'prouter';

// Instantiate the router
const router = browserRouter();

// Declare the paths and its respective handlers
router
  .use('/', async (req, resp, next)=> {
    const people = await personService.find();
    const html = PersonListCmp(people);
    document.querySelector('.router-outlet') = html;
    next();
  })
  .use('(.*)', (req, resp)=> {
    // do some (generic) stuff
    resp.end();
  });

// start listening events for navigation events
router.listen();
```


### modularize your routing code in different files using Router Group

```js
import { browserRouter, routerGroup } from 'prouter';

// this can be in a different file for modularization of the routes,
// and then import it in your main routes file and mount it.
const productRouterGroup = routerGroup();

productRouterGroup
  .use('/', (req, resp)=> {
    // do some stuff...
    resp.end();
  })
  .use('/create', (req, resp)=> {
    // do some stuff...  
    resp.end();
  })
  .use('/:id', (req, resp)=> {
    const id = req.params.id;
    // do some stuff with the 'id'...
    resp.end();
  });

// Instantiate the router
const router = browserRouter();

// Declare the paths and its respective handlers
router
  .use('(.*)', (req, resp, next)=> {
    // this handler will be for any routing event, before other handlers
    console.log('request info', req);
    next();
  })
  .use('/', (req, resp)=> {
    // do some stuff...
    resp.end();
  })
  // mount the product's group of handlers using this base path
  .use('/product', productRouterGroup);

// start listening events for the routing
router.listen();

// programmatically navigate to the detail of the product with this ID
router.push('/product/123');
```


### see more advanced usages in the [unit tests.](https://github.com/rogerpadilla/prouter/blob/master/src/browser-router.spec.ts)
