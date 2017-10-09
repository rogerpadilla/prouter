import { BrowserRouter, RouterGroup } from './';

describe('Router', () => {

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

    router = new BrowserRouter({
      defaultTarget: 'body'
    });

    router.listen();
  });

  afterEach(() => {
    router.stop();
  });

  it('basic', (done) => {

    router.use(
      'about',
      (req, res, next) => {
        expect(req.path).toBe('about');
        expect(req.queryString).toBe('');
        expect(req.query).toEqual({});
        expect(router.getPath()).toBe('about');
        done();
      }
    );

    router.push('about');
  });

  it('basic with send', (done) => {

    router.use(
      'about',
      (req, res, next) => {
        res.send('hello');
        done();
      }
    );

    router.push('about');
  });

  it('basic with send twice', (done) => {

    router.use(
      'about',
      (req, res, next) => {
        res.send('hello');
        expect(() => {
          res.send('hello');
        }).toThrowError();
        done();
      }
    );

    router.push('about');
  });

  it('basic with send no-target', (done) => {

    router.use(
      'about',
      (req, res, next) => {
        expect(() => {
          res.send('hello', '');
        }).toThrowError();
        done();
      }
    );

    router.push('about');
  });

  it('parameters', (done) => {

    router.use(
      'about/:id/:num',
      (req, res, next) => {
        expect(req.params.id).toBe('16');
        expect(req.params.num).toBe('18');
        done();
      }
    );

    router.push('about/16/18');
  });

  it('query', (done) => {

    router.use(
      'something',
      (req, res, next) => {
        expect(req.queryString).toBe('?first=5&second=6');
        expect(req.query).toEqual({first: '5', second: '6'});
        done();
      }
    );

    router.push('something?first=5&second=6');
  });

  it('parameters & query', (done) => {

    router.use(
      'something/:param1/:param2',
      (req, res, next) => {
        expect(req.params).toEqual({param1: '16', param2: '18'});
        expect(req.queryString).toBe('?first=5&second=6');
        expect(req.query).toEqual({first: '5', second: '6'});        
        done();
      }
    );

    router.push('something/16/18?first=5&second=6');
  });

  it('divided parameters', (done) => {

    router.use(
      'something/:param1/other/:param2',
      (req, res, next) => {
        expect(req.params).toEqual({param1: '16', param2: '18'});
        expect(req.query).toEqual({first: '5', second: '6'});                
        done();
      }
    );

    router.push('something/16/other/18?first=5&second=6');
  });

  it('path', (done) => {

    router.use(
      'file/:path*',
      (req, res, next) => {
        expect(req.params.path).toBe('dir/file.jpg');
        done();
      }
    );

    router.push('file/dir/file.jpg');
  });

  it('default only', (done) => {

    router.use(
      'abc/:p1/other/:p2',
      (req, res, next) => {
        expect(true).toBeFalsy();
      }
    );

    router.use(
      '(.*)',
      (req, res, next) => done()
    );

    router.push('something/16/other/18?q1=5&q2=6');
  });

  it('transfer request', (done) => {

    router.use(
      'something/:p1/other/:p2',
      (req, res, next) => {
        req.params.paramA = 123;
        next();
      }
    );

    router.use(
      '(.*)',
      (req, res, next) => {
        expect(req.params.paramA).toEqual(123);
        done();
      }
    );

    router.push('something/16/other/18?q1=5&q2=6');
  });

  it('default also', (done) => {

    router.use(
      'something/:p1/other/:p2',
      (req, res, next) => next()
    );

    router.use(
      '(.*)',
      (req, res, next) => done()
    );

    router.push('something/16/other/18?q1=5&q2=6');
  });

  it('Throws error if try to listen again', () => {
    expect(() => {
      router.listen();
    }).toThrowError();
  });

  it('RouterGroup', (done) => {

    const groupRouter = new RouterGroup();

    groupRouter
      .use(':p1/other/:p2', (req, res, next) => {
        next();
      })
      .use('(.*)', () => done());

    router.use('something', groupRouter);

    router.push('something/16/other/18?q1=5&q2=6');
  });

  it('Emulate browsers with URL support', (done) => {

    class URL {
      constructor(url: string) {        
        const parser = document.createElement('a');
        parser.href = 'http://example.com/' + url;
        const propsToCopy = ['pathname', 'hash', 'hostname', 'host', 'search'];
        for (const prop of propsToCopy) {
          this[prop] = parser[prop];
        }
      }
    }

    window.URL = URL as any;

    router.use(
      'about',
      (req, res, next) => {
        res.send('hello');
        done();
      }
    );

    router.push('about');
  });

});
