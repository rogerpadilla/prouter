# prouter
<p>
    <a href="https://travis-ci.org/rogerpadilla/prouter?branch=master" title="build status"><img src="https://travis-ci.org/rogerpadilla/prouter.svg?branch=master" alt="build status" /></a>
    <a href="https://coveralls.io/r/rogerpadilla/prouter?branch=master" title="coverage status"><img src="https://coveralls.io/repos/rogerpadilla/prouter/badge.svg?branch=master" alt="coverage status" /></a>
    <a href="https://david-dm.org/rogerpadilla/prouter" title="dependencies status"><img src="https://david-dm.org/rogerpadilla/prouter/status.svg" alt="dependencies status" /></a>
    <a href="https://david-dm.org/rogerpadilla/prouter#info=devDependencies" title="dev dependencies status"><img src="https://david-dm.org/rogerpadilla/prouter/dev-status.svg" alt="dev dependencies status" /></a>
</p>

In web/hybrid applications, we want to provide linkable, bookmarkable, and shareable URLs to meaningful locations within the app without reload the page. prouter provides methods for routing pages and connecting them to actions and events in the browser. Under the hood, prouter uses the same library than express for parsing URLs: [Path-to-RegExp](https://github.com/pillarjs/path-to-regexp). So now you can use the powerful express's [routing-expressions style](https://expressjs.com/en/guide/routing.html) in the frontend.

## Why prouter?
- **Unobtrusive:** it is designed from the beginning to (optionally) play well with any UI libraries like [Polymer](https://www.polymer-project.org/1.0/), [React](http://facebook.github.io/react/), [Handlebars](http://handlebarsjs.com/), etc.
- **Really lightweight:** 8kb (before gzipping).
- **Forward-thinking:** learns from others Router components like the ones of Express and Angular. Written in TypeScript for the future and transpiled to ES5 with UMD format for the present... thus it transparently supports almost every modules' style out there: ES6, CommonJS, AMD. And can be used also as global browser variable (via 'script' tag in your HTML).
- KISS principle: unnecessary complexity avoided.
- Unit tests for every feature are created.

## Routing
In client-side apps, routing refers to the declaration of end-points (paths) to an application and how it responds (handlers) to URL changes.

## Installation

```bash
# Using NPM
npm install prouter --save

# Or with Bower
bower install prouter --save

# Or just inject it using a 'script' tag in your HTML file
<script src="prouter.js"></script>
```

## Examples

### basic using ES6 Modules

```js
import { BrowserRouter } from 'prouter';

const router = new BrowserRouter({
  // default CSS selector used to obtaing the target DOM-element
  // when sending content (res.send) from the handler
  defaultTarget: 'body'
});

router
  .use('', (req, res, next) => {
    res.send('<h1>Home page.</h1>');
  })
  .use('about', (req, res, next) => {
    res.send('<h1>About page.</h1>');
  });

// start listening events for the routing
router.listen();

// programmatically navigate to any route in your router
router.push('about');
```


### basic using global variable (including it via a 'script' tag in the HTML file)

```js
const BrowserRouter = proute.BrowserRouter;

const router = new BrowserRouter({
  // default CSS selector used to obtaing the target DOM-element
  // when sending content (res.send) from the handler
  defaultTarget: 'body'
});

router
  .use('', (req, res, next) => {
    res.send('<h1>Home page.</h1>');
  })
  .use('about', (req, res, next) => {
    res.send('<h1>About page.</h1>');
  });

// start listening events for the routing
router.listen();

// programmatically navigate to any route in your router
router.push('about');
```

### using an interceptor/validator handler

```js
import { BrowserRouter } from 'prouter';

const router = new BrowserRouter({
  // default CSS selector used to obtaing the target DOM-element
  // when sending/printing content (res.send) from the handler
  defaultTarget: '.my-router-outlet'
});

router
  .use('(.*)', (req, res, next) => {
    // this handler will be for any routing event, before other handlers
    const srcPath = router.getPath();
    const destPath = req.path;
    console.log('coming from', srcPath);
    console.log('going to', destPath);
    const isAuthorized = validateUserAuthorization(req.path);
    if (!isAuthorized) {
      showAlert("You haven't rights to access the page: " + destPath);
      // stop the flow since 'next' wasn't called
      return;
    }
    // let's continue with the flow in the other handlers below
    next();
  })
  .use('', (req, res, next) => {
    res.send('<h1>Home page.</h1>');
  })
  .use('top', (req, res, next) => {
    res.send('<h1>About page.</h1>');
  });

// start listening events for the routing
router.listen();

// programmatically navigate to any route in your router
router.push('top');
```


### advanced using RouterGroup with ES6 Modules

```js
import { BrowserRouter, RouterGroup } from 'prouter';

// this can be in a different file for modularization of the routes,
// and then import it in your main routes file and mount it.
const productRouterGroup = new RouterGroup();

productRouterGroup
  .use('', (req, res, next) => {
    res.send('<h1>Landing page of Products.</h1>');
  })
  .use('create', (req, res, next) => {
    res.send('<form>Create a product.</form>');    
  })
  .use(':id', (req, res, next) => {
    const id = req.params.id;
    productService.findOneById(id).then(product => {
      res.send(`<h1>${product.name}<h1>`);    
    });
  });

const router = new BrowserRouter({
  // default CSS selector used to obtaing the target DOM-element
  // when sending/printing content (res.send) from the handler
  defaultTarget: '.my-router-outlet'
});

router
  .use('(.*)', (req, res, next) => {
    // this handler will be for any routing event, before other handlers
    console.log('request info', req);
    // let's continue with the flow in the other handlers below
    next();
  })
  .use('', (req, res, next) => {
    res.send('<h1>Home page.</h1>');
  })
  // mount the product's group of handlers using this base path
  .use('product', productRouterGroup);

// start listening events for the routing
router.listen();

// programmatically navigate to the detail of the product with this ID
router.push('product/123');
```