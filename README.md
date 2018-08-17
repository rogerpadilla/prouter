# prouter

[![build status](https://travis-ci.org/rogerpadilla/prouter.svg?branch=master)](https://travis-ci.org/rogerpadilla/prouter?branch=master)
[![coverage status](https://coveralls.io/repos/rogerpadilla/prouter/badge.svg?branch=master)](https://coveralls.io/r/rogerpadilla/prouter?branch=master)
[![dependencies status](https://david-dm.org/rogerpadilla/prouter/status.svg)](https://david-dm.org/rogerpadilla/prouter/status.svg)
[![dev dependencies status](https://david-dm.org/rogerpadilla/prouter/dev-status.svg)](https://david-dm.org/rogerpadilla/prouter/dev-status.svg)
[![npm downloads](https://img.shields.io/npm/dm/prouter.svg)](https://www.npmjs.com/package/prouter)
[![npm version](https://badge.fury.io/js/prouter.svg)](https://www.npmjs.com/prouter)

Micro client-side router inspired in the simplicity and power of express router.

Basically, give prouter a list of path expressions and a callback function for each one (that tuple is known as a middleware), and prouter will invoke the callbacks (passing contextual parameters) according to the activated path (URL). Read more information about middlewares [here](https://expressjs.com/en/guide/writing-middleware.html).

## Why prouter?
- **KISS principle everywhere:** do only one thing and do it well. Guards? conditional execution? generic pre and post middlewares? all that ad more is easily achivable with prouter (see examples below).
- **Performance:** [must be fast](https://github.com/rogerpadilla/prouter/blob/master/src/browser-router.spec.ts#L8) and tiny size (currently least than 7kb before gzipping) are must to have.
- **Learn once:** express.js is very powerfull, flexible and popular, why not bringing a similar API (really a subset) to the frontend? Under the hood, prouter uses the same (wonderful) library than express for parsing URLs [Path-to-RegExp](https://github.com/pillarjs/path-to-regexp) (so the same power to declare routes).
- **Unobtrusive:** it is designed from the beginning to play well with vanilla JavaScript or with any other library or framework.
- **Forward-thinking:** written in TypeScript for the future and transpiled to es5 with UMD format for the present... thus it transparently supports any module style: es6, commonJS, AMD.
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
    document.querySelector('.router-outlet') = `<h1>Some static content for the About page.</h1>`;
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

    // this handler will run for any routing event, before other handlers
    
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


### run a generic middleware (for doing some generic stuff) after running specific middlewares

```js
import { browserRouter } from 'prouter';

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
  .use('/:id(\\d+)', (req, resp)=> {
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

### full example

```js
import { browserRouter, routerGroup } from 'prouter';

// this can be in a different file for modularization of the routes,
// and then import it in your main routes file and mount it.
const productRouterGroup = routerGroup();

productRouterGroup
  .use('/', (req, resp, next)=> {
    // do some stuff...
    next();
  })
  .use('/create', (req, resp, next)=> {
    // do some stuff...  
    next();
  })
  .use('/:id(\\d+)', (req, resp, next)=> {
    const id = req.params.id;
    // do some stuff with the 'id'...
    next();
  });

// Instantiate the router
const router = browserRouter();

// Declare the paths and its respective handlers
router
  .use('(.*)', (req, resp, next) => {

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
  .use('/', (req, resp, next)=> {
    // do some stuff...
    next();
  })
  .use('/admin', (req, resp, next)=> {
    // do some stuff...
    next();
  })
  // mount the product's group of handlers using this base path
  .use('/product', productRouterGroup)
  .use('(.*)', (req, res, next) => {
    if (req.listening) {
      const title = inferTitleFromPath(req.originalUrl, APP_TITLE);
      updatePageTitle(title);
    }
    next();
  });
  .listen();


// the below code is an example (typically, you would put it in a separated file)
// about how you could capture clicks on links and accordingly trigger routing
// navigation in your app

export function isNavigationPath(path: string) {
  return !!path && !path.startsWith('javascript:void');
}

export function isExternalPath(path: string) {
  return /^https?:\/\//.test(path);
}

export function isApplicationPath(path: string) {
  return isNavigationPath(path) && !isExternalPath(path);
}

document.body.addEventListener('click', (evt) => {

    const target = evt.target as Element;
    let link: Element;

    if (target.nodeName === 'A') {
      link = target;
    } else {
      link = target.closest('a');
      if (!link) {
        return;
      }
    }

    const url = link.getAttribute('href');

    // do nothing if it is not an app's internal link
    if (!isApplicationPath(url)) {
      return;
    }
    
    // prevent the default behaviour (i.e. avoid the reload of the page)
    evt.preventDefault();

    if (url === '/login') {
      openLoginModal();
      // just open the modal
      return;
    }

    // it is an app's link, so trigger the routing navigation
    router.push(url);
  });
```


### see more advanced usages in the [unit tests.](https://github.com/rogerpadilla/prouter/blob/master/src/browser-router.spec.ts)
