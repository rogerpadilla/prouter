# prouter

[![build status](https://travis-ci.org/rogerpadilla/prouter.svg?branch=master)](https://travis-ci.org/rogerpadilla/prouter?branch=master)
[![coverage status](https://coveralls.io/repos/rogerpadilla/prouter/badge.svg?branch=master)](https://coveralls.io/r/rogerpadilla/prouter?branch=master)
[![dependencies status](https://david-dm.org/rogerpadilla/prouter/status.svg)](https://david-dm.org/rogerpadilla/prouter/status.svg)
[![dev dependencies status](https://david-dm.org/rogerpadilla/prouter/dev-status.svg)](https://david-dm.org/rogerpadilla/prouter/dev-status.svg)
[![npm downloads](https://img.shields.io/npm/dm/prouter.svg)](https://www.npmjs.com/package/prouter)
[![npm version](https://badge.fury.io/js/prouter.svg)](https://www.npmjs.com/prouter)

Fast, unopinionated, minimalist client side router library inspired in the simplicity and flexibility of express router.

Basically, give prouter a list of path expressions (routes) and a callback function (handler) for each one, and prouter will invoke the callbacks according to the activated path in the URL.

## Why prouter?
- **Performance:** [fast](https://github.com/rogerpadilla/prouter/blob/master/src/browser-router.spec.ts#L7) and tiny size (currently 5kb before gzipping) are both must to have to smoothly run in any mobile or desktop browser.
- **KISS principle everywhere:** do only one thing and do it well, routing! Guards? conditional execution? generic pre and post middlewares? all that and more is easily achivable with prouter (see examples below).
- **Learn once:** express router is very powerfull, flexible and simple, why not bringing a similar API to the frontend? Under the hood, prouter uses the same (wonderful) library that express for parsing routes [path-to-regexp](https://github.com/pillarjs/path-to-regexp) (so it allows the same flexibility to declare routes). Read more about the concept of middlewares [here](https://expressjs.com/en/guide/writing-middleware.html).
- **Unobtrusive:** it is designed from the beginning to play well with vanilla JavaScript or with any other library or framework.
- **Forward-thinking:** written in TypeScript for the future and transpiled to es5 with UMD format for the present... thus it transparently supports any module style: es6, commonJS, AMD. By default, prouter uses the modern [history](https://developer.mozilla.org/en-US/docs/Web/API/History_API) API for routing.
- Unit tests for every feature are created.

## Installation

```bash
# With NPM
npm install prouter --save

# Or with Yarn
yarn prouter --save

# Or just include it using a 'script' tag in your HTML file
<script src="https://unpkg.com/prouter/prouter.min.js"></script>
```

## Examples

### basic

```js
// Using es6 modules
import { browserRouter } from 'prouter';

// Instantiate the router
const router = browserRouter();

// Declare the paths and its respective handlers
router
  .use('/', async (req, resp) => {
    const people = await personService.find();
    const html = PersonListCmp(people);
    document.querySelector('.router-outlet') = html;
    // end the request-response cycle
    resp.end();
  })
  .use('/about', (req, resp) => {
    document.querySelector('.router-outlet') =
      `<h1>Some static content for the About page.</h1>`;
    // end the request-response cycle
    resp.end();
  });

// start listening for navigation events
router.listen();
```


### guard middleware which conditionally avoid executing next handlers and prevent changing the path in the URL

```js
// Using commonJs modules
const prouter = require('prouter');

// Instantiate the router
const router = prouter.browserRouter();

// Declare the paths and its respective handlers
router
  .use('*', (req, resp, next) => {

    // this handler will run for any routing event, before any other handlers
    
    const isAllowed = authService.validateHasAccessToUrl(req.originalUrl);

    if (!isAllowed) {
      showAlert("You haven't rights to access the page: " + destPath);
      // end the request-response cycle, avoid executing other handlers
      // and prevent changing the path in the URL.
      resp.end({ preventNavigation: true });
      return;
    }

    // pass control to the next handler
    next();
  })
  .use('/', (req, resp) => {
    // do some stuff...
    // and end the request-response cycle
    resp.end();
  })
  .use('/admin', (req, resp) => {
    // do some stuff...
    // and end the request-response cycle
    resp.end();
  });

// start listening for navigation events
router.listen();

// programmatically try to navigate to any route in your router
router.push('/admin');
```


### run a generic middleware (for doing some generic stuff) after running specific handlers

```js
import { browserRouter } from 'prouter';

// Instantiate the router
const router = browserRouter();

// Declare the paths and its respective handlers
router
  .use('/', async (req, resp, next) => {
    const people = await personService.find();
    const html = PersonListCmp(people);
    document.querySelector('.router-outlet') = html;
    // pass control to the next handler
    next();
  })
  .use('*', (req, resp) => {
    // do some (generic) stuff...
    // and end the request-response cycle
    resp.end();
  });

// start listening for navigation events
router.listen();
```


### modularize your routing code in different files using Router Group

```js
import { browserRouter, routerGroup } from 'prouter';

// this can be in a different file for modularization of the routes,
// and then import it in your main routes file and mount it.
const productRouterGroup = routerGroup();

productRouterGroup
  .use('/', (req, resp) => {
    // do some stuff...
    // and end the request-response cycle
    resp.end();
  })
  .use('/create', (req, resp) => {
    // do some stuff...  
    // and end the request-response cycle
    resp.end();
  })
  .use('/:id(\\d+)', (req, resp) => {
    const id = req.params.id;
    // do some stuff with the 'id'...
    // and end the request-response cycle
    resp.end();
  });

// Instantiate the router
const router = browserRouter();

// Declare the paths and its respective handlers
router
  .use('*', (req, resp, next) => {
    // this handler will run for any routing event, before any other handlers
    console.log('request info', req);
    // pass control to the next handler
    next();
  })
  .use('/', (req, resp) => {
    // do some stuff...
    // and end the request-response cycle
    resp.end();
  })
  // mount the product's group of handlers using this base path
  .use('/product', productRouterGroup);

// start listening for the routing
router.listen();

// programmatically navigate to the detail of the product with this ID
router.push('/product/123');
```

### full example: modularized routing, generic pre handler acting as a guard, generic post handler.

```js
import { browserRouter, routerGroup } from 'prouter';

// this can be in a different file for modularization of the routes,
// and then import it in your main routes file and mount it.
const productRouterGroup = routerGroup();

productRouterGroup
  .use('/', (req, resp, next) => {
    // do some stuff...
    // and pass control to the next handler
    next();
  })
  .use('/create', (req, resp, next) => {
    // do some stuff...  
    // and pass control to the next handler
    next();
  })
  .use('/:id(\\d+)', (req, resp, next) => {
    const id = req.params.id;
    // do some stuff with the 'id'...
    // and pass control to the next handler
    next();
  });

// Instantiate the router
const router = browserRouter();

// Declare the paths and its respective handlers
router
  .use('*', (req, resp, next) => {

    // this handler will run for any routing event, before any other handlers

    const isAllowed = authService.validateHasAccessToUrl(req.originalUrl);

    if (!isAllowed) {
      showAlert("You haven't rights to access the page: " + destPath);
      // end the request-response cycle, avoid executing next handlers
      // and prevent changing the path in the URL.
      resp.end({ preventNavigation: true });
      return;
    }

    // pass control to the next handler
    next();
  })
  .use('/', (req, resp, next) => {
    
    const doInfiniteScroll = () => {
      // do infinite scroll ...
    };    
    
    const onNavigation = (navigationEvt) => {
      // if navigating, then remove the listener for the window.scroll. 
      router.off('navigation', onNavigation);
      window.removeEventListener('scroll', doInfiniteScroll);
    };

    window.addEventListener('scroll', doInfiniteScroll);

    // subscribe to the navigation event
    router.on('navigation', onNavigation);    

    // and pass control to the next handler
    next();
  })
  .use('/login', () => {
    openLoginModal();
    // as this route opens a modal, we would want to prevent navigation in this handler,
    // so end the request-response cycle, avoid executing next handlers
    // and prevent changing the path in the URL.
    resp.end({ preventNavigation: true });
  })
  .use('/admin', (req, resp, next) => {
    // do some stuff...
    // and pass control to the next handler
    next();
  })
  // mount the product's group of handlers using this base path
  .use('/product', productRouterGroup)
  .use('*', (req, res, next) => {

    // this handler will run for any routing event, after the other handlers

    // req.listening will be true when this callback was called due to a
    // client-side navigation (useful to differentiate client-side vs
    // server-side rendering - when using a mix of both SSR and CSR)
    if (req.listening) {
      const title = inferTitleFromPath(req.originalUrl, APP_TITLE);
      updatePageTitle(title);
    }

    // end the request-response cycle
    resp.end();
  });

// start listening for the routing
router.listen();


// the below code is an example about how you could capture clicks on links,
// and accordingly, trigger routing navigation in your app
// (typically, you would put it in a separated file)

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
    
    // avoid the default browser's behaviour when clicking on a link
    // (i.e. do not reload the page).
    evt.preventDefault();

    // it is a normal app's link, so trigger the routing navigation
    router.push(url);
  });
```


### see more advanced usages in the [unit tests.](https://github.com/rogerpadilla/prouter/blob/master/src/browser-router.spec.ts)
