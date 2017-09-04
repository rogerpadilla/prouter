import { BrowserRouter } from './browser-router';

describe('Router', () => {

  let router: BrowserRouter;

  beforeAll(() => {

    const htmlElementsCache = {};

    document.querySelector = jasmine.createSpy('document - querySelector').and.callFake((selector: string) => {
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
        expect(req.query.first).toBe('5');
        expect(req.query.second).toBe('6');
        done();
      }
    );

    router.push('something?first=5&second=6');
  });

  it('parameters & query', (done) => {

    router.use(
      'something/:param1/:param2',
      (req, res, next) => {
        expect(req.params.param1).toBe('16');
        expect(req.params.param2).toBe('18');
        expect(req.query.first).toBe('5');
        expect(req.query.second).toBe('6');
        done();
      }
    );

    router.push('something/16/18?first=5&second=6');
  });

  it('divided parameters', (done) => {

    router.use(
      'something/:param1/other/:param2',
      (req, res, next) => {
        expect(req.params.param1).toBe('16');
        expect(req.params.param2).toBe('18');
        expect(req.query.first).toBe('5');
        expect(req.query.second).toBe('6');
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

});
