'use strict';

var Router = prouter.Router;

describe("Routing -", function () {

  this.timeout(1000);

  beforeEach(function () {
    Router.reset();
    Router.listen({mode: 'history'});
  });

  it("Expression routing", function (done) {
    Router.use('about', function () {
      done();
    });
    Router.navigate('/about');
  });


  it("Expression routing with parameters", function (done) {
    Router.use('/about/:id', function (req) {
      req.params.should.be.a('object');
      req.params.id.should.equal('16');
      done();
    });
    Router.navigate('about/16');
  });

  it("Expression routing with query", function (done) {
    Router.use('/about', function (req) {
      req.query.should.be.a('object');
      req.query.first.should.equal('5');
      req.query.second.should.equal('6');
      done();
    });
    Router.navigate('/about?first=5&second=6');
  });

  it("Expression routing with parameters & query", function (done) {
    Router.use('/about/:id/:num', function (req) {
      req.params.should.be.a('object');
      req.params.id.should.equal('16');
      req.params.num.should.equal('18');
      req.query.first.should.equal('5');
      req.query.second.should.equal('6');
      done();
    });
    Router.navigate('/about/16/18?first=5&second=6');
  });

  it("Nested Routing sequence", function (done) {

    var sequence = '';

    Router
      .use('/about/docs', function () {
      sequence += '1';
    });

    Router
      .use('about/docs/about', function () {
      sequence += '2';
    });

    Router
      .use('/about/docs/stub', function () {
      sequence += '3';
    });

    Router
      .use('/about/*', function () {
      sequence += '4';
    });

    Router.navigate('/about/docs');
    Router.getCurrent().should.equal('about/docs');
    Router.navigate('about/docs/about');
    Router.getCurrent().should.equal('about/docs/about');
    Router.navigate('/about/docs/stub');
    Router.getCurrent().should.equal('about/docs/stub');

    setTimeout(function () {
      sequence.should.equal('142434');
      done();
    }, 50);
  });

  it("Nested routing with parameters", function (done) {

    var sequence = '';

    Router
      .use('/about/:id/:dynamic', function (req) {
      sequence = req.params;
    });

    Router
      .use('/about/:id/fixed', function () {
      sequence.should.be.a('object');
      sequence.id.should.equal('16');
      sequence.dynamic.should.equal('fixed');
      done();
    });

    Router.navigate('/about/16/fixed');
  });

  it("Nested routing with parameters", function (done) {

    var first = '';

    Router
      .use('/about/:id/:num/*', function (req) {
      first = req;
    });

    Router
      .use('/about/:id/:num/docs/:id/:num', function (req) {
      first.params.should.be.a('object');
      first.params.id.should.equal('16');
      first.params.num.should.equal('18');
      first.query.first.should.equal('3');
      req.params.should.be.a('object');
      req.params.id.should.equal('17');
      req.params.num.should.equal('19');
      req.query.first.should.equal('3');
      req.query.second.should.equal('7');
      done();
    });

    Router.navigate('/about/16/18/docs/17/19?first=3&second=7');
  });

  it("Expression routing with parameters", function (done) {
    Router.use('/about/:id/:num', function (req) {
      req.params.id.should.equal('16');
      req.params.num.should.equal('18');
      done();
    });
    Router.navigate('/about/16/18');
  });


  it("Expression routing with parameters & query", function (done) {
    Router.use('/about/:id/:num', function (req) {
      req.params.id.should.equal('16');
      req.params.num.should.equal('18');
      req.query.first.should.equal('1');
      req.query.second.should.equal('2');
      done();
    });
    Router.navigate('/about/16/18?first=1&second=2');
  });



  it("Expression routing with divided parameters", function (done) {
    Router.use('/about/:id/route/:num', function (req) {
      req.params.should.be.a('object');
      req.params.id.should.equal('16');
      req.params.num.should.equal('18');
      done();
    });
    Router.navigate('/about/16/route/18');
  });


  it("Expression routing context", function (done) {
    var context = {
      name: 'context'
    };

    Router.use('/about', function () {
      this.should.equal(context);
      done();
    }.bind(context));

    Router.navigate('/about');
  });

  it("Default routing", function (done) {
    Router.use(function () {
      done();
    });
    Router.navigate('/about');
  });

  it("Default nested routing", function (done) {

    var sequence = '';

    Router
      .use('/about/:part', function () {
      sequence += '1';
    });

    Router
      .use('/about/docs', function () {
      false.should.equal(true);
    })
      .use(function () {
      sequence.should.equal('1');
      done();
    });

    Router.navigate('/about/default');
  });

  it("Path routing", function (done) {
    Router.use('/file/:path*', function (req) {
      req.params.path.should.equal('dir/file.jpg');
      done();
    });
    Router.navigate('/file/dir/file.jpg');
  });

  it("Path routing with parameters", function (done) {
    Router.use('/file/:path*', function (req) {
      req.params.path.should.equal('dir/file.jpg');
      req.query.first.should.equal('1');
      req.query.second.should.equal('2');
      done();
    });
    Router.navigate('/file/dir/file.jpg?first=1&second=2');
  });

  it("/ routing", function (done) {
    
    var counter = 0;
    
    Router.use('/docs', function () {
      counter++;
    });

    Router.navigate('/docs');
    Router.navigate('/docs/');

    setTimeout(function () {
      counter.should.equal(2);
      done();
    }, 50);
  });

  it("routing with parameters", function (done) {
    Router.use('/docs', function (params) {
      var query = params.query;
      query.first.should.equal('1');
      query.second.should.equal('2');
      done();
    });
    Router.navigate('/docs?first=1&second=2');
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

    setTimeout(function () {
      counter.should.equal(6);
      done();
    }, 50);
  });


  it("Cancel navigation", function (done) {

    Router.use(function (req) {
      req.path.should.equal('about');
      req.old.should.equal('');
      return false;
    });   

    Router.use('/about', function () {
      false.should.equal(true);
    });

    Router.navigate('/about');

    setTimeout(function () {
      done();
    }, 50);
  });

  it("() routing with parameters", function (done) {
    var counter = 0,
      queryCounter = 0;
    Router.use('/docs/:section/:subsection?', function (req) {
      counter += parseInt(req.params.section, 10);
      if (req.params.subsection) {
        counter += parseInt(req.params.subsection, 10);
      }
      queryCounter += parseInt(req.query.first, 10);
    });

    Router.navigate('/docs/1?first=1');
    Router.navigate('/docs/2/3?first=2');

    setTimeout(function () {
      counter.should.equal(6);
      queryCounter.should.equal(3);
      done();
    }, 50);
  });


  it("Get current URL", function () {
    Router
      .use('/about', function () { })
      .use('/about/docs', function () { })
      .use('/about/docs/about', function () { })
      .use('/about/docs/stub', function () { });

    Router.getCurrent().should.equal('');
    Router.navigate('/about/docs');
    Router.getCurrent().should.equal('about/docs');
    Router.navigate('/about/docs/about');
    Router.getCurrent().should.equal('about/docs/about');
    Router.navigate('/about/docs/stub');
    Router.getCurrent().should.equal('about/docs/stub');
  });

});
