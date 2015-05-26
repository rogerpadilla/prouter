'use strict';

var gulp = require('gulp');
var tslint = require('gulp-tslint');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var karma = require('karma').server;
var coveralls = require('gulp-coveralls');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

var tsConfig = require('./tsconfig.json');

var mainFileName = 'prouter';
var mainFile = 'src/' + mainFileName + '.js';

/*** Tasks ***/

/**
 * Run tests once and exit.
 */
gulp.task('test', ['script'], function (done) {
    karma.start({
        configFile: __dirname + '/karma.conf.js',
        action: 'run',
        autoWatch: false,
        singleRun: true
    }, done);
});

gulp.task('coveralls', ['test'], function () {
    gulp.src('build/reports/coverage/**/lcov.info')
        .pipe(coveralls());
});

gulp.task('clean', function (cb) {
    del(['dist/**/*'], cb);
});

gulp.task('script', function () {
    return gulp.src(mainFile)
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(babel())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('script:minify', ['script'], function () {
    return gulp.src('dist/' + mainFileName + '.js')
        .pipe(uglify())
        .pipe(rename(mainFileName + '.min.js'))
        .pipe(gulp.dest('dist'));
});

gulp.task('lint', function() {
    gulp.src(tsConfig.filesGlob)
        .pipe(tslint({
            configuration: {
                rules: {
                    'class-name': true,
                    curly: true,
                    indent: true,
                    'jsdoc-format': true,
                    'no-arg': true,
                    'no-bitwise': true,
                    'no-construct': true,
                    'no-debugger': true,
                    'no-duplicate-key': true,
                    'no-duplicate-variable': true,
                    'no-empty': true,
                    'no-eval': true,
                    'no-trailing-comma': true,
                    'no-unreachable': true,
                    'no-unused-expression': true,
                    'no-unused-variable': true,
                    'no-use-before-declare': true,
                    quotemark: true,
                    semicolon: true,
                    'triple-equals': true,
                    'variable-name': 'allow-leading-underscore'
                }
            }
        }))
        .pipe(tslint.report('full'));
});

gulp.task('watch', ['test'], function() {
    gulp.watch([mainFile, 'test/*.spec.js'], ['test']);
});

gulp.task('build', ['lint', 'script:minify']);
gulp.task('default', ['watch']);
