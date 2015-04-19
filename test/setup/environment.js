(function() {

  var history = window.history;
  var pushState = history.pushState;
  var replaceState = history.replaceState;

  QUnit.testStart(function() {

    var env = QUnit.config.current.testEnvironment;

    // We never want to actually call these during tests.
    history.pushState = history.replaceState = function(){};

  });

  QUnit.testDone(function() {
    history.pushState = pushState;
    history.replaceState = replaceState;
  });

})();
