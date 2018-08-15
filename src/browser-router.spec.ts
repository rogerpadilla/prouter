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

  it('basic - push', (done) => {

    const currentPath = router.getPath();

    expect(currentPath).toBe('/');

    router
      .use('/about', (req) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe(currentPath);
      })
      .listen();

    router.push('/about').then(() => {
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

    router
      .use('/about', (req) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        window.URL = _URL;
        document.createElement = _createElement;
      })
      .listen();

    router.push('/about').then(() => {
      done();
    });

    // Restore original objects
  });

  it('proper listening - default path', (done) => {

    router
      .use('/', (req) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => resolve(), 20);
        });
      })
      .use('(.*)', (req) => {
        expect(req.listening).toBeFalsy();
        done();
      })
      .listen();
  });

  it('proper listening - push', (done) => {

    router
      .use('/something', (req) => {
        throw new Error('Should not call this (unmatched) path');
      })
      .use('/about', (req) => {
        expect(req.listening).toBeTruthy();
      })
      .listen();

    router.push('/about').then(() => {
      done();
    });
  });

  it('parameters', (done) => {

    router
      .use('/about/:id/:num', (req) => {
        expect(req.params.id).toBe('16');
        expect(req.params.num).toBe('18');
      })
      .listen();

    router.push('/about/16/18').then(() => {
      done();
    });
  });

  it('query', (done) => {

    router
      .use('/something', (req) => {
        expect(req.queryString).toBe('?first=5&second=6');
        expect(req.query).toEqual({ first: '5', second: '6' });
      })
      .listen();

    router.push('/something?first=5&second=6').then(() => {
      done();
    });
  });

  it('parameters & query', (done) => {

    router
      .use('/something/:param1/:param2', (req) => {
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

  it('path', (done) => {

    router
      .use('/file/:path*', (req) => {
        expect(req.params.path).toBe('dir/file.jpg');
        done();
      })
      .listen();

    router.push('/file/dir/file.jpg');
  });

  it('default only', (done) => {

    router
      .use('/abc/:p1/other/:p2', (req) => {
        expect(true).toBeFalsy();
      })
      .use('(.*)', (req) => done())
      .listen();

    router.push('/something/16/other/18?q1=5&q2=6');
  });

  it('next also', (done) => {

    router
      .use('/something/:p1/other/:p2', req => {
        expect(req.query).toEqual({ q1: '5', q2: '6' });
        req.query.q3 = '7';
      })
      .use('(.*)', (req) => {
        expect(req.query).toEqual({ q1: '5', q2: '6', q3: '7' });
        done();
      });

    router.push('/something/16/other/18?q1=5&q2=6');
  });

  it('abort with promise', (done) => {

    const currentPath = router.getPath();

    expect(currentPath).toBe('/');

    const errMsg = 'Some error while navigating';

    router
      .use('/about', (req) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe(currentPath);
        return Promise.reject(errMsg);
      })
      .listen();

    router.push('/about').catch(err => {
      expect(err).toBe(errMsg);
      expect(router.getPath()).toBe(currentPath);
      done();
    });
  });

  it('abort with exception', (done) => {

    const currentPath = router.getPath();

    expect(currentPath).toBe('/');

    const errMsg = 'Some error while navigating';

    router
      .use('/about', (req) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe(currentPath);
        throw errMsg;
      })
      .listen();

    router.push('/about').catch(err => {
      expect(err).toBe(errMsg);
      expect(router.getPath()).toBe(currentPath);
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
      .use('/ask', (req) => {
        done();
      });

    router
      .use('/question', groupRouter);

    router.push('/question/ask');
  });

  it('RouterGroup with params', (done) => {

    const groupRouter = new RouterGroup();

    groupRouter
      .use('/:p1/other/:p2', (req) => {
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
      .use('/about', (req) => {
        window.URL = _URL;
        done();
      });

    router.push('/about');
  });

});
