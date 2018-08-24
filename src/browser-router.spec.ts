// tslint:disable:max-file-line-count
import { browserRouter, routerGroup, ProuterBrowserRouter } from './';


describe('browserRouter', () => {

  // Ensure each test completes in less than this short amout of milliseconds.
  jest.setTimeout(20);

  let browserRouterObj: ProuterBrowserRouter;

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
    browserRouterObj = browserRouter();
  });

  afterEach(() => {
    browserRouterObj.stop();
  });

  it('basic', (done) => {

    expect(browserRouterObj.getPath()).toBe('/');

    browserRouterObj
      .use('/', (req) => {
        expect(req.originalUrl).toBe('/');
        expect(req.path).toBe('/');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(browserRouterObj.getPath()).toBe('/');
        done();
      })
      .listen();
  });

  it('basic chain', (done) => {

    expect(browserRouterObj.getPath()).toBe('/');

    browserRouterObj
      .use('/', (req, resp, next) => {
        expect(req.originalUrl).toBe('/');
        expect(req.path).toBe('/');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(browserRouterObj.getPath()).toBe('/');
        next();
      })
      .use('(.*)', (req) => {
        done();
      })
      .listen();
  });

  it('basic - push', (done) => {

    expect(browserRouterObj.getPath()).toBe('/');

    let msg = '';

    browserRouterObj
      .use('/about', (req, resp) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(browserRouterObj.getPath()).toBe('/');
        msg = 'changed';
        resp.end();
      })
      .listen();

    browserRouterObj.push('/about', () => {
      expect(msg).toBe('changed');
      expect(browserRouterObj.getPath()).toBe('/about');
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

    browserRouterObj
      .use('/about', (req, resp) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        msg = 'changed';
        resp.end();
      })
      .listen();

    browserRouterObj.push('/about', () => {
      expect(msg).toBe('changed');
      window.URL = _URL;
      document.createElement = _createElement;
      done();
    });

    // Restore original objects
  });

  it('process current path when listen', (done) => {

    browserRouterObj
      .use('(.*)', (req) => {
        expect(req.listening).toBeFalsy();
        done();
      })
      .listen();
  });

  it('proper listening - push', (done) => {

    browserRouterObj
      .use('/something', () => {
        fail('This should not be called');
      })
      .use('/about', (req) => {
        expect(req.listening).toBeTruthy();
        done();
      })
      .listen();

    browserRouterObj.push('/about');
  });

  it('parameters', (done) => {

    browserRouterObj
      .use('/some-path/:id(\\d+)/:tag', (req) => {
        expect(req.params.id).toBe('16');
        expect(req.params.tag).toBe('abc');
        done();
      })
      .listen();

    browserRouterObj.push('/some-path/16/abc');
  });

  it('query', (done) => {

    browserRouterObj
      .use('/something', (req) => {
        expect(req.queryString).toBe('?first=5&second=6');
        expect(req.query).toEqual({ first: '5', second: '6' });
        done();
      });

    browserRouterObj.push('/something?first=5&second=6');
  });

  it('parameters & query', (done) => {

    browserRouterObj
      .use('/something/:param1/:param2', (req) => {
        expect(req.params).toEqual({ param1: '16', param2: '18' });
        expect(req.queryString).toBe('?first=5&second=6');
        expect(req.query).toEqual({ first: '5', second: '6' });
        done();
      })
      .listen();

    browserRouterObj.push('/something/16/18?first=5&second=6');
  });

  it('divided parameters', (done) => {

    browserRouterObj
      .use('/something/:param1/other/:param2', (req) => {
        expect(req.params).toEqual({ param1: '16', param2: '18' });
        expect(req.query).toEqual({ first: '5', second: '6' });
        done();
      })
      .listen();

    browserRouterObj.push('/something/16/other/18?first=5&second=6');
  });

  it('any sub-path', (done) => {

    browserRouterObj
      .use('/file/:path*', (req) => {
        expect(req.params.path).toBe('dir/file.jpg');
        done();
      })
      .listen();

    browserRouterObj.push('/file/dir/file.jpg');
  });

  it('do not call if no match', (done) => {

    browserRouterObj
      .use('/abc/:p1/other/:p2', () => {
        fail('This should not be called');
      })
      .use('(.*)', () => {
        done();
      })
      .listen();

    browserRouterObj.push('/something/16/other/18?q1=5&q2=6');
  });

  it('next also', (done) => {

    browserRouterObj
      .use('/something/:p1/other/:p2', (req, resp, next) => {
        expect(req.query).toEqual({ q1: '5', q2: '6' });
        req.query.q3 = '7';
        next();
      })
      .use('(.*)', (req) => {
        expect(req.query).toEqual({ q1: '5', q2: '6', q3: '7' });
        done();
      });

    browserRouterObj.push('/something/16/other/18?q1=5&q2=6');
  });

  it('end', (done) => {

    expect(browserRouterObj.getPath()).toBe('/');

    let msg = '';

    browserRouterObj
      .use('/about', (req, resp) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(browserRouterObj.getPath()).toBe('/');
        msg = 'hello';
        resp.end();
      })
      .use('(.*)', () => {
        fail('Should not call this');
      });

    browserRouterObj.push('/about', () => {
      expect(msg).toBe('hello');
      expect(browserRouterObj.getPath()).toBe('/about');
      done();
    });
  });

  it('end and prevent navigation', (done) => {

    expect(browserRouterObj.getPath()).toBe('/');

    browserRouterObj
      .use('/about', (req, resp) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(browserRouterObj.getPath()).toBe('/');
        resp.end({ preventNavigation: true });
      })
      .use('(.*)', () => {
        fail('Should not call this');
      });

    browserRouterObj.push('/about', () => {
      expect(browserRouterObj.getPath()).toBe('/');
      done();
    });
  });

  it('next in all', (done) => {

    expect(browserRouterObj.getPath()).toBe('/');

    browserRouterObj
      .use('/about', (req, resp, next) => {
        expect(req.originalUrl).toBe('/about');
        expect(req.path).toBe('/about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(browserRouterObj.getPath()).toBe('/');
        next();
      })
      .use('(.*)', (req, resp, next) => {
        next();
      });

    browserRouterObj.push('/about', () => {
      expect(browserRouterObj.getPath()).toBe('/about');
      done();
    });
  });

  it('Throws error if try to listen more than once', () => {

    browserRouterObj.listen();

    expect(() => {
      browserRouterObj.listen();
    }).toThrowError();
  });

  it('RouterGroup', (done) => {

    const group = routerGroup();

    group
      .use('/ask', () => {
        done();
      });

    browserRouterObj
      .use('/question', group);

    browserRouterObj.push('/question/ask');
  });

  it('RouterGroup with params', (done) => {

    const group = routerGroup();

    group
      .use('/:p1/other/:p2', (req) => {
        expect(req.originalUrl).toBe('/something/16/other/18');
        expect(req.path).toBe('/something/16/other/18');
        done();
      });

    browserRouterObj.use('/something', group);

    browserRouterObj.push('/something/16/other/18?q1=5&q2=6');
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

    browserRouterObj
      .use('/about', () => {
        window.URL = _URL;
        done();
      });

    browserRouterObj.push('/about');
  });

});
