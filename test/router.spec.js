describe("Routing", function() {

  beforeEach(function() {
    Router.drop();
  });

  it("Expression routing", function(done) {
    Router.add('about', function() {
      done();
    });
    Router.route('about');
  });

  it("Nested routing", function(done) {
    var sequence = '';

    Router
      .add('about', function() {
        sequence += '1';
      });

    Router
      .to('about')
      .add('/docs', function() {
        sequence.should.equal('1');
        done();
      });

    Router.route('about/docs');
  });

  it("Nested routing (more levels)", function(done) {
    var sequence = '';

    Router
      .add('about', function() {
        sequence += '1';
      });

    Router
      .to('about')
      .add('/docs', function() {
        sequence += '2';
      });

    var aboutDocs = Router
      .to('about')
      .to('/docs');

    aboutDocs.add('/about', function() {
      sequence.should.equal('12');
      done();
    });

    Router.route('about/docs/about');
  });

  it("Expression routing with parameters", function(done) {
    Router.add('/about/:id', function(params) {
      params.should.be.a('object');
      (params.id).should.equal('16');
      done();
    });

    Router.route('/about/16');
  });

  it("Expression routing with query", function(done) {
    Router.add('/about', function(params) {
      params.should.be.a('object');
      (params.first).should.equal('5');
      (params.second).should.equal('6');
      done();
    });

    Router.route('/about?first=5&second=6');
  });

  it("Expression routing with parameters & query", function(done) {
    Router.add('/about/:id/:number', function(params) {
      params.should.be.a('object');
      (params.id).should.equal('16');
      (params.number).should.equal('18');
      (params.query.first).should.equal('5');
      (params.query.second).should.equal('6');
      done();
    });

    Router.route('/about/16/18?first=5&second=6');
  });

  it("Nested routing with parameters", function(done) {
    var sequence = '';

    Router
      .add('/about/:id/:number', function(params) {
        sequence = params;
      });

    Router
      .to('/about/:id/:number')
      .add('/docs', function() {
        sequence.should.be.a('object');
        (sequence.id).should.equal('16');
        (sequence.number).should.equal('18');
        done();
      });

    Router.route('/about/16/18/docs');
  });

  it("Nested routing with parameters two levels", function(done) {
    var first = '';

    Router
      .add('/about/:id/:number', function(params) {
        first = params;
      });

    Router
      .to('/about/:id/:number')
      .add('/docs/:id/:number', function(params) {
        first.should.be.a('object');
        (first.id).should.equal('16');
        (first.number).should.equal('18');
        (first.query.first).should.equal('5');

        params.should.be.a('object');
        (params.id).should.equal('17');
        (params.number).should.equal('19');
        (params.query.second).should.equal('7');
        done();
      });

    Router.route('/about/16/18?first=5/docs/17/19?second=7');
  });

  it("Expression routing with parameters (keysof mode)", function(done) {
    Router.config({
      keys: false
    });
    Router.add('/about/:id/:number', function(id, number) {
      (id).should.equal('16');
      (number).should.equal('18');
      done();
    });

    Router.route('/about/16/18');
  });


  it("Expression routing with parameters & query (keysof mode)", function(done) {
    Router.config({
      keys: false
    });
    Router.add('/about/:id/:number', function(id, number, query) {
      (id).should.equal('16');
      (number).should.equal('18');
      (query.first).should.equal('1');
      (query.second).should.equal('2');
      done();
    });

    Router.route('/about/16/18?first=1&second=2');
  });

  it("Nested routing with parameters two levels (keyoff mode)", function(done) {
    Router
      .config({
        keys: false
      })
      .add('/about/:id/:number', function(id, number, query) {
        (id).should.equal('16');
        (number).should.equal('18');
        (query.first).should.equal('5');
      });

    Router
      .to('/about/:id/:number')
      .add('/docs/:id/:number', function(id, number, query) {
        (id).should.equal('17');
        (number).should.equal('19');
        (query.second).should.equal('7');
        done();
      });

    Router.route('/about/16/18?first=5/docs/17/19?second=7');
  });


  it("Expression routing with divided parameters", function(done) {
    Router.add('/about/:id/route/:number', function(params) {
      params.should.be.a('object');
      (params.id).should.equal('16');
      (params.number).should.equal('18');
      done();
    });

    Router.route('/about/16/route/18');
  });

  it("Nested routing with parameters two levels", function(done) {
    Router
      .add('/about/:id/todo/:number', function(params) {
        (params.id).should.equal('16');
        (params.number).should.equal('18');
        (params.query.first).should.equal('5');
      });

    Router
      .to('/about/:id/todo/:number')
      .add('/docs/:id/:number', function(params) {
        (params.id).should.equal('17');
        (params.number).should.equal('19');
        (params.query.second).should.equal('7');
        done();
      });

    Router.route('/about/16/todo/18?first=5/docs/17/19?second=7');
  });

  it("Nested routing with parameters two levels (keyoff mode)", function(done) {
    Router
      .config({
        keys: false
      })
      .add('/about/:id/todo/:number', function(id, number, query) {
        (id).should.equal('16');
        (number).should.equal('18');
        (query.first).should.equal('5');
      });

    Router
      .to('/about/:id/todo/:number')
      .add('/docs/:id/:number', function(id, number, query) {
        (id).should.equal('17');
        (number).should.equal('19');
        (query.second).should.equal('7');
        done();
      });

    Router.route('/about/16/todo/18?first=5/docs/17/19?second=7');
  });

  it("Remove string expression routing via string", function(done) {
    var flag = false;

    Router.add('/about', function() {
      flag = true;
    });

    Router.remove('/about');
    Router.route('/about');

    setTimeout(function() {
      flag.should.equal(false);
      done();
    }, 50);
  });

  it("Remove root routing", function(done) {
    var sequence = '';
    Router
      .add('/about', function() {
        sequence += '1';
      });

    Router
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    Router.remove('/about');
    Router.route('/about/docs');

    setTimeout(function() {
      sequence.should.equal('');
      done();
    }, 50);
  });

  it("Remove nested routing", function(done) {
    var sequence = '';
    Router
      .add('/about', function() {
        sequence += '1';
      });

    Router
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    Router.to('/about').remove('/docs');
    Router.route('/about/docs');

    setTimeout(function() {
      sequence.should.equal('1');
      done();
    }, 50);
  });

  it("Remove several string expression routing via path " +
    "(it is possible in the same routing level !!!)",
    function(done) {
      var flag = false;

      Router
        .add('/about', function() {
          flag = true;
        })
        .add('/doc', function() {
          flag = true;
        });

      Router.remove('/about');
      Router.remove('/doc');

      Router.check('/about').check('/doc');

      setTimeout(function() {
        flag.should.equal(false);
        done();
      }, 50);
    });

  it("Remove expression routing via callback", function(done) {
    var flag = false;

    function callback() {
      flag = true;
    }

    Router.add('/about', callback);

    Router.remove(callback);
    Router.route('/about');

    setTimeout(function() {
      flag.should.equal(false);
      done();
    }, 50);
  });

  it("Expression routing context", function(done) {
    var context = {
      name: 'context'
    };

    Router.add('/about', function() {
      this.should.equal(context);
      done();
    }.bind(context));

    Router.route('/about');
  });

  it("Default routing", function(done) {
    Router.add(function() {
      done();
    });

    Router.route('/about');
  });

  it("Default nested routing", function(done) {
    var sequence = '';

    Router
      .add('/about', function() {
        sequence += '1';
      });

    Router
      .to('/about')
      .add('/docs', function() {
        // stub routing callback
      })
      .add(function() {
        sequence.should.equal('1');
        done();
      });

    Router.route('/about/default');
  });

  it("Path routing", function(done) {
    Router.add('/file/*path', function(path) {
      path.should.equal('dir/file.jpg');
      done();
    });

    Router.route('/file/dir/file.jpg');
  });

  it("Path routing with parameters", function(done) {
    Router.add('/file/*path', function(path, query) {
      path.should.equal('dir/file.jpg');
      (query.first).should.equal('1');
      (query.second).should.equal('2');
      done();
    });

    Router.route('/file/dir/file.jpg?first=1&second=2');
  });

  it("() routing", function(done) {
    var counter = 0;
    Router.add('/docs(/)', function() {
      counter++;
    });

    Router.route('/docs');
    Router.route('/docs/');

    setTimeout(function() {
      counter.should.equal(2);
      done();
    }, 50);
  });

  it("() routing with parameters", function(done) {
    Router.add('/docs(/)', function(query) {
      (query.first).should.equal('1');
      (query.second).should.equal('2');
      done();
    });

    Router.route('/docs?first=1&second=2');
  });

  it("() nested routing with parameters", function(done) {
    var sequence = '';

    Router.add('/docs(/)', function(query) {
      sequence += '1';
    });

    Router
      .to('/docs(/)')
      .add('/about', function() {
        sequence.should.equal('1');
        done();
      });

    Router.route('/docs?first=1&second=2/about');
  });

  it("() routing", function(done) {
    var counter = 0;
    Router.add('/docs/:section(/:subsection)', function(params) {
      counter += parseInt(params.section, 10);
      if (params.subsection) {
        counter += parseInt(params.subsection, 10);
      }
    });

    Router.route('/docs/1');
    Router.route('/docs/2/3');

    setTimeout(function() {
      counter.should.equal(6);
      done();
    }, 50);
  });

  it("() routing", function(done) {
    var counter = 0;
    Router.add('/docs/:section(/:subsection)', function(params) {
      counter += parseInt(params.section, 10);
      if (params.subsection) {
        counter += parseInt(params.subsection, 10);
      }
    });

    Router
      .to('/docs/:section(/:subsection)')
      .add('/about', function() {
        console.log(counter)
        done();
      });

    //todo Router.route('/docs/1/about'); так не сработает т.к. '/about' будет восприниматся как (/:subsection)
    // а не как nested routing, удалить из тестов
    Router.route('/docs/2/3/about');

    //setTimeout(function () {
    //    counter.should.equal(6);
    //    done();
    //}, 50);
  });

  it("() routing with parameters", function(done) {
    var counter = 0,
      queryCounter = 0;
    Router.add('/docs/:section(/:subsection)', function(params) {
      counter += parseInt(params.section, 10);
      if (params.subsection) {
        counter += parseInt(params.subsection, 10);
      }
      queryCounter += parseInt(params.query.first, 10);
    });

    Router.route('/docs/1?first=1');
    Router.route('/docs/2/3?first=2');

    setTimeout(function() {
      counter.should.equal(6);
      queryCounter.should.equal(3);
      done();
    }, 50);
  });

  it("Nested routing (rerouting:true)", function(done) {
    var sequence = '';
    Router
      .add('/about', function() {
        sequence += '1';
      });

    Router
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    var aboutDocs = Router
      .to('/about')
      .to('/docs');

    aboutDocs
      .add('/about', function() {
        sequence += '3';
      })
      .add('/stub', function() {
        sequence += '4';
      });

    Router.route('/about/docs');
    Router.route('/about/docs/about');
    Router.route('/about/docs/stub');

    setTimeout(function() {
      sequence.should.equal('12123124');
      done();
    }, 50);
  });

  it("Nested routing (rerouting:false)", function(done) {
    var sequence = '';
    Router
      .config({
        rerouting: false
      })
      .add('/about', function() {
        sequence += '1';
      });

    Router
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    var aboutDocs = Router
      .to('/about')
      .to('/docs');

    aboutDocs
      .add('/about', function() {
        sequence += '3';
      })
      .add('/stub', function() {
        sequence += '4';
      });

    Router.route('/about/docs');
    Router.route('/about/docs/about');
    Router.route('/about/docs/stub');

    setTimeout(function() {
      sequence.should.equal('1234');
      done();
    }, 50);
  });

  it("Get current URL", function() {
    Router
      .add('/about', function() {});

    Router
      .to('/about')
      .add('/docs', function() {});

    var aboutDocs = Router
      .to('/about')
      .to('/docs');

    aboutDocs
      .add('/about', function() {})
      .add('/stub', function() {});

    (Router.getCurrent()).should.equal('');
    Router.route('/about/docs');
    (Router.getCurrent()).should.equal('/about/docs');
    Router.route('/about/docs/about');
    (Router.getCurrent()).should.equal('/about/docs/about');
    Router.route('/about/docs/stub');
    (Router.getCurrent()).should.equal('/about/docs/stub');
  });

  it("Navigate without saving rote in history", function(done) {
    var sequence = '';
    Router
      .add('/about', function() {
        sequence += '1';
      });

    Router
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    var aboutDocs = Router
      .to('/about')
      .to('/docs');

    aboutDocs
      .add('/about', function() {
        sequence += '3';
      })
      .add('/stub', function() {
        sequence += '4';
      });

    Router.check('/about/docs');
    Router.route('/about/docs/about');
    Router.check('/about/docs/stub');
    (Router.getCurrent()).should.equal('/about/docs/about');

    setTimeout(function() {
      sequence.should.equal('12123124');
      done();
    }, 50);
  });

  it("Saving rote in history without navigate", function(done) {
    var sequence = '';
    Router
      .add('/about', function() {
        sequence += '1';
      });

    Router
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    var aboutDocs = Router
      .to('/about')
      .to('/docs');

    aboutDocs
      .add('/about', function() {
        sequence += '3';
      })
      .add('/stub', function() {
        sequence += '4';
      });

    Router.navigate('/about/docs');
    Router.route('/about/docs/about');
    Router.navigate('/about/docs/stub');
    (Router.getCurrent()).should.equal('/about/docs/stub');

    setTimeout(function() {
      sequence.should.equal('123');
      done();
    }, 50);
  });


  it("Sync rollback", function() {
    var sequence = '';

    Router
      .add('/about', function() {
        sequence += '1';
      });

    Router
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
        return false;
      });

    Router.to('/about').to('/docs')
      .add('/about', function() {
        sequence += '3';
      });

    Router.route('/about/docs/about');

    (Router.getCurrent()).should.equal('');
    (sequence).should.equal('12');
  });

});
