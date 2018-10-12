// tslint:disable:max-file-line-count
import { browserRouter, routerGroup, ProuterBrowserRouter } from './';


describe('browserRouter', () => {

  // Ensure each test completes in less than this short amout of milliseconds.
  jest.setTimeout(20);

  let router: ProuterBrowserRouter;

  beforeAll(() => {
    const htmlElementsCache = {};
    document.querySelector = jasmine.createSpy('document - querySelector').and.callFake((selector: string) => {
      if (!selector) {
        return undefined;
      }
      if (!htmlElementsCache[selector]) {
        const newElement = document.createElement('div');
        htmlElementsCache[selector] = newElement;
      }
      return htmlElementsCache[selector];
    });
  });

  beforeEach(() => {
    history.pushState(undefined, '', '/');
    router = browserRouter();
  });

  afterEach(() => {
    router.stop();
  });

  it('basic', (done) => {

    expect(router.getPath()).toBe('/');

    router
      .use('/', (req, res) => {
        expect(req.originalUrl).toBe('/');
        expect(req.path).toBe('/');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        res.end();
        done();
      })
      .listen();
  });

  it('basic chain - no push', (done) => {

    expect(router.getPath()).toBe('/');

    let msg = '';

    router
      .use('/', (req, resp, next) => {
        expect(req.originalUrl).toBe('/');
        expect(req.path).toBe('/');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        msg = 'changed';
        next();
      })
      .use('*', (req, res) => {
        expect(msg).toBe('changed');
        expect(router.getPath()).toBe('/');
        res.end();
        done();
      })
      .listen();
  });

  it('basic chain - push', (done) => {

    expect(router.getPath()).toBe('/');

    let msg = '';

    router
      .use('/about', (req, res, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        msg = 'changed';
        res.end();
      });

    router.on('navigation', navigationEvt => {
      expect(router.getPath()).toBe('/about');
      expect(navigationEvt.oldPath).toBe('/');
      expect(navigationEvt.newPath).toBe('/about');
      expect(msg).toBe('changed');
      done();
    });

    router.push('/about');
  });

  it('basic chain - push - old browser', (done) => {

    const _URL = window.URL;
    // Emulates old browsers which doesn't supports URL constructor
    delete window.URL;
    const _createElement = document.createElement;

    // Router will use 'createElement("a")' as fallback for parsing paths
    // when the URL's constructor is not available (old browsers).
    document.createElement = (tag: string) => {
      if (tag === 'a') {
        // tslint:disable-next-line:no-any
        return new _URL('', 'http://example.com') as any;
      }
      return _createElement(tag);
    };

    expect(router.getPath()).toBe('/');

    let msg = '';

    router
      .use('/about', (req, res, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        msg = 'changed';
        next();
      })
      .use('*', (req, res, next) => {
        expect(msg).toBe('changed');
        window.URL = _URL;
        document.createElement = _createElement;
        res.end();
        done();
      });

    router.push('/about');
  });

  it('process current path when listen', (done) => {
    router
      .use('/', (req, res) => {
        expect(req.listening).toBeFalsy();
        res.end();
        done();
      })
      .listen();
  });

  it('proper listening - push', (done) => {

    router
      .use('/something', () => {
        fail('This should not be called');
      })
      .use('/about', (req, res) => {
        expect(req.listening).toBeTruthy();
        res.end();
        done();
      })
      .listen();

    router.push('/about');
  });

  it('parameters', (done) => {

    router
      .use('/some-path/:id(\\d+)/:tag', (req, res) => {
        expect(req.params.id).toBe('16');
        expect(req.params.tag).toBe('abc');
        res.end();
        done();
      })
      .listen();

    router.push('/some-path/16/abc');
  });

  it('query', (done) => {

    router
      .use('/something', (req, res) => {
        expect(req.queryString).toBe('?first=5&second=6');
        expect(req.query).toEqual({ first: '5', second: '6' });
        res.end();
        done();
      });

    router.push('/something?first=5&second=6');
  });

  it('parameters & query', (done) => {

    router
      .use('/something/:param1/:param2', (req, res) => {
        expect(req.params).toEqual({ param1: '16', param2: '18' });
        expect(req.queryString).toBe('?first=5&second=6');
        expect(req.query).toEqual({ first: '5', second: '6' });
        res.end();
        done();
      })
      .listen();

    router.push('/something/16/18?first=5&second=6');
  });

  it('divided parameters', (done) => {

    router
      .use('/something/:param1/other/:param2', (req, res) => {
        expect(req.params).toEqual({ param1: '16', param2: '18' });
        expect(req.query).toEqual({ first: '5', second: '6' });
        res.end();
        done();
      })
      .listen();

    router.push('/something/16/other/18?first=5&second=6');
  });

  it('do not call if no match', (done) => {

    router
      .use('/abc/:p1/other/:p2', () => {
        fail('This should not be called');
      })
      .use('*', (req, res) => {
        res.end();
        done();
      })
      .listen();

    router.push('/something/16/other/18?q1=5&q2=6');
  });

  it('next also', (done) => {

    router
      .use('/something/:p1/other/:p2', (req, resp, next) => {
        expect(req.query).toEqual({ q1: '5', q2: '6' });
        req.query.q3 = '7';
        next();
      })
      .use('*', (req, res) => {
        expect(req.query).toEqual({ q1: '5', q2: '6', q3: '7' });
        res.end();
        done();
      });

    router.push('/something/16/other/18?q1=5&q2=6');
  });

  it('order', (done) => {

    expect(router.getPath()).toBe('/');

    let msg = '';

    router
      .use('/about', (req, resp, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        msg = 'hello';
        next();
      })
      .use('*', (req, res) => {
        expect(msg).toBe('hello');
        expect(router.getPath()).toBe('/');
        res.end();
        done();
      });

    router.push('/about');
  });

  it('end and prevent navigation', () => {

    expect(router.getPath()).toBe('/');

    router
      .use('/about', (req, resp) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        resp.end({ preventNavigation: true });
      })
      .use('*', () => {
        fail('Should not call this');
      });

    router.push('/about');
  });

  it('next() in every callback', (done) => {

    expect(router.getPath()).toBe('/');

    router
      .use('/about', (req, resp, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        next();
      })
      .use('*', (req, resp, next) => {
        expect(router.getPath()).toBe('/');
        next();
        done();
      });

    router.push('/about');
  });

  it('Throws error if try to listen more than once', () => {

    router.listen();

    expect(() => {
      router.listen();
    }).toThrowError();
  });

  it('RouterGroup', (done) => {

    const group = routerGroup();

    group
      .use('/ask', () => {
        done();
      });

    router
      .use('/question', group);

    router.push('/question/ask');
  });

  it('RouterGroup with params', (done) => {

    const group = routerGroup();

    group
      .use('/:p1/other/:p2', (req, res) => {
        expect(req.originalUrl).toBe('/something/16/other/18');
        expect(req.path).toBe('/something/16/other/18');
        res.end();
        done();
      });

    router.use('/something', group);

    router.push('/something/16/other/18?q1=5&q2=6');
  });

  it('Emulate browsers with URL support', (done) => {

    // tslint:disable-next-line:no-unnecessary-class
    class URL {
      constructor(path: string) {
        const parser = document.createElement('a');
        parser.href = 'http://example.com' + path;
        const propsToCopy = ['pathname', 'hash', 'hostname', 'host', 'search'];
        for (const prop of propsToCopy) {
          this[prop] = parser[prop];
        }
      }
    }

    const _URL = window.URL;
    window.URL = URL as typeof _URL;

    router
      .use('/about', (req, res) => {
        window.URL = _URL;
        res.end();
        done();
      });

    router.push('/about');
  });

  it('should produce navigation event', (done) => {

    expect(router.getPath()).toBe('/');

    router
      .use('/hello', (req, resp, next) => {
        expect(req.originalUrl).toBe('/hello');
        expect(req.path).toBe('/hello');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        next();
      })
      .listen();

    router.on('navigation', navigationEvt => {
      expect(router.getPath()).toBe('/hello');
      expect(navigationEvt.oldPath).toBe('/');
      expect(navigationEvt.newPath).toBe('/hello');
      done();
    });

    router.push('/hello');
  });

  it('should not produce navigation event', () => {

    expect(router.getPath()).toBe('/');

    router
      .use('/', (req, resp, next) => {
        expect(req.originalUrl).toBe('/');
        expect(req.path).toBe('/');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        next();
      })
      .listen();

    router.on('navigation', () => {
      fail('Should not navigate since no match in the registered handlers');
    });

    router.push('/hello');
  });

  it('should unsubscribe from navigation event', (done) => {

    expect(router.getPath()).toBe('/');

    router
      .use('/hello', (req, resp, next) => {
        expect(req.originalUrl).toBe('/hello');
        expect(req.path).toBe('/hello');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        next();
        done();
      })
      .listen();

    const onNavigation = () => {
      fail('Should not enter here since unsubscribed');
    };

    router.on('navigation', onNavigation);

    router.off('navigation', onNavigation);

    router.push('/hello');
  });

});
