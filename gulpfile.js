'use strict';

var gulp = require('gulp');
var eslint = require('gulp-eslint');
var babel = require('gulp-babel');
var closureCompiler = require('gulp-closure-compiler');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var karma = require('gulp-karma');

var mainFileName = 'easy-router';
var mainFile = 'js/' + mainFileName + '.js';

// list of files / patterns to load in the browser
var testFiles = [
    'test/setup/*.js',
    'dist/easy-router.js',
    'dist/easy-router.js.map',
    'test/*.js'
];

/*** Tasks ***/

gulp.task('lint', function () {
    return gulp.src([mainFile])
        .pipe(eslint())
        .pipe(eslint.format());
});

gulp.task('test', function () {
    return gulp.src(testFiles)
        .pipe(karma({
            configFile: 'karma.conf.js',
            action: 'run'
        }))
        .on('error', function (err) {
            throw err;
        });
});

gulp.task('clean', function (cb) {
    del(['dist/**/*'], cb);
});

gulp.task('script:build', ['clean'], function () {
    return gulp.src(mainFile)
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('script', ['script:build'], function () {
    return gulp.src('dist/' + mainFileName + '.js')
        .pipe(closureCompiler({
            compilerPath: 'node_modules/closure-compiler/lib/vendor/compiler.jar',
            fileName: mainFileName + '.min.js'
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', ['build'], function () {
    gulp.watch([mainFile, '.eslintrc', 'gulpfile.js'], ['build']);
});

gulp.task('build', ['lint', 'script']);
gulp.task('default', ['watch']);

