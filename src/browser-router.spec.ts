// tslint:disable:max-file-line-count

import { BrowserRouter, RouterGroup } from './';

describe('BrowserRouter', () => {

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
    router
      .use('/', (req, res, next) => {
        expect(req.originalUrl).toBe('/');
        expect(req.path).toBe('/');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/');
        done();
      })
      .listen();
  });

  it('basic - push', (done) => {

    router
      .use('/about', (req, res, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/about');
        done();
      })
      .listen();

    router.push('/about');
  });

  it('basic - old browser', (done) => {

    const _URL = window.URL;
    // Emulates old browsers which doesn't supports URL constructor
    window.URL = undefined as any;
    const _createElement = document.createElement;

    // Router will use 'createElement("a")' as fallback for parsing paths
    // when the URL's constructor is not available (old browsers).
    document.createElement = (tag: string) => {
      if (tag === 'a') {
        return new _URL('', 'http://example.com') as any;
      }
      return _createElement(tag);
    };

    router
      .use('/about', (req, res, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('/about');
        done();
      })
      .listen();

    router.push('/about');

    // Restore original objects
    window.URL = _URL;
    document.createElement = _createElement;
  });

  it('proper listening - default path', (done) => {

    router
      .use('/', (req, res, next) => {
        setTimeout(() => next(), 10);
      })
      .use('(.*)', (req, res, next) => {
        expect(req.listening).toBeFalsy();
        done();
      })
      .listen();
  });

  it('proper listening - push', (done) => {

    router
      .use('/something', (req, res, next) => {
        throw new Error('Should not call unmatched path');
      })
      .use('/about', (req, res, next) => {
        expect(req.listening).toBeTruthy();
        done();
      })
      .listen();

    router.push('/about');
  });

  it('basic trying to use send function without providing it', (done) => {

    router
      .use('/about', (req, res, next) => {
        expect(() => {
          res.send('hello');
        }).toThrowError();
        done();
      })
      .listen();

    router.push('/about');
  });

  it('parameters', (done) => {

    router
      .use('/about/:id/:num', (req, res, next) => {
        expect(req.params.id).toBe('16');
        expect(req.params.num).toBe('18');
        done();
      })
      .listen();

    router.push('/about/16/18');
  });

  it('query', (done) => {

    router
      .use('/something', (req, res, next) => {
        expect(req.queryString).toBe('?first=5&second=6');
        expect(req.query).toEqual({ first: '5', second: '6' });
        done();
      })
      .listen();

    router.push('/something?first=5&second=6');
  });

  it('parameters & query', (done) => {

    router
      .use('/something/:param1/:param2', (req, res, next) => {
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
      .use('/something/:param1/other/:param2', (req, res, next) => {
        expect(req.params).toEqual({ param1: '16', param2: '18' });
        expect(req.query).toEqual({ first: '5', second: '6' });
        done();
      })
      .listen();

    router.push('/something/16/other/18?first=5&second=6');
  });

  it('path', (done) => {

    router
      .use('/file/:path*', (req, res, next) => {
        expect(req.params.path).toBe('dir/file.jpg');
        done();
      })
      .listen();

    router.push('/file/dir/file.jpg');
  });

  it('default only', (done) => {

    router
      .use('/abc/:p1/other/:p2', (req, res, next) => {
        expect(true).toBeFalsy();
      })
      .use('(.*)', (req, res, next) => done())
      .listen();

    router.push('/something/16/other/18?q1=5&q2=6');
  });

  it('next also', (done) => {

    router
      .use('/something/:p1/other/:p2', (req, res, next) => next())
      .use('(.*)', (req, res, next) => done());

    router.push('/something/16/other/18?q1=5&q2=6');
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
      .use('/ask', (req, res, next) => {
        done();
      });

    router
      .use('/question', groupRouter);

    router.push('/question/ask');
  });

  it('RouterGroup with params', (done) => {

    const groupRouter = new RouterGroup();

    groupRouter
      .use('/:p1/other/:p2', (req, res, next) => {
        expect(req.originalUrl).toBe('/something/16/other/18');
        expect(req.path).toBe('/something/16/other/18');
        done();
      });

    router.use('/something', groupRouter);

    router.push('/something/16/other/18?q1=5&q2=6');
  });

  it('Emulate browsers with URL support', (done) => {

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

    window.URL = URL as any;

    router
      .use('/about', (req, res, next) => {
        done();
      });

    router.push('/about');
  });

});
