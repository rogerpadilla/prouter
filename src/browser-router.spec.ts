// tslint:disable:max-file-line-count

import { BrowserRouter, RouterGroup } from './';


describe('BrowserRouter', () => {

  jest.setTimeout(500);

  let router: BrowserRouter;

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
    router = new BrowserRouter();
  });

  afterEach(() => {
    router.stop();
  });

  it('basic', (done) => {

    expect(router.getPath()).toBe('/');

    router
      .use('/', (req) => {
        expect(req.originalUrl).toBe('/');
        expect(req.path).toBe('/');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        done();
      })
      .listen();
  });

  it('basic chain', (done) => {

    expect(router.getPath()).toBe('/');

    router
      .use('/', (req, next) => {
        expect(req.originalUrl).toBe('/');
        expect(req.path).toBe('/');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        next();
      })
      .use('(.*)', (req) => {
        done();
      })
      .listen();
  });

  it('basic - push', (done) => {

    expect(router.getPath()).toBe('/');

    let msg = '';

    router
      .use('/about', (req, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        msg = 'changed';
        next();
      })
      .listen();

    router.push('/about', () => {
      expect(msg).toBe('changed');
      expect(router.getPath()).toBe('/about');
      done();
    });
  });

  it('basic - old browser', (done) => {

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

    let msg = '';

    router
      .use('/about', (req, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        msg = 'changed';
        next();
      })
      .listen();

    router.push('/about', () => {
      expect(msg).toBe('changed');
      window.URL = _URL;
      document.createElement = _createElement;
      done();
    });

    // Restore original objects
  });

  it('process current path when listen', (done) => {

    router
      .use('(.*)', (req) => {
        expect(req.listening).toBeFalsy();
        done();
      })
      .listen();
  });

  it('proper listening - push', (done) => {

    router
      .use('/something', () => {
        fail('This should not be called');
      })
      .use('/about', (req) => {
        expect(req.listening).toBeTruthy();
        done();
      })
      .listen();

    router.push('/about');
  });

  it('parameters', (done) => {

    router
      .use('/about/:id/:num', (req) => {
        expect(req.params.id).toBe('16');
        expect(req.params.num).toBe('18');
        done();
      })
      .listen();

    router.push('/about/16/18');
  });

  it('query', (done) => {

    router
      .use('/something', (req) => {
        expect(req.queryString).toBe('?first=5&second=6');
        expect(req.query).toEqual({ first: '5', second: '6' });
        done();
      });

    router.push('/something?first=5&second=6');
  });

  it('parameters & query', (done) => {

    router
      .use('/something/:param1/:param2', (req, next) => {
        expect(req.params).toEqual({ param1: '16', param2: '18' });
        expect(req.queryString).toBe('?first=5&second=6');
        expect(req.query).toEqual({ first: '5', second: '6' });
        done();
      })
      .listen();

    router.push('/something/16/18?first=5&second=6');
  });

  it('divided parameters', (done) => {

    router
      .use('/something/:param1/other/:param2', (req) => {
        expect(req.params).toEqual({ param1: '16', param2: '18' });
        expect(req.query).toEqual({ first: '5', second: '6' });
        done();
      })
      .listen();

    router.push('/something/16/other/18?first=5&second=6');
  });

  it('any sub-path', (done) => {

    router
      .use('/file/:path*', (req) => {
        expect(req.params.path).toBe('dir/file.jpg');
        done();
      })
      .listen();

    router.push('/file/dir/file.jpg');
  });

  it('do not call if no match', (done) => {

    router
      .use('/abc/:p1/other/:p2', () => {
        fail('This should not be called');
      })
      .use('(.*)', () => {
        done();
      })
      .listen();

    router.push('/something/16/other/18?q1=5&q2=6');
  });

  it('next also', (done) => {

    router
      .use('/something/:p1/other/:p2', (req, next) => {
        expect(req.query).toEqual({ q1: '5', q2: '6' });
        req.query.q3 = '7';
        next();
      })
      .use('(.*)', (req, next) => {
        expect(req.query).toEqual({ q1: '5', q2: '6', q3: '7' });
        done();
      });

    router.push('/something/16/other/18?q1=5&q2=6');
  });

  it('end', (done) => {

    expect(router.getPath()).toBe('/');

    let msg = '';

    router
      .use('/about', (req, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        msg = 'hello';
        next({endMode: 'end'});
      })
      .use('(.*)', () => {
        fail('Should not call this');
      });

    router.push('/about', err => {
      expect(msg).toBe('hello');
      expect(router.getPath()).toBe('/about');
      done();
    });
  });

  it('end and prevent navigation', (done) => {

    expect(router.getPath()).toBe('/');

    router
      .use('/about', (req, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        next({endMode: 'endAndPreventNavigation'});
      })
      .use('(.*)', () => {
        fail('Should not call this');
      });

    router.push('/about', err => {
      expect(router.getPath()).toBe('/');
      done();
    });
  });

  it('Throws error if try to listen more than once', () => {

    router.listen();

    expect(() => {
      router.listen();
    }).toThrowError();
  });

  it('RouterGroup', (done) => {

    const groupRouter = new RouterGroup();

    groupRouter
      .use('/ask', () => {
        done();
      });

    router
      .use('/question', groupRouter);

    router.push('/question/ask');
  });

  it('RouterGroup with params', (done) => {

    const groupRouter = new RouterGroup();

    groupRouter
      .use('/:p1/other/:p2', (req, next) => {
        expect(req.originalUrl).toBe('/something/16/other/18');
        expect(req.path).toBe('/something/16/other/18');
        done();
      });

    router.use('/something', groupRouter);

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
      .use('/about', () => {
        window.URL = _URL;
        done();
      });

    router.push('/about');
  });

});
