'use strict';

var gulp = require('gulp');
var eslint = require('gulp-eslint');
var babel = require('gulp-babel');
var closureCompiler = require('gulp-closure-compiler');
var sourcemaps = require('gulp-sourcemaps');

/*** Tasks ***/

gulp.task('lint', function () {
    return gulp.src(['src/easy-router.es'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failOnError());
});

gulp.task('script:build', function () {
    return gulp.src('src/easy-router.es')
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('dist'));
});

gulp.task('script', ['script:build'], function () {
    return gulp.src('dist/easy-router.js')
        .pipe(closureCompiler({
            compilerPath: 'node_modules/closure-compiler/lib/vendor/compiler.jar',
            fileName: 'easy-router.min.js'
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', ['build'], function () {
    gulp.watch(['easy-router.es', '.eslintrc', 'gulpfile.js'], ['build']);
});

gulp.task('build', ['lint', 'script']);
gulp.task('default', ['watch']);
