'use strict';

describe('Routing -', function () {

  // This library must be fast.
  // Ensure each test takes maximun the following time (ms) to complete.
  this.timeout(50);

  var Router = prouter.Router;
  var RouteGroup = prouter.RouteGroup;

  beforeEach(function () {
    var usePushState = Math.random() > 0.5;
    var randomRoot = Math.random() > 0.5 ? '/' : 'some-root';
    var options = {
      usePushState: usePushState,
      root: randomRoot,
      usePost: true
    };
    Router.listen(options);
  })

  afterEach(function () {
    Router.stop();
  });

  it('basic', function (done) {
    Router.use('about', function () {
      done();
    });
    Router.navigate('/about');
  });

  it('default', function (done) {
    Router.use(function () {
      done();
    });
    Router.navigate('about');
  });

  it('parameters', function (done) {
    Router.use('/about/:id/:num', function (req) {
      expect(req.params.id).eq('16');
      expect(req.params.num).eq('18');
      done();
    });
    Router.navigate('/about/16/18');
  });

  it('get parameters', function (done) {
    Router.get('/about/:id/:num', function (req) {
      expect(req.params.id).eq('16');
      expect(req.params.num).eq('18');
      done();
    });
    Router.navigate('/about/16/18');
  });

  it('query', function (done) {
    Router.use('/about', function (req) {
      expect(req.query).a('object');
      expect(req.query.first).eq('5');
      expect(req.query.second).eq('6');
      done();
    });
    Router.navigate('/about?first=5&second=6');
  });

  it('parameters & query', function (done) {
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

  it('divided parameters', function (done) {
    Router.use('/about/:id/route/:num', function (req) {
      expect(req.params).a('object');
      expect(req.params.id).eq('16');
      expect(req.params.num).eq('18');
      done();
    });
    Router.navigate('/about/16/route/18');
  });

  it('post from form submit intercept', function (done) {
    Router.post('/about/:id/:num', function (req) {
      expect(req.params.id).eq('16');
      expect(req.params.num).eq('18');
      expect(req.body.test3).eq('1234');
      done();
    });
    var form = document.createElement("form");
    form.action = '/about/16/18';
    var input = document.createElement("input");
    input.type = "text";
    input.value = "1234";
    input.name = "test3";
    form.appendChild(input);
    document.body.appendChild(form);
    var event = document.createEvent('Event');
    event.initEvent('submit', true, true);
    form.dispatchEvent(event);
  });

  it('post from submit', function (done) {
    Router.post('/about/:id/:num', function (req) {
      expect(req.params.id).eq('16');
      expect(req.params.num).eq('18');
      done();
    });
    Router.submit('/about/16/18');
  });

  it('post from submit with body', function (done) {
    Router.post('/about/:id/:num', function (req) {
      expect(req.params.id).eq('16');
      expect(req.params.num).eq('18');
      expect(req.body.test3).eq('123');
      done();
    });
    Router.submit('/about/16/18', { test3: "123"});
  });

  it('preserve context', function (done) {
    var context = {
      name: 'context'
    };
    Router.use('/about', function () {
      expect(this).eq(context);
      done();
    }.bind(context));
    Router.navigate('/about');
  });

  it('shift /', function (done) {

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

  it('path', function (done) {
    Router.use('/file/:path*', function (req) {
      expect(req.params.path).eq('dir/file.jpg');
      done();
    });
    Router.navigate('/file/dir/file.jpg');
  });

  it('path with parameters', function (done) {
    Router.use('/file/:path*', function (req) {
      expect(req.params.path).eq('dir/file.jpg');
      expect(req.query.first).eq('1');
      expect(req.query.second).eq('2');
      expect(req.path).eq('file/dir/file.jpg');
      done();
    });
    Router.navigate('/file/dir/file.jpg?first=1&second=2');
  });

  it('optional param', function (done) {

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

  it('optional parameters', function (done) {

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

  it('custom match parameters', function (done) {

    var sequence = '';

    Router.use(':foo(\\d+)', function (req) {
      expect(req.path).eq('123');
      expect(req.params.foo).eq('123');
      sequence += '1';
    }).use('some/:other(\\d+)', function (req) {
      expect(req.oldPath).eq('123');
      expect(req.path).eq('some/987');
      expect(req.params.other).eq('987');
      sequence += '2';
    });

    Router.navigate('123');
    Router.navigate('some/987');

    expect(sequence).eq('12');

    done();
  });

  it('unnamed parameters', function (done) {

    Router.use(':foo/(.*)', function (req) {
      expect(req.path).eq('test/route');
      expect(req.params.foo).eq('test');
      expect(req.params['0']).eq('route');
      done();
    });

    Router.navigate('test/route');
  });

  it('get current URL', function () {

    var originalPath = Router.getCurrent();

    Router.use('/about', function () { })
      .use('/about/docs', function () { })
      .use('/about/docs/about', function () { })
      .use('/about/docs/stub', function () { });

    expect(Router.getCurrent()).eq(originalPath);
    Router.navigate('/about/docs');
    expect(Router.getCurrent()).eq('about/docs');
    Router.navigate('/about/docs/about');
    expect(Router.getCurrent()).eq('about/docs/about');
    Router.navigate('/about/docs/stub');
    expect(Router.getCurrent()).eq('about/docs/stub');
  });

  it('new and old routes', function (done) {

    var originalPath = Router.getCurrent();

    Router.use('some', function (req) {
      expect(req.path).eq('some');
      expect(req.oldPath).eq(originalPath);
    }).use('another', function (req) {
      expect(req.path).eq('another');
      expect(req.oldPath).eq('some');
      done();
    });

    Router.navigate('some');
    Router.navigate('another');
  });

  it('end routing cycle', function (done) {

    var originalPath = Router.getCurrent();

    Router.use(function (req) {
      expect(req.path).eq('about');
      expect(req.oldPath).eq(originalPath);
    }).use('/about', function () {
      expect(false).true;
    });

    Router.navigate('/about');

    done();
  });

  it('default nested', function (done) {

    var sequence = '';

    Router.use('/about/:part', function (req, next) {
      sequence += '1';
      next()
    }).use('/about/docs', function () {
      expect(false).true;
    }).use(function () {
      expect(sequence).eq('1');
      done();
    });

    Router.navigate('/about/some');
  });

  it('nested with sequence', function (done) {

    var sequence = '';

    Router.use('/about/docs', function (req) {
      sequence += '1';
      return true;
    }).use('about/docs/about', function (req) {
      sequence += '2';
      return true;
    }).use('/about/docs/stub', function (req, next) {
      sequence += '3';
      // simulates async.
      setTimeout(next, 30);
    }).use('/about/*', function () {
      sequence += '*';
      if (sequence === '1*2*3*') {
        done();
      }
    });

    Router.navigate('/about/docs');
    expect(Router.getCurrent()).eq('about/docs');
    Router.navigate('about/docs/about');
    expect(Router.getCurrent()).eq('about/docs/about');
    Router.navigate('/about/docs/stub');
    expect(Router.getCurrent()).eq('about/docs/stub');    
  });

  it('nested preserve context', function (done) {

    var context = { something: Math.random };

    Router.use('/about/docs', function (req, next) {
      next();
    }).use('/about/*', function () {
      expect(this).eq(context);
      done();
    }.bind(context));

    Router.navigate('/about/docs');
  });

  it('nested with parameters', function (done) {

    var sequence = '';

    Router.use('/about/:id/:dynamic', function (req, next) {
      sequence = req.params;
      next();
    }).use('/about/:id/fixed', function () {
      expect(sequence).a('object');
      expect(sequence.id).eq('16');
      expect(sequence.dynamic).eq('fixed');
      done();
    });

    Router.navigate('/about/16/fixed');
  });

  it('nested with parameters and query', function (done) {

    var first = '';

    Router.use('/about/:id/:num/*', function (req, next) {
      first = req;
      next();
    }).use('/about/:id/:num/docs/:id/:num', function (req) {
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

  it('groups', function (done) {

    var sequence = '';

    var userGroup = new RouteGroup();

    userGroup.use('', function (req, next) {
      sequence += '1';
      next();
    }).use(':id', function () {
      sequence += '2';
    });

    Router.use('users', userGroup);

    Router.navigate('users');
    Router.navigate('users/9');

    expect(sequence).eq('12');

    done();
  });

  it('groups many', function (done) {

    var sequence = '';

    var userGroup = new RouteGroup();
    userGroup.use('', function () {
      sequence += '1';
    }).use(':id', function () {
      sequence += '2';
    });

    var aboutGroup = new RouteGroup();
    aboutGroup.use('owner', function () {
      sequence += '3';
    }).use('year/:num', function () {
      sequence += '4';
    });

    Router.use('users', userGroup)
      .use('about', aboutGroup);

    Router.navigate('users');
    Router.navigate('users/9');
    Router.navigate('about/owner');
    Router.navigate('about/year/2015');

    expect(sequence).eq('1234');

    done();
  });

  it('groups with default route', function (done) {

    var sequence = '';

    var userGroup = new RouteGroup();
    userGroup.use(function () {
      sequence += '*';
    }).use(':id', function () {
      sequence += '2';
    });

    Router.use('users', userGroup);

    Router.navigate('users');
    Router.navigate('users/9');

    expect(sequence).eq('*2');

    done();
  });

  it('groups with default route mounted in default', function (done) {

    var sequence = '';

    var userGroup = new RouteGroup();

    userGroup.use('users', function (req, next) {
      sequence += '1';
      next()
    }).use('users/:id', function (req, next) {
      sequence += '2';
      next();
    }).use(function () {
      sequence += '*';
    });

    Router.use(userGroup);

    Router.navigate('users');
    Router.navigate('users/9');

    expect(sequence).eq('1*2*');

    done();
  });

  it('listen - throws error if already listening', function (done) {
    expect(function () {
      Router.listen();
    }).throw(Error);
    done();
  });

  it('listen - throws error if navigating without listening', function (done) {
    expect(function () {
      Router.stop().navigate('something');
    }).throw(Error);
    done();
  });
  
  it('respect escaped characters', function (done) {
    Router.use('\\(testing\\)', function () {
      done();
    });
    Router.navigate('/(testing)');
  });
  
  it('respect unicode characters', function (done) {
    Router.use('café/:it', function (req) {
      expect(req.params.it).eq('costeño');
      done();
    });
    Router.navigate('café/costeño');
  });
  
  it('unnamed custom param', function (done) {
    Router.use('(\\d+)?', function (req) {
      done();
    });
    Router.navigate('123');
  });

});
