_DEF_OPTIONS.mode = 'node';

describe("Routing", function() {

  beforeEach(function() {
    Prouter.drop();
  });

  it("Expression routing", function(done) {
    Prouter.add('about', function() {
      done();
    });
    Prouter.route('about');
  });

  it("Nested routing", function(done) {
    var sequence = '';

    Prouter
      .add('about', function() {
        sequence += '1';
      });

    Prouter
      .to('about')
      .add('/docs', function() {
        sequence.should.equal('1');
        done();
      });

    Prouter.route('about/docs');
  });

  it("Nested routing (more levels)", function(done) {
    var sequence = '';

    Prouter
      .add('about', function() {
        sequence += '1';
      });

    Prouter
      .to('about')
      .add('/docs', function() {
        sequence += '2';
      });

    var aboutDocs = Prouter
      .to('about')
      .to('/docs');

    aboutDocs.add('/about', function() {
      sequence.should.equal('12');
      done();
    });

    Prouter.route('about/docs/about');
  });

  it("Expression routing with parameters", function(done) {
    Prouter.add('/about/:id', function(params) {
      params.should.be.a('object');
      params.id.should.equal('16');
      done();
    });

    Prouter.route('/about/16');
  });

  it("Expression routing with query", function(done) {
    Prouter.add('/about', function(params) {
      params.should.be.a('object');
      (params.first).should.equal('5');
      (params.second).should.equal('6');
      done();
    });

    Prouter.route('/about?first=5&second=6');
  });

  it("Expression routing with parameters & query", function(done) {
    Prouter.add('/about/:id/:number', function(params) {
      params.should.be.a('object');
      (params.id).should.equal('16');
      (params.number).should.equal('18');
      (params.query.first).should.equal('5');
      (params.query.second).should.equal('6');
      done();
    });

    Prouter.route('/about/16/18?first=5&second=6');
  });

  it("Nested routing with parameters", function(done) {
    var sequence = '';

    Prouter
      .add('/about/:id/:number', function(params) {
        sequence = params;
      });

    Prouter
      .to('/about/:id/:number')
      .add('/docs', function() {
        sequence.should.be.a('object');
        (sequence.id).should.equal('16');
        (sequence.number).should.equal('18');
        done();
      });

    Prouter.route('/about/16/18/docs');
  });

  it("Nested routing with parameters two levels", function(done) {
    var first = '';

    Prouter
      .add('/about/:id/:number', function(params) {
        first = params;
      });

    Prouter
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

    Prouter.route('/about/16/18?first=5/docs/17/19?second=7');
  });

  it("Expression routing with parameters (keysof mode)", function(done) {
    Prouter.config({
      keys: false
    });
    Prouter.add('/about/:id/:number', function(id, number) {
      (id).should.equal('16');
      (number).should.equal('18');
      done();
    });

    Prouter.route('/about/16/18');
  });


  it("Expression routing with parameters & query (keysof mode)", function(done) {
    Prouter.config({
      keys: false
    });
    Prouter.add('/about/:id/:number', function(id, number, query) {
      (id).should.equal('16');
      (number).should.equal('18');
      (query.first).should.equal('1');
      (query.second).should.equal('2');
      done();
    });

    Prouter.route('/about/16/18?first=1&second=2');
  });

  it("Nested routing with parameters two levels (keyoff mode)", function(done) {
    Prouter
      .config({
        keys: false
      })
      .add('/about/:id/:number', function(id, number, query) {
        (id).should.equal('16');
        (number).should.equal('18');
        (query.first).should.equal('5');
      });

    Prouter
      .to('/about/:id/:number')
      .add('/docs/:id/:number', function(id, number, query) {
        (id).should.equal('17');
        (number).should.equal('19');
        (query.second).should.equal('7');
        done();
      });

    Prouter.route('/about/16/18?first=5/docs/17/19?second=7');
  });


  it("Expression routing with divided parameters", function(done) {
    Prouter.add('/about/:id/route/:number', function(params) {
      params.should.be.a('object');
      (params.id).should.equal('16');
      (params.number).should.equal('18');
      done();
    });

    Prouter.route('/about/16/route/18');
  });

  it("Nested routing with parameters two levels", function(done) {
    Prouter
      .add('/about/:id/todo/:number', function(params) {
        (params.id).should.equal('16');
        (params.number).should.equal('18');
        (params.query.first).should.equal('5');
      });

    Prouter
      .to('/about/:id/todo/:number')
      .add('/docs/:id/:number', function(params) {
        (params.id).should.equal('17');
        (params.number).should.equal('19');
        (params.query.second).should.equal('7');
        done();
      });

    Prouter.route('/about/16/todo/18?first=5/docs/17/19?second=7');
  });

  it("Nested routing with parameters two levels (keyoff mode)", function(done) {
    Prouter
      .config({
        keys: false
      })
      .add('/about/:id/todo/:number', function(id, number, query) {
        (id).should.equal('16');
        (number).should.equal('18');
        (query.first).should.equal('5');
      });

    Prouter
      .to('/about/:id/todo/:number')
      .add('/docs/:id/:number', function(id, number, query) {
        (id).should.equal('17');
        (number).should.equal('19');
        (query.second).should.equal('7');
        done();
      });

    Prouter.route('/about/16/todo/18?first=5/docs/17/19?second=7');
  });

  it("Remove string expression routing via string", function(done) {
    var flag = false;

    Prouter.add('/about', function() {
      flag = true;
    });

    Prouter.remove('/about');
    Prouter.route('/about');

    setTimeout(function() {
      flag.should.equal(false);
      done();
    }, 50);
  });

  it("Remove root routing", function(done) {
    var sequence = '';
    Prouter
      .add('/about', function() {
        sequence += '1';
      });

    Prouter
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    Prouter.remove('/about');
    Prouter.route('/about/docs');

    setTimeout(function() {
      sequence.should.equal('');
      done();
    }, 50);
  });

  it("Remove nested routing", function(done) {
    var sequence = '';
    Prouter
      .add('/about', function() {
        sequence += '1';
      });

    Prouter
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    Prouter.to('/about').remove('/docs');
    Prouter.route('/about/docs');

    setTimeout(function() {
      sequence.should.equal('1');
      done();
    }, 50);
  });

  it("Remove several string expression routing via path " +
    "(it is possible in the same routing level !!!)",
    function(done) {
      var flag = false;

      Prouter
        .add('/about', function() {
          flag = true;
        })
        .add('/doc', function() {
          flag = true;
        });

      Prouter.remove('/about');
      Prouter.remove('/doc');

      Prouter.check('/about').check('/doc');

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

    Prouter.add('/about', callback);

    Prouter.remove(callback);
    Prouter.route('/about');

    setTimeout(function() {
      flag.should.equal(false);
      done();
    }, 50);
  });

  it("Expression routing context", function(done) {
    var context = {
      name: 'context'
    };

    Prouter.add('/about', function() {
      this.should.equal(context);
      done();
    }.bind(context));

    Prouter.route('/about');
  });

  it("Default routing", function(done) {
    Prouter.add(function() {
      done();
    });
    Prouter.route('/about');
  });

  it("Default nested routing", function(done) {
    var sequence = '';

    Prouter
      .add('/about', function() {
        sequence += '1';
      });

    Prouter
      .to('/about')
      .add('/docs', function() {
        // stub routing callback
      })
      .add(function() {
        sequence.should.equal('1');
        done();
      });

    Prouter.route('/about/default');
  });

  it("Path routing", function(done) {
    Prouter.add('/file/*path', function(path) {
      path.should.equal('dir/file.jpg');
      done();
    });

    Prouter.route('/file/dir/file.jpg');
  });

  it("Path routing with parameters", function(done) {
    Prouter.add('/file/*path', function(path, query) {
      path.should.equal('dir/file.jpg');
      (query.first).should.equal('1');
      (query.second).should.equal('2');
      done();
    });

    Prouter.route('/file/dir/file.jpg?first=1&second=2');
  });

  it("() routing", function(done) {
    var counter = 0;
    Prouter.add('/docs(/)', function() {
      counter++;
    });

    Prouter.route('/docs');
    Prouter.route('/docs/');

    setTimeout(function() {
      counter.should.equal(2);
      done();
    }, 50);
  });

  it("() routing with parameters", function(done) {
    Prouter.add('/docs(/)', function(query) {
      (query.first).should.equal('1');
      (query.second).should.equal('2');
      done();
    });

    Prouter.route('/docs?first=1&second=2');
  });

  it("() nested routing with parameters", function(done) {
    var sequence = '';

    Prouter.add('/docs(/)', function(query) {
      sequence += '1';
    });

    Prouter
      .to('/docs(/)')
      .add('/about', function() {
        sequence.should.equal('1');
        done();
      });

    Prouter.route('/docs?first=1&second=2/about');
  });

  it("() routing", function(done) {
    var counter = 0;
    Prouter.add('/docs/:section(/:subsection)', function(params) {
      counter += parseInt(params.section, 10);
      if (params.subsection) {
        counter += parseInt(params.subsection, 10);
      }
    });

    Prouter.route('/docs/1');
    Prouter.route('/docs/2/3');

    setTimeout(function() {
      counter.should.equal(6);
      done();
    }, 50);
  });

  it("() routing", function(done) {
    var counter = 0;
    Prouter.add('/docs/:section(/:subsection)', function(params) {
      counter += parseInt(params.section, 10);
      if (params.subsection) {
        counter += parseInt(params.subsection, 10);
      }
    });

    Prouter
      .to('/docs/:section(/:subsection)')
      .add('/about', function() {
        console.log(counter)
        done();
      });

    Prouter.route('/docs/2/3/about');
  });

  it("() routing with parameters", function(done) {
    var counter = 0,
      queryCounter = 0;
    Prouter.add('/docs/:section(/:subsection)', function(params) {
      counter += parseInt(params.section, 10);
      if (params.subsection) {
        counter += parseInt(params.subsection, 10);
      }
      queryCounter += parseInt(params.query.first, 10);
    });

    Prouter.route('/docs/1?first=1');
    Prouter.route('/docs/2/3?first=2');

    setTimeout(function() {
      counter.should.equal(6);
      queryCounter.should.equal(3);
      done();
    }, 50);
  });

  it("Nested routing (rerouting:true)", function(done) {
    var sequence = '';
    Prouter
      .add('/about', function() {
        sequence += '1';
      });

    Prouter
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    var aboutDocs = Prouter
      .to('/about')
      .to('/docs');

    aboutDocs
      .add('/about', function() {
        sequence += '3';
      })
      .add('/stub', function() {
        sequence += '4';
      });

    Prouter.route('/about/docs');
    Prouter.route('/about/docs/about');
    Prouter.route('/about/docs/stub');

    setTimeout(function() {
      sequence.should.equal('12123124');
      done();
    }, 50);
  });

  it("Nested routing (rerouting:false)", function(done) {
    var sequence = '';
    Prouter
      .config({
        rerouting: false
      })
      .add('/about', function() {
        sequence += '1';
      });

    Prouter
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    var aboutDocs = Prouter
      .to('/about')
      .to('/docs');

    aboutDocs
      .add('/about', function() {
        sequence += '3';
      })
      .add('/stub', function() {
        sequence += '4';
      });

    Prouter.route('/about/docs');
    Prouter.route('/about/docs/about');
    Prouter.route('/about/docs/stub');

    setTimeout(function() {
      sequence.should.equal('1234');
      done();
    }, 50);
  });

  it("Get current URL", function() {
    Prouter
      .add('/about', function() {});

    Prouter
      .to('/about')
      .add('/docs', function() {});

    var aboutDocs = Prouter
      .to('/about')
      .to('/docs');

    aboutDocs
      .add('/about', function() {})
      .add('/stub', function() {});

    (Prouter.getCurrent()).should.equal('');
    Prouter.route('/about/docs');
    (Prouter.getCurrent()).should.equal('/about/docs');
    Prouter.route('/about/docs/about');
    (Prouter.getCurrent()).should.equal('/about/docs/about');
    Prouter.route('/about/docs/stub');
    (Prouter.getCurrent()).should.equal('/about/docs/stub');
  });

  it("Navigate without saving rote in history", function(done) {
    var sequence = '';
    Prouter
      .add('/about', function() {
        sequence += '1';
      });

    Prouter
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    var aboutDocs = Prouter
      .to('/about')
      .to('/docs');

    aboutDocs
      .add('/about', function() {
        sequence += '3';
      })
      .add('/stub', function() {
        sequence += '4';
      });

    Prouter.check('/about/docs');
    Prouter.route('/about/docs/about');
    Prouter.check('/about/docs/stub');
    (Prouter.getCurrent()).should.equal('/about/docs/about');

    setTimeout(function() {
      sequence.should.equal('12123124');
      done();
    }, 50);
  });

  it("Saving rote in history without navigate", function(done) {
    var sequence = '';
    Prouter
      .add('/about', function() {
        sequence += '1';
      });

    Prouter
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
      });

    var aboutDocs = Prouter
      .to('/about')
      .to('/docs');

    aboutDocs
      .add('/about', function() {
        sequence += '3';
      })
      .add('/stub', function() {
        sequence += '4';
      });

    Prouter.navigate('/about/docs');
    Prouter.route('/about/docs/about');
    Prouter.navigate('/about/docs/stub');
    (Prouter.getCurrent()).should.equal('/about/docs/stub');

    setTimeout(function() {
      sequence.should.equal('123');
      done();
    }, 50);
  });


  it("Sync rollback", function() {
    var sequence = '';

    Prouter
      .add('/about', function() {
        sequence += '1';
      });

    Prouter
      .to('/about')
      .add('/docs', function() {
        sequence += '2';
        return false;
      });

    Prouter.to('/about').to('/docs')
      .add('/about', function() {
        sequence += '3';
      });

    Prouter.route('/about/docs/about');

    (Prouter.getCurrent()).should.equal('');
    (sequence).should.equal('12');
  });

});
