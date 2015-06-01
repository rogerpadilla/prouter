'use strict';

var Router = prouter.Router;
var RouteGroup = prouter.RouteGroup;

describe("Routing -", function () {

  this.timeout(500);

  beforeEach(function () {
    Router.stop().listen({ mode: 'history' });
  });

  after(function () {
    Router.stop();
  });

  it("basic", function (done) {
    Router.use('about', function () {
      done();
    });
    Router.navigate('/about');
  });

  it("parameters", function (done) {
    Router.use('/about/:id/:num', function (req) {
      expect(req.params.id).eq('16');
      expect(req.params.num).eq('18');
      done();
    });
    Router.navigate('/about/16/18');
  });

  it("query", function (done) {
    Router.use('/about', function (req) {
      expect(req.query).a('object');
      expect(req.query.first).eq('5');
      expect(req.query.second).eq('6');
      done();
    });
    Router.navigate('/about?first=5&second=6');
  });

  it("parameters & query", function (done) {
    Router.use('/about/:id/:num', function (req) {
      expect(req.params).a('object');
      expect(req.params.id).eq('16');
      expect(req.params.num).eq('18');
      expect(req.query.first).eq('5');
      expect(req.query.second).eq('6');
      done();
    });
    Router.navigate('/about/16/18?first=5&second=6');
  });

  it("divided parameters", function (done) {
    Router.use('/about/:id/route/:num', function (req) {
      expect(req.params).a('object');
      expect(req.params.id).eq('16');
      expect(req.params.num).eq('18');
      done();
    });
    Router.navigate('/about/16/route/18');
  });

  it("context", function (done) {
    var context = {
      name: 'context'
    };

    Router.use('/about', function () {
      expect(this).eq(context);
      done();
    }.bind(context));

    Router.navigate('/about');
  });

  it("default", function (done) {
    Router.use(function () {
      done();
    });
    Router.navigate('about');
  });

  it("shift /", function (done) {

    var counter = 0;

    Router.use('docs', function () {
      counter++;
    });

    Router.navigate('/docs');
    Router.navigate('/docs/');
    Router.navigate('docs/');
    Router.navigate('docs');

    expect(counter).eq(4);
    done();
  });

  it("path", function (done) {
    Router.use('/file/:path*', function (req) {
      expect(req.params.path).eq('dir/file.jpg');
      done();
    });
    Router.navigate('/file/dir/file.jpg');
  });

  it("path with parameters", function (done) {
    Router.use('/file/:path*', function (req) {
      expect(req.params.path).eq('dir/file.jpg');
      expect(req.query.first).eq('1');
      expect(req.query.second).eq('2');
      done();
    });
    Router.navigate('/file/dir/file.jpg?first=1&second=2');
  });

  it("optional param", function (done) {

    var counter = 0;

    Router.use('/docs/:section/:subsection?', function (req) {
      counter += parseInt(req.params.section, 10);
      if (req.params.subsection) {
        counter += parseInt(req.params.subsection, 10);
      }
    });

    Router.navigate('/docs/1');
    Router.navigate('/docs/2/3');

    expect(counter).eq(6);
    done();
  });

  it("optional parameters", function (done) {

    var counter = 0;
    var queryCounter = 0;

    Router.use('/docs/:section/:subsection?', function (req) {
      counter += parseInt(req.params.section, 10);
      if (req.params.subsection) {
        counter += parseInt(req.params.subsection, 10);
      }
      queryCounter += parseInt(req.query.first, 10);
    });

    Router.navigate('/docs/1?first=1');
    Router.navigate('/docs/2/3?first=2');

    expect(counter).eq(6);
    expect(queryCounter).eq(3);
    done();
  });

  it("get current URL", function () {
    Router.use('/about', function () { });
    Router.use('/about/docs', function () { });
    Router.use('/about/docs/about', function () { });
    Router.use('/about/docs/stub', function () { });
    expect(Router.getCurrent()).eq('');
    Router.navigate('/about/docs');
    expect(Router.getCurrent()).eq('about/docs');
    Router.navigate('/about/docs/about');
    expect(Router.getCurrent()).eq('about/docs/about');
    Router.navigate('/about/docs/stub');
    expect(Router.getCurrent()).eq('about/docs/stub');
  });

  it("new and old routes", function (done) {

    Router.use('some', function (req) {
      expect(req.path).eq('some');
      expect(req.old).eq('');
    });

    Router.use('another', function (req) {
      expect(req.path).eq('another');
      expect(req.old).eq('some');
    });

    Router.navigate('some');
    Router.navigate('another');

    done();
  });

  it("cancel navigation", function (done) {

    Router.use(function (req) {
      expect(req.path).eq('about');
      expect(req.old).eq('');
      return false;
    });

    Router.use('/about', function () {
      expect(false);
    });

    Router.navigate('/about');

    done();
  });

  it("default nested", function (done) {

    var sequence = '';

    Router.use('/about/:part', function () {
      sequence += '1';
    });

    Router.use('/about/docs', function () {
      expect(false);
    });

    Router.use(function () {
      expect(sequence).eq('1');
      done();
    });

    Router.navigate('/about/some');
  });

  it("nested with sequence", function (done) {

    var sequence = '';

    Router.use('/about/docs', function () {
      sequence += '1';
    });

    Router.use('about/docs/about', function () {
      sequence += '2';
    });

    Router.use('/about/docs/stub', function () {
      sequence += '3';
    });

    Router.use('/about/*', function () {
      sequence += '*';
    });

    Router.navigate('/about/docs');
    expect(Router.getCurrent()).eq('about/docs');
    Router.navigate('about/docs/about');
    expect(Router.getCurrent()).eq('about/docs/about');
    Router.navigate('/about/docs/stub');
    expect(Router.getCurrent()).eq('about/docs/stub');

    expect(sequence).eq('1*2*3*');
    done();
  });

  it("nested with parameters", function (done) {

    var sequence = '';

    Router.use('/about/:id/:dynamic', function (req) {
      sequence = req.params;
    });

    Router.use('/about/:id/fixed', function () {
      expect(sequence).a('object');
      expect(sequence.id).eq('16');
      expect(sequence.dynamic).eq('fixed');
      done();
    });

    Router.navigate('/about/16/fixed');
  });

  it("nested with parameters and query", function (done) {

    var first = '';

    Router.use('/about/:id/:num/*', function (req) {
      first = req;
    });

    Router.use('/about/:id/:num/docs/:id/:num', function (req) {
      expect(first.params).a('object');
      expect(first.params.id).eq('16');
      expect(first.params.num).eq('18');
      expect(first.query.first).eq('3');
      expect(req.params).a('object');
      expect(req.params.id).eq('17');
      expect(req.params.num).eq('19');
      expect(req.query.first).eq('3');
      expect(req.query.second).eq('7');
      done();
    });

    Router.navigate('/about/16/18/docs/17/19?first=3&second=7');
  });

  it("groups", function (done) {

    var sequence = '';

    var userGroup = new RouteGroup();

    userGroup.use('', function () {
      sequence += '1';
    });

    userGroup.use(':id', function () {
      sequence += '2';
    });

    Router.use('users', userGroup);

    Router.navigate('users');
    Router.navigate('users/9');

    expect(sequence).eq('12');

    done();
  });

  it("groups with default route", function (done) {

    var sequence = '';

    var userGroup = new RouteGroup();

    userGroup.use(function () {
      sequence += '*';
    });

    userGroup.use(':id', function () {
      sequence += '2';
    });

    Router.use('users', userGroup);

    Router.navigate('users');
    Router.navigate('users/9');

    expect(sequence).eq('*2');

    done();
  });

  it("groups with default route mounted in default", function (done) {

    var sequence = '';

    var userGroup = new RouteGroup();

    userGroup.use('users', function () {
      sequence += '1';
    });

    userGroup.use('users/:id', function () {
      sequence += '2';
    });

    userGroup.use(function () {
      sequence += '*';
    });

    Router.use(userGroup);

    Router.navigate('users');
    Router.navigate('users/9');

    expect(sequence).eq('1*2*');

    done();
  });


});
