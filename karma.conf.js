// Note some browser launchers should be installed before using karma start.
// For example:
// npm install karma-firefox-launcher
// karma start --browsers=Firefox
module.exports = function (config) {
  config.set({

    frameworks: ['mocha', 'chai'],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage'],

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: [
     'Chrome',
     'Firefox',
     'IE',
     'IE9',
      'PhantomJS'
    ],

    // you can define custom flags
    customLaunchers: {
      IE9: {
        base: 'IE',
        'x-ua-compatible': 'IE=EmulateIE9'
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    files: [
      'test/setup/*.js',
      'src/prouter.js',
      'test/*.spec.js'
    ],

    preprocessors: {
      'src/prouter.js': ['coverage']
    },

    coverageReporter: {
      dir: 'build/reports/coverage',
      reporters: [
        // reporters not supporting the `file` property
        {
          type: 'html',
          subdir: 'html'
        }, {
          type: 'lcov',
          subdir: 'lcov'
        }
      ]
    }
  });
};
